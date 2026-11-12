import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Shield } from 'lucide-react';
import { registerUser } from '../../store/slices/auth.slice.js';

const schema = z.object({
  name:     z.string().min(2, 'Min 2 characters'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
  role:     z.enum(['buyer','seller']),
});

const RegisterPage = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { loading } = useSelector(state => state.auth);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema), defaultValues: { role: 'buyer' }
  });
  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    const result = await dispatch(registerUser(data));
    if (registerUser.fulfilled.match(result)) navigate('/verify-otp');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Shield className="w-7 h-7 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">TrustTrade</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-800 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Join TrustTrade for secure buying & selling</p>

        {/* Role Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {['buyer','seller'].map(r => (
            <label key={r} className="flex-1 cursor-pointer">
              <input type="radio" {...register('role')} value={r} className="sr-only" />
              <div className={`text-center py-2 rounded-md text-sm font-medium transition ${selectedRole === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
                {r === 'buyer' ? '🛒 Buyer' : '🏪 Seller'}
              </div>
            </label>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name:'name',     label:'Full Name',  type:'text',     placeholder:'John Doe' },
            { name:'email',    label:'Email',       type:'email',    placeholder:'you@example.com' },
            { name:'password', label:'Password',    type:'password', placeholder:'••••••••' },
          ].map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input {...register(field.name)} type={field.type} placeholder={field.placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors[field.name] && <p className="text-xs text-red-500 mt-1">{errors[field.name].message}</p>}
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
export default RegisterPage;
