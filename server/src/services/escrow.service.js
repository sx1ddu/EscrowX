import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Dispute from '../models/dispute.model.js';
import LedgerService from './ledger.service.js';
import { notifyUser } from '../sockets/index.js';
import { sendEmail } from '../utils/email.js';
import { scheduleAutoRelease } from '../jobs/escrow.job.js';
import logger from '../utils/logger.js';

export const ESCROW_STATES = {
  PENDING: 'pending',
  FUNDED: 'funded',
  DELIVERED: 'delivered',
  DISPUTED: 'disputed',
  RELEASED: 'released',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};

// Permitted transition graph
const VALID_TRANSITIONS = {
  [ESCROW_STATES.PENDING]: [ESCROW_STATES.FUNDED, ESCROW_STATES.CANCELLED],
  [ESCROW_STATES.FUNDED]: [ESCROW_STATES.DELIVERED, ESCROW_STATES.RELEASED, ESCROW_STATES.DISPUTED],
  [ESCROW_STATES.DELIVERED]: [ESCROW_STATES.RELEASED, ESCROW_STATES.DISPUTED],
  [ESCROW_STATES.DISPUTED]: [ESCROW_STATES.RELEASED, ESCROW_STATES.REFUNDED],
  [ESCROW_STATES.RELEASED]: [], // terminal
  [ESCROW_STATES.REFUNDED]: [], // terminal
  [ESCROW_STATES.CANCELLED]: [], // terminal
};

export class EscrowService {
  /**
   * Verifies whether a state transition is permitted.
   */
  static isValidTransition(currentStatus, targetStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Funds an order after verified payment.
   */
  static async fundOrder({ orderId, paymentId, method }) {
    const order = await Order.findById(orderId).populate('buyer seller product');
    if (!order) throw new Error('Order not found.');

    if (order.escrowStatus === ESCROW_STATES.FUNDED && order.payment.status === 'paid') {
      return order; // Idempotent return
    }

    if (!this.isValidTransition(order.escrowStatus, ESCROW_STATES.FUNDED)) {
      throw new Error(`Cannot fund order in state: ${order.escrowStatus}`);
    }

    const fundedOrder = await Order.findOneAndUpdate(
      { _id: orderId, escrowStatus: ESCROW_STATES.PENDING },
      {
        $set: {
          'payment.razorpayPaymentId': paymentId,
          'payment.method': method || 'razorpay',
          'payment.status': 'paid',
          escrowStatus: ESCROW_STATES.FUNDED,
          escrowHeldAt: new Date(),
        },
        $push: {
          timeline: {
            status: ESCROW_STATES.FUNDED,
            message: 'Payment received and secured in EscrowX.',
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    ).populate('buyer seller product');

    if (!fundedOrder) {
      return Order.findById(orderId).populate('buyer seller product');
    }

    // Ensure product is marked sold
    await Product.findByIdAndUpdate(fundedOrder.product._id || fundedOrder.product, { status: 'sold' });

    // Record immutable financial ledger entry
    await LedgerService.recordEscrowFunding({
      order: fundedOrder,
      buyerId: fundedOrder.buyer._id,
      paymentReference: paymentId,
      idempotencyKey: `fund_${fundedOrder._id}`,
    });

    // Notify parties
    notifyUser(fundedOrder.buyer._id.toString(), 'ORDER_FUNDED', { orderId: fundedOrder._id, status: 'funded' });
    notifyUser(fundedOrder.seller._id.toString(), 'ORDER_FUNDED', { orderId: fundedOrder._id, status: 'funded' });

    // Send transactional confirmation email
    await sendEmail({ to: fundedOrder.buyer.email, template: 'orderPlaced', data: fundedOrder });

    // Schedule 7-day durable auto-release background job
    await scheduleAutoRelease(fundedOrder._id.toString(), 7 * 24 * 60 * 60 * 1000);

    logger.info(`[Escrow] Order #${orderId} moved to FUNDED`);
    return fundedOrder;
  }

  /**
   * Seller marks order as delivered.
   */
  static async markDelivered({ orderId, sellerId, trackingId }) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found.');

    if (order.seller.toString() !== sellerId.toString()) {
      throw new Error('Only the assigned seller can mark this order as delivered.');
    }

    if (!this.isValidTransition(order.escrowStatus, ESCROW_STATES.DELIVERED)) {
      throw new Error(`Cannot mark delivered from state: ${order.escrowStatus}`);
    }

    order.escrowStatus = ESCROW_STATES.DELIVERED;
    order.delivery.trackingId = trackingId || '';
    order.delivery.deliveredAt = new Date();
    order.timeline.push({
      status: ESCROW_STATES.DELIVERED,
      message: trackingId ? `Seller shipped order (Tracking: ${trackingId})` : 'Seller marked order as delivered.',
      timestamp: new Date(),
    });
    await order.save();

    notifyUser(order.buyer.toString(), 'ORDER_DELIVERED', { orderId: order._id, status: 'delivered' });
    notifyUser(order.seller.toString(), 'ORDER_DELIVERED', { orderId: order._id, status: 'delivered' });

    logger.info(`[Escrow] Order #${orderId} moved to DELIVERED`);
    return order;
  }

  /**
   * Buyer confirms delivery, releasing funds to seller.
   */
  static async confirmDelivery({ orderId, buyerId }) {
    const order = await Order.findById(orderId).populate('seller buyer');
    if (!order) throw new Error('Order not found.');

    if (order.buyer._id.toString() !== buyerId.toString()) {
      throw new Error('Only the purchasing buyer can confirm delivery.');
    }

    if (!this.isValidTransition(order.escrowStatus, ESCROW_STATES.RELEASED)) {
      throw new Error(`Cannot release escrow in state: ${order.escrowStatus}`);
    }

    // Atomically transition to RELEASED
    const releasedOrder = await Order.findOneAndUpdate(
      { _id: orderId, escrowStatus: { $in: [ESCROW_STATES.FUNDED, ESCROW_STATES.DELIVERED] } },
      {
        $set: {
          escrowStatus: ESCROW_STATES.RELEASED,
          fundsReleasedAt: new Date(),
          'delivery.deliveredAt': order.delivery?.deliveredAt || new Date(),
        },
        $push: {
          timeline: {
            status: ESCROW_STATES.RELEASED,
            message: 'Buyer confirmed delivery. Funds released to seller wallet.',
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    ).populate('seller buyer');

    if (!releasedOrder) {
      return Order.findById(orderId).populate('seller buyer');
    }

    // Ledger Service handles atomic credit and fee calculation
    await LedgerService.recordEscrowRelease({
      order: releasedOrder,
      sellerId: releasedOrder.seller._id,
      idempotencyKey: `release_${releasedOrder._id}`,
    });

    notifyUser(releasedOrder.buyer._id.toString(), 'ORDER_RELEASED', { orderId: releasedOrder._id, status: 'released' });
    notifyUser(releasedOrder.seller._id.toString(), 'ORDER_RELEASED', { orderId: releasedOrder._id, status: 'released' });
    notifyUser(releasedOrder.seller._id.toString(), 'FUNDS_RELEASED', {
      orderId: releasedOrder._id,
      status: 'released',
      amount: releasedOrder.sellerAmount,
    });

    await sendEmail({ to: releasedOrder.seller.email, template: 'fundsReleased', data: releasedOrder.sellerAmount });

    logger.info(`[Escrow] Order #${orderId} successfully RELEASED to Seller #${releasedOrder.seller._id}`);
    return releasedOrder;
  }

  /**
   * Internal / Worker execution of automatic escrow release.
   * Supports BOTH 'funded' and 'delivered' orders. Never releases disputed orders.
   */
  static async autoReleaseOrder(orderId) {
    const order = await Order.findById(orderId).populate('seller buyer');
    if (!order) {
      logger.warn(`[Escrow Auto-Release] Order #${orderId} not found, skipping.`);
      return { skipped: true, reason: 'order_not_found' };
    }

    // Do NOT release disputed, cancelled, refunded, or already released orders
    if (![ESCROW_STATES.FUNDED, ESCROW_STATES.DELIVERED].includes(order.escrowStatus)) {
      logger.info(`[Escrow Auto-Release] Order #${orderId} in state '${order.escrowStatus}', auto-release skipped.`);
      return { skipped: true, reason: `status_${order.escrowStatus}` };
    }

    // Check if an open dispute exists
    const openDispute = await Dispute.findOne({ order: orderId, status: { $in: ['open', 'under_review'] } });
    if (openDispute) {
      logger.warn(`[Escrow Auto-Release] Order #${orderId} has active dispute, auto-release aborted.`);
      return { skipped: true, reason: 'active_dispute' };
    }

    // Atomically transition
    const releasedOrder = await Order.findOneAndUpdate(
      { _id: orderId, escrowStatus: { $in: [ESCROW_STATES.FUNDED, ESCROW_STATES.DELIVERED] } },
      {
        $set: {
          escrowStatus: ESCROW_STATES.RELEASED,
          fundsReleasedAt: new Date(),
        },
        $push: {
          timeline: {
            status: ESCROW_STATES.RELEASED,
            message: 'Funds auto-released by EscrowX after inspection period.',
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    ).populate('seller buyer');

    if (!releasedOrder) return { skipped: true, reason: 'concurrently_updated' };

    await LedgerService.recordEscrowRelease({
      order: releasedOrder,
      sellerId: releasedOrder.seller._id,
      idempotencyKey: `auto_release_${releasedOrder._id}`,
    });

    notifyUser(releasedOrder.buyer._id.toString(), 'ORDER_RELEASED', { orderId: releasedOrder._id, status: 'released' });
    notifyUser(releasedOrder.seller._id.toString(), 'ORDER_RELEASED', { orderId: releasedOrder._id, status: 'released' });
    notifyUser(releasedOrder.seller._id.toString(), 'FUNDS_RELEASED', {
      orderId: releasedOrder._id,
      status: 'released',
      amount: releasedOrder.sellerAmount,
    });

    await sendEmail({ to: releasedOrder.seller.email, template: 'fundsReleased', data: releasedOrder.sellerAmount });

    logger.info(`[Escrow Auto-Release] Successfully auto-released Order #${orderId}`);
    return { success: true, order: releasedOrder };
  }

  /**
   * Raises a dispute, freezing funds and preventing auto-release.
   */
  static async raiseDispute({ orderId, userId, reason, description, aiRiskScore = 0 }) {
    const order = await Order.findById(orderId).populate('buyer seller');
    if (!order) throw new Error('Order not found.');

    const isBuyer = order.buyer._id.toString() === userId.toString();
    const isSeller = order.seller._id.toString() === userId.toString();
    if (!isBuyer && !isSeller) {
      throw new Error('Only the buyer or seller can dispute this order.');
    }

    if (!this.isValidTransition(order.escrowStatus, ESCROW_STATES.DISPUTED)) {
      throw new Error(`Cannot dispute order in state: ${order.escrowStatus}`);
    }

    const against = isBuyer ? order.seller._id : order.buyer._id;

    const dispute = await Dispute.create({
      order: orderId,
      raisedBy: userId,
      against,
      reason,
      description,
      aiRiskScore,
      status: 'open',
    });

    order.escrowStatus = ESCROW_STATES.DISPUTED;
    order.timeline.push({
      status: ESCROW_STATES.DISPUTED,
      message: `Dispute raised: ${reason}`,
      timestamp: new Date(),
    });
    await order.save();

    notifyUser(userId.toString(), 'DISPUTE_RAISED', { disputeId: dispute._id, orderId, status: 'disputed' });
    notifyUser(against.toString(), 'DISPUTE_RAISED', { disputeId: dispute._id, orderId, status: 'disputed' });

    const userEmail = isBuyer ? order.buyer.email : order.seller.email;
    await sendEmail({ to: userEmail, template: 'disputeRaised', data: dispute._id });

    logger.info(`[Escrow] Dispute #${dispute._id} raised for Order #${orderId}`);
    return { dispute, order };
  }

  /**
   * Admin resolves dispute in favor of buyer or seller.
   */
  static async resolveDispute({ disputeId, adminId, resolution, adminNotes }) {
    if (!['buyer', 'seller'].includes(resolution)) {
      throw new Error('Resolution must be either "buyer" or "seller".');
    }

    const dispute = await Dispute.findById(disputeId).populate({
      path: 'order',
      populate: [
        { path: 'buyer', select: 'name email wallet' },
        { path: 'seller', select: 'name email wallet totalSales' },
      ],
    });
    if (!dispute) throw new Error('Dispute not found.');

    const order = dispute.order;
    if (!order) throw new Error('Order associated with dispute not found.');

    if (dispute.status.startsWith('resolved_')) {
      throw new Error('Dispute is already resolved.');
    }

    dispute.status = `resolved_${resolution}`;
    dispute.resolvedBy = adminId;
    dispute.resolvedAt = new Date();
    dispute.resolution = resolution;
    dispute.adminNotes = adminNotes || '';

    let resolvedOrder;

    if (resolution === 'buyer') {
      // 1. Refund buyer
      resolvedOrder = await Order.findOneAndUpdate(
        { _id: order._id, escrowStatus: ESCROW_STATES.DISPUTED },
        {
          $set: { escrowStatus: ESCROW_STATES.REFUNDED },
          $push: {
            timeline: {
              status: ESCROW_STATES.REFUNDED,
              message: `Dispute resolved in favor of Buyer. Refunded: ₹${order.amount}`,
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      ).populate('buyer seller');

      if (resolvedOrder) {
        await LedgerService.recordBuyerRefund({
          order: resolvedOrder,
          buyerId: order.buyer._id,
          reason: adminNotes || 'Admin resolution in favor of buyer',
          idempotencyKey: `dispute_refund_${order._id}`,
        });
        // Product restored to active
        await Product.findByIdAndUpdate(order.product, { status: 'active' });
      }
    } else {
      // 2. Release to seller
      resolvedOrder = await Order.findOneAndUpdate(
        { _id: order._id, escrowStatus: ESCROW_STATES.DISPUTED },
        {
          $set: { escrowStatus: ESCROW_STATES.RELEASED, fundsReleasedAt: new Date() },
          $push: {
            timeline: {
              status: ESCROW_STATES.RELEASED,
              message: `Dispute resolved in favor of Seller. Released: ₹${order.sellerAmount}`,
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      ).populate('buyer seller');

      if (resolvedOrder) {
        await LedgerService.recordEscrowRelease({
          order: resolvedOrder,
          sellerId: order.seller._id,
          idempotencyKey: `dispute_release_${order._id}`,
        });
      }
    }

    await dispute.save();

    const finalOrder = resolvedOrder || (await Order.findById(order._id).populate('buyer seller'));
    const status = resolution === 'buyer' ? 'refunded' : 'released';
    const amount = resolution === 'buyer' ? finalOrder.amount : finalOrder.sellerAmount;

    notifyUser(finalOrder.buyer._id.toString(), 'DISPUTE_RESOLVED', {
      orderId: finalOrder._id,
      resolution,
      status,
      amount,
    });
    notifyUser(finalOrder.seller._id.toString(), 'DISPUTE_RESOLVED', {
      orderId: finalOrder._id,
      resolution,
      status,
      amount,
    });

    if (resolution === 'buyer') {
      await sendEmail({ to: finalOrder.buyer.email, template: 'buyerRefunded', data: finalOrder.amount });
    } else {
      await sendEmail({ to: finalOrder.seller.email, template: 'fundsReleased', data: finalOrder.sellerAmount });
    }

    logger.info(`[Escrow] Dispute #${disputeId} resolved in favor of ${resolution.toUpperCase()}`);
    return { dispute, order: finalOrder };
  }
}

export default EscrowService;
