import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/slices/auth.slice.js';
import api from '../../store/api/axios.js';

const OAuthCallback = () => {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const dispatch  = useDispatch();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      api.get('/users/me').then(({ data }) => {
        dispatch(setUser(data.data.user));
        navigate('/', { replace: true });
      }).catch(() => navigate('/login'));
    } else {
      navigate('/login');
    }
  }, [dispatch, navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
};
export default OAuthCallback;
