import { Navigate, useSearchParams } from 'react-router-dom';

export const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/products';
  const modeParam = searchParams.get('mode');
  const initialMode = modeParam === 'signup' ? 'signup' : 'signin';

  return <Navigate to={`/?auth=${initialMode}&redirect=${encodeURIComponent(redirectTarget)}`} replace />;
};