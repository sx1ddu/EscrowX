import { Shield } from 'lucide-react';
const Footer = () => (
  <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2 font-bold text-indigo-600">
        <Shield className="w-5 h-5" /> TrustTrade
      </div>
      <p className="text-sm text-gray-500">© 2025 TrustTrade. Secure escrow for everyone.</p>
    </div>
  </footer>
);
export default Footer;
