import { useEffect, useState } from 'react';
import type { OnboardingSummary } from '@/types/onboarding';
import { onboardingAPI } from '@/lib/api-service';

interface Props {
  clientId: string;
}

export default function OnboardingChecklist({ clientId }: Props) {
  const backendClientId = /^\d+$/.test(clientId) ? clientId : null;
  const [summary, setSummary] = useState<OnboardingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!backendClientId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await onboardingAPI.getClientSummary(backendClientId);
      setSummary(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to load onboarding checklist');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!backendClientId) {
      setSummary(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    load();
  }, [backendClientId]);

  if (!backendClientId) {
    return (
      <div className="card" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
        <h3>Onboarding Checklist</h3>
        <p style={{ margin: 0 }}>
          This importer was created in the legacy Contacts module. Create or link a CDS onboarding
          client (numeric ID) from the Onboarding tab to enable checklist tracking.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="card">Loading checklist…</div>;
  if (error)
    return (
      <div className="card" style={{ color: '#ef4444' }}>
        {error}
      </div>
    );
  if (!summary) return null;

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3>Onboarding Checklist</h3>
          <p style={{ color: 'var(--text-muted)' }}>{summary.progress}% complete</p>
        </div>
        <button
          className="secondaryButton"
          onClick={() => onboardingAPI.recalculate(summary.clientId).then(load)}
        >
          Recalculate
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {summary.checklist.map((item) => (
          <div
            key={item.key}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: item.completed ? '#ecfdf5' : '#fff',
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{item.label}</p>
              {!item.completed && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Missing
                </p>
              )}
            </div>
            <button
              className="secondaryButton"
              onClick={() => {
                const currentKeys = summary.missingKeys || [];
                const updatedKeys = item.completed
                  ? currentKeys.filter((key) => key !== item.key)
                  : Array.from(new Set([...currentKeys, item.key]));
                onboardingAPI
                  .updateClientSummary(summary.clientId, { missingFields: updatedKeys })
                  .then(load);
              }}
            >
              {item.completed ? 'Mark missing' : 'Mark complete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
