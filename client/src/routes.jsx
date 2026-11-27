import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import GameEntryGate from './site/GameEntryGate.jsx';
import AuthProvider from './site/context/AuthProvider.jsx';
import SiteLayout from './site/SiteLayout.jsx';
import RequireAuth from './site/RequireAuth.jsx';
import LandingPage from './site/pages/LandingPage.jsx';
import LoginPage from './site/pages/LoginPage.jsx';
import SignUpPage from './site/pages/SignUpPage.jsx';
import ForgotPasswordPage from './site/pages/ForgotPasswordPage.jsx';
import DashboardPage from './site/pages/DashboardPage.jsx';
import ProfilePage from './site/pages/ProfilePage.jsx';
import SettingsPage from './site/pages/SettingsPage.jsx';
import './site/site.css';

// `/` still boots the existing game, but only after its welcome entry gate is
// dismissed. The public site lives on its own paths and is the only place that
// mounts the auth provider, so a game load never makes an unnecessary /auth/me
// request.
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameEntryGate />} />

        <Route
          element={
            <AuthProvider>
              <SiteLayout />
            </AuthProvider>
          }
        >
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
