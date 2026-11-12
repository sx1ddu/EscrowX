import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Building2, CheckCircle2, Clock, ShieldCheck, X } from 'lucide-react';
import api from '../../store/api/axios.js';
import toast from 'react-hot-toast';

const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

const typeLabels = {
  escrow_funding:  { label: 'Escrow Funded', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  escrow_release:  { label: 'Escrow Released', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  platform_fee:    { label: 'Platform Fee', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  buyer_refund:    { label: 'Buyer Refund', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  seller_payout:   { label: 'Bank Withdrawal', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  payout_reversal: { label: 'Payout Reversal', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  adjustment:      { label: 'Ledger Adjustment', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

const WalletPage = () => {
  const [wallet, setWallet] = useState({ balance: 0, pendingPayouts: 0, totalWithdrawn: 0 });
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');

  const fetchWalletData = useCallback(async () => {
    try {
      const [walletRes, txRes, payoutsRes] = await Promise.all([
        api.get('/payments/wallet'),
        api.get('/payments/transactions?limit=20'),
        api.get('/payments/payouts'),
      ]);

      setWallet(walletRes.data.data.wallet);
      setTransactions(txRes.data.data.transactions || []);
      setPayouts(payoutsRes.data.data.payouts || []);
    } catch (err) {
      console.error('Wallet fetch error:', err);
      toast.error('Failed to load wallet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    const handleOrderStatus = (event) => {
      const { status } = event.detail || {};
      if (status === 'released' || status === 'refunded') fetchWalletData();
    };

    window.addEventListener('escrowx:order-status', handleOrderStatus);
    return () => window.removeEventListener('escrowx:order-status', handleOrderStatus);
  }, [fetchWalletData]);

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);

    if (!amt || amt < 100) return toast.error('Minimum withdrawal amount is ₹100.');
    if (amt > (wallet.balance || 0)) return toast.error('Insufficient available balance.');
    if (!accountNumber || accountNumber !== confirmAccount) {
      return toast.error('Account numbers do not match.');
    }
    if (!ifscCode.trim() || ifscCode.trim().length !== 11) {
      return toast.error('Please enter a valid 11-character IFSC code.');
    }
    if (!accountHolderName.trim()) {
      return toast.error('Account holder name is required.');
    }

    setSubmittingWithdraw(true);
    try {
      const res = await api.post('/payments/payout', {
        amount: amt,
        bankDetails: {
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim() || 'Bank',
        },
      });

      toast.success(res.data?.message || 'Withdrawal request submitted successfully.');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setAccountNumber('');
      setConfirmAccount('');
      setIfscCode('');
      setAccountHolderName('');
      setBankName('');
      await fetchWalletData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-gray-400">
        Loading EscrowX ledger and wallet...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EscrowX Wallet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Audited escrow funds, balance, and bank disbursements.</p>
        </div>
        <button
          onClick={() => setShowWithdrawModal(true)}
          disabled={(wallet.balance || 0) < 100}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
        >
          <Building2 className="w-4 h-4" /> Withdraw to Bank
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Balance */}
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-200">Available Escrow Balance</span>
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-500/40 border border-indigo-400/30 px-2.5 py-1 rounded-full text-indigo-100">
              <ShieldCheck className="w-3.5 h-3.5" /> Secured by EscrowX
            </span>
          </div>
          <div className="my-6">
            <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              {formatCurrency(wallet.balance)}
            </p>
            <p className="text-xs text-indigo-200 mt-1.5">Indian Rupee (INR) · Available for instant withdrawal</p>
          </div>
          <div className="text-xs text-indigo-200/80 flex items-center gap-2 border-t border-indigo-500/30 pt-3">
            <Clock className="w-3.5 h-3.5" /> Payout requests process within 1-3 business days
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Withdrawals</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(wallet.pendingPayouts)}
            </p>
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Under banking clearance
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Disbursed</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(wallet.totalWithdrawn)}
            </p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completed bank transfers
            </p>
          </div>
        </div>
      </div>

      {/* Payout Requests (if any) */}
      {payouts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 sm:px-6 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Recent Bank Withdrawal Requests</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {payouts.map(p => (
              <div key={p._id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{formatCurrency(p.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'processed' ? 'bg-emerald-50 text-emerald-700' :
                      p.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.bankDetails?.bankName || 'Bank'} · {p.bankDetails?.accountNumberMasked || '****'} · IFSC: {p.bankDetails?.ifscCode}
                  </p>
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {new Date(p.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History Ledger */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Audit-Verified Transaction Ledger</h2>
            <p className="text-xs text-gray-500 mt-0.5">Immutable financial records linked to escrow transitions.</p>
          </div>
          <span className="text-xs text-gray-400 font-medium">{transactions.length} records</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No ledger transactions yet. Funds credited upon escrow release will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4 sm:px-6">Type & Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {transactions.map(tx => {
                  const badge = typeLabels[tx.type] || { label: tx.type, color: 'bg-gray-50 text-gray-700 border-gray-200' };
                  const isCredit = tx.direction === 'credit';

                  return (
                    <tr key={tx._id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{tx.description || 'Escrow transaction'}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">Ref: {tx.transactionId}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                        <div className={`flex items-center gap-1 ${isCredit ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {isCredit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />}
                          <span>{isCredit ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-600 whitespace-nowrap">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right text-xs text-gray-400 whitespace-nowrap font-mono">
                        {new Date(tx.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Withdraw Funds to Bank</h3>
                <p className="text-xs text-gray-500">Available: {formatCurrency(wallet.balance)}</p>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  min={100}
                  max={wallet.balance || 0}
                  step={1}
                  required
                  placeholder="Min. ₹100"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="As registered in your bank"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Confirm Account Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Re-enter account number"
                    value={confirmAccount}
                    onChange={(e) => setConfirmAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    placeholder="HDFC0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Bank Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-700 leading-relaxed">
                🛡️ Payout amounts are debited atomically from your EscrowX wallet. If an automated transfer fails at the clearing house, funds are reversed automatically with a full audit log.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={submittingWithdraw}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {submittingWithdraw ? 'Submitting...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;