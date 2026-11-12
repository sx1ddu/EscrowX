import { useCallback, useEffect, useState } from 'react';
import api from '../../store/api/axios.js';
import toast from 'react-hot-toast';

const WalletPage = () => {
  const [wallet, setWallet] = useState({ balance: 0 });
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const { data } = await api.get('/payments/wallet');
      setWallet(data.data.wallet);
    } catch {
      toast.error('Failed to load wallet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    const handleOrderStatus = (event) => {
      const { status } = event.detail || {};
      if (status === 'released' || status === 'refunded') fetchWallet();
    };

    window.addEventListener('trusttrade:order-status', handleOrderStatus);
    return () => window.removeEventListener('trusttrade:order-status', handleOrderStatus);
  }, [fetchWallet]);

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount.');
    if (amt > wallet.balance) return toast.error('Insufficient balance.');

    setWithdrawing(true);
    try {
      // NOTE: backend mein abhi withdraw endpoint nahi hai —
      // yeh future feature ke liye placeholder hai
      toast.success('Withdrawal request submitted! (feature coming soon)');
      setAmount('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-gray-400">
        Loading wallet...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-950">My Wallet</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-10 text-white text-center">
        <p className="text-indigo-100 text-sm font-medium">Available Balance</p>
        <p className="text-5xl font-bold mt-3">
          ₹{wallet.balance?.toLocaleString() || 0}
        </p>
        <p className="text-indigo-100 text-sm mt-2">INR · TrustTrade Wallet</p>
      </div>

      {/* Withdraw Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-950 mb-3">
          Withdraw Funds
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Withdrawals are processed within 1-3 business days to your registered bank account.
        </p>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {withdrawing ? 'Processing...' : 'Withdraw to Bank'}
          </button>
        </div>
      </div>

      {/* Info note — transaction history backend mein abhi nahi hai */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center text-sm text-gray-400">
        Transaction history coming soon — your wallet balance updates automatically
        whenever you confirm a sale's escrow release.
      </div>
    </div>
  );
};

export default WalletPage;
