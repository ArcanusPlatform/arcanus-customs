import { useEffect, useState } from 'react';
import { getScoreColor } from '@/lib/compliance-utils';
import styles from '@/styles/compliance.module.css';

interface OverallScoreCardProps {
  score: number;
  lastUpdated: Date;
}

export default function OverallScoreCard({ score, lastUpdated }: OverallScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  // Calculate circle properties
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div
      className={`${styles.complianceCard} ${styles.fadeIn}`}
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '280px',
      }}
    >
      {/* Circular Progress Ring */}
      <div style={{ position: 'relative', width: '200px', height: '200px', marginBottom: '1rem' }}>
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className={styles.progressRing}
          aria-hidden="true"
        >
          {/* Background Circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className={`${styles.progressRingCircle} ${styles.progressRingBackground}`}
          />
          {/* Progress Circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className={`${styles.progressRingCircle} ${styles.progressRingProgress}`}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1.5s ease-out',
            }}
          />
        </svg>

        {/* Score Text in Center */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '3rem',
              fontWeight: 700,
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              color: color,
              lineHeight: 1,
            }}
          >
            {Math.round(animatedScore)}%
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Score
          </div>
        </div>
      </div>

      {/* Title and Last Updated */}
      <div style={{ textAlign: 'center' }}>
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-dark)',
            marginBottom: '0.25rem',
          }}
        >
          Overall Compliance Score
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Last updated: {lastUpdated.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
