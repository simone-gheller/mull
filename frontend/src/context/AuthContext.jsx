import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

// Auth state reducer
const authReducer = (state, action) => {
  console.log('AuthContext Reducer: Action:', action.type, 'Payload:', action.payload);
  switch (action.type) {
    case 'LOGIN_START':
      console.log('AuthContext Reducer: LOGIN_START - clearing error');
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      console.log('AuthContext Reducer: LOGIN_SUCCESS');
      return {
        ...state,
        loading: false,
        error: null,
        user: action.payload.user,
        isAuthenticated: true,
      };
    case 'LOGIN_FAILURE':
      console.log('AuthContext Reducer: LOGIN_FAILURE with error:', action.payload.error);
      let newState = {
        ...state,
        loading: false,
        error: action.payload.error,
        user: null,
        isAuthenticated: false,
      };
      console.log('AuthContext Reducer: New state after LOGIN_FAILURE:', newState);
      return newState;
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_AUTH':
      console.log('AuthContext reducer SET_AUTH:', action.payload);
      newState = {
        ...state,
        user: action.payload.user,
        isAuthenticated: action.payload.isAuthenticated,
        loading: false,
        error: null,
      };
      console.log('AuthContext new state after SET_AUTH:', newState);
      return newState;
    default:
      return state;
  }
};

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false, // No need to check session on startup
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Listen for logout events from API interceptor
  useEffect(() => {
    const handleLogout = () => {
      dispatch({ type: 'LOGOUT' });
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (credentials) => {
    console.log('AuthContext: Starting login with credentials:', credentials);
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await apiService.login(credentials);
      const { user } = response; // Tokens are now set as cookies by the server

      console.log('AuthContext: Login successful, user:', user);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });

      return { success: true, user };
    } catch (error) {
      console.log('AuthContext: Login failed, error:', error);
      console.log('AuthContext: Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Login failed';
      console.log('AuthContext: Dispatching LOGIN_FAILURE with message:', errorMessage);
      
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: { error: errorMessage },
      });
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await apiService.register(userData);
      const { user } = response; // Tokens are now set as cookies by the server

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });

      return { success: true, user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: { error: errorMessage },
      });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout(); // This clears cookies on the server
    } catch (error) {
      // Even if logout request fails, we should still clear local state
      console.warn('Logout request failed:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const setAuth = (authData) => {
    console.log('AuthContext.setAuth called with:', authData);
    dispatch({
      type: 'SET_AUTH',
      payload: authData,
    });
    console.log('AuthContext.setAuth dispatch completed');
  };

  const value = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    clearError,
    setAuth,
  };

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;