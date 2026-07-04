import React from 'react';

export function Spinner({ size = '2rem', color = 'var(--cp-primary)', className = '' }) {
  return (
    <div
      className={`spinner ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '3px solid rgba(37, 99, 235, 0.1)',
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function Skeleton({ width = '100%', height = '1rem', borderRadius = 'var(--radius-sm)', className = '' }) {
  return (
    <div
      className={`shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--cp-border)',
        background: 'var(--cp-white)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
      }}
    >
      <Skeleton height="8rem" borderRadius="var(--radius-md)" />
      <Skeleton width="40%" height="1.2rem" />
      <Skeleton width="90%" height="0.8rem" />
      <Skeleton width="70%" height="0.8rem" />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <Skeleton width="30%" height="1.8rem" borderRadius="var(--radius-full)" />
        <Skeleton width="30%" height="1.8rem" borderRadius="var(--radius-full)" />
      </div>
    </div>
  );
}

export default function Loader({ fullPage = false }) {
  if (fullPage) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '1rem',
        }}
      >
        <Spinner size="3rem" />
        <p style={{ color: 'var(--cp-subtext)', fontWeight: 500, fontFamily: 'var(--font-display)' }}>
          Loading CarePlus...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <Spinner />
    </div>
  );
}
