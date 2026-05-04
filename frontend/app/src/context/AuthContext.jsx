import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import apiClient, { setToken } from '../lib/api';
import apiService from '../services/api';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        user: action.payload.user,
        orgId: action.payload.orgId,
        isAuthenticated: !!action.payload.user,
        loading: false,
        error: null,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  orgId: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const fetchOrgId = async () => {
  try {
    const { data } = await apiClient.get('/auth/me');
    return data.organization?.id ?? null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);
        const orgId = await fetchOrgId();
        apiService.setOrgId(orgId);
        dispatch({ type: 'SET_SESSION', payload: { user: session.user, orgId } });
      } else {
        dispatch({ type: 'SET_SESSION', payload: { user: null, orgId: null } });
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setToken(null);
        apiService.setOrgId(null);
        dispatch({ type: 'SET_SESSION', payload: { user: null, orgId: null } });
        return;
      }

      setToken(session.access_token);

      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      const orgId = await fetchOrgId();
      apiService.setOrgId(orgId);
      dispatch({ type: 'SET_SESSION', payload: { user: session.user, orgId } });
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async ({ email, password }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  };

  const register = async ({ email, password, displayName }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    user: state.user,
    orgId: state.orgId,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
