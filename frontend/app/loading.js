'use client';
import { LoadingScreen } from './components/ui/LoadingScreen';

export default function Loading() {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0f0f0f',
        margin: 0,
        padding: 0,
      }}
    >
      <LoadingScreen />
    </div>
  );
}

