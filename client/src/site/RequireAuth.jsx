import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/useAuth.js';

// Guards /dashboard, /profile and /settings. AuthProvider is above this in the
// route tree, so `ready` is false only while a stored token is being checked.
export default function RequireAuth() {
  const { isAuthenticated, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="sx-auth-loading" role="status">
        <span className="sx-live-dot" aria-hidden="true" />
        Checking your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          notice: 'Sign in to view your dashboard.',
        }}
      />
    );
  }

  return <Outlet />;
}
