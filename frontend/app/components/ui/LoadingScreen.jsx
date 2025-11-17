'use client';
import { BackgroundBlobs } from './BackgroundBlobs';
import { Logo } from '../auth/Logo';
import styles from './LoadingScreen.module.css';

export function LoadingScreen() {
  return (
    <div 
      className={styles.loadingScreen}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        backgroundColor: '#0f0f0f',
        margin: 0,
        padding: 0,
        zIndex: 9999,
      }}
    >
      <BackgroundBlobs />
      <div 
        className={styles.loadingContent}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2.5rem',
          padding: '2rem',
        }}
      >
        <Logo className={styles.loadingLogo} />
        <div className={styles.spinnerWrapper}>
          <div className={styles.spinner}></div>
        </div>
        <p 
          className={styles.loadingText}
          style={{
            fontSize: '1.375rem',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #9933ff 0%, #ef3124 50%, #ff6b35 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            backgroundSize: '200% 200%',
          }}
        >
          Загрузка...
        </p>
      </div>
    </div>
  );
}

