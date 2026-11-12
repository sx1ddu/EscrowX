import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const RoleRoute = ({ children, roles }) => {
  const { user } = useSelector(state => state.auth);

  const hasToken = !!localStorage.getItem('accessToken');

  // Wait until user is restored
  if (hasToken && !user) {
    return null; // or loader component
  }

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;