import {
  FileCheck,
  FileWarning,
  Shield,
  UserCheck,
  Banknote,
  Calculator,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import type { ComplianceDetails, CheckStatus } from '@/types';
import styles from '@/styles/compliance.module.css';

interface ClaimDetailPanelProps {
  details: ComplianceDetails;
  claimRef: string;
  onActionClick: (action: string, claimRef: string) => void;
}

export default function ClaimDetailPanel({
  details,
  claimRef,
  onActionClick,
}: ClaimDetailPanelProps) {
  return (
    <div
      style={{
        padding: '1.5rem',
        background: 'rgba(248, 250, 252, 0.5)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Mandatory Documents */}
        <Section title="Mandatory Documents" icon={<FileCheck size={18} />}>
          {details.mandatoryDocuments.map((doc, idx) => (
            <CheckItem
              key={idx}
              label={doc.name}
              status={doc.status}
              issues={doc.issues}
              suggestions={doc.suggestions}
            />
          ))}
        </Section>

        {/* Supporting Documents */}
        <Section title="Supporting Evidence" icon={<FileWarning size={18} />}>
          {details.supportingDocuments.map((doc, idx) => (
            <CheckItem
              key={idx}
              label={doc.name}
              status={doc.status}
              issues={doc.issues}
              suggestions={doc.suggestions}
            />
          ))}
        </Section>

        {/* Tariff Evidence */}
        <Section title="Tariff Evidence" icon={<Shield size={18} />}>
          <CheckItem
            label={details.tariffEvidence.description}
            status={details.tariffEvidence.status}
            issues={details.tariffEvidence.issues}
            suggestions={details.tariffEvidence.suggestions}
          />
        </Section>

        {/* Origin Evidence */}
        <Section title="Origin Evidence" icon={<Shield size={18} />}>
          <CheckItem
            label={details.originEvidence.description}
            status={details.originEvidence.status}
            issues={details.originEvidence.issues}
            suggestions={details.originEvidence.suggestions}
          />
        </Section>

        {/* Declarant Match */}
        <Section title="Declarant Match" icon={<UserCheck size={18} />}>
          <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ color: 'var(--text-muted)' }}>
              Expected: {details.declarantMatch.expected}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              Actual: {details.declarantMatch.actual}
            </div>
          </div>
          <CheckItem
            label="Declarant identity verification"
            status={details.declarantMatch.status}
            issues={details.declarantMatch.issues}
            suggestions={details.declarantMatch.suggestions}
          />
        </Section>

        {/* Bank Match */}
        <Section title="Bank Match" icon={<Banknote size={18} />}>
          <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ color: 'var(--text-muted)' }}>Expected: {details.bankMatch.expected}</div>
            <div style={{ color: 'var(--text-muted)' }}>Actual: {details.bankMatch.actual}</div>
          </div>
          <CheckItem
            label="Bank account ownership verification"
            status={details.bankMatch.status}
            issues={details.bankMatch.issues}
            suggestions={details.bankMatch.suggestions}
          />
        </Section>

        {/* Financial Accuracy */}
        <Section title="Financial Accuracy" icon={<Calculator size={18} />}>
          <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ color: 'var(--text-muted)' }}>
              Calculated: £{details.financialAccuracy.calculatedAmount.toFixed(2)}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              Declared: £{details.financialAccuracy.declaredAmount.toFixed(2)}
            </div>
            {details.financialAccuracy.variance > 0 && (
              <div style={{ color: 'var(--compliance-fail)', fontWeight: 600 }}>
                Variance: £{details.financialAccuracy.variance.toFixed(2)}
              </div>
            )}
          </div>
          <CheckItem
            label="Overpayment calculation"
            status={details.financialAccuracy.status}
            issues={details.financialAccuracy.issues}
            suggestions={details.financialAccuracy.suggestions}
          />
        </Section>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => onActionClick('fix', claimRef)}
        >
          <ExternalLink size={16} />
          Fix Issues
        </button>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => onActionClick('view', claimRef)}
        >
          View Details
        </button>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => onActionClick('assist', claimRef)}
        >
          <HelpCircle size={16} />
          Ask M Assist
        </button>
      </div>
    </div>
  );
}

// Helper Components

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          color: 'var(--accent-purple)',
        }}
      >
        {icon}
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dark)' }}>
          {title}
        </h4>
      </div>
      <div
        style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.75rem',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CheckItem({
  label,
  status,
  issues,
  suggestions,
}: {
  label: string;
  status: CheckStatus;
  issues: string[];
  suggestions: string[];
}) {
  const getStatusBadge = (status: CheckStatus) => {
    const config = {
      pass: { className: styles.statusPass, label: 'Pass' },
      warn: { className: styles.statusWarn, label: 'Warning' },
      fail: { className: styles.statusFail, label: 'Failed' },
      missing: { className: styles.statusMissing, label: 'Missing' },
    };
    const { className, label } = config[status];
    return <span className={`${styles.statusBadge} ${className}`}>{label}</span>;
  };

  return (
    <div
      style={{
        marginBottom: '0.75rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>{label}</span>
        {getStatusBadge(status)}
      </div>
      {issues.length > 0 && (
        <div
          style={{ fontSize: '0.75rem', color: 'var(--compliance-fail)', marginBottom: '0.25rem' }}
        >
          {issues.map((issue, idx) => (
            <div key={idx}>• {issue}</div>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {suggestions.map((suggestion, idx) => (
            <div key={idx}>💡 {suggestion}</div>
          ))}
        </div>
      )}
    </div>
  );
}
