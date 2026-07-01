'use client';

import React, { useEffect, useRef } from 'react';
import { DEFAULT_LOGO } from '@/config/branding';
import styles from './AssistDrawer.module.css';

interface AssistDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}

export const AssistDrawer: React.FC<AssistDrawerProps> = ({
  open,
  onClose,
  children,
  ariaLabel = 'Arcanus Assist Drawer',
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) {
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    } else {
      el.style.transform = 'translateY(16px)';
      el.style.opacity = '0';
    }
  }, [open]);

  return (
    <>
      <div
        className={styles.overlay}
        onMouseDown={handleOverlayClick}
        aria-hidden={!open}
        data-closed={!open}
      />

      <div
        role="dialog"
        aria-label={ariaLabel}
        aria-modal="true"
        ref={panelRef}
        className={`suite-drawer ${styles.panel}`}
        data-closed={!open}
      >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <img
              src={DEFAULT_LOGO}
              alt="Arcanus Assist Lion"
              className={styles.drawerLogo}
            />
            <span
              className={`suite-brand-text ${styles.brandText}`}
            >
              Arcanus Assist
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Arcanus Assist"
            className={`suite-drawer-close ${styles.closeButton}`}
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>{children}</div>
      </div>
    </>
  );
};

export default AssistDrawer;
