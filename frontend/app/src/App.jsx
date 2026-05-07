import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme, FONTS } from '@mull/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Parameters from './pages/Parameters';
import ParameterDetail from './pages/ParameterDetail';
import Environments from './pages/Environments';
import OAuthCallback from './pages/OAuthCallback';
import ProfilePage from './pages/ProfilePage';
import OrgSettingsPage from './pages/OrgSettingsPage';

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
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="apps" element={<Projects />} />
        <Route path="parameters" element={<Parameters />} />
        <Route path="parameters/:parameterId" element={<ParameterDetail />} />
        <Route path="environments" element={<Environments />} />
        <Route path="users" element={<div style={{ fontFamily: FONTS.mono }}>Users — coming soon</div>} />
      </Route>

      <Route path="/settings" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/settings/profile" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="security" element={<div style={{ fontFamily: FONTS.mono, fontSize: '13px' }}>Security — coming soon</div>} />
        <Route path="tokens" element={<div style={{ fontFamily: FONTS.mono, fontSize: '13px' }}>Personal tokens — coming soon</div>} />
        <Route path="org" element={<OrgSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
