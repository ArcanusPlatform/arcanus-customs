import { X, Filter } from 'lucide-react';
import type {
  ComplianceFilters,
  ComplianceClaimStatus,
  ScoreRange,
  IssueCountRange,
} from '@/types';
import styles from '@/styles/compliance.module.css';

interface FilterBarProps {
  filters: ComplianceFilters;
  onFilterChange: (filters: ComplianceFilters) => void;
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const statusOptions: ComplianceClaimStatus[] = ['Draft', 'In Progress', 'Ready', 'Submitted'];
  const scoreRangeOptions: ScoreRange[] = ['0-50', '51-75', '76-90', '91-100'];
  const issueCountOptions: IssueCountRange[] = ['0', '1-3', '4+'];

  const toggleStatus = (status: ComplianceClaimStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const toggleScoreRange = (range: ScoreRange) => {
    const newRanges = filters.scoreRanges.includes(range)
      ? filters.scoreRanges.filter((r) => r !== range)
      : [...filters.scoreRanges, range];
    onFilterChange({ ...filters, scoreRanges: newRanges });
  };

  const toggleIssueCount = (count: IssueCountRange) => {
    const newCounts = filters.issueCounts.includes(count)
      ? filters.issueCounts.filter((c) => c !== count)
      : [...filters.issueCounts, count];
    onFilterChange({ ...filters, issueCounts: newCounts });
  };

  const clearAllFilters = () => {
    onFilterChange({ statuses: [], scoreRanges: [], issueCounts: [] });
  };

  const activeFilterCount =
    filters.statuses.length + filters.scoreRanges.length + filters.issueCounts.length;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Filter Controls */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
          }}
        >
          <Filter size={16} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Filters:</span>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Status:
          </span>
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`${styles.button} ${
                filters.statuses.includes(status) ? styles.buttonPrimary : styles.buttonSecondary
              }`}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              aria-pressed={filters.statuses.includes(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Score Range Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Score:
          </span>
          {scoreRangeOptions.map((range) => (
            <button
              key={range}
              onClick={() => toggleScoreRange(range)}
              className={`${styles.button} ${
                filters.scoreRanges.includes(range) ? styles.buttonPrimary : styles.buttonSecondary
              }`}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              aria-pressed={filters.scoreRanges.includes(range)}
            >
              {range}%
            </button>
          ))}
        </div>

        {/* Issue Count Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Issues:
          </span>
          {issueCountOptions.map((count) => (
            <button
              key={count}
              onClick={() => toggleIssueCount(count)}
              className={`${styles.button} ${
                filters.issueCounts.includes(count) ? styles.buttonPrimary : styles.buttonSecondary
              }`}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              aria-pressed={filters.issueCounts.includes(count)}
            >
              {count}
            </button>
          ))}
        </div>

        {/* Clear All Button */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
            aria-label="Clear all filters"
          >
            Clear All ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {filters.statuses.map((status) => (
            <div key={status} className={styles.filterChip}>
              <span>Status: {status}</span>
              <button
                className={styles.filterChipRemove}
                onClick={() => toggleStatus(status)}
                aria-label={`Remove ${status} filter`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {filters.scoreRanges.map((range) => (
            <div key={range} className={styles.filterChip}>
              <span>Score: {range}%</span>
              <button
                className={styles.filterChipRemove}
                onClick={() => toggleScoreRange(range)}
                aria-label={`Remove ${range}% score filter`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {filters.issueCounts.map((count) => (
            <div key={count} className={styles.filterChip}>
              <span>Issues: {count}</span>
              <button
                className={styles.filterChipRemove}
                onClick={() => toggleIssueCount(count)}
                aria-label={`Remove ${count} issues filter`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
