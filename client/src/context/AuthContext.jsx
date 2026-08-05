// AuthContext — React context managing user authentication state and JWT token handling
import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, registerAdmin } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('civibridge_token'));
  const [loading, setLoading] = useState(true);

  // Initialize user state from token decode on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('civibridge_token');
    const savedUser = localStorage.getItem('civibridge_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('civibridge_token');
        localStorage.removeItem('civibridge_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('civibridge_token', data.token);
    localStorage.setItem('civibridge_user', JSON.stringify(data.user));
    return data;
  };

  const register = async (email, password) => {
    const data = await registerUser(email, password);
    // Auto-login after registration
    return login(email, password);
  };

  const provisionAdmin = async (email, password, adminSecret) => {
    const data = await registerAdmin(email, password, adminSecret);
    return login(email, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('civibridge_token');
    localStorage.removeItem('civibridge_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        provisionAdmin,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
