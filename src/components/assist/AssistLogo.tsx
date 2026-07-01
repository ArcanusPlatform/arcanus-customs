'use client';
import React from 'react';

interface AssistLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

export const AssistLogo: React.FC<AssistLogoProps> = ({
  size = 'md',
  animated = true,
  className,
  onClick,
}) => {
  const sizeMap = {
    sm: { size: 32, particle: 2, fontSize: 10 },
    md: { size: 48, particle: 3, fontSize: 14 },
    lg: { size: 64, particle: 4, fontSize: 16 },
    xl: { size: 96, particle: 6, fontSize: 20 },
  };

  const config = sizeMap[size];

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        width: config.size,
        height: config.size,
      }}
      onClick={onClick}
      role="img"
      aria-label="Arcanus Assist Logo"
    >
      <div
        className="suite-logo-circle"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: config.size,
          height: config.size,
          borderRadius: '50%',
          fontWeight: 'bold',
          fontSize: config.fontSize,
          color: '#111',
          background: 'linear-gradient(135deg, var(--primary-purple) 0%, #8b5cf6 100%)',
          boxShadow: animated
            ? '0 0 20px rgba(240, 200, 75, 0.4), 0 0 40px rgba(240, 200, 75, 0.2)'
            : '0 4px 12px rgba(0,0,0,0.15)',
          transition: animated ? 'transform 0.3s ease' : 'none',
          transform: animated ? 'hover:scale(1.1)' : 'scale(1)',
        }}
      >
        <span>MP</span>

        {animated && (
          <div
            className="suite-logo-orbit"
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(240, 200, 75, 0.3)',
              animation: 'suite-orbit 8s linear infinite',
              transform: `scale(${1 + (config.size / 48) * 0.3})`,
            }}
          />
        )}

        {animated && (
          <div
            className="suite-logo-pulse"
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(240, 200, 75, 0.3) 0%, transparent 70%)',
              animation: 'suite-pulse 2s ease-in-out infinite',
              transform: `scale(${1 + (config.size / 48) * 0.5})`,
            }}
          />
        )}
      </div>

      {animated && (
        <>
          <div
            className="suite-logo-particle-1"
            aria-hidden
            style={{
              position: 'absolute',
              width: config.particle,
              height: config.particle,
              borderRadius: '50%',
              background: 'var(--primary-purple)',
              animation: 'suite-orbit-particle-1 6s linear infinite',
              boxShadow: '0 0 6px rgba(240, 200, 75, 0.8)',
            }}
          />
          <div
            className="suite-logo-particle-2"
            aria-hidden
            style={{
              position: 'absolute',
              width: config.particle,
              height: config.particle,
              borderRadius: '50%',
              background: 'var(--primary-purple)',
              animation: 'suite-orbit-particle-2 8s linear infinite',
              boxShadow: '0 0 6px rgba(240, 200, 75, 0.8)',
            }}
          />
          <div
            className="suite-logo-particle-3"
            aria-hidden
            style={{
              position: 'absolute',
              width: config.particle * 0.7,
              height: config.particle * 0.7,
              borderRadius: '50%',
              background: 'var(--primary-purple)',
              animation: 'suite-orbit-particle-3 10s linear infinite',
              boxShadow: '0 0 4px rgba(240, 200, 75, 0.6)',
            }}
          />
        </>
      )}

      <style>{`
        @keyframes suite-orbit { 
          from { transform: rotate(0deg) scale(var(--scale,1)); } 
          to { transform: rotate(360deg) scale(var(--scale,1)); } 
        }
        @keyframes suite-pulse { 
          0%,100% { opacity: 0.3; transform: scale(1.5);} 
          50% { opacity: 0.6; transform: scale(1.8);} 
        }
        @keyframes suite-orbit-particle-1 { 
          from { transform: rotate(0deg) translateX(${config.size * 0.6}px) rotate(0deg); } 
          to { transform: rotate(360deg) translateX(${config.size * 0.6}px) rotate(-360deg); } 
        }
        @keyframes suite-orbit-particle-2 { 
          from { transform: rotate(120deg) translateX(${config.size * 0.7}px) rotate(-120deg); } 
          to { transform: rotate(480deg) translateX(${config.size * 0.7}px) rotate(-480deg); } 
        }
        @keyframes suite-orbit-particle-3 { 
          from { transform: rotate(240deg) translateX(${config.size * 0.5}px) rotate(-240deg); } 
          to { transform: rotate(600deg) translateX(${config.size * 0.5}px) rotate(-600deg); } 
        }
        @media (prefers-reduced-motion: reduce) { 
          * { 
            animation-duration: 0.01ms !important; 
            animation-iteration-count: 1 !important; 
            transition-duration: 0.01ms !important; 
          } 
        }
      `}</style>
    </div>
  );
};

export default AssistLogo;
