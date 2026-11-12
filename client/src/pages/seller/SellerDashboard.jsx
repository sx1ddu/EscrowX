import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ShoppingCart, Wallet, TrendingUp, Plus, ArrowRight, Star } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../store/api/axios.js';
import Loader from '../../components/common/Loader.jsx';
import EscrowBadge from '../../components/common/EscrowBadge.jsx';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-gray-500">{label}</p>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const SellerDashboard = () => {
  const { user } = useSelector(s => s.auth);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const [ordersRes, walletRes] = await Promise.all([
        api.get('/orders/my?role=seller&limit=5'),
        api.get('/payments/wallet'),
      ]);
      setRecentOrders(ordersRes.data.data.orders);
      setStats({
        wallet:     walletRes.data.data.wallet.balance,
        totalOrders: ordersRes.data.data.total,
        rating:     user?.rating?.average || 0,
        totalSales: user?.totalSales || 0,
      });
    } catch { setRecentOrders([]); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const handleOrderStatus = (event) => {
      const { orderId, status } = event.detail || {};
      if (!orderId || !status) return;
      setRecentOrders(orders => orders.map(order => (
        order._id === orderId ? { ...order, escrowStatus: status } : order
      )));
      if (status === 'released' || status === 'refunded') fetchDashboard();
    };

    window.addEventListener('trusttrade:order-status', handleOrderStatus);
    return () => window.removeEventListener('trusttrade:order-status', handleOrderStatus);
  }, [fetchDashboard]);

  const chartData = [
    { month: 'Jan', revenue: 12000 }, { month: 'Feb', revenue: 19000 },
    { month: 'Mar', revenue: 15000 }, { month: 'Apr', revenue: 28000 },
    { month: 'May', revenue: 22000 }, { month: 'Jun', revenue: 35000 },
  ];

  if (loading) return <Loader text="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your seller overview</p>
        </div>
        <Link to="/seller/listings/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> New Listing
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet}      label="Wallet Balance"  value={`₹${(stats?.wallet||0).toLocaleString()}`} sub="Available to withdraw" color="bg-green-100 text-green-600" />
        <StatCard icon={ShoppingCart} label="Total Orders"   value={stats?.totalOrders || 0} sub="All time" color="bg-blue-100 text-blue-600" />
        <StatCard icon={Star}         label="Seller Rating"  value={`${(stats?.rating||0).toFixed(1)} ★`} sub={`${user?.rating?.count||0} reviews`} color="bg-yellow-100 text-yellow-600" />
        <StatCard icon={TrendingUp}   label="Total Sales"    value={stats?.totalSales || 0} sub="Products sold" color="bg-purple-100 text-purple-600" />
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${v/1000}k`} />
            <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Orders</h2>
          <Link to="/seller/orders" className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No orders yet. List a product to start selling!</p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <Link key={order._id} to={`/orders/${order._id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                <img src={order.product?.images?.[0]?.url || '/placeholder.png'}
                  className="w-10 h-10 rounded-lg object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{order.product?.title}</p>
                  <p className="text-xs text-gray-400">by {order.buyer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹{order.amount?.toLocaleString()}</p>
                  <EscrowBadge status={order.escrowStatus} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default SellerDashboard;
