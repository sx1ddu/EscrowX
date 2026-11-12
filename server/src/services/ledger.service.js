import crypto from 'crypto';
import User from '../models/user.model.js';
import Transaction from '../models/transaction.model.js';
import Payout from '../models/payout.model.js';
import logger from '../utils/logger.js';

const generateTxnId = (prefix = 'txn') => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

export class LedgerService {
  /**
   * Converts Rupee amounts to integer paise for storage and math.
   */
  static toPaise(rupees) {
    return Math.round(Number(rupees) * 100);
  }

  /**
   * Converts integer paise to standard Rupee format.
   */
  static fromPaise(paise) {
    return Number((Number(paise) / 100).toFixed(2));
  }

  /**
   * Records an escrow funding event when a buyer's payment is captured.
   */
  static async recordEscrowFunding({ order, buyerId, paymentReference, idempotencyKey }) {
    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey });
      if (existing) return existing;
    }

    const amountInPaise = Math.round(order.amount * 100);
    const txn = await Transaction.create({
      transactionId: generateTxnId('txn_fund'),
      order: order._id,
      user: buyerId,
      type: 'escrow_funding',
      direction: 'debit', // Funds transferred from buyer to platform escrow
      amount: order.amount,
      amountInPaise,
      currency: 'INR',
      status: 'completed',
      idempotencyKey: idempotencyKey || `fund_${order._id}`,
      providerReference: paymentReference,
      description: `Escrow payment held for Order #${order._id}`,
      metadata: {
        productId: order.product,
        sellerId: order.seller,
      },
    });

    logger.info(`[Ledger] Escrow funded: ${txn.transactionId} for Order #${order._id}`);
    return txn;
  }

  /**
   * Records release of funds to the seller upon delivery confirmation or auto-release.
   * Atomically credits seller wallet and creates matching ledger entries.
   */
  static async recordEscrowRelease({ order, sellerId, idempotencyKey }) {
    const key = idempotencyKey || `release_${order._id}`;
    const existing = await Transaction.findOne({ idempotencyKey: key });
    if (existing) {
      logger.warn(`[Ledger] Escrow release duplicate detected for Order #${order._id}`);
      return existing;
    }

    const sellerAmount = order.sellerAmount;
    const platformFee = order.platformFee || Math.round(order.amount * 0.02);

    // Atomically credit seller wallet
    const updatedSeller = await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: {
          'wallet.balance': sellerAmount,
          totalSales: 1,
        },
      },
      { new: true }
    );

    const balanceAfter = updatedSeller?.wallet?.balance || sellerAmount;

    // 1. Credit entry for seller
    const sellerTxn = await Transaction.create({
      transactionId: generateTxnId('txn_rel'),
      order: order._id,
      user: sellerId,
      type: 'escrow_release',
      direction: 'credit',
      amount: sellerAmount,
      amountInPaise: Math.round(sellerAmount * 100),
      currency: 'INR',
      status: 'completed',
      balanceAfter,
      idempotencyKey: key,
      description: `Escrow funds released for Order #${order._id}`,
      metadata: {
        orderTotal: order.amount,
        platformFeeDeducted: platformFee,
      },
    });

    // 2. Platform commission record
    if (platformFee > 0) {
      await Transaction.create({
        transactionId: generateTxnId('txn_fee'),
        order: order._id,
        user: sellerId,
        type: 'platform_fee',
        direction: 'debit',
        amount: platformFee,
        amountInPaise: Math.round(platformFee * 100),
        currency: 'INR',
        status: 'completed',
        idempotencyKey: `fee_${order._id}`,
        description: `Platform fee (2%) for Order #${order._id}`,
        metadata: { orderId: order._id },
      });
    }

    logger.info(`[Ledger] Escrow released: ${sellerTxn.transactionId} to Seller #${sellerId}`);
    return sellerTxn;
  }

  /**
   * Records a dispute refund to the buyer's wallet.
   */
  static async recordBuyerRefund({ order, buyerId, reason, idempotencyKey }) {
    const key = idempotencyKey || `refund_${order._id}`;
    const existing = await Transaction.findOne({ idempotencyKey: key });
    if (existing) return existing;

    const refundAmount = order.amount;

    // Atomically credit buyer wallet
    const updatedBuyer = await User.findByIdAndUpdate(
      buyerId,
      { $inc: { 'wallet.balance': refundAmount } },
      { new: true }
    );

    const balanceAfter = updatedBuyer?.wallet?.balance || refundAmount;

    const refundTxn = await Transaction.create({
      transactionId: generateTxnId('txn_ref'),
      order: order._id,
      user: buyerId,
      type: 'buyer_refund',
      direction: 'credit',
      amount: refundAmount,
      amountInPaise: Math.round(refundAmount * 100),
      currency: 'INR',
      status: 'completed',
      balanceAfter,
      idempotencyKey: key,
      description: `Dispute refund for Order #${order._id}: ${reason || 'Admin resolution'}`,
      metadata: { orderId: order._id, reason },
    });

    logger.info(`[Ledger] Buyer refunded: ${refundTxn.transactionId} for Order #${order._id}`);
    return refundTxn;
  }

  /**
   * Creates a payout request and atomically debits seller wallet balance.
   */
  static async requestPayout({ sellerId, amount, bankAccount, idempotencyKey }) {
    const key = idempotencyKey || `payout_req_${Date.now()}`;
    if (idempotencyKey) {
      const existing = await Payout.findOne({ idempotencyKey });
      if (existing) return { payout: existing, isDuplicate: true };
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      throw new Error('Minimum withdrawal amount is ₹100.');
    }

    // Atomic debit ensuring balance >= requested amount
    const updatedSeller = await User.findOneAndUpdate(
      {
        _id: sellerId,
        'wallet.balance': { $gte: numAmount },
      },
      {
        $inc: { 'wallet.balance': -numAmount },
      },
      { new: true }
    );

    if (!updatedSeller) {
      throw new Error('Insufficient wallet balance for withdrawal.');
    }

    const payoutId = generateTxnId('po');
    const txnId = generateTxnId('txn_po');

    const txn = await Transaction.create({
      transactionId: txnId,
      user: sellerId,
      type: 'seller_payout',
      direction: 'debit',
      amount: numAmount,
      amountInPaise: Math.round(numAmount * 100),
      currency: 'INR',
      status: 'pending',
      balanceAfter: updatedSeller.wallet.balance,
      idempotencyKey: `payout_txn_${payoutId}`,
      description: `Withdrawal request to bank account ending in ${bankAccount.accountNumber.slice(-4)}`,
      metadata: {
        accountHolderName: bankAccount.accountHolderName,
        ifscCode: bankAccount.ifscCode,
        bankName: bankAccount.bankName,
      },
    });

    const payout = await Payout.create({
      payoutId,
      seller: sellerId,
      amount: numAmount,
      amountInPaise: Math.round(numAmount * 100),
      currency: 'INR',
      status: 'requested',
      bankAccount,
      idempotencyKey: key,
      transaction: txn._id,
    });

    logger.info(`[Ledger] Payout requested: ${payout.payoutId} for ₹${numAmount} by Seller #${sellerId}`);
    return { payout, transaction: txn };
  }

  /**
   * Reconciles a user's wallet balance against the immutable ledger entries.
   */
  static async reconcileUserBalance(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found.');

    const transactions = await Transaction.find({
      user: userId,
      status: 'completed',
    });

    let calculatedBalance = 0;
    for (const t of transactions) {
      if (t.type === 'escrow_release' || t.type === 'buyer_refund' || t.type === 'payout_reversal') {
        calculatedBalance += t.amount;
      } else if (t.type === 'seller_payout') {
        calculatedBalance -= t.amount;
      }
    }

    const currentBalance = user.wallet?.balance || 0;
    const isReconciled = currentBalance === calculatedBalance;

    return {
      userId,
      currentBalance,
      calculatedBalance,
      isReconciled,
      discrepancy: currentBalance - calculatedBalance,
    };
  }
}

export default LedgerService;
