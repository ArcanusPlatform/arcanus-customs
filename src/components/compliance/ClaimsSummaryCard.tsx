import styles from '@/styles/compliance.module.css';

interface ClaimsSummaryCardProps {
  count: number;
  label: string;
  type: 'ready' | 'needsAttention' | 'critical';
  onClick: () => void;
}

export default function ClaimsSummaryCard({ count, label, type, onClick }: ClaimsSummaryCardProps) {
  const typeConfig = {
    ready: {
      color: 'var(--compliance-pass)',
      bgColor: 'var(--compliance-pass-bg)',
    },
    needsAttention: {
      color: 'var(--compliance-warn)',
      bgColor: 'var(--compliance-warn-bg)',
    },
    critical: {
      color: 'var(--compliance-fail)',
      bgColor: 'var(--compliance-fail-bg)',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`${styles.complianceCard} ${styles.complianceCardClickable} ${styles.fadeIn}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${count} claims ${label}. Click to filter.`}
      style={{
        padding: '1.5rem',
        background: config.bgColor,
        borderColor: config.color,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {/* Count */}
      <div
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
          color: config.color,
          lineHeight: 1,
        }}
      >
        {count}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-dark)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
    </div>
  );
}
