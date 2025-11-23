'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import { AuthForm } from '../components/auth/AuthForm';
import { BackgroundBlobs } from '../components/ui/BackgroundBlobs';
import { FullScreenLoading } from '../components/ui/full-screen-loading';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, register as apiRegister } from '../utils/authApi';
import { useToast } from '../components/ui/toast';
import { formatErrorDetail } from '../utils/errorHelpers';
import styles from './page.module.css';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const { login, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return <FullScreenLoading />;
  }

  const setAction = (next) => {
    const query = next ? `?action=${next}` : '';
    router.push(`/auth${query}`, { scroll: false });
  };

  const handleLogin = async (data) => {
    try {
      setIsSubmitting(true);
      const { token, user } = await apiLogin(data.email, data.password);
      login(token, user);
    } catch (error) {
      toast.error(formatErrorDetail(error?.message) || 'Ошибка входа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (data) => {
    try {
      setIsSubmitting(true);
      await apiRegister(data.name, data.email, data.password);
      toast.success('Регистрация успешна! Теперь войдите в систему');
      setAction('login');
    } catch (error) {
      toast.error(formatErrorDetail(error?.message) || 'Ошибка регистрации');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (email) => {
    try {
      toast.info('Функция восстановления пароля в разработке');
    } catch (error) {
      toast.error('Ошибка при отправке запроса на восстановление пароля');
    }
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
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<FullScreenLoading />}>
      <AuthPageContent />
    </Suspense>
  );
}
