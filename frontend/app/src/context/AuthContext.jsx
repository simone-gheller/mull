import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
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
        orgs: action.payload.orgs,
        orgId: action.payload.orgId,
        isAuthenticated: !!action.payload.user,
        loading: false,
        error: null,
      };
    case 'SWITCH_ORG':
      return { ...state, orgId: action.payload };
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
  orgs: [],
  orgId: localStorage.getItem('active_org_id') ?? null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const fetchUserData = async () => {
  try {
    const { data } = await apiClient.get('/auth/me');
    return data;
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
        const userData = await fetchUserData();
        const orgs = userData?.organizations ?? [];
        const storedOrgId = localStorage.getItem('active_org_id');
        const activeOrgId = orgs.find(o => o.id === storedOrgId)?.id
          ?? orgs.find(o => o.role === 'OWNER')?.id
          ?? orgs[0]?.id ?? null;
        apiService.setOrgId(activeOrgId);
        dispatch({ type: 'SET_SESSION', payload: { user: session.user, orgs, orgId: activeOrgId } });
      } else {
        dispatch({ type: 'SET_SESSION', payload: { user: null, orgs: [], orgId: null } });
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setToken(null);
        apiService.setOrgId(null);
        dispatch({ type: 'SET_SESSION', payload: { user: null, orgs: [], orgId: null } });
        return;
      }

      setToken(session.access_token);

      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      const userData = await fetchUserData();
      const orgs = userData?.organizations ?? [];
      const storedOrgId = localStorage.getItem('active_org_id');
      const activeOrgId = orgs.find(o => o.id === storedOrgId)?.id
        ?? orgs.find(o => o.role === 'OWNER')?.id
        ?? orgs[0]?.id ?? null;
      apiService.setOrgId(activeOrgId);
      dispatch({ type: 'SET_SESSION', payload: { user: session.user, orgs, orgId: activeOrgId } });
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

  const register = async ({ email, password, displayName, organizationName }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          organization_name: organizationName,
        },
      },
    });
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
    dispatch({ type: 'SET_LOADING', payload: false });
    return { success: true, user: data.user, sessionCreated: !!data.session };
  };

  const verifyOtp = async ({ email, token }) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const switchOrg = (orgId) => {
    localStorage.setItem('active_org_id', orgId);
    apiService.setOrgId(orgId);
    dispatch({ type: 'SWITCH_ORG', payload: orgId });
  };

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = {
    user: state.user,
    orgs: state.orgs,
    orgId: state.orgId,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    register,
    verifyOtp,
    logout,
    switchOrg,
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
