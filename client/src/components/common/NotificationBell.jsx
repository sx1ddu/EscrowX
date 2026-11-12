import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { markAllRead } from '../../store/slices/ui.slice.js';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const notifications = useSelector(state => state.ui.notifications);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); dispatch(markAllRead()); }}
        className="p-2 text-gray-500 hover:text-indigo-600 transition relative">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 font-medium text-sm text-gray-700">Notifications</div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 text-center">No notifications yet.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} className={`p-3 border-b border-gray-50 text-sm ${!n.read ? 'bg-indigo-50' : ''}`}>
                  <p className="text-gray-700">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(n.id).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default NotificationBell;
