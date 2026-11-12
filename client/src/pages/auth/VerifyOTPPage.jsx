import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Shield } from 'lucide-react';
import api from '../../store/api/axios.js';

const VerifyOTPPage = () => {
  const [otp, setOtp] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);
  const navigate  = useNavigate();
  const { pendingUserId } = useSelector(state => state.auth);

  const handleChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { userId: pendingUserId, otp: code });
      localStorage.setItem('accessToken', data.data.accessToken);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <Shield className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Verify your email</h1>
        <p className="text-sm text-gray-500 mb-8">Enter the 6-digit code sent to your email</p>
        <div className="flex gap-2 justify-center mb-8">
          {otp.map((digit, idx) => (
            <input key={idx} ref={el => inputsRef.current[idx] = el}
              value={digit} onChange={e => handleChange(e.target.value, idx)}
              onKeyDown={e => e.key === 'Backspace' && !digit && idx > 0 && inputsRef.current[idx - 1]?.focus()}
              maxLength={1} type="text" inputMode="numeric"
              className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500" />
          ))}
        </div>
        <button onClick={handleSubmit} disabled={loading || otp.join('').length !== 6}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50">
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </div>
    </div>
  );
};
export default VerifyOTPPage;
