'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JWT_TOKEN_MAX_AGE } from '../utils/apiHelpers';

const AuthContext = createContext(null);

const getUserIdFromToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token: token must be a non-empty string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token format: expected 3 parts');
  }

  try {
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const decoded = JSON.parse(jsonPayload);

    if (!decoded.user_id) {
      throw new Error('Token does not contain user_id');
    }

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error('Token has expired');
    }

    return decoded.user_id;
  } catch (error) {
    throw new Error(`Failed to decode token: ${error.message}`);
  }
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const id = getUserIdFromToken(token);
        setIsAuthenticated(true);
        setUserId(id);
        const isSecure = window.location.protocol === 'https:';
        document.cookie = `auth_token=${token}; path=/; max-age=${JWT_TOKEN_MAX_AGE}${isSecure ? '; secure' : ''}; samesite=strict`;
      } catch (error) {
        console.error('Invalid token on mount:', error);
        localStorage.removeItem('auth_token');
        document.cookie = 'auth_token=; path=/; max-age=0';
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token) => {
    try {
      const id = getUserIdFromToken(token);
      localStorage.setItem('auth_token', token);
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `auth_token=${token}; path=/; max-age=${JWT_TOKEN_MAX_AGE}${isSecure ? '; secure' : ''}; samesite=strict`;
      setIsAuthenticated(true);
      setUserId(id);
      router.push('/');
    } catch (error) {
      console.error('Failed to login with token:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; max-age=0';
    setIsAuthenticated(false);
    setUserId(null);
    router.push('/auth');
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, userId, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
