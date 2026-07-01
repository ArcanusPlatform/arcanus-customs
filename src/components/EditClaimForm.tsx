import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { claimsAPI } from '@/lib/api-service';
import type { C285Claim, C285ClaimItem, ClaimReason } from '@/types';

interface EditClaimFormProps {
  claim: C285Claim;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClaimItemFormData {
  id: string;
  item_number: number;
  commodity_code: string;
  description: string;
  invoice_value: number;
  original_duty: number;
  correct_duty: number;
  original_vat: number;
  correct_vat: number;
  original_excise: number;
  correct_excise: number;
}

export default function EditClaimForm({ claim, onClose, onSuccess }: EditClaimFormProps) {
  const [formData, setFormData] = useState({
    mrn: claim.mrn || '',
    trader_eori: claim.trader_eori,
    trader_name: claim.trader_name,
    reason: claim.reason,
    reason_description: claim.reason_description,
    items:
      claim.items?.map((item) => ({
        id: item.id,
        item_number: item.item_number,
        commodity_code: item.commodity_code,
        description: item.description,
        invoice_value: item.invoice_value,
        original_duty: item.original_duty,
        correct_duty: item.correct_duty,
        original_vat: item.original_vat,
        correct_vat: item.correct_vat,
        original_excise: item.original_excise,
        correct_excise: item.correct_excise,
      })) || [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const claimReasons: { value: ClaimReason; label: string }[] = [
    { value: 'tariff_code_error', label: 'Incorrect Tariff Code' },
    { value: 'origin_relief', label: 'Origin Preference Not Applied' },
    { value: 'goods_return', label: 'Goods Returned' },
    { value: 'goods_destroyed', label: 'Goods Destroyed' },
    { value: 'vat_postponement', label: 'VAT Postponement Error' },
    { value: 'incorrect_valuation', label: 'Incorrect Valuation' },
    { value: 'preference_not_claimed', label: 'Preference Not Claimed' },
    { value: 'relief_not_applied', label: 'Relief Not Applied' },
    { value: 'system_error', label: 'System Error' },
    { value: 'duplicate_payment', label: 'Duplicate Payment' },
    { value: 'rate_change', label: 'Rate Change' },
    { value: 'other', label: 'Other' },
  ];

  const addItem = () => {
    const newItem: ClaimItemFormData = {
      id: crypto.randomUUID(),
      item_number: formData.items.length + 1,
      commodity_code: '',
      description: '',
      invoice_value: 0,
      original_duty: 0,
      correct_duty: 0,
      original_vat: 0,
      correct_vat: 0,
      original_excise: 0,
      correct_excise: 0,
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  const removeItem = (id: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item) => item.id !== id),
    });
  };

  const updateItem = (id: string, field: keyof ClaimItemFormData, value: string | number) => {
    setFormData({
      ...formData,
      items: formData.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.trader_eori) newErrors.trader_eori = 'EORI is required';
    if (!formData.trader_name) newErrors.trader_name = 'Trader name is required';
    if (!formData.reason_description) newErrors.reason_description = 'Description is required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';

    formData.items.forEach((item, index) => {
      if (!item.commodity_code) newErrors[`item_${index}_commodity`] = 'Commodity code required';
      if (!item.description) newErrors[`item_${index}_description`] = 'Description required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      // Calculate totals
      const original_duty = formData.items.reduce((sum, item) => sum + item.original_duty, 0);
      const correct_duty = formData.items.reduce((sum, item) => sum + item.correct_duty, 0);
      const original_vat = formData.items.reduce((sum, item) => sum + item.original_vat, 0);
      const correct_vat = formData.items.reduce((sum, item) => sum + item.correct_vat, 0);
      const original_excise = formData.items.reduce((sum, item) => sum + item.original_excise, 0);
      const correct_excise = formData.items.reduce((sum, item) => sum + item.correct_excise, 0);

      const duty_overpayment = original_duty - correct_duty;
      const vat_overpayment = original_vat - correct_vat;
      const excise_overpayment = original_excise - correct_excise;

      // Update claim items
      const items: Omit<C285ClaimItem, 'claim_id'>[] = formData.items.map((item) => ({
        id: item.id,
        item_number: item.item_number,
        commodity_code: item.commodity_code,
        description: item.description,
        invoice_value: item.invoice_value,
        invoice_currency: 'GBP',
        original_duty: item.original_duty,
        correct_duty: item.correct_duty,
        duty_overpayment: item.original_duty - item.correct_duty,
        original_vat: item.original_vat,
        correct_vat: item.correct_vat,
        vat_overpayment: item.original_vat - item.correct_vat,
        original_excise: item.original_excise,
        correct_excise: item.correct_excise,
        excise_overpayment: item.original_excise - item.correct_excise,
        item_claim_amount:
          item.original_duty -
          item.correct_duty +
          (item.original_vat - item.correct_vat) +
          (item.original_excise - item.correct_excise),
        error_explanation: formData.reason_description,
      }));

      // Update claim
      await claimsAPI.updateClaim(claim.id, {
        mrn: formData.mrn || undefined,
        trader_eori: formData.trader_eori,
        trader_name: formData.trader_name,
        reason: formData.reason,
        reason_description: formData.reason_description,
        original_duty,
        correct_duty,
        duty_overpayment,
        original_vat,
        correct_vat,
        vat_overpayment,
        original_excise,
        correct_excise,
        excise_overpayment,
        original_total: original_duty + original_vat + original_excise,
        correct_total: correct_duty + correct_vat + correct_excise,
        total_claim_amount: duty_overpayment + vat_overpayment + excise_overpayment,
        items: items as C285ClaimItem[],
      });

      onSuccess();
    } catch (error) {
      console.error('Failed to update claim:', error);
      alert('Failed to update claim. Please try again.');
    } finally {
      setIsSaving(false);
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
          maxWidth: '1000px',
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
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Edit Claim</h2>
            <p
              style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}
            >
              {claim.reference}
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

        {/* Form - Same as NewClaimForm but with pre-populated data */}
        <div style={{ padding: '2rem' }}>
          {/* Basic Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Basic Information
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  MRN (Optional)
                </label>
                <input
                  type="text"
                  value={formData.mrn}
                  onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                  placeholder="23GB001XYZ123456789"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                    }}
                  >
                    Trader EORI <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.trader_eori}
                    onChange={(e) => setFormData({ ...formData, trader_eori: e.target.value })}
                    placeholder="GB123456789000"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.trader_eori ? '#ef4444' : 'var(--border)'}`,
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                  {errors.trader_eori && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#ef4444',
                        marginTop: '0.25rem',
                        display: 'block',
                      }}
                    >
                      {errors.trader_eori}
                    </span>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                    }}
                  >
                    Trader Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.trader_name}
                    onChange={(e) => setFormData({ ...formData, trader_name: e.target.value })}
                    placeholder="Importer Ltd"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.trader_name ? '#ef4444' : 'var(--border)'}`,
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                  {errors.trader_name && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#ef4444',
                        marginTop: '0.25rem',
                        display: 'block',
                      }}
                    >
                      {errors.trader_name}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  Claim Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value as ClaimReason })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                >
                  {claimReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  Reason Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={formData.reason_description}
                  onChange={(e) => setFormData({ ...formData, reason_description: e.target.value })}
                  placeholder="Explain the reason for the claim..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.reason_description ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                  }}
                />
                {errors.reason_description && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    {errors.reason_description}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Claim Items */}
          <div style={{ marginBottom: '2rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Claim Items</h3>
              <button
                onClick={addItem}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--accent-purple)',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                <Plus size={16} />
                Add Item
              </button>
            </div>

            {errors.items && (
              <div
                style={{
                  padding: '1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '0.875rem', color: '#ef4444' }}>{errors.items}</span>
              </div>
            )}

            {formData.items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: '1.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  background: '#f9fafb',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                    Item {item.item_number}
                  </h4>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      padding: '0.5rem',
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      borderRadius: '6px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                        }}
                      >
                        Commodity Code <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={item.commodity_code}
                        onChange={(e) => updateItem(item.id, 'commodity_code', e.target.value)}
                        placeholder="8471300000"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: `1px solid ${errors[`item_${index}_commodity`] ? '#ef4444' : 'var(--border)'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                        }}
                      >
                        Description <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Laptop computers"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: `1px solid ${errors[`item_${index}_description`] ? '#ef4444' : 'var(--border)'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                        }}
                      >
                        Original Duty (£)
                      </label>
                      <input
                        type="number"
                        value={item.original_duty}
                        onChange={(e) =>
                          updateItem(item.id, 'original_duty', parseFloat(e.target.value) || 0)
                        }
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                        }}
                      >
                        Correct Duty (£)
                      </label>
                      <input
                        type="number"
                        value={item.correct_duty}
                        onChange={(e) =>
                          updateItem(item.id, 'correct_duty', parseFloat(e.target.value) || 0)
                        }
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                          color: 'var(--accent-purple)',
                        }}
                      >
                        Duty Overpayment
                      </label>
                      <input
                        type="text"
                        value={`£${(item.original_duty - item.correct_duty).toFixed(2)}`}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          background: 'var(--card-bg)',
                          fontWeight: 600,
                          color: 'var(--accent-purple)',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                        }}
                      >
                        Original VAT (£)
                      </label>
                      <input
                        type="number"
                        value={item.original_vat}
                        onChange={(e) =>
                          updateItem(item.id, 'original_vat', parseFloat(e.target.value) || 0)
                        }
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                        }}
                      >
                        Correct VAT (£)
                      </label>
                      <input
                        type="number"
                        value={item.correct_vat}
                        onChange={(e) =>
                          updateItem(item.id, 'correct_vat', parseFloat(e.target.value) || 0)
                        }
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                          color: 'var(--accent-purple)',
                        }}
                      >
                        VAT Overpayment
                      </label>
                      <input
                        type="text"
                        value={`£${(item.original_vat - item.correct_vat).toFixed(2)}`}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          background: 'var(--card-bg)',
                          fontWeight: 600,
                          color: 'var(--accent-purple)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {formData.items.length === 0 && (
              <div
                style={{
                  padding: '3rem',
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <p>No items added yet. Click "Add Item" to get started.</p>
              </div>
            )}
          </div>

          {/* Total Summary */}
          {formData.items.length > 0 && (
            <div
              style={{
                padding: '1.5rem',
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>Total Claim Amount:</span>
                <span
                  style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-purple)' }}
                >
                  £
                  {formData.items
                    .reduce(
                      (sum, item) =>
                        sum +
                        (item.original_duty - item.correct_duty) +
                        (item.original_vat - item.correct_vat) +
                        (item.original_excise - item.correct_excise),
                      0
                    )
                    .toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            background: '#f9fafb',
          }}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            style={{
              padding: '0.75rem 1.5rem',
              background: isSaving ? 'var(--text-muted)' : 'var(--accent-purple)',
              color: 'var(--text-light)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
