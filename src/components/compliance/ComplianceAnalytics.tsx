import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ScoreDistribution, IssueBreakdown } from '@/types';
import ScoreDistributionChart from './ScoreDistributionChart';
import IssuesBreakdownChart from './IssuesBreakdownChart';
import styles from '@/styles/compliance.module.css';

interface ComplianceAnalyticsProps {
  scoreDistribution: ScoreDistribution[];
  issuesBreakdown: IssueBreakdown[];
  onIssueClick: (issue: string) => void;
}

export default function ComplianceAnalytics({
  scoreDistribution,
  issuesBreakdown,
  onIssueClick,
}: ComplianceAnalyticsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={`${styles.complianceCard} ${styles.fadeIn}`}
      style={{ padding: '1.5rem', marginBottom: '2rem' }}
    >
      {/* Header with Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? '1.5rem' : 0,
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-dark)' }}>
          Compliance Analytics
        </h2>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
          aria-label={isExpanded ? 'Collapse analytics' : 'Expand analytics'}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              Expand
            </>
          )}
        </button>
      </div>

      {/* Charts Grid */}
      {isExpanded && (
        <div className={styles.analyticsGrid}>
          <div
            className={styles.complianceCard}
            style={{ padding: 0, background: 'rgba(255, 255, 255, 0.5)' }}
          >
            <ScoreDistributionChart distribution={scoreDistribution} />
          </div>

          <div
            className={styles.complianceCard}
            style={{ padding: 0, background: 'rgba(255, 255, 255, 0.5)' }}
          >
            <IssuesBreakdownChart breakdown={issuesBreakdown} onIssueClick={onIssueClick} />
          </div>
        </div>
      )}
    </div>
  );
}
