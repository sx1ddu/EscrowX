import { useSelector } from 'react-redux';
import { User, Mail, MapPin, Star, ShoppingBag } from 'lucide-react';

const ProfilePage = () => {
  const { user } = useSelector(s => s.auth);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600">
            {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover rounded-full" alt="" /> : user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500 capitalize">{user?.role} account</p>
            {user?.isVerified && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Verified</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" />{user?.email}</div>
          <div className="flex items-center gap-2 text-gray-600"><Star className="w-4 h-4" />{user?.rating?.average?.toFixed(1)||'0.0'} rating</div>
          <div className="flex items-center gap-2 text-gray-600"><ShoppingBag className="w-4 h-4" />{user?.totalPurchases||0} purchases</div>
          <div className="flex items-center gap-2 text-gray-600"><User className="w-4 h-4" />Joined {new Date(user?.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
