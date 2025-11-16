'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import { AuthForm } from '../components/auth/AuthForm';
import { BackgroundBlobs } from '../components/ui/BackgroundBlobs';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, register as apiRegister } from '../utils/authApi';
import styles from './page.module.css';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const { login, isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  const setAction = (next) => {
    setError(null);
    const query = next ? `?action=${next}` : '';
    router.push(`/auth${query}`, { scroll: false });
  };

  const handleLogin = async (data) => {
    try {
      setError(null);
      setIsSubmitting(true);
      const { token, user } = await apiLogin(data.email, data.password);
      login(token, user);
    } catch (error) {
      setError(error.message || 'Ошибка входа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (data) => {
    try {
      setError(null);
      setIsSubmitting(true);
      const { token, user } = await apiRegister(
        data.name,
        data.email,
        data.password,
      );
      login(token, user);
    } catch (error) {
      setError(error.message || 'Ошибка регистрации');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = (email) => {
    console.log('Password reset requested for:', email);
  };

  return (
    <div className={styles.container}>
      <BackgroundBlobs />
      <div className={styles.content}>
        <AuthForm
          mode={action || 'welcome'}
          onBack={() => setAction(null)}
          onSwitchMode={setAction}
          onSubmit={action === 'login' ? handleLogin : handleSignup}
          onForgotPassword={handleForgotPassword}
          error={error}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}
