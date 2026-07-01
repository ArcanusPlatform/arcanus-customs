import { useState } from 'react';
import type { ScoreDistribution } from '@/types';

interface ScoreDistributionChartProps {
  distribution: ScoreDistribution[];
}

export default function ScoreDistributionChart({ distribution }: ScoreDistributionChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  const getBarColor = (range: string) => {
    switch (range) {
      case '0-50':
        return 'var(--compliance-fail)';
      case '51-75':
        return 'var(--compliance-warn)';
      case '76-90':
        return 'var(--compliance-warn)';
      case '91-100':
        return 'var(--compliance-pass)';
      default:
        return 'var(--text-muted)';
    }
  };

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
        Score Distribution
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {distribution.map((item, index) => (
          <div
            key={item.range}
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
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
              <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.range}%</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {item.count} claims ({item.percentage}%)
              </span>
            </div>

            {/* Bar */}
            <div
              style={{
                width: '100%',
                height: '32px',
                background: 'rgba(148, 163, 184, 0.1)',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  height: '100%',
                  background: getBarColor(item.range),
                  transition: 'width 0.5s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '0.75rem',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
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
                  {item.count} claims ({item.percentage}%)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
