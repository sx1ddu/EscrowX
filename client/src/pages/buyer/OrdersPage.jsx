import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../../store/slices/order.slice.js';
import EscrowBadge from '../../components/common/EscrowBadge.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { ShoppingBag } from 'lucide-react';

const OrdersPage = () => {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector(s => s.orders);
  useEffect(() => { dispatch(fetchMyOrders({ role: 'buyer', limit: 20 })); }, [dispatch]);

  if (loading) return <Loader text="Loading orders..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet"
          description="Browse products and make your first secure purchase."
          action={<Link to="/" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Browse Products</Link>} />
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Link key={order._id} to={`/orders/${order._id}`}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
              <img src={order.product?.images?.[0]?.url||'/placeholder.png'} className="w-16 h-16 object-cover rounded-lg" alt="" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{order.product?.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">Seller: {order.seller?.name}</p>
                <div className="mt-1"><EscrowBadge status={order.escrowStatus} /></div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">₹{order.amount?.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
export default OrdersPage;
