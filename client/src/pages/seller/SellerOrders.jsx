import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchMyOrders } from '../../store/slices/order.slice.js';
import EscrowBadge from '../../components/common/EscrowBadge.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { ShoppingCart } from 'lucide-react';
import api from '../../store/api/axios.js';
import toast from 'react-hot-toast';

const SellerOrders = () => {
  const dispatch            = useDispatch();
  const { orders, loading } = useSelector(s => s.orders);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    dispatch(fetchMyOrders({ role: 'seller' }));
  }, [dispatch]);

  const handleMarkDelivered = async (orderId) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/mark-delivered`, { trackingId: '' });
      toast.success('Marked as delivered!');
      dispatch(fetchMyOrders({ role: 'seller' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <Loader text="Loading orders..." />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders Received</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders yet"
          description="Orders from buyers will appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(order => (
            <div key={order._id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">

              <Link to={`/orders/${order._id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <img
                  src={order.product?.images?.[0]?.url || '/placeholder.png'}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {order.product?.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Buyer: {order.buyer?.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <p className="font-bold text-gray-900">
                  ₹{order.amount?.toLocaleString()}
                </p>
                <EscrowBadge status={order.escrowStatus} />
              </div>

              {order.escrowStatus === 'funded' && (
                <button
                  onClick={() => handleMarkDelivered(order._id)}
                  disabled={updatingId === order._id}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex-shrink-0"
                >
                  {updatingId === order._id ? 'Updating...' : 'Mark Delivered'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerOrders;