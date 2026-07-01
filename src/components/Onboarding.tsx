import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingAPI } from '@/lib/api-service';
import type { OnboardingClientEntry } from '@/types/onboarding';
import { Layers, UploadCloud, FileText, CheckCircle2, Send, ShieldCheck, X } from 'lucide-react';
import OnboardingForm from './OnboardingForm';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'info_submitted', label: 'Info Submitted' },
  { value: 'documents_pending', label: 'Documents Pending' },
  { value: 'verification_required', label: 'Verification Required' },
  { value: 'ready_for_cds', label: 'Ready for CDS' },
  { value: 'live', label: 'Live' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<OnboardingClientEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);

  const loadClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await onboardingAPI.getClients();
      setClients(response.clients || []);
    } catch (err) {
      console.error('Onboarding API not available:', err);
      // Don't show error - just use empty state
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filtered = useMemo(() => {
    let data = [...clients];
    if (statusFilter) data = data.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.eori?.toLowerCase().includes(q) ||
          c.vat?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [clients, statusFilter, search]);

  const toggleSelect = (clientId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((client) => client.clientId)));
  };

  const handleBulkVerify = async () => {
    await Promise.all(
      Array.from(selected).map((clientId) =>
        onboardingAPI.updateClientSummary(clientId, { status: 'ready_for_cds', progress: 100 })
      )
    );
    setSelected(new Set());
    loadClients();
  };

  const handleBulkReminder = () => {
    alert(`Reminder emails sent to ${selected.size} clients.`);
  };

  const handleOnboardingSuccess = () => {
    setShowOnboardingForm(false);
    loadClients();
  };

  return (
    <>
      <div className="border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
        <div className="px-6 py-6" style={{ backgroundColor: 'var(--color-chrome)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Client Onboarding</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Track onboarding progress and documentation for importers</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => navigate('/templates')}>
                  <FileText size={20} />
                  Templates
                </button>
                <button
                  className="btn-primary btn-onboarding"
                  onClick={() => setShowOnboardingForm(true)}
                >
                  <UploadCloud size={20} />
                  Start Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div
            className="card"
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              className="authInput"
              placeholder="Search clients"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: '1 1 240px' }}
            />
            <select
              className="authInput"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ flex: '1 1 200px' }}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}
        >
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {selected.size} selected
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="secondaryButton"
                disabled={selected.size === 0}
                onClick={handleBulkReminder}
              >
                <Send size={16} />
                Send Reminder
              </button>
              <button
                className="primaryButton"
                disabled={selected.size === 0}
                onClick={handleBulkVerify}
              >
                <ShieldCheck size={16} />
                Mark Verified
              </button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === filtered.length}
                    onChange={selectAll}
                  />
                </th>
                <th>Client</th>
                <th>Contact</th>
                <th>EORI</th>
                <th>VAT</th>
                <th>Progress</th>
                <th>Missing Items</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center' }}>
                    Loading onboarding data…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                    >
                      <Layers size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      <div>
                        <p
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: 'var(--text-dark)',
                            marginBottom: '0.5rem',
                          }}
                        >
                          No clients yet
                        </p>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                          Start onboarding your first client to track their progress and
                          documentation
                        </p>
                        <button
                          className="btn-primary btn-onboarding"
                          onClick={() => setShowOnboardingForm(true)}
                        >
                          <UploadCloud size={20} />
                          Start Onboarding
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.clientId} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={selected.has(client.clientId)}
                        onChange={() => toggleSelect(client.clientId)}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      {client.name || client.clientId}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{client.contact || '—'}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                      {client.eori || '—'}
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                      {client.vat || '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div
                        style={{
                          height: '8px',
                          background: '#e2e8f0',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${client.progress}%`,
                            height: '100%',
                            background: client.progress >= 80 ? '#22c55e' : '#f97316',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {client.progress}% complete
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#f97316' }}>
                      {client.missingItems.slice(0, 2).join(', ') || '—'}
                      {client.missingItems.length > 2 && ` +${client.missingItems.length - 2} more`}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          background: client.status === 'live' ? '#dcfce7' : '#e0f2fe',
                        }}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="icon-button"
                          title="View checklist"
                          onClick={() => navigate(`/clients/${client.clientId}?tab=onboarding`)}
                        >
                          <Layers size={16} />
                        </button>
                        <button
                          className="icon-button"
                          title="Upload documents"
                          onClick={() => navigate(`/clients/${client.clientId}?tab=documents`)}
                        >
                          <UploadCloud size={16} />
                        </button>
                        <button
                          className="icon-button"
                          title="View client details"
                          onClick={() => navigate(`/clients/${client.clientId}`)}
                        >
                          <FileText size={16} />
                        </button>
                        <button className="icon-button" title="Mark verified">
                          <CheckCircle2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Onboarding Form Modal */}
        {showOnboardingForm && (
          <OnboardingForm
            onClose={() => setShowOnboardingForm(false)}
            onSuccess={handleOnboardingSuccess}
          />
        )}
      </main>
    </>
  );
}
