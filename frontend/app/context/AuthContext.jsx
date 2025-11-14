'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

// TODO: Когда появится golang backend с JWT - заменить на реальный парсинг токена
const getUserIdFromToken = (token) => {
  // Временный мок: всегда возвращаем user_id = 1
  // В будущем: использовать jwt-decode для парсинга настоящего JWT
  return 1;
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
      setUserId(getUserIdFromToken(token));
      document.cookie = `auth_token=${token}; path=/; max-age=86400`;
    }
    setIsLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem('auth_token', token);
    document.cookie = `auth_token=${token}; path=/; max-age=86400`;
    setIsAuthenticated(true);
    setUserId(getUserIdFromToken(token));
    router.push('/');
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
