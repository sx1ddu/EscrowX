import { useEffect, useState } from 'react';
import {
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import api from '../../store/api/axios.js';
import Loader from '../../components/common/Loader.jsx';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    orders: 0,
    disputes: 0,
    revenue: 0,
    platformFee: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');

        console.log('ADMIN STATS =>', res.data);

        setStats({
          users: res.data.data.users || 0,
          products: res.data.data.products || 0,
          orders: res.data.data.orders || 0,
          disputes: res.data.data.disputes || 0,
          revenue: res.data.data.revenue || 0,
          platformFee: res.data.data.platformFee || 0,
        });
      } catch (error) {
        console.error('Dashboard Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const orderData = [
    { name: 'Orders', orders: stats.orders },
  ];

  const roleData = [
    { name: 'Users', value: stats.users },
    { name: 'Products', value: stats.products },
    { name: 'Orders', value: stats.orders },
    { name: 'Disputes', value: stats.disputes },
  ];

  const cards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats.users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Package,
      label: 'Active Products',
      value: stats.products,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: ShoppingCart,
      label: 'Total Orders',
      value: stats.orders,
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: AlertTriangle,
      label: 'Open Disputes',
      value: stats.disputes,
      color: 'bg-red-100 text-red-600',
    },
    {
      icon: DollarSign,
      label: 'Total Revenue',
      value: `₹${stats.revenue.toLocaleString()}`,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: TrendingUp,
      label: 'Platform Fees',
      value: `₹${stats.platformFee.toLocaleString()}`,
      color: 'bg-indigo-100 text-indigo-600',
    },
  ];

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="bg-white border border-gray-200 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{label}</p>

              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <p className="text-2xl font-bold text-gray-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Orders Overview
          </h2>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Platform Overview
          </h2>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label
              >
                {roleData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;