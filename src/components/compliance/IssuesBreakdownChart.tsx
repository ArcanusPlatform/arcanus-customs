import { useState } from 'react';
import type { IssueBreakdown } from '@/types';

interface IssuesBreakdownChartProps {
  breakdown: IssueBreakdown[];
  onIssueClick: (issue: string) => void;
}

export default function IssuesBreakdownChart({
  breakdown,
  onIssueClick,
}: IssuesBreakdownChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  return (
    <div style={{ padding: '1rem' }}>
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          color: 'var(--text-dark)',
        }}
      >
        Common Issues
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {breakdown.map((item, index) => (
          <div
            key={item.issue}
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => onIssueClick(item.issue)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onIssueClick(item.issue);
              }
            }}
          >
            {/* Label */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.issue}</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {item.count} ({item.percentage}%)
              </span>
            </div>

            {/* Bar */}
            <div
              style={{
                width: '100%',
                height: '28px',
                background: 'rgba(148, 163, 184, 0.1)',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)';
              }}
            >
              <div
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  height: '100%',
                  background:
                    'linear-gradient(135deg, var(--accent-purple) 0%, var(--primary-purple) 100%)',
                  transition: 'width 0.5s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '0.75rem',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                {item.count > 0 && item.count}
              </div>

              {/* Tooltip */}
              {hoveredIndex === index && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.9)',
                    color: 'white',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                  }}
                >
                  Click to filter by this issue
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
