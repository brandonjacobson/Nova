'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setToken, removeToken, getToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Load user data from token on mount
  const loadUser = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) {
      setUser(null);
      setBusiness(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.auth.me();
      setUser(response.data.user);
      setBusiness(response.data.business);
      setError(null);
    } catch (err) {
      // Token is invalid or expired
      console.error('Failed to load user:', err.message);
      removeToken();
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Login function
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.auth.login(email, password);
      setToken(response.data.token);
      setUser(response.data.user);
      setBusiness(response.data.business);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Register function
  const register = async (data) => {
    setError(null);
    try {
      const response = await api.auth.register(data);
      setToken(response.data.token);
      setUser(response.data.user);
      setBusiness(response.data.business);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Logout function
  const logout = () => {
    removeToken();
    setUser(null);
    setBusiness(null);
    setError(null);
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Update user data (for profile edits) - persists to backend
  const updateUser = async (updates) => {
    try {
      const response = await api.auth.updateProfile({
        name: updates.name,
        businessName: updates.businessName,
      });

      // Update local state with response from server
      if (response.data?.user) {
        setUser(prev => ({ ...prev, ...response.data.user }));
      }
      if (response.data?.business) {
        setBusiness(prev => ({ ...prev, ...response.data.business }));
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to update profile:', err.message);
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    business,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    clearError,
    loadUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
