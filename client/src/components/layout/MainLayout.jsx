import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

const MainLayout = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default MainLayout;
