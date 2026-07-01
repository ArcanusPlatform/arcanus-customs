import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Eye,
  Edit,
  Trash2,
  Upload,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { claimsAPI } from '@/lib/api-service';
import type { C285Claim } from '@/types';
import ClaimDetailModal from './ClaimDetailModal';
import NewClaimForm from './NewClaimFormEnhanced';
import EditClaimForm from './EditClaimForm';
import ClaimsCSVUpload from './ClaimsCSVUpload';
import { generateClaimCompliance } from '@/lib/compliance-api';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import KPITile from '@/components/ui/KPITile';

export default function Claims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<C285Claim[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    by_status: {} as Record<string, number>,
    total_claimed: 0,
    total_approved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<C285Claim | null>(null);
  const [showNewClaimForm, setShowNewClaimForm] = useState(false);
  const [editingClaim, setEditingClaim] = useState<C285Claim | null>(null);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [complianceScores, setComplianceScores] = useState<
    Record<string, { score: number; issueCount: number }>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [claimsData, statsData] = await Promise.all([
        claimsAPI.getClaims({ limit: 100 }),
        claimsAPI.getStats(),
      ]);
      setClaims(claimsData.claims);
      setStats(statsData);

      // Generate compliance scores for each claim
      const scores: Record<string, { score: number; issueCount: number }> = {};

      // Generate compliance data for each claim
      claimsData.claims.forEach((claim, index) => {
        const complianceData = generateClaimCompliance(index);
        scores[claim.id] = {
          score: complianceData.score,
          issueCount: complianceData.issueCount,
        };
      });

      setComplianceScores(scores);
    } catch (error) {
      console.error('Failed to load claims:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await claimsAPI.deleteClaim(id);
    setSelectedClaim(null);
    loadData();
  };

  const handleSubmit = async (claim: C285Claim) => {
    // Update claim status to submitted
    await claimsAPI.updateClaim(claim.id, {
      status: 'submitted',
      submitted_date: new Date().toISOString().split('T')[0],
    });
    setSelectedClaim(null);
    loadData();
    alert('Claim submitted successfully!');
  };

  const handleNewClaimSuccess = () => {
    setShowNewClaimForm(false);
    loadData();
    alert('Claim created successfully!');
  };

  const handleEditClaimSuccess = () => {
    setEditingClaim(null);
    setSelectedClaim(null);
    loadData();
    alert('Claim updated successfully!');
  };

  const handleCSVUploadSuccess = () => {
    setShowCSVUpload(false);
    loadData();
  };

  const filteredClaims = claims.filter(
    (claim) =>
      !searchTerm ||
      claim.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.trader_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate compliance stats
  const complianceStats = Object.values(complianceScores);
  const avgComplianceScore =
    complianceStats.length > 0
      ? Math.round(complianceStats.reduce((sum, c) => sum + c.score, 0) / complianceStats.length)
      : 0;
  const claimsWithIssues = complianceStats.filter((c) => c.issueCount > 0).length;

  const claimStats = [
    {
      label: 'Total Claims',
      value: isLoading ? '...' : stats.total,
      icon: FileText,
      color: 'var(--accent-purple)',
    },
    {
      label: 'In Progress',
      value: isLoading
        ? '...'
        : (stats.by_status['draft'] || 0) +
          (stats.by_status['submitted'] || 0) +
          (stats.by_status['under_review'] || 0),
      icon: Clock,
      color: '#3b82f6',
    },
    {
      label: 'Approved',
      value: isLoading
        ? '...'
        : (stats.by_status['approved'] || 0) + (stats.by_status['paid'] || 0),
      icon: CheckCircle2,
      color: '#22c55e',
    },
    {
      label: 'Avg Compliance',
      value: isLoading ? '...' : `${avgComplianceScore}%`,
      icon: Shield,
      color:
        avgComplianceScore >= 90 ? '#22c55e' : avgComplianceScore >= 75 ? '#f59e0b' : '#ef4444',
      subtitle: claimsWithIssues > 0 ? `${claimsWithIssues} with issues` : 'All clear',
    },
  ];

  return (
    <>
      <div className="border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
        <div className="px-6 py-6" style={{ backgroundColor: 'var(--color-chrome)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Claims Management</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Submit and track HMRC C285 duty repayment claims</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowCSVUpload(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-semibold"
                >
                  <Upload size={20} />
                  Import CSV
                </button>
                <button
                  onClick={() => setShowNewClaimForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Plus size={20} />
                  New Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {claimStats.map((stat) => (
            <KPITile
              key={stat.label}
              title={stat.label}
              value={stat.value}
              subtext={
                stat.subtitle ||
                (stat.value === '0' || stat.value === '£0.00' ? 'No data yet' : 'Active')
              }
              icon={stat.icon}
              color="purple"
            />
          ))}
        </div>

        {/* Compliance Info Banner */}
        {claimsWithIssues > 0 && (
          <div
            style={{
              marginTop: '2rem',
              background:
                'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {claimsWithIssues} {claimsWithIssues === 1 ? 'claim has' : 'claims have'}{' '}
                  compliance issues
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Review compliance details to ensure HMRC submission readiness
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/compliance')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
              }}
            >
              <Shield size={18} />
              View Compliance
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <div style={{ marginTop: '2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>All Claims</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                }}
              >
                <Search size={16} style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by MRN or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.875rem',
                    width: '250px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Claims Table */}
          {isLoading ? (
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '3rem',
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'var(--text-muted)' }}>Loading claims...</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '3rem',
                textAlign: 'center',
              }}
            >
              <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {searchTerm ? 'No claims found' : 'No claims yet'}
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {searchTerm
                  ? 'Try a different search term'
                  : 'Analyze declarations to generate claims automatically'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/analysis')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--accent-purple)',
                    color: 'var(--text-light)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Search size={20} />
                  Analyze Declarations
                </button>
              )}
            </div>
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
                      Reference
                    </th>
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
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Reason
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Amount
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Shield size={14} />
                        Compliance
                      </div>
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td
                        style={{
                          padding: '1rem',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {claim.reference}
                      </td>
                      <td
                        style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}
                      >
                        {claim.mrn || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 600 }}>{claim.trader_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {claim.trader_eori}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        {formatReason(claim.reason)}
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--accent-purple)',
                        }}
                      >
                        £{(claim.total_claim_amount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {complianceScores[claim.id] ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.25rem 0.75rem',
                                background: getComplianceColor(complianceScores[claim.id].score),
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
                              }}
                            >
                              <Shield size={12} />
                              {Math.round(complianceScores[claim.id].score)}%
                            </div>
                            {complianceScores[claim.id].issueCount > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  color: '#ef4444',
                                  fontWeight: 600,
                                }}
                              >
                                <AlertTriangle size={12} />
                                {complianceScores[claim.id].issueCount} issues
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: getStatusColor(claim.status),
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {claim.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            style={{
                              padding: '0.5rem',
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                          {claim.status === 'draft' && (
                            <>
                              <button
                                onClick={() => setEditingClaim(claim)}
                                style={{
                                  padding: '0.5rem',
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const confirmMessage =
                                    `⚠️ WARNING: Delete Claim?\n\n` +
                                    `You are about to permanently delete claim ${claim.reference}.\n\n` +
                                    `Claim Amount: £${(claim.total_claim_amount || 0).toLocaleString()}\n` +
                                    `Items: ${claim.items?.length || 0}\n\n` +
                                    `This action CANNOT be undone. All claim data will be lost.\n\n` +
                                    `Are you absolutely sure you want to delete this claim?`;

                                  if (confirm(confirmMessage)) {
                                    handleDelete(claim.id);
                                  }
                                }}
                                style={{
                                  padding: '0.5rem',
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#ef4444',
                                }}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div style={{ marginTop: '2rem' }}>
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              borderRadius: '12px',
              padding: '2rem',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Need help with your claim?
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Our AI assistant can guide you through the C285 claim process, help you gather the
              right documents, and ensure your claim meets all HMRC requirements.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent-purple)',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Ask M Assist
              </button>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: 'var(--accent-purple)',
                  border: '1px solid var(--accent-purple)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View C285 Guide
              </button>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: 'var(--accent-purple)',
                  border: '1px solid var(--accent-purple)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Document Checklist
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        {selectedClaim && !editingClaim && (
          <ClaimDetailModal
            claim={selectedClaim}
            onClose={() => setSelectedClaim(null)}
            onEdit={(claim) => {
              setEditingClaim(claim);
            }}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
          />
        )}

        {showNewClaimForm && (
          <NewClaimForm
            onClose={() => setShowNewClaimForm(false)}
            onSuccess={handleNewClaimSuccess}
          />
        )}

        {editingClaim && (
          <EditClaimForm
            claim={editingClaim}
            onClose={() => {
              setEditingClaim(null);
              setSelectedClaim(null);
            }}
            onSuccess={handleEditClaimSuccess}
          />
        )}

        {showCSVUpload && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem',
            }}
            onClick={() => setShowCSVUpload(false)}
          >
            <div
              style={{
                background: 'var(--card-bg)',
                borderRadius: '16px',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow:
                  '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <ClaimsCSVUpload
                onSuccess={handleCSVUploadSuccess}
                onCancel={() => setShowCSVUpload(false)}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function formatReason(reason: string): string {
  const formats: Record<string, string> = {
    tariff_code_error: 'Incorrect Tariff Code',
    origin_relief: 'Origin Preference Not Applied',
    goods_return: 'Goods Returned',
    goods_destroyed: 'Goods Destroyed',
    vat_postponement: 'VAT Postponement Error',
    incorrect_valuation: 'Incorrect Valuation',
    preference_not_claimed: 'Preference Not Claimed',
    relief_not_applied: 'Relief Not Applied',
    system_error: 'System Error',
    duplicate_payment: 'Duplicate Payment',
    rate_change: 'Rate Change',
    other: 'Other',
  };
  return formats[reason] || reason;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
    case 'paid':
      return 'rgba(34, 197, 94, 0.2)';
    case 'submitted':
    case 'under_review':
      return 'rgba(59, 130, 246, 0.2)';
    case 'draft':
      return 'rgba(245, 158, 11, 0.2)';
    case 'rejected':
      return 'rgba(239, 68, 68, 0.2)';
    default:
      return 'rgba(156, 163, 175, 0.2)';
  }
}

function getComplianceColor(score: number): string {
  if (score >= 90) return 'rgba(34, 197, 94, 0.2)'; // green
  if (score >= 75) return 'rgba(245, 158, 11, 0.2)'; // amber
  return 'rgba(239, 68, 68, 0.2)'; // red
}
