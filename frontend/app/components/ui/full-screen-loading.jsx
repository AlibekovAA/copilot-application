'use client';
import { LoadingScreen } from './LoadingScreen';

export function FullScreenLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: '#0f0f0f',
      }}
    >
      <LoadingScreen />
    </div>
  );
}
