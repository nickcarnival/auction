import { useAuth } from '@/pages/auth/auth-provider';
import { Navigate, Outlet } from 'react-router';

export const PrivateRoute = () => {
  const { user, isUserLoading } = useAuth();

  if (isUserLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
