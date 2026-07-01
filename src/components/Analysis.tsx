import { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, AlertCircle, CheckCircle2, Clock, Play, FileText } from 'lucide-react';
import { cdsAPI, claimsAPI } from '@/lib/api-service';
import { analyzeBatch, getBatchSummary } from '@/lib/refund-calculator';
import { generateBatchClaims } from '@/lib/claim-generator';
import type { RefundAnalysis } from '@/lib/refund-calculator';
import type { AnalysisRecord, ManifestSummary, ManifestDeclaration } from '@/types/manifest';
import { useNavigate } from 'react-router-dom';
import SearchFilterBar from '@/components/ui/SearchFilterBar';

export default function Analysis() {
  const navigate = useNavigate();
  const [declarations, setDeclarations] = useState<ManifestDeclaration[]>([]);
  const [analyses, setAnalyses] = useState<RefundAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedDeclarations, setSelectedDeclarations] = useState<Set<string>>(new Set());
  const [manifestStats, setManifestStats] = useState<ManifestSummary | null>(null);
  const [auditRecords, setAuditRecords] = useState<AnalysisRecord[]>([]);
  const [riskProfile, setRiskProfile] = useState('all');

  useEffect(() => {
    loadDeclarations();
  }, []);

  const loadDeclarations = async () => {
    try {
      const [response, stats, auditResponse] = await Promise.all([
        cdsAPI.getDeclarations({}),
        cdsAPI.getStats(),
        cdsAPI.getAnalysisRecords({ riskProfile: riskProfile === 'all' ? undefined : riskProfile }),
      ]);
      const listedDeclarations = response.declarations || [];
      const detailedDeclarations = await Promise.all(
        listedDeclarations.map(async (declaration) => {
          try {
            const detail = await cdsAPI.getDeclaration(declaration.id);
            return { ...declaration, ...detail } as ManifestDeclaration;
          } catch (error) {
            console.warn(`Failed to load declaration detail for ${declaration.id}:`, error);
            return declaration;
          }
        })
      );

      setDeclarations(detailedDeclarations);
      setManifestStats(stats);
      setAuditRecords(auditResponse.records || []);
    } catch (error) {
      console.error('Failed to load declarations:', error);
    }
  };

  useEffect(() => {
    cdsAPI
      .getAnalysisRecords({ riskProfile: riskProfile === 'all' ? undefined : riskProfile })
      .then((response) => setAuditRecords(response.records || []))
      .catch((error) => console.error('Failed to load audit records:', error));
  }, [riskProfile]);

  const handleAnalyzeAll = async () => {
    setIsAnalyzing(true);
    setProgress({ current: 0, total: declarations.length });

    try {
      const result = await cdsAPI.runAutoAnalysis();
      setProgress({ current: result.analyzed_count, total: result.analyzed_count });
      const auditResponse = await cdsAPI.getAnalysisRecords({
        riskProfile: riskProfile === 'all' ? undefined : riskProfile,
      });
      setAuditRecords(auditResponse.records || []);
      setAnalyses([]);
      await loadDeclarations();
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeSelected = async () => {
    const selected = declarations.filter((d) => selectedDeclarations.has(d.id));
    if (selected.length === 0) return;

    setIsAnalyzing(true);
    setProgress({ current: 0, total: selected.length });

    try {
      const result = await cdsAPI.runAutoAnalysis(selected.map((declaration) => declaration.id));
      setProgress({ current: result.analyzed_count, total: result.analyzed_count });
      const auditResponse = await cdsAPI.getAnalysisRecords({
        riskProfile: riskProfile === 'all' ? undefined : riskProfile,
      });
      setAuditRecords(auditResponse.records || []);
      setAnalyses([]);
      await loadDeclarations();
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateAuditRecord = async (
    record: AnalysisRecord,
    payload: Parameters<typeof cdsAPI.updateAnalysisRecord>[1]
  ) => {
    const response = await cdsAPI.updateAnalysisRecord(record.id, payload);
    setAuditRecords((current) =>
      current.map((item) => (item.id === record.id ? { ...item, ...response.record } : item))
    );
  };

  const handleGenerateClaims = async () => {
    const claims = generateBatchClaims(analyses);

    // Save claims to API
    for (const claim of claims) {
      await claimsAPI.createClaim(claim);
    }

    alert(`Generated ${claims.length} draft claims!`);
  };

  const summary = analyses.length > 0 ? getBatchSummary(analyses) : null;

  const opportunityPipeline = useMemo(() => {
    return analyses
      .filter((a) => a.has_overpayment)
      .sort((a, b) => b.total_overpayment - a.total_overpayment)
      .slice(0, 5);
  }, [analyses]);

  const reviewQueue = useMemo(() => {
    return analyses
      .filter((a) => a.has_overpayment && a.recommended_action !== 'claim')
      .slice(0, 4);
  }, [analyses]);

  const toggleDeclaration = (id: string) => {
    const newSelected = new Set(selectedDeclarations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDeclarations(newSelected);
  };

  const toggleAll = () => {
    if (selectedDeclarations.size === declarations.length) {
      setSelectedDeclarations(new Set());
    } else {
      setSelectedDeclarations(new Set(declarations.map((d) => d.id)));
    }
  };

  return (
    <>
      <div className="border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
        <div className="px-6 py-6" style={{ backgroundColor: 'var(--color-chrome)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Refund Analysis</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Identify duty overpayment opportunities</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDeclarations.size > 0 && (
                  <button
                    onClick={handleAnalyzeSelected}
                    disabled={isAnalyzing}
                    className="btn-secondary"
                  >
                    <Play size={20} />
                    Analyze Selected ({selectedDeclarations.size})
                  </button>
                )}
                <button
                  onClick={handleAnalyzeAll}
                  disabled={isAnalyzing || declarations.length === 0}
                  className="btn-primary btn-analysis"
                >
                  <Search size={20} />
                  {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Connected Manifest Snapshot */}
        {manifestStats && (
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
            }}
          >
            <div className="card" style={{ cursor: 'default' }}>
              <h2>Manifest Snapshot</h2>
              <div className="value">{manifestStats.totalDeclarations}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Declarations available for analysis
              </p>
            </div>
            <div className="card" style={{ cursor: 'default' }}>
              <h2>Value Imported</h2>
              <div className="value">{manifestStats.uniqueMrns}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Unique MRNs</p>
            </div>
            <div className="card" style={{ cursor: 'default' }}>
              <h2>Duties Paid</h2>
              <div className="value">£{(manifestStats.totalDuties || 0).toLocaleString()}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Potential refund base
              </p>
            </div>
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.03))',
              }}
            >
              <h2>Manifest Actions</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Need to import more CDS data? Jump to the Manifest page to keep this feed fresh.
              </p>
              <button
                onClick={() => navigate('/manifest')}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Open Manifest
              </button>
            </div>
          </div>
        )}

        {/* Analysis Readiness */}
        {manifestStats && (
          <div
            className="card"
            style={{ marginBottom: '2rem', background: '#0f172a', color: '#fff' }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Analysis Readiness
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{declarations.length}</p>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
              Declarations available for analysis right now
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
              Select rows below or analyze everything in one click.
            </p>
          </div>
        )}

        <div
          className="card"
          style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'end',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 260px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Audit queue
            </label>
            <select
              value={riskProfile}
              onChange={(event) => setRiskProfile(event.target.value)}
              className="authInput"
              style={{ marginTop: '0.35rem' }}
            >
              <option value="all">All Declarations</option>
              <option value="value_discrepancies">Value Discrepancies</option>
              <option value="duty_mismatches">Duty Mismatches</option>
              <option value="pva">Postponed VAT Audits</option>
            </select>
          </div>
          <button
            onClick={handleAnalyzeAll}
            disabled={isAnalyzing || declarations.length === 0}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: isAnalyzing || declarations.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Play size={16} />
            Run Auto-Analysis
          </button>
        </div>

        {auditRecords.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Checked Records ({auditRecords.length})
            </h2>
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1180px' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '0.85rem', textAlign: 'left' }}>Entry / Item</th>
                    <th style={{ padding: '0.85rem', textAlign: 'left' }}>Commodity</th>
                    <th style={{ padding: '0.85rem', textAlign: 'right' }}>CDS Value</th>
                    <th style={{ padding: '0.85rem', textAlign: 'right' }}>VAT Base</th>
                    <th style={{ padding: '0.85rem', textAlign: 'right' }}>Duty Variance</th>
                    <th style={{ padding: '0.85rem', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '0.85rem', textAlign: 'left' }}>Human Review</th>
                    <th style={{ padding: '0.85rem', textAlign: 'left' }}>Final Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRecords.map((record) => {
                    const flags = record.audit_flags || [];
                    const statusColor =
                      record.audit_status === 'pass'
                        ? '#16a34a'
                        : record.audit_status === 'fail'
                          ? '#dc2626'
                          : '#f97316';

                    return (
                      <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {record.mrn}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Item {record.item_number}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <input
                            className="authInput"
                            value={String(
                              (record.adjusted_record?.commodity_code as string) ||
                                record.commodity_code ||
                                ''
                            )}
                            onChange={(event) =>
                              updateAuditRecord(record, {
                                adjusted_record: { commodity_code: event.target.value },
                                human_review_status: 'pending_review',
                              })
                            }
                            style={{ width: '135px', fontFamily: 'monospace' }}
                          />
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Original: {record.commodity_code || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                          £{(record.customs_value || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                          <div>CDS £{(record.declared_vat_value || 0).toLocaleString()}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Calc £{(record.calculated_vat_base || 0).toLocaleString()}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '0.85rem',
                            textAlign: 'right',
                            color: (record.duty_variance || 0) < 0 ? '#dc2626' : '#16a34a',
                            fontWeight: 600,
                          }}
                        >
                          £{(record.duty_variance || 0).toLocaleString()}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Expected £{(record.expected_duty || 0).toLocaleString()}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.55rem',
                              borderRadius: '999px',
                              color: '#fff',
                              background: statusColor,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            {record.audit_status}
                          </span>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                            {flags[0]?.message || 'No variance detected'}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <select
                            className="authInput"
                            value={record.human_review_status || 'pending_review'}
                            onChange={(event) =>
                              updateAuditRecord(record, { human_review_status: event.target.value })
                            }
                          >
                            <option value="pending_review">Pending Review</option>
                            <option value="approved_broker_override">
                              Approved - Accept Broker Override
                            </option>
                            <option value="flag_for_amendment">
                              Flag for Post-Clearance Amendment
                            </option>
                            <option value="verified">Verified</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <select
                            className="authInput"
                            value={record.allocation_status || ''}
                            onChange={(event) =>
                              updateAuditRecord(record, {
                                allocation_status: event.target.value || undefined,
                              })
                            }
                          >
                            <option value="">Pending allocation</option>
                            <option value="correct_verified">Correct / Verified</option>
                            <option value="not_viable_to_change">Not Viable to Change</option>
                            <option value="draft_claim_initialized">Draft Claim Initialized</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isAnalyzing && (
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}
            >
              <span style={{ fontWeight: 600 }}>Analyzing declarations...</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: '#f3f4f6',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  height: '100%',
                  background: 'var(--accent-purple)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {summary && (
          <>
            <div
              className="grid"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
            >
              <div className="card" style={{ cursor: 'default' }}>
                <TrendingUp
                  size={32}
                  style={{ color: 'var(--accent-purple)', marginBottom: '0.75rem' }}
                />
                <h2>Total Potential Refund</h2>
                <div className="value" style={{ color: 'var(--accent-purple)' }}>
                  £{summary.total_potential_refund.toLocaleString()}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  From {summary.declarations_with_overpayments} declarations
                </p>
              </div>
              <div className="card" style={{ cursor: 'default' }}>
                <CheckCircle2 size={32} style={{ color: '#22c55e', marginBottom: '0.75rem' }} />
                <h2>High Confidence</h2>
                <div className="value">{summary.high_confidence_claims}</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Ready to claim</p>
              </div>
              <div className="card" style={{ cursor: 'default' }}>
                <Clock size={32} style={{ color: '#f59e0b', marginBottom: '0.75rem' }} />
                <h2>Requires Review</h2>
                <div className="value">{summary.requires_review}</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Manual verification needed
                </p>
              </div>
              <div className="card" style={{ cursor: 'default' }}>
                <FileText size={32} style={{ color: '#3b82f6', marginBottom: '0.75rem' }} />
                <h2>Total Analyzed</h2>
                <div className="value">{summary.total_declarations}</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Declarations processed
                </p>
              </div>
            </div>

            {/* Issue Breakdown */}
            <div style={{ marginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                Issues Detected
              </h2>
              <div
                className="grid"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}
              >
                {Object.entries(summary.by_issue_type).map(([type, count]) => (
                  <div key={type} className="card">
                    <AlertCircle
                      size={24}
                      style={{ color: 'var(--accent-purple)', marginBottom: '0.75rem' }}
                    />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {formatIssueType(type)}
                    </h3>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {count}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>occurrences</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Claims Button */}
            {summary.high_confidence_claims > 0 && (
              <div
                style={{
                  marginTop: '2rem',
                  background:
                    'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                }}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Ready to Generate Claims
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  {summary.high_confidence_claims} high-confidence claims can be automatically
                  generated
                </p>
                <button
                  onClick={handleGenerateClaims}
                  style={{
                    padding: '0.75rem 2rem',
                    background: 'var(--accent-purple)',
                    color: 'var(--text-light)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  Generate Draft Claims
                </button>
              </div>
            )}
          </>
        )}

        {/* Declarations List */}
        {!isAnalyzing && declarations.length > 0 && analyses.length === 0 && auditRecords.length === 0 && (
          <div style={{ marginTop: '2rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Declarations ({declarations.length})
              </h2>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={selectedDeclarations.size === declarations.length}
                  onChange={toggleAll}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem' }}>Select All</span>
              </label>
            </div>

            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', width: '50px' }}></th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      MRN
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Trader
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Items
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Duties Paid
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((declaration) => (
                    <tr key={declaration.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedDeclarations.has(declaration.id)}
                          onChange={() => toggleDeclaration(declaration.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </td>
                      <td
                        style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}
                      >
                        {declaration.mrn}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        {declaration.consignee_name || 'N/A'}
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {declaration.items?.length || 0}
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        £{declaration.total_taxes_paid?.toLocaleString() || '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results List */}
        {analyses.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Analysis Results
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {analyses
                .filter((a) => a.has_overpayment)
                .map((analysis) => (
                  <div
                    key={analysis.declaration.id}
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '1rem',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.25rem',
                          }}
                        >
                          {analysis.declaration.mrn}
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                          {analysis.declaration.consignee_name || 'Unknown Trader'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: 'var(--accent-purple)',
                          }}
                        >
                          £{analysis.total_overpayment.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Potential refund
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div
                        style={{
                          padding: '0.5rem 1rem',
                          background:
                            analysis.recommended_action === 'claim'
                              ? 'rgba(34, 197, 94, 0.1)'
                              : 'rgba(245, 158, 11, 0.1)',
                          border: `1px solid ${analysis.recommended_action === 'claim' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: analysis.recommended_action === 'claim' ? '#22c55e' : '#f59e0b',
                        }}
                      >
                        {analysis.recommended_action === 'claim'
                          ? 'Ready to Claim'
                          : 'Requires Review'}
                      </div>
                      <div
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#3b82f6',
                        }}
                      >
                        {analysis.confidence_score}% Confidence
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem',
                      }}
                    >
                      {analysis.detected_issues.length} issue
                      {analysis.detected_issues.length !== 1 ? 's' : ''} detected:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {analysis.detected_issues.map((issue, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '0.75rem',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                            Item {issue.item_number}: {formatIssueType(issue.issue_type)}
                          </div>
                          <div style={{ color: 'var(--text-muted)' }}>{issue.description}</div>
                          <div
                            style={{
                              marginTop: '0.5rem',
                              color: 'var(--accent-purple)',
                              fontWeight: 600,
                            }}
                          >
                            Overpayment: £{issue.overpayment.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Opportunity Pipeline */}
        {analyses.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Opportunity Pipeline
            </h2>
            {opportunityPipeline.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No overpayments detected yet.</p>
            ) : (
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        MRN
                      </th>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        Trader
                      </th>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        Confidence
                      </th>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        Action
                      </th>
                      <th
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        Overpayment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunityPipeline.map((analysis) => (
                      <tr
                        key={`${analysis.declaration.id}-pipeline`}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td
                          style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}
                        >
                          {analysis.declaration.mrn}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                          {analysis.declaration.consignee_name || 'Unknown'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
                          {analysis.confidence_score}%
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background:
                                analysis.recommended_action === 'claim'
                                  ? 'rgba(34,197,94,0.15)'
                                  : 'rgba(245,158,11,0.15)',
                              color:
                                analysis.recommended_action === 'claim' ? '#15803d' : '#b45309',
                              textTransform: 'uppercase',
                            }}
                          >
                            {analysis.recommended_action}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                          £{analysis.total_overpayment.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Review Queue */}
        {reviewQueue.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Manual Review Queue
            </h2>
            <div
              className="grid"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}
            >
              {reviewQueue.map((analysis) => (
                <div key={`${analysis.declaration.id}-review`} className="card">
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {analysis.declaration.mrn}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {analysis.declaration.consignee_name || 'Unknown Trader'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {analysis.detected_issues.length} issues flagged
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--accent-purple)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    £{analysis.total_overpayment.toFixed(2)} potential refund
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {analysis.detected_issues.slice(0, 2).map((issue, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          background: '#f9fafb',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {formatIssueType(issue.issue_type)}
                      </span>
                    ))}
                    {analysis.detected_issues.length > 2 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        +{analysis.detected_issues.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isAnalyzing && declarations.length === 0 && (
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              marginTop: '2rem',
            }}
          >
            <Search size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No declarations to analyze
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Import declarations from the Manifest page to start analyzing for overpayments
            </p>
          </div>
        )}
      </main>
    </>
  );
}

function formatIssueType(type: string): string {
  const formats: Record<string, string> = {
    tariff_code_error: 'Incorrect Tariff Code',
    origin_relief: 'Origin Preference Not Applied',
    incorrect_valuation: 'Incorrect Valuation',
    vat_calculation_error: 'VAT Calculation Error',
    goods_returned: 'Goods Returned',
    goods_destroyed: 'Goods Destroyed',
    vat_postponement: 'VAT Postponement Error',
    preference_not_claimed: 'Preference Not Claimed',
    relief_not_applied: 'Relief Not Applied',
    system_error: 'System Error',
    other: 'Other',
  };

  return formats[type] || type;
}

// Note: Closing tag should be </UniversalPageLayout> - check the component
