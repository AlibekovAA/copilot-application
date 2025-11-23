'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JWT_TOKEN_MAX_AGE, AUTH_API_URL, getAuthToken } from '../utils/apiHelpers';

const AuthContext = createContext(null);

const setAuthCookie = (token) => {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `auth_token=${token}; path=/; max-age=${JWT_TOKEN_MAX_AGE}${isSecure ? '; secure' : ''}; samesite=strict`;
};

const clearAuthCookie = () => {
  document.cookie = 'auth_token=; path=/; max-age=0';
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {

      fetch(`${AUTH_API_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Неверный токен');
          }
          return response.json();
        })
        .then((data) => {
          setIsAuthenticated(true);
          setUserId(data.user_id);
          setUserEmail(data.email);
          setAuthCookie(token);
        })
        .catch((error) => {
          console.error('Invalid token on mount:', error);
          localStorage.removeItem('auth_token');
          clearAuthCookie();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (token, user) => {
    try {
      localStorage.setItem('auth_token', token);
      setAuthCookie(token);
      setIsAuthenticated(true);
      setUserId(user.id);
      setUserEmail(user.email);
      router.push('/');
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    clearAuthCookie();
    setIsAuthenticated(false);
    setUserId(null);
    setUserEmail(null);
    router.push('/auth');
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, userId, userEmail, login, logout }}
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
