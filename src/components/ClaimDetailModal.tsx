import { X, Edit, Send, Trash2, FileText, Calendar, TrendingUp } from 'lucide-react';
import type { C285Claim } from '@/types';

interface ClaimDetailModalProps {
  claim: C285Claim;
  onClose: () => void;
  onEdit?: (claim: C285Claim) => void;
  onSubmit?: (claim: C285Claim) => void;
  onDelete?: (claimId: string) => void;
}

export default function ClaimDetailModal({
  claim,
  onClose,
  onEdit,
  onSubmit,
  onDelete,
}: ClaimDetailModalProps) {
  const handleSubmit = () => {
    if (
      confirm('Are you sure you want to submit this claim to HMRC? This action cannot be undone.')
    ) {
      onSubmit?.(claim);
    }
  };

  const handleDelete = () => {
    const confirmMessage =
      `⚠️ WARNING: Delete Claim?\n\n` +
      `You are about to permanently delete claim ${claim.reference}.\n\n` +
      `Claim Amount: £${(claim.total_claim_amount || 0).toLocaleString()}\n` +
      `Items: ${claim.items?.length || 0}\n\n` +
      `This action CANNOT be undone. All claim data will be lost.\n\n` +
      `Are you absolutely sure you want to delete this claim?`;

    if (confirm(confirmMessage)) {
      onDelete?.(claim.id);
    }
  };

  const formatReason = (reason: string): string => {
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
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
      case 'paid':
        return '#22c55e';
      case 'submitted':
      case 'under_review':
        return '#3b82f6';
      case 'draft':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '2rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
          }}
        >
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{claim.reference}</h2>
              <span
                style={{
                  padding: '0.25rem 0.75rem',
                  background: `${getStatusColor(claim.status)}20`,
                  color: getStatusColor(claim.status),
                  borderRadius: '999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {claim.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {claim.mrn && `MRN: ${claim.mrn}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <TrendingUp size={16} style={{ color: 'var(--accent-purple)' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Total Claim
                </span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                £{(claim.total_claim_amount || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <FileText size={16} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Items</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{claim.items?.length || 0}</div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <Calendar size={16} style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Created</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                {new Date(claim.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Claim Details */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Claim Details
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Trader:</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{claim.trader_name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {claim.trader_eori}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Reason:</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{formatReason(claim.reason)}</div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {claim.reason_description}
                  </div>
                </div>
              </div>
              {claim.submitted_date && (
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Submitted:
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {new Date(claim.submitted_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {claim.hmrc_reference && (
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    HMRC Reference:
                  </span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {claim.hmrc_reference}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Financial Breakdown
            </h3>
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th
                      style={{
                        padding: '0.5rem',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      Original
                    </th>
                    <th
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      Correct
                    </th>
                    <th
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      Overpayment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>Duty</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      £{claim.original_duty.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      £{claim.correct_duty.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--accent-purple)',
                      }}
                    >
                      £{claim.duty_overpayment.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>VAT</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      £{claim.original_vat.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      £{claim.correct_vat.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--accent-purple)',
                      }}
                    >
                      £{claim.vat_overpayment.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>Excise</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      £{claim.original_excise.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      £{claim.correct_excise.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--accent-purple)',
                      }}
                    >
                      £{claim.excise_overpayment.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                    <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>Total</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      £{claim.original_total.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      £{claim.correct_total.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        color: 'var(--accent-purple)',
                      }}
                    >
                      £{(claim.total_claim_amount || 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Claim Items */}
          {claim.items && claim.items.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                Claim Items
              </h3>
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th
                        style={{
                          padding: '0.75rem',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        Item
                      </th>
                      <th
                        style={{
                          padding: '0.75rem',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        Commodity Code
                      </th>
                      <th
                        style={{
                          padding: '0.75rem',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        Description
                      </th>
                      <th
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        Overpayment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {claim.items.map((item) => (
                      <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          {item.item_number}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {item.commodity_code}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          {item.description}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            textAlign: 'right',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--accent-purple)',
                          }}
                        >
                          £{item.item_claim_amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f9fafb',
          }}
        >
          <div>
            {claim.status === 'draft' && onDelete && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            {claim.status === 'draft' && onEdit && (
              <button
                onClick={() => onEdit(claim)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Edit size={16} />
                Edit
              </button>
            )}
            {claim.status === 'draft' && onSubmit && (
              <button
                onClick={handleSubmit}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent-purple)',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Send size={16} />
                Submit to HMRC
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
