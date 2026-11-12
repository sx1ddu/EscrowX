import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { setUser } from './store/slices/auth.slice.js';
import { useSocket } from './hooks/useSocket.js';
import api from './store/api/axios.js';

// Layout
import MainLayout from './components/layout/MainLayout.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';

// Auth Pages
import LoginPage      from './pages/auth/LoginPage.jsx';
import RegisterPage   from './pages/auth/RegisterPage.jsx';
import VerifyOTPPage  from './pages/auth/VerifyOTPPage.jsx';
import OAuthCallback  from './pages/auth/OAuthCallback.jsx';

// Buyer Pages
import HomePage       from './pages/buyer/HomePage.jsx';
import ProductPage    from './pages/buyer/ProductPage.jsx';
//import CartPage       from './pages/buyer/CartPage.jsx';
import OrdersPage     from './pages/buyer/OrdersPage.jsx';
import OrderDetailPage from './pages/buyer/OrderDetailPage.jsx';
import ProfilePage    from './pages/buyer/ProfilePage.jsx';
import ChatPage       from './pages/buyer/ChatPage.jsx';

// Seller Pages
import SellerDashboard  from './pages/seller/SellerDashboard.jsx';
import CreateProduct    from './pages/seller/CreateProduct.jsx';
import MyListings       from './pages/seller/MyListings.jsx';
import SellerOrders     from './pages/seller/SellerOrders.jsx';
import WalletPage       from './pages/seller/WalletPage.jsx';

// Admin Pages
import AdminDashboard   from './pages/admin/AdminDashboard.jsx';
import AdminUsers       from './pages/admin/AdminUsers.jsx';
import AdminDisputes    from './pages/admin/AdminDisputes.jsx';
import AdminProducts    from './pages/admin/AdminProducts.jsx';

// Guards
import ProtectedRoute   from './components/auth/ProtectedRoute.jsx';
import RoleRoute        from './components/auth/RoleRoute.jsx';

function App() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  useSocket(user);

  // Restore user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      
      try {
        const { data } = await api.get('/users/me');
        dispatch(setUser(data.data.user));
      } catch{
        localStorage.removeItem('accessToken');
      }
    };
    restoreSession();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Auth */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/verify-otp"    element={<VerifyOTPPage />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* Public routes with main layout */}
        <Route element={<MainLayout />}>
          <Route path="/"             element={<HomePage />} />
          <Route path="/products/:id" element={<ProductPage />} />
        </Route>

        {/* Protected Buyer Routes */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/orders"        element={<OrdersPage />} />
          <Route path="/orders/:id"    element={<OrderDetailPage />} />
          {/* //<Route path="/cart"          element={<CartPage />} /> */}
          <Route path="/chat"          element={<ChatPage />} />
          <Route path="/chat/:chatId"  element={<ChatPage />} />
          <Route path="/profile"       element={<ProfilePage />} />
        </Route>

        {/* Seller Routes */}
        <Route element={<RoleRoute roles={['seller','admin']}><DashboardLayout /></RoleRoute>}>
          <Route path="/seller"              element={<SellerDashboard />} />
          <Route path="/seller/listings"     element={<MyListings />} />
          <Route path="/seller/listings/new" element={<CreateProduct />} />
          <Route path="/seller/orders"       element={<SellerOrders />} />
          <Route path="/seller/wallet"       element={<WalletPage />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<RoleRoute roles={['admin']}><DashboardLayout /></RoleRoute>}>
          <Route path="/admin"           element={<AdminDashboard />} />
          <Route path="/admin/users"     element={<AdminUsers />} />
          <Route path="/admin/disputes"  element={<AdminDisputes />} />
          <Route path="/admin/products"  element={<AdminProducts />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
