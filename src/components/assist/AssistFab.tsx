'use client';

import React, { useState, useRef } from 'react';
import { DEFAULT_LOGO } from '@/config/branding';
import styles from './AssistFab.module.css';

interface AssistFabProps {
  onClick?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  disabled?: boolean;
  badge?: number;
  status?: 'ok' | 'warn' | 'error';
  inline?: boolean;
  sizePx?: number;
}

export const AssistFab: React.FC<AssistFabProps> = ({
  onClick,
  position = 'bottom-left',
  disabled = false,
  badge,
  status = 'ok',
  inline = false,
  sizePx,
}) => {
  const [hover, setHover] = useState(false);
  const ringRef = useRef<HTMLDivElement | null>(null);

  const resolvedSize = typeof sizePx === 'number' ? sizePx : inline ? 36 : 54;
  const ringSize = inline ? resolvedSize - 8 : resolvedSize - 8;

  const positionClass = inline ? styles.container : `${styles.container} ${styles[`container`]}`;
  
  const containerProps: { [key: string]: string | number } = {
    '--fab-size': `${resolvedSize}px`,
    '--ring-size': `${ringSize}px`,
    '--logo-size': `${inline ? resolvedSize - 12 : 30}px`,
  } as React.CSSProperties;

  return (
    <div 
      className={styles.container}
      data-position={position}
      data-inline={inline}
      style={containerProps}
    >
      <button
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={disabled}
        aria-label="Open Arcanus Assist"
        aria-expanded={false}
        className={`suite-fab ${styles.button}`}
        style={{
          width: `${resolvedSize}px`,
          height: `${resolvedSize}px`,
        }}
      >
        <div className={styles.center}>
          <div
            aria-hidden
            className={styles.background}
            style={{
              width: `${inline ? resolvedSize - 10 : 34}px`,
              height: `${inline ? resolvedSize - 10 : 34}px`,
            }}
          />
          <div
            ref={ringRef}
            aria-hidden
            className={`suite-fab-ring suite-fab-ring-${status} ${styles.ring}`}
            data-status={status}
            style={{
              width: `${ringSize}px`,
              height: `${ringSize}px`,
            }}
          >
            <span
              className={`suite-fab-status-dot ${styles.statusDot}`}
              data-status={status}
            />
          </div>

          <img
            src={DEFAULT_LOGO}
            alt="Arcanus Assist Lion"
            className={styles.logo}
            style={{
              width: `${inline ? resolvedSize - 12 : 30}px`,
              height: `${inline ? resolvedSize - 12 : 30}px`,
            }}
          />
        </div>

        {badge && badge > 0 && !inline && (
          <div
            className={`suite-fab-badge ${styles.badge}`}
          >
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </button>
    </div>
  );
};

export default AssistFab;
