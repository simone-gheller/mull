import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (processedRef.current) return; // prevent re-run (StrictMode double mount)
      processedRef.current = true;

      const error = searchParams.get('error');
      const userParam = searchParams.get('user');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login', { 
          replace: true,
          state: { error: 'Authentication failed. Please try again.' }
        });
        return;
      }

      if (!userParam) {
        console.error('Missing user parameter');
        navigate('/login', { 
          replace: true,
          state: { error: 'Invalid authentication response. Please try again.' }
        });
        return;
      }

      try {
        const decodedUserParam = decodeURIComponent(userParam);
        const user = JSON.parse(decodedUserParam);

        setAuth({ user, isAuthenticated: true });

        // Delay ensures context update completes before redirect
        setTimeout(() => navigate('/dashboard', { replace: true }), 100);
      } catch (err) {
        console.error('Failed to parse user data:', err);
        navigate('/login', { 
          replace: true,
          state: { error: 'Authentication failed. Please try again.' }
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
