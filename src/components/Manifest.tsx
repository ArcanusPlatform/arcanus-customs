import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Upload,
  Filter,
  Eye,
  UserPlus,
  Play,
  Trash2,
  Layers,
  X,
  RefreshCw,
  History,
  Bell,
  Database,
} from 'lucide-react';
import CSVUpload from './CSVUpload';
import { cdsAPI } from '@/lib/api-service';
import type {
  ManifestSummary,
  ImportBatch,
  ManifestDeclaration,
  ManifestFilters,
  DeclarationDetail,
  DeclarationEvent,
  DeclarationVersion,
} from '@/types/manifest';
import { useNavigate } from 'react-router-dom';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import UniversalPageLayout from '@/components/ui/UniversalPageLayout';
import UniversalPageHeader from '@/components/ui/UniversalPageHeader';

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  unchecked: { color: '#64748b', label: 'Unchecked' },
  checked: { color: '#22c55e', label: 'Checked' },
  adjusted: { color: '#8b5cf6', label: 'Adjusted' },
  accepted: { color: '#22c55e', label: 'Accepted' },
  released: { color: '#0ea5e9', label: 'Released' },
  submitted: { color: '#3b82f6', label: 'Submitted' },
  amended: { color: '#8b5cf6', label: 'Amended' },
  rejected: { color: '#ef4444', label: 'Rejected' },
  cancelled: { color: '#64748b', label: 'Cancelled' },
  under_review: { color: '#f97316', label: 'Under Review' },
  imported: { color: '#3b82f6', label: 'Imported' },
  analyzed: { color: '#22c55e', label: 'Analyzed' },
  issues: { color: '#f97316', label: 'Issues' },
  failed: { color: '#ef4444', label: 'Failed' },
  claimed: { color: '#0ea5e9', label: 'Claimed' },
  archived: { color: '#94a3b8', label: 'Archived' },
};

const iconButtonStyle = {
  padding: '0.35rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--card-bg)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export default function Manifest() {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [summary, setSummary] = useState<ManifestSummary | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [declarations, setDeclarations] = useState<ManifestDeclaration[]>([]);
  const [filters, setFilters] = useState<ManifestFilters>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingDeclarations, setLoadingDeclarations] = useState(true);
  const [detail, setDetail] = useState<DeclarationDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'snapshot' | 'versions' | 'events' | 'raw'>(
    'snapshot'
  );
  const [versions, setVersions] = useState<DeclarationVersion[]>([]);
  const [events, setEvents] = useState<DeclarationEvent[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [hmrcMrn, setHmrcMrn] = useState('');
  const [hmrcLoading, setHmrcLoading] = useState(false);
  const [hmrcMessage, setHmrcMessage] = useState<string | null>(null);
  const [hmrcError, setHmrcError] = useState<string | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
    loadBatches();
  }, []);

  useEffect(() => {
    loadDeclarations();
  }, [filters]);

  const loadSummary = async () => {
    try {
      const data = await cdsAPI.getStats();
      setSummary(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await cdsAPI.getBatches();
      setBatches(res.batches || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadDeclarations = async () => {
    setLoadingDeclarations(true);
    try {
      const res = await cdsAPI.getDeclarations(filters as any);
      setDeclarations(res.declarations || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDeclarations(false);
    }
  };

  const formatCurrency = (value?: number) =>
    value !== undefined ? `£${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—';

  const asNumber = (value: unknown) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : '—';

  const formatSource = (source?: string) => {
    if (!source) return '—';
    return source
      .replace(/^hmrc_/, 'HMRC ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === declarations.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(declarations.map((d) => d.id)));
    }
  };

  const openDetail = async (id: string) => {
    try {
      const [data, versionRes, eventRes] = await Promise.all([
        cdsAPI.getDeclaration(id),
        cdsAPI.getDeclarationVersions(id),
        cdsAPI.getDeclarationEvents(id),
      ]);
      setDetail(data as DeclarationDetail);
      setVersions(versionRes.versions || []);
      setEvents(eventRes.events || []);
      setDrawerTab('snapshot');
      setDrawerOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFetchFromHMRC = async () => {
    const mrn = hmrcMrn.trim();
    if (!mrn) {
      setHmrcError('Enter an MRN to request from HMRC.');
      return;
    }

    setHmrcLoading(true);
    setHmrcError(null);
    setHmrcMessage(null);

    try {
      const response = await cdsAPI.fetchFromHMRC(mrn);
      setHmrcMessage(response.message || `Fetched ${response.mrn} from HMRC.`);
      setHmrcMrn('');
      await Promise.all([loadSummary(), loadBatches(), loadDeclarations()]);
      if (response.declaration_id) {
        await openDetail(response.declaration_id);
      }
    } catch (error) {
      setHmrcError(error instanceof Error ? error.message : 'HMRC request failed.');
    } finally {
      setHmrcLoading(false);
    }
  };

  const handleAssignClient = async (declaration: ManifestDeclaration) => {
    const clientName = prompt('Enter client name to assign', declaration.client_name ?? '');
    if (!clientName) return;
    setAssigning(true);
    try {
      await cdsAPI.assignClient(declaration.id, {
        clientId: declaration.importer_eori,
        clientName,
      });
      await loadDeclarations();
    } catch (error) {
      console.error(error);
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this declaration?')) return;
    setDeleting(id);
    try {
      await cdsAPI.deleteDeclaration(id);
      await loadDeclarations();
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(null);
    }
  };

  const handleRunAutoAnalysis = async () => {
    setAnalysisRunning(true);
    setAnalysisMessage(null);
    try {
      const ids = selected.size > 0 ? Array.from(selected) : undefined;
      const result = await cdsAPI.runAutoAnalysis(ids);
      setAnalysisMessage(
        `Auto-analysis completed: ${result.analyzed_count} lines checked, ${result.flagged_count} flagged.`
      );
      setSelected(new Set());
      await Promise.all([loadSummary(), loadDeclarations()]);
      navigate('/analysis');
    } catch (error) {
      setAnalysisMessage(error instanceof Error ? error.message : 'Auto-analysis failed.');
    } finally {
      setAnalysisRunning(false);
    }
  };

  const summaryTiles = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Total Declarations',
        value: summary.totalDeclarations,
        description: 'Rows imported',
      },
      {
        label: 'Unique MRNs',
        value: summary.uniqueMrns,
        description: 'Distinct entries',
      },
      {
        label: 'Unchecked',
        value: summary.unchecked ?? 0,
        description: 'Awaiting auto-analysis',
      },
      {
        label: 'Checked / Adjusted',
        value: `${summary.checked ?? 0} / ${summary.adjusted ?? 0}`,
        description: 'In the review pipeline',
      },
    ];
  }, [summary]);

  if (showUpload) {
    return (
      <CSVUpload
        onCancel={() => setShowUpload(false)}
        onSuccess={() => {
          setShowUpload(false);
          loadSummary();
          loadBatches();
          loadDeclarations();
        }}
      />
    );
  }

  return (
    <UniversalPageLayout>
      <UniversalPageHeader
        title="CDS Manifest"
        subtitle={
          summary
            ? `Import and manage customs declarations · ${summary.totalDeclarations} records`
            : 'Import and manage customs declarations'
        }
        actions={
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Upload size={20} />
            Upload CSV
          </button>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Summary Tiles */}
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {summaryTiles.map((tile) => (
            <div key={tile.label} className="card">
              <p
                style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}
              >
                {tile.label}
              </p>
              <div className="value">{tile.value}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tile.description}</p>
            </div>
          ))}
        </div>

        {/* HMRC request */}
        <div
          className="card"
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1fr) auto',
            gap: '1rem',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Request declaration from HMRC by MRN
            </label>
            <input
              type="text"
              value={hmrcMrn}
              onChange={(e) => {
                setHmrcMrn(e.target.value);
                setHmrcError(null);
                setHmrcMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFetchFromHMRC();
              }}
              placeholder="23GB123456789ABCDE"
              className="authInput"
              style={{ marginTop: '0.35rem', fontFamily: 'monospace' }}
            />
            {(hmrcMessage || hmrcError) && (
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.85rem',
                  color: hmrcError ? '#ef4444' : '#16a34a',
                }}
              >
                {hmrcError || hmrcMessage}
              </p>
            )}
          </div>
          <button
            onClick={handleFetchFromHMRC}
            disabled={hmrcLoading}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: hmrcLoading ? '#94a3b8' : '#0f172a',
              color: '#fff',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: hmrcLoading ? 'not-allowed' : 'pointer',
              minWidth: '150px',
            }}
          >
            <RefreshCw size={16} />
            {hmrcLoading ? 'Requesting' : 'Request HMRC'}
          </button>
        </div>

        {/* Filters */}
        <div
          className="card"
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MRN</label>
            <input
              type="text"
              value={filters.mrn || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, mrn: e.target.value }))}
              className="authInput"
            />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Client</label>
            <input
              type="text"
              value={filters.client || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
              className="authInput"
            />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value || undefined }))
              }
              className="authInput"
            >
              <option value="">All</option>
              {Object.entries(STATUS_BADGE).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Has Issues</label>
            <select
              value={typeof filters.hasIssues === 'boolean' ? String(filters.hasIssues) : ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  hasIssues: e.target.value === '' ? undefined : e.target.value === 'true',
                }))
              }
              className="authInput"
            >
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <button
            onClick={loadDeclarations}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              height: 'fit-content',
              marginTop: '1.5rem',
            }}
          >
            <Filter size={16} />
            Apply
          </button>
          <button
            onClick={() => {
              setFilters({});
              loadDeclarations();
            }}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(15,23,42,0.05)',
              fontWeight: 600,
              cursor: 'pointer',
              height: 'fit-content',
              marginTop: '1.5rem',
            }}
          >
            Reset
          </button>
        </div>

        {/* Bulk actions */}
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleRunAutoAnalysis}
            disabled={analysisRunning || declarations.length === 0}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              border: 'none',
              background: declarations.length > 0 ? '#3b82f6' : '#cbd5f5',
              color: '#fff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: declarations.length > 0 && !analysisRunning ? 'pointer' : 'not-allowed',
            }}
          >
            <Play size={16} />
            {analysisRunning
              ? 'Running Auto-Analysis'
              : selected.size > 0
                ? `Run Auto-Analysis (${selected.size})`
                : 'Run Auto-Analysis'}
          </button>
          <button
            onClick={() => alert('Archive coming soon')}
            disabled={selected.size === 0}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              fontWeight: 600,
              cursor: selected.size ? 'pointer' : 'not-allowed',
            }}
          >
            Archive Selected
          </button>
          {analysisMessage && (
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {analysisMessage}
            </span>
          )}
        </div>

        {/* Declarations Table */}
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={selected.size === declarations.length && declarations.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th>MRN</th>
                  <th>Client</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>HMRC Updated</th>
                  <th>Issues</th>
                  <th>Items</th>
                  <th>VAT / Tax</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loadingDeclarations ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      Loading declarations…
                    </td>
                  </tr>
                ) : declarations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      No declarations found. Import CDS files to begin.
                    </td>
                  </tr>
                ) : (
                  declarations.map((dec) => {
                    const badge = STATUS_BADGE[dec.status] || STATUS_BADGE.imported;
                    return (
                      <tr key={dec.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={selected.has(dec.id)}
                            onChange={() => toggleSelect(dec.id)}
                          />
                        </td>
                        <td style={{ fontFamily: 'monospace', padding: '0.75rem' }}>{dec.mrn}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {dec.client_name ? (
                            <span>{dec.client_name}</span>
                          ) : (
                            <span style={{ color: '#f97316', fontWeight: 600 }}>Unmatched</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {formatSource(dec.declaration_source)}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#fff',
                              background: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                          {formatDateTime(dec.last_updated_from_hmrc)}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            color: dec.has_issues ? '#f97316' : 'inherit',
                          }}
                        >
                          {dec.issue_count ?? 0}
                        </td>
                        <td style={{ padding: '0.75rem' }}>{dec.items_count ?? '—'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700 }}>
                            {formatCurrency(asNumber(dec.total_vat_value ?? dec.total_taxes_paid))}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Paid {formatCurrency(asNumber(dec.total_duty_paid) + asNumber(dec.total_vat_paid))}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => openDetail(dec.id)}
                              title="View details"
                              style={iconButtonStyle}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleAssignClient(dec)}
                              title="Assign client"
                              style={iconButtonStyle}
                              disabled={assigning}
                            >
                              <UserPlus size={16} />
                            </button>
                            <button
                              onClick={() => navigate('/analysis')}
                              title="Analyze"
                              style={iconButtonStyle}
                            >
                              <Layers size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(dec.id)}
                              title="Delete"
                              style={{ ...iconButtonStyle, color: '#ef4444' }}
                              disabled={deleting === dec.id}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Batch History */}
        <div style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
            Batch History
          </h2>
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th>Batch</th>
                  <th>Files</th>
                  <th>Status</th>
                  <th>Declarations</th>
                  <th>Items</th>
                  <th>Tax Lines</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      No import history yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => (
                    <tr key={batch.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem', fontFamily: 'monospace' }}>{batch.id}</td>
                      <td style={{ padding: '0.85rem' }}>{(batch.file_names || []).join(', ')}</td>
                      <td style={{ padding: '0.85rem' }}>{batch.status}</td>
                      <td style={{ padding: '0.85rem' }}>{batch.declarations ?? '—'}</td>
                      <td style={{ padding: '0.85rem' }}>{batch.items ?? '—'}</td>
                      <td style={{ padding: '0.85rem' }}>{batch.tax_lines ?? '—'}</td>
                      <td style={{ padding: '0.85rem' }}>
                        {batch.created_at ? new Date(batch.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail drawer */}
        {drawerOpen && detail && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
            }}
            onClick={() => setDrawerOpen(false)}
          >
            <div
              style={{
                width: 'min(90vw, 1000px)',
                maxHeight: '90vh',
                background: 'var(--card-bg)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>{detail.mrn}</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{detail.importer_eori}</p>
                </div>
                <button onClick={() => setDrawerOpen(false)} style={iconButtonStyle}>
                  <X />
                </button>
              </div>
              <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <DrawerTabButton
                    active={drawerTab === 'snapshot'}
                    icon={<Database size={16} />}
                    label="Snapshot"
                    onClick={() => setDrawerTab('snapshot')}
                  />
                  <DrawerTabButton
                    active={drawerTab === 'versions'}
                    icon={<History size={16} />}
                    label={`Versions (${versions.length})`}
                    onClick={() => setDrawerTab('versions')}
                  />
                  <DrawerTabButton
                    active={drawerTab === 'events'}
                    icon={<Bell size={16} />}
                    label={`Events (${events.length})`}
                    onClick={() => setDrawerTab('events')}
                  />
                  <DrawerTabButton
                    active={drawerTab === 'raw'}
                    icon={<Layers size={16} />}
                    label="Raw"
                    onClick={() => setDrawerTab('raw')}
                  />
                </div>

                {drawerTab === 'snapshot' && (
                  <>
                    <section style={{ marginBottom: '1.5rem' }}>
                      <h4>Declaration</h4>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                          gap: '1rem',
                        }}
                      >
                        <DetailField label="Status" value={detail.status} />
                        <DetailField
                          label="Source"
                          value={formatSource(detail.declaration_source)}
                        />
                        <DetailField
                          label="HMRC Updated"
                          value={formatDateTime(detail.last_updated_from_hmrc)}
                        />
                        <DetailField label="Procedure" value={detail.procedure_code} />
                        <DetailField label="SOE Code" value={detail.soe_code} />
                        <DetailField label="ROE Code" value={detail.roe_code} />
                        <DetailField
                          label="Total Duties"
                          value={formatCurrency(detail.total_duty_paid)}
                        />
                        <DetailField
                          label="Total VAT"
                          value={formatCurrency(detail.total_vat_paid)}
                        />
                      </div>
                    </section>
                    <section style={{ marginBottom: '1.5rem' }}>
                      <h4>Items</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(detail.items || []).map((item) => (
                          <div
                            key={item.id}
                            style={{
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              padding: '0.75rem 1rem',
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>Item {item.item_number}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              {item.commodity_code}{' '}
                              {item.origin_country ? `· Origin ${item.origin_country}` : ''}
                            </div>
                            <p style={{ marginTop: '0.25rem' }}>
                              {(item as any).goods_description || item.description}
                            </p>
                            {(item.taxes || []).length > 0 && (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
                                  gap: '0.5rem',
                                  marginTop: '0.75rem',
                                }}
                              >
                                {(item.taxes || []).map((tax) => (
                                  <div
                                    key={tax.id}
                                    style={{
                                      background: '#f8fafc',
                                      borderRadius: '8px',
                                      padding: '0.6rem',
                                    }}
                                  >
                                    <div style={{ fontWeight: 600 }}>{tax.tax_type}</div>
                                    <div>{formatCurrency(tax.tax_amount)}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {drawerTab === 'versions' && (
                  <section>
                    <h4>Version History</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {versions.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No versions recorded.</p>
                      ) : (
                        versions.map((version) => (
                          <div
                            key={version.id}
                            style={{
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              padding: '0.85rem 1rem',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '1rem',
                              }}
                            >
                              <strong>Version {version.version_number}</strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {formatDateTime(version.created_at)}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              {formatSource(version.source)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                )}

                {drawerTab === 'events' && (
                  <section>
                    <h4>HMRC Event History</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {events.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No HMRC events recorded.</p>
                      ) : (
                        events.map((event) => (
                          <div
                            key={event.id}
                            style={{
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              padding: '0.85rem 1rem',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '1rem',
                              }}
                            >
                              <strong>{event.event_type}</strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {formatDateTime(event.received_at)}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              {formatSource(event.source)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                )}

                {drawerTab === 'raw' && (
                  <section>
                    <h4>Raw Payload</h4>
                    <pre
                      style={{
                        background: '#0f172a',
                        color: '#e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem',
                        overflowX: 'auto',
                        fontSize: '0.8rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {JSON.stringify(detail.raw_data || detail, null, 2)}
                    </pre>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </UniversalPageLayout>
  );
}

function DetailField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        {label}
      </p>
      <p style={{ fontWeight: 600 }}>{value ?? '—'}</p>
    </div>
  );
}

function DrawerTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 0.8rem',
        borderRadius: '8px',
        border: `1px solid ${active ? '#0f172a' : 'var(--border)'}`,
        background: active ? '#0f172a' : 'var(--card-bg)',
        color: active ? '#fff' : 'inherit',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
