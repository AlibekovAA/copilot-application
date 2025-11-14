'use client';
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { WelcomeScreen } from "../components/auth/WelcomeScreen";
import { LoginForm } from "../components/auth/LoginForm";
import { SignupForm } from "../components/auth/SignupForm";
import { useAuth } from "../context/AuthContext";
import styles from "./page.module.css";

function AuthPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams.get("action");
    const { login, isAuthenticated, isLoading } = useAuth();

    // Если уже авторизован, редирект на главную
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || isAuthenticated) {
        return null;
    }

    const setAction = (next) => {
        const query = next ? `?action=${next}` : "";
        router.push(`/auth${query}`, { scroll: false });
    };

    const handleLogin = (data) => {
        // Имитация успешной авторизации
        // В реальном приложении здесь будет запрос к API
        const token = `mock_token_${Date.now()}`;
        login(token);
    };

    const handleSignup = (data) => {
        // Имитация успешной регистрации и авторизации
        // В реальном приложении здесь будет запрос к API
        const token = `mock_token_${Date.now()}`;
        login(token);
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <div className={`${styles.blob} ${styles.blob1}`}></div>
            <div className={`${styles.blob} ${styles.blob2}`}></div>
            <div className={`${styles.blob} ${styles.blob3}`}></div>
            <div className={`${styles.blob} ${styles.blob4}`}></div>
            <div className={`${styles.blob} ${styles.blob5}`}></div>
            <div className={`${styles.blob} ${styles.blob6}`}></div>
            <div className={`${styles.blob} ${styles.blob7}`}></div>
            <div className={`${styles.blob} ${styles.blob8}`}></div>
            <div className={`${styles.blob} ${styles.blob9}`}></div>

            <div className={styles.content}>
                {!action && <WelcomeScreen onSelectAction={setAction} />}
                {action === "login" && (
                    <LoginForm
                        onBack={() => setAction(null)}
                        onSwitchToSignup={() => setAction("signup")}
                        onSubmit={handleLogin}
                    />
                )}
                {action === "signup" && (
                    <SignupForm
                        onBack={() => setAction(null)}
                        onSwitchToLogin={() => setAction("login")}
                        onSubmit={handleSignup}
                    />
                )}
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