'use client';

import { useEffect, useRef, useState } from 'react';
import { AssistFab } from './AssistFab';
import { AssistDrawer } from './AssistDrawer';
import { AssistChat } from './AssistChat';

interface AssistPanelProps {
  inline?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  disabled?: boolean;
}

const API_STATUS = '/api/assist/status';

export default function AssistPanel({
  inline = false,
  position = 'bottom-right',
  disabled = false,
}: AssistPanelProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'ok' | 'warn' | 'error'>('ok');
  const [unreadCount, setUnreadCount] = useState(0);
  const statusCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Check backend status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(API_STATUS, { cache: 'no-store' });
        if (res.ok) {
          setStatus('ok');
        } else {
          setStatus('warn');
        }
      } catch {
        setStatus('error');
      }
    };

    // Check immediately
    checkStatus();

    // Check every 30 seconds
    statusCheckRef.current = setInterval(checkStatus, 30000);

    return () => {
      if (statusCheckRef.current) {
        clearInterval(statusCheckRef.current);
      }
    };
  }, []);

  // Keyboard support: Escape to close drawer
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Reset unread count when drawer opens
  const handleOpenDrawer = () => {
    setOpen(true);
    setUnreadCount(0);
  };

  const handleCloseDrawer = () => {
    setOpen(false);
  };

  return (
    <div className={`suite-assist ${inline ? 'inline' : 'fixed'}`}>
      <AssistFab
        onClick={handleOpenDrawer}
        position={position}
        disabled={disabled || status === 'error'}
        badge={unreadCount > 0 ? unreadCount : undefined}
        status={status}
        inline={inline}
      />

      <AssistDrawer
        open={open}
        onClose={handleCloseDrawer}
        ariaLabel="Arcanus Assist - Chat with AI assistant for duty refund help"
      >
        <AssistChat />
      </AssistDrawer>

      <style>{`
        .suite-assist.fixed {
          position: fixed;
          z-index: 9998;
        }

        .suite-assist.inline {
          position: relative;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
