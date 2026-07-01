import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { ClaimCompliance } from '@/types';
import { getScoreColor } from '@/lib/compliance-utils';
import { getClaimDetails } from '@/lib/compliance-api';
import ClaimDetailPanel from './ClaimDetailPanel';
import styles from '@/styles/compliance.module.css';

interface ClaimRowProps {
  claim: ClaimCompliance;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onActionClick: (action: string, claimRef: string) => void;
}

export default function ClaimRow({
  claim,
  isExpanded,
  onToggleExpand,
  onActionClick,
}: ClaimRowProps) {
  const [details, setDetails] = useState(claim.details);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Load details when expanded
  useEffect(() => {
    if (isExpanded && !details) {
      setIsLoadingDetails(true);
      getClaimDetails(claim.claimRef)
        .then((data) => {
          setDetails(data);
          setIsLoadingDetails(false);
        })
        .catch(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [isExpanded, details, claim.claimRef]);

  const scoreColor = getScoreColor(claim.score);

  // Status badge styling
  const statusColors: Record<string, string> = {
    Draft: 'rgba(148, 163, 184, 0.1)',
    'In Progress': 'rgba(245, 158, 11, 0.1)',
    Ready: 'rgba(34, 197, 94, 0.1)',
    Submitted: 'rgba(59, 130, 246, 0.1)',
  };

  return (
    <>
      <tr className={styles.complianceTableRow}>
        <td className={styles.complianceTableCell}>
          <span style={{ fontWeight: 600, fontFamily: "'SF Mono', 'JetBrains Mono', monospace" }}>
            {claim.claimRef}
          </span>
        </td>
        <td className={styles.complianceTableCell}>
          <span
            style={{ fontFamily: "'SF Mono', 'JetBrains Mono', monospace", fontSize: '0.75rem' }}
          >
            {claim.mrn}
          </span>
        </td>
        <td className={styles.complianceTableCell}>
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: statusColors[claim.status] || 'rgba(148, 163, 184, 0.1)',
            }}
          >
            {claim.status}
          </span>
        </td>
        <td className={styles.complianceTableCell}>
          <span
            style={{
              fontWeight: 700,
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              color: scoreColor,
            }}
          >
            {Math.round(claim.score)}%
          </span>
        </td>
        <td className={styles.complianceTableCell}>
          {claim.issueCount > 0 ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: 'var(--compliance-fail)',
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={14} />
              {claim.issueCount}
            </span>
          ) : (
            <span style={{ color: 'var(--compliance-pass)', fontWeight: 600 }}>0</span>
          )}
        </td>
        <td className={styles.complianceTableCell}>
          <button
            onClick={onToggleExpand}
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Hide details' : 'View details'}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                Hide
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                View
              </>
            )}
          </button>
        </td>
      </tr>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <div
              className={styles.claimDetailPanel}
              style={{
                maxHeight: isExpanded ? '2000px' : '0',
                opacity: isExpanded ? 1 : 0,
                transition: 'max-height 300ms ease, opacity 200ms ease',
              }}
            >
              {isLoadingDetails ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading compliance details...
                </div>
              ) : details ? (
                <ClaimDetailPanel
                  details={details}
                  claimRef={claim.claimRef}
                  onActionClick={onActionClick}
                />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Failed to load details. Please try again.
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
