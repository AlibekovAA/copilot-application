'use client';
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { AuthForm } from "../components/auth/AuthForm";
import { useAuth } from "../context/AuthContext";
import styles from "./page.module.css";

function AuthPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams.get("action");
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
        const query = next ? `?action=${next}` : "";
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