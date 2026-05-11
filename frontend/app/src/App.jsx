import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme, FONTS } from '@mull/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const Parameters = lazy(() => import('./pages/Parameters'));
const ParameterDetail = lazy(() => import('./pages/ParameterDetail'));
const Environments = lazy(() => import('./pages/Environments'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const PersonalTokensPage = lazy(() => import('./pages/PersonalTokensPage'));
const OrgSettingsPage = lazy(() => import('./pages/OrgSettingsPage'));
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage'));

function Spinner() {
  const { T } = useTheme();
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: T.termGreen }}>loading…</span>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function BackendStatusBanner() {
  const { T } = useTheme();
  const { backendDown } = useAuth();

  if (!backendDown) return null;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 3000,
      background: T.amberBg,
      borderBottom: `1px solid ${T.amberBorder}`,
      color: T.amber,
      fontFamily: FONTS.mono,
      fontSize: '11px',
      letterSpacing: '0.03em',
      padding: '8px 16px',
      textAlign: 'center',
    }}>
      API temporarily unreachable. Retrying...
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <BackendStatusBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/invite/accept" element={<InviteAcceptPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="apps" element={<Projects />} />
          <Route path="parameters" element={<Parameters />} />
          <Route path=":orgSlug/:appSlug/parameters/:paramKey" element={<ParameterDetail />} />
          <Route path="environments" element={<Environments />} />
        </Route>

        <Route path="/settings" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/settings/profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="tokens" element={<PersonalTokensPage />} />
          <Route path="org" element={<OrgSettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastProvider>
          <Suspense fallback={<Spinner />}>
            <AppRoutes />
          </Suspense>
        </ToastProvider>
      </Router>
    </AuthProvider>
  );
}
