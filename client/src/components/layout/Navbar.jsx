import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Shield, MessageSquare, User, LogOut, Bell } from 'lucide-react';
import { logoutUser } from '../../store/slices/auth.slice.js';
import { useState } from 'react';
import { markAllRead } from '../../store/slices/ui.slice.js';

const Navbar = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user, isAuthenticated } = useSelector(s => s.auth);
  const notifications = useSelector(s => s.ui.notifications);
  const unread = notifications.filter(n => !n.read).length;
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const handleBell = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) dispatch(markAllRead());
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
          <Shield className="w-6 h-6" />
          TrustTrade
        </Link>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                navigate(`/?search=${e.target.value}`);
            }}
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* My Orders — sirf buyer ke liye */}
              {user?.role === 'buyer' && (
                <Link to="/orders"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600">
                  My Orders
                </Link>
              )}

              {/* Seller Dashboard link */}
              {user?.role === 'seller' && (
                <Link to="/seller"
                  className="text-sm font-medium text-indigo-600">
                  Dashboard
                </Link>
              )}

              {/* Admin link */}
              {user?.role === 'admin' && (
                <Link to="/admin"
                  className="text-sm font-medium text-red-600">
                  Admin
                </Link>
              )}

              {/* Chat icon */}
              <Link to="/chat"
                className="p-2 text-gray-500 hover:text-indigo-600">
                <MessageSquare className="w-5 h-5" />
              </Link>

              {/* Single Notification Bell */}
              <div className="relative">
                <button onClick={handleBell}
                  className="p-2 text-gray-500 hover:text-indigo-600 relative">
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 font-medium text-sm">
                      Notifications
                    </div>
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-gray-400 text-center">
                        No notifications yet.
                      </p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.map(n => (
                          <div key={n.id}
                            className={`p-3 border-b border-gray-50 text-sm ${!n.read ? 'bg-indigo-50' : ''}`}>
                            <p className="text-gray-700">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Click outside to close */}
                    <div className="p-2 border-t">
                      <button onClick={() => setNotifOpen(false)}
                        className="w-full text-xs text-gray-400 hover:text-gray-600">
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <Link to="/profile" className="p-2 text-gray-500 hover:text-indigo-600">
                <User className="w-5 h-5" />
              </Link>

              {/* Logout */}
              <button onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login"
                className="text-sm text-gray-600 hover:text-indigo-600">
                Login
              </Link>
              <Link to="/register"
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;