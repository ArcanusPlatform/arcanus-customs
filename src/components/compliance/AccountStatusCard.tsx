import type { ComplianceStatus } from '@/types';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import styles from '@/styles/compliance.module.css';

interface AccountStatusCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: ComplianceStatus;
  issueCount: number;
  onClick: () => void;
}

export default function AccountStatusCard({
  icon,
  title,
  description,
  status,
  issueCount,
  onClick,
}: AccountStatusCardProps) {
  const statusConfig = {
    pass: {
      icon: <CheckCircle size={20} />,
      label: 'Verified',
      className: styles.statusPass,
    },
    warn: {
      icon: <AlertTriangle size={20} />,
      label: 'Warning',
      className: styles.statusWarn,
    },
    fail: {
      icon: <XCircle size={20} />,
      label: 'Failed',
      className: styles.statusFail,
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`${styles.complianceCard} ${styles.complianceCardClickable} ${styles.fadeIn} ${
        status === 'fail' ? styles.pulse : ''
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${title}: ${config.label}. ${issueCount} issues. Click to view details.`}
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Icon */}
      <div
        style={{
          color: 'var(--accent-purple)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>{icon}</div>
        <span className={`${styles.statusBadge} ${config.className}`}>
          {config.icon}
          {config.label}
        </span>
      </div>

      {/* Title and Description */}
      <div>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-dark)',
            marginBottom: '0.25rem',
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {description}
        </p>
      </div>

      {/* Issue Count */}
      {issueCount > 0 && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--compliance-fail)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <AlertTriangle size={14} />
          {issueCount} {issueCount === 1 ? 'issue' : 'issues'} require attention
        </div>
      )}
    </div>
  );
}
