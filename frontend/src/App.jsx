import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Parameters from './pages/Parameters';
import ParameterDetail from './pages/ParameterDetail';
import Users from './pages/Users';
import NotFound from './pages/NotFound';
import OAuthCallback from './pages/OAuthCallback';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  console.log('ProtectedRoute:', { isAuthenticated, loading, path: window.location.pathname });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  console.log('PublicRoute:', { isAuthenticated, loading, path: window.location.pathname });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('PublicRoute: Authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Landing Page - Public Route */}
      <Route 
        path="/" 
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        } 
      />
      
      {/* Auth Pages - Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />
      
      {/* OAuth Callback - Special Route */}
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="parameters" element={<Parameters />} />
        <Route path="parameters/:parameterId" element={<ParameterDetail />} />
        <Route path="users" element={<Users />} />
        <Route path="history" element={<div>History Page - Coming Soon</div>} />
        <Route path="settings" element={<div>Settings Page - Coming Soon</div>} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
