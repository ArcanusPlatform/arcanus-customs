import { ArrowUp, ArrowDown } from 'lucide-react';
import type { SortConfig, SortColumn } from '@/types';
import styles from '@/styles/compliance.module.css';

interface SortableTableHeaderProps {
  sortConfig: SortConfig;
  onSortChange: (column: SortColumn) => void;
}

export default function SortableTableHeader({
  sortConfig,
  onSortChange,
}: SortableTableHeaderProps) {
  const columns: { key: SortColumn; label: string }[] = [
    { key: 'claimRef', label: 'Claim Ref' },
    { key: 'mrn', label: 'MRN' },
    { key: 'status', label: 'Status' },
    { key: 'score', label: 'Score' },
    { key: 'issues', label: 'Issues' },
  ];

  const handleSort = (column: SortColumn) => {
    onSortChange(column);
  };

  return (
    <thead className={styles.complianceTableHeader}>
      <tr>
        {columns.map((column) => {
          const isActive = sortConfig.column === column.key;
          return (
            <th
              key={column.key}
              className={`${styles.complianceTableHeaderCell} ${
                isActive ? styles.complianceTableHeaderCellActive : ''
              }`}
              onClick={() => handleSort(column.key)}
              role="columnheader"
              aria-sort={
                isActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'
              }
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSort(column.key);
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{column.label}</span>
                {isActive && (
                  <span aria-hidden="true">
                    {sortConfig.direction === 'asc' ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </th>
          );
        })}
        <th className={styles.complianceTableHeaderCell}>Actions</th>
      </tr>
    </thead>
  );
}
