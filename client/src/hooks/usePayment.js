import { useState } from 'react';
import { useDispatch } from 'react-redux';
import api from '../store/api/axios.js';
import toast from 'react-hot-toast';
import { setCurrentOrder, updateOrderStatus } from '../store/slices/order.slice.js';
import { emitOrderStatus } from '../utils/orderEvents.js';

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const syncOrder = (order) => {
    if (!order?._id) return;
    dispatch(setCurrentOrder(order));
    dispatch(updateOrderStatus({ orderId: order._id, status: order.escrowStatus }));
    emitOrderStatus({ order });
  };

  const initiatePayment = async (orderId, onSuccess) => {
    setLoading(true);
    try {
      const { data } = await api.post('/payments/create-order', { orderId });
      const { razorpayOrderId, amount, currency, key } = data.data;

      const options = {
        key,
        amount,
        currency,
        order_id: razorpayOrderId,
        name:     'TrustTrade',
        description: 'Secure Escrow Payment',
        theme:    { color: '#6366f1' },
        handler: async (response) => {
          setLoading(true);
          try {
            const { data: verifyData } = await api.post('/payments/verify', response);
            syncOrder(verifyData.data?.order);
            toast.success('Payment successful! Funds held in escrow.');
            await onSuccess?.(verifyData.data?.order);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled.');
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed.');
      setLoading(false);
    }
  };

  const confirmDelivery = async (orderId, onSuccess) => {
    setLoading(true);
    try {
      const { data } = await api.post(`/payments/confirm-delivery/${orderId}`);
      syncOrder(data.data?.order);
      toast.success('Delivery confirmed! Funds released to seller.');
      await onSuccess?.(data.data?.order);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm delivery.');
    } finally { setLoading(false); }
  };

  return { initiatePayment, confirmDelivery, loading };
};
