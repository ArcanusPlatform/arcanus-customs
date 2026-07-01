import { useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCheck } from 'lucide-react';
import type { ComplianceNotification } from '@/types';
import styles from '@/styles/compliance.module.css';

interface ComplianceNotificationCenterProps {
  notifications: ComplianceNotification[];
  onNotificationClick: (notification: ComplianceNotification) => void;
  onMarkAllRead: () => void;
}

export default function ComplianceNotificationCenter({
  notifications,
  onNotificationClick,
  onMarkAllRead,
}: ComplianceNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle size={16} style={{ color: 'var(--compliance-fail)' }} />;
      case 'warning':
        return <AlertTriangle size={16} style={{ color: 'var(--compliance-warn)' }} />;
      default:
        return <Info size={16} style={{ color: 'var(--accent-purple)' }} />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div style={{ position: 'fixed', top: '5rem', right: '2rem', zIndex: 1000 }}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.button} ${styles.buttonPrimary}`}
        style={{
          position: 'relative',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={`Notifications. ${unreadCount} unread.`}
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--compliance-fail)',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`${styles.complianceCard} ${styles.slideDown}`}
          style={{
            position: 'absolute',
            top: '60px',
            right: 0,
            width: '360px',
            maxHeight: '500px',
            overflowY: 'auto',
            padding: 0,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: 'var(--glass-bg)',
              zIndex: 1,
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              Notifications ({unreadCount} unread)
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className={`${styles.button} ${styles.buttonSecondary}`}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No notifications</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    onNotificationClick(notification);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: notification.isRead ? 'transparent' : 'rgba(124, 58, 237, 0.05)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notification.isRead
                      ? 'transparent'
                      : 'rgba(124, 58, 237, 0.05)';
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNotificationClick(notification);
                      setIsOpen(false);
                    }
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: notification.isRead ? 400 : 600,
                          color: 'var(--text-dark)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {notification.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {notification.description}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
