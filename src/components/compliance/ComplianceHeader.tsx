import { FileDown, FileSpreadsheet, RefreshCw } from 'lucide-react';
import styles from '@/styles/compliance.module.css';

interface ComplianceHeaderProps {
  onExportPDF: () => void;
  onExportCSV: () => void;
  onRefresh: () => void;
  isExporting: boolean;
}

export default function ComplianceHeader({
  onExportPDF,
  onExportCSV,
  onRefresh,
  isExporting,
}: ComplianceHeaderProps) {
  return (
    <div
      className={`${styles.complianceCard} ${styles.fadeIn}`}
      style={{ padding: '1.5rem', marginBottom: '1.5rem' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Title Section */}
        <div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-dark)',
              marginBottom: '0.25rem',
            }}
          >
            Compliance Tracking
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Monitor account-level compliance and claim-level readiness for HMRC submission
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onRefresh}
            disabled={isExporting}
            aria-label="Refresh compliance data"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onExportCSV}
            disabled={isExporting}
            aria-label="Export compliance data as CSV"
          >
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>

          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onExportPDF}
            disabled={isExporting}
            aria-label="Export compliance report as PDF"
          >
            <FileDown size={16} />
            <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
