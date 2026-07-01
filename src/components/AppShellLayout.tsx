import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/contexts/SettingsContext';
import styles from './AppShellLayout.module.css';

const navItems = [
  // Section 1: Core Workflow
  { label: 'Dashboard', icon: '📊', path: '/dashboard' },
  { label: 'Clients', icon: '🏢', path: '/clients', agentOnly: true },
  { label: 'Onboarding', icon: '🧭', path: '/onboarding', agentOnly: true },
  { label: 'Services', icon: '🧩', path: '/services' },
  { label: 'Compliance', icon: '🛡️', path: '/compliance' },
  { label: 'divider', icon: '', path: '' },
  
  // Section 2: Data & Analysis
  { label: 'Companies House', icon: '🏛️', path: '/companies-house', agentOnly: true },
  { label: 'Contacts', icon: '👥', path: '/contacts', agentOnly: true },
  { label: 'Documents', icon: '🗂️', path: '/documents', agentOnly: true },
  { label: 'divider', icon: '', path: '' },
  
  // Section 3: Resources & Settings
  { label: 'Reports', icon: '📑', path: '/reports', agentOnly: true },
  { label: 'Accounts Production', icon: '📒', path: '/accounts-production', agentOnly: true },
  { label: 'Letter Templates', icon: '📄', path: '/documents/templates', agentOnly: true },
  { label: 'Knowledge Centre', icon: '📘', path: '/knowledge' },
  { label: 'Settings', icon: '⚙️', path: '/settings' },
];

export const ShellLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Full-width topbar with centered title */}
      <header className="header">
        <div className={styles.headerTitle}>ARCANUS PRACTICE</div>
        <div className={styles.headerActions}>
          <button
            className={styles.headerButton}
            onClick={() => navigate('/services')}
          >
            Add Service
          </button>
          <button
            className={styles.headerButton}
            onClick={() => navigate('/reports')}
          >
            Reports
          </button>
          <span className={styles.userSpan}>{user?.username || 'User'}</span>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar below topbar - no branding */}
      <aside className="sidebar">
        <nav className="suite-navlist">
          {navItems.map((item, index) => {
            // Render divider
            if (item.label === 'divider') {
              return (
                <div
                  key={`divider-${index}`}
                  className={styles.navDivider}
                />
              );
            }

            const userType =
              settings.userType === 'self'
                ? 'SELF'
                : settings.userType === 'agent'
                  ? 'AGENT'
                  : settings.userType;
            const isDisabled = item.agentOnly && userType === 'SELF';
            const isHovered = hoveredItem === item.label;

            return (
              <div
                key={item.label}
                className={styles.navItemWrapper}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <button
                  className={`suite-nav-item ${styles.navButton} ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => !isDisabled && navigate(item.path)}
                  disabled={isDisabled}
                >
                  <span className="suite-nav-icon">{item.icon}</span>
                  <span className="suite-nav-label">{item.label}</span>
                </button>

                {/* Tooltip for disabled items */}
                {isDisabled && isHovered && (
                  <div className={styles.tooltip}>
                    This section is only available for Agent users
                    <div className={styles.tooltipArrow} />
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="main">{children}</main>
    </div>
  );
};
