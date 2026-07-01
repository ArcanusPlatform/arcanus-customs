import { useState, useEffect } from 'react';
import type { ClaimCompliance, ComplianceFilters, SortConfig, SortColumn } from '@/types';
import { filterClaims, sortClaims } from '@/lib/compliance-utils';
import FilterBar from './FilterBar';
import SortableTableHeader from './SortableTableHeader';
import ClaimRow from './ClaimRow';
import styles from '@/styles/compliance.module.css';

interface ClaimsComplianceTableProps {
  claims: ClaimCompliance[];
  onActionClick: (action: string, claimRef: string) => void;
}

export default function ClaimsComplianceTable({
  claims,
  onActionClick,
}: ClaimsComplianceTableProps) {
  const [filters, setFilters] = useState<ComplianceFilters>({
    statuses: [],
    scoreRanges: [],
    issueCounts: [],
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'claimRef',
    direction: 'asc',
  });
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [filteredAndSortedClaims, setFilteredAndSortedClaims] = useState<ClaimCompliance[]>(claims);

  // Apply filters and sorting
  useEffect(() => {
    let result = filterClaims(claims, filters);
    result = sortClaims(result, sortConfig);
    setFilteredAndSortedClaims(result);
  }, [claims, filters, sortConfig]);

  const handleSortChange = (column: SortColumn) => {
    setSortConfig((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleToggleExpand = (claimRef: string) => {
    setExpandedClaimId((prev) => (prev === claimRef ? null : claimRef));
  };

  return (
    <div className={`${styles.complianceCard} ${styles.fadeIn}`} style={{ padding: '1.5rem' }}>
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          color: 'var(--text-dark)',
        }}
      >
        Claims Compliance Overview
      </h2>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Table */}
      {filteredAndSortedClaims.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            No claims match the selected filters
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Try adjusting your filters or clearing them to see all claims
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.complianceTable}>
            <SortableTableHeader sortConfig={sortConfig} onSortChange={handleSortChange} />
            <tbody>
              {filteredAndSortedClaims.map((claim) => (
                <ClaimRow
                  key={claim.claimRef}
                  claim={claim}
                  isExpanded={expandedClaimId === claim.claimRef}
                  onToggleExpand={() => handleToggleExpand(claim.claimRef)}
                  onActionClick={onActionClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results Count */}
      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        Showing {filteredAndSortedClaims.length} of {claims.length} claims
      </div>
    </div>
  );
}
