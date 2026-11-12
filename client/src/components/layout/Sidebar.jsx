import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LayoutDashboard, Package, ShoppingCart, Wallet, Users, AlertTriangle, List } from 'lucide-react';

const sellerLinks = [
  { to: '/seller',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/seller/listings',     icon: Package,         label: 'My Listings' },
  { to: '/seller/listings/new', icon: List,            label: 'Add Product' },
  { to: '/seller/orders',       icon: ShoppingCart,    label: 'Orders' },
  { to: '/seller/wallet',       icon: Wallet,          label: 'Wallet' },
];

const adminLinks = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users',     icon: Users,           label: 'Users' },
  { to: '/admin/disputes',  icon: AlertTriangle,   label: 'Disputes' },
  { to: '/admin/products',  icon: Package,         label: 'Products' },
];

const Sidebar = () => {
  const { user } = useSelector(state => state.auth);
  const links = user?.role === 'admin' ? adminLinks : sellerLinks;

  return (
    <aside className="w-60 bg-white border-r border-gray-200 min-h-screen p-4">
      <nav className="flex flex-col gap-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
