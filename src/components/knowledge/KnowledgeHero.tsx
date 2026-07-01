import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type KnowledgeHeroProps = {
  title: string;
  description: string;
  tips?: string[];
  rightContent?: ReactNode;
};

export function KnowledgeHero({ title, description, tips, rightContent }: KnowledgeHeroProps) {
  const navigate = useNavigate();

  const defaultTips =
    tips && tips.length > 0 ? (
      <>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Quick Tips</h3>
        <ul
          style={{
            margin: '0.5rem 0 0',
            paddingLeft: '1.1rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
          }}
        >
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </>
    ) : null;

  const extraContent = rightContent ?? defaultTips;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(15,23,42,0.08))',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '18px',
        padding: '1.75rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: '280px' }}>
        <button
          onClick={() => navigate('/knowledge')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.9rem',
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(15,23,42,0.1)',
            borderRadius: '999px',
            cursor: 'pointer',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          <ArrowLeft size={14} />
          Back to Knowledge Centre
        </button>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>{title}</h1>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', maxWidth: 520 }}>
          {description}
        </p>
      </div>
      {extraContent && (
        <div
          style={{
            minWidth: '220px',
            background: 'var(--card-bg)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            border: '1px solid rgba(15,23,42,0.06)',
            boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
          }}
        >
          {extraContent}
        </div>
      )}
    </div>
  );
}
