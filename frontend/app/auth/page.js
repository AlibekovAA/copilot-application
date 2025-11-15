'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { AuthForm } from '../components/auth/AuthForm';
import { BackgroundBlobs } from '../components/ui/BackgroundBlobs';
import { useAuth } from '../context/AuthContext';
import styles from './page.module.css';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const { login, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  const setAction = (next) => {
    const query = next ? `?action=${next}` : '';
    router.push(`/auth${query}`, { scroll: false });
  };

  const handleLogin = (data) => {
    const token = `mock_token_${Date.now()}`;
    login(token);
  };

  const handleSignup = (data) => {
    const token = `mock_token_${Date.now()}`;
    login(token);
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
