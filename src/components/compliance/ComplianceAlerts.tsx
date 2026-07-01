import { AlertTriangle, X } from 'lucide-react';
import type { ComplianceAlert } from '@/types';
import styles from '@/styles/compliance.module.css';

interface ComplianceAlertsProps {
  alerts: ComplianceAlert[];
  onAlertClick: (alert: ComplianceAlert) => void;
  onDismiss: (alertId: string) => void;
}

export default function ComplianceAlerts({
  alerts,
  onAlertClick,
  onDismiss,
}: ComplianceAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`${styles.alertBanner} ${
            alert.severity === 'critical' ? styles.alertBannerCritical : styles.alertBannerWarning
          }`}
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={24} aria-hidden="true" />

          <div
            className={styles.alertBannerContent}
            onClick={() => onAlertClick(alert)}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAlertClick(alert);
              }
            }}
          >
            <div className={styles.alertBannerTitle}>{alert.title}</div>
            <div className={styles.alertBannerDescription}>{alert.description}</div>
          </div>

          <button
            className={styles.alertBannerClose}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(alert.id);
            }}
            aria-label={`Dismiss alert: ${alert.title}`}
          >
            <X size={20} />
          </button>
        </div>
      ))}
    </div>
  );
}
