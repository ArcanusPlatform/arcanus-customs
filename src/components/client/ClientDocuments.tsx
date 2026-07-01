import { useEffect, useState } from 'react';
import type { ClientDocument } from '@/types/onboarding';
import { onboardingAPI } from '@/lib/api-service';
import DocumentUploader from '@/components/documents/DocumentUploader';

interface Props {
  clientId: string;
}

export default function ClientDocuments({ clientId }: Props) {
  const backendClientId = /^\d+$/.test(clientId) ? clientId : null;
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const load = async () => {
    if (!backendClientId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await onboardingAPI.listDocuments(backendClientId);
      setDocuments(res.documents || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!backendClientId) {
      setDocuments([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    load();
  }, [backendClientId]);

  if (!backendClientId) {
    return (
      <div className="card" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
        <h3>Client Documents</h3>
        <p style={{ margin: 0 }}>
          Documents sync only for onboarding clients stored in the CDS database.
        </p>
        <p style={{ margin: '0.75rem 0 0' }}>
          Use the Onboarding workspace to create a numeric client record, then link this importer to
          enable uploads.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          alignItems: 'center',
        }}
      >
        <div>
          <h3>Client Documents</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Drag & drop files, categorize, and track versions
          </p>
        </div>
        <select
          className="authInput"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          <option value="Identity">Identity</option>
          <option value="HMRC">HMRC</option>
          <option value="Finance">Finance</option>
          <option value="General">General</option>
          <option value="Evidence">Evidence</option>
        </select>
      </div>
      <DocumentUploader clientId={backendClientId} onComplete={load} />
      {isLoading ? (
        <p>Loading documents…</p>
      ) : error ? (
        <p style={{ color: '#ef4444' }}>{error}</p>
      ) : documents.filter((doc) => categoryFilter === 'all' || doc.category === categoryFilter)
          .length === 0 ? (
        <p>No documents yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {documents
            .filter((doc) => categoryFilter === 'all' || doc.category === categoryFilter)
            .map((doc) => (
              <div
                key={doc.document_id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{doc.document_type}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Uploaded {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  className="dangerButton"
                  onClick={() => onboardingAPI.deleteDocument(doc.document_id).then(load)}
                >
                  Delete
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
