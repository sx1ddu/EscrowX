import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { CheckCircle, Clock, Truck, AlertTriangle, DollarSign } from 'lucide-react';
import api from '../../store/api/axios.js';
import EscrowBadge from '../../components/common/EscrowBadge.jsx';
import Loader from '../../components/common/Loader.jsx';
import { usePayment } from '../../hooks/usePayment.js';
import toast from 'react-hot-toast';
import { setCurrentOrder, updateOrderStatus } from '../../store/slices/order.slice.js';
import { emitOrderStatus } from '../../utils/orderEvents.js';

const steps = [
  { key: 'pending',   icon: Clock,        label: 'Order Placed' },
  { key: 'funded',    icon: DollarSign,   label: 'Payment in Escrow' },
  { key: 'delivered', icon: Truck,        label: 'Delivered' },
  { key: 'released',  icon: CheckCircle,  label: 'Funds Released' },
];

const disputeReasons = [
  'Product Damaged',
  'Wrong Product',
  'Seller Not Responding',
  'Payment Issue',
  'Other',
];

const OrderDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState(disputeReasons[0]);
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const { initiatePayment, confirmDelivery, loading: paymentLoading } = usePayment();

  const syncOrder = useCallback((updatedOrder, notify = false) => {
    if (!updatedOrder?._id) return;
    setOrder(prev => ({
      ...prev,
      ...updatedOrder,
      product: updatedOrder.product || prev?.product,
      timeline: updatedOrder.timeline || prev?.timeline,
    }));
    dispatch(setCurrentOrder(updatedOrder));
    dispatch(updateOrderStatus({ orderId: updatedOrder._id, status: updatedOrder.escrowStatus }));
    if (notify) emitOrderStatus({ order: updatedOrder });
  }, [dispatch]);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      syncOrder(data.data.order);
      return data.data.order;
    } catch { toast.error('Failed to load order'); }
    finally { setLoading(false); }
    return null;
  }, [id, syncOrder]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  useEffect(() => {
    const handleOrderStatus = (event) => {
      if (event.detail?.orderId !== id) return;
      if (event.detail?.status === 'released') {
        setDisputeLoading(false);
      }
      if (event.detail?.status === 'disputed') {
        setDisputeLoading(false);
        setShowDisputeModal(false);
      }
      if (event.detail?.order) {
        syncOrder(event.detail.order);
        return;
      }
      fetchOrder();
    };

    window.addEventListener('trusttrade:order-status', handleOrderStatus);
    return () => window.removeEventListener('trusttrade:order-status', handleOrderStatus);
  }, [fetchOrder, id, syncOrder]);

  const closeDisputeModal = () => {
    if (disputeLoading) return;
    setShowDisputeModal(false);
    setDisputeReason(disputeReasons[0]);
    setDisputeDescription('');
  };

  const handleConfirmDelivery = async () => {
    await confirmDelivery(order._id, async (updatedOrder) => {
      syncOrder(updatedOrder);
      await fetchOrder();
    });
  };

  const submitDispute = async (e) => {
    e.preventDefault();

    if (disputeDescription.trim().length < 10) {
      toast.error('Please enter at least 10 characters in the description.');
      return;
    }

    setDisputeLoading(true);
    try {
      const { data } = await api.post('/disputes', {
        orderId: order._id,
        reason: disputeReason,
        description: disputeDescription.trim(),
      });
      syncOrder(data.data?.order, true);
      setShowDisputeModal(false);
      setDisputeReason(disputeReasons[0]);
      setDisputeDescription('');
      toast.success(data.message || 'Dispute raised successfully.');
      await fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise dispute.');
    } finally {
      setDisputeLoading(false);
    }
  };

  if (loading) return <Loader text="Loading order..." />;
  if (!order)  return <div className="text-center py-12 text-gray-400">Order not found</div>;

  const currentStepIdx = steps.findIndex(s => s.key === order.escrowStatus);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-800">Order Details</h1>
          <EscrowBadge status={order.escrowStatus} />
        </div>
        <p className="text-sm text-gray-400 font-mono">#{order._id}</p>
      </div>

      {/* Escrow Progress */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-6 uppercase tracking-wide">Escrow Timeline</h2>
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const done = idx <= currentStepIdx;
            const active = idx === currentStepIdx;
            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition ${done ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`text-xs mt-2 text-center font-medium ${active ? 'text-indigo-600' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {idx < steps.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Product */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex gap-4">
        <img src={order.product?.images?.[0]?.url || '/placeholder.png'} className="w-20 h-20 object-cover rounded-lg" alt="" />
        <div>
          <h3 className="font-semibold text-gray-800">{order.product?.title}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{order.amount?.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Platform fee: ₹{order.platformFee} | Seller gets: ₹{order.sellerAmount}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        {order.escrowStatus === 'pending' && (
          <button onClick={() => initiatePayment(order._id, fetchOrder)} disabled={paymentLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {paymentLoading ? 'Processing...' : '🔒 Pay Securely (Escrow)'}
          </button>
        )}
        {(order.escrowStatus === 'funded' || order.escrowStatus === 'delivered') && (
          <button onClick={handleConfirmDelivery} disabled={paymentLoading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50">
            {paymentLoading ? 'Confirming...' : '✅ Confirm Delivery & Release Funds'}
          </button>
        )}
        {order.escrowStatus === 'funded' && (
          <button onClick={() => setShowDisputeModal(true)} className="w-full border border-red-200 text-red-600 py-3 rounded-lg font-medium hover:bg-red-50 transition">
            ⚠️ Raise a Dispute
          </button>
        )}
        {order.escrowStatus === 'released' && (
          <div className="text-center text-green-600 font-semibold py-3">
            ✅ Transaction Complete — Funds Released to Seller
          </div>
        )}
      </div>

      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Raise a Dispute</h2>
                <p className="text-sm text-gray-500 mt-1">Order #{order._id}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            </div>

            <form onSubmit={submitDispute} className="space-y-4">
              <div>
                <label htmlFor="dispute-reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  id="dispute-reason"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  disabled={disputeLoading}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                >
                  {disputeReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dispute-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="dispute-description"
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  required
                  minLength={10}
                  rows={5}
                  disabled={disputeLoading}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  placeholder="Describe the issue with this order"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDisputeModal}
                  disabled={disputeLoading}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputeLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                >
                  {disputeLoading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Activity Log</h2>
        <div className="space-y-3">
          {order.timeline?.map((t, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-gray-700">{t.message}</p>
                <p className="text-xs text-gray-400">{new Date(t.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default OrderDetailPage;
