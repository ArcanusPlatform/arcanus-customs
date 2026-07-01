import { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Contact } from '@/types';

type SupportContactType = Extract<Contact['type'], 'agent' | 'hmrc'>;

interface SupportContactFormData {
  name: string;
  contact_person?: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  postcode?: string;
  country?: string;
  notes?: string;
}

interface SupportContactModalProps {
  isOpen: boolean;
  type: SupportContactType;
  contact: Contact | null;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (data: SupportContactFormData) => void;
}

const initialFormState: SupportContactFormData = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postcode: '',
  country: 'GB',
  notes: '',
};

export default function SupportContactModal({
  isOpen,
  type,
  contact,
  isSaving = false,
  onClose,
  onSubmit,
}: SupportContactModalProps) {
  const [formData, setFormData] = useState<SupportContactFormData>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        contact_person: contact.contact_person,
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        city: contact.city,
        postcode: contact.postcode,
        country: contact.country,
        notes: contact.notes,
      });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
  }, [contact]);

  if (!isOpen) return null;

  const handleChange = (field: keyof SupportContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim() || !formData.email.includes('@'))
      newErrors.email = 'Valid email required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address?.trim()) newErrors.address = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(formData);
  };

  const typeLabel = type === 'agent' ? 'Agent Contact' : 'HMRC Office';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div>
            <p
              style={{
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                color: '#94a3b8',
                margin: 0,
              }}
            >
              Directory
            </p>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              {contact ? `Edit ${typeLabel}` : `Add ${typeLabel}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '8px',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem 1.75rem', display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.65rem',
                borderRadius: '10px',
                border: errors.name ? '1px solid #f87171' : '1px solid #cbd5f5',
              }}
            />
            {errors.name && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Contact Person</label>
            <input
              type="text"
              value={formData.contact_person || ''}
              onChange={(e) => handleChange('contact_person', e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.65rem',
                borderRadius: '10px',
                border: '1px solid #cbd5f5',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: errors.email ? '1px solid #f87171' : '1px solid #cbd5f5',
                }}
              />
              {errors.email && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: errors.phone ? '1px solid #f87171' : '1px solid #cbd5f5',
                }}
              />
              {errors.phone && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.65rem',
                borderRadius: '10px',
                border: errors.address ? '1px solid #f87171' : '1px solid #cbd5f5',
              }}
            />
            {errors.address && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.address}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            }}
          >
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5f5',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Postcode</label>
              <input
                type="text"
                value={formData.postcode || ''}
                onChange={(e) => handleChange('postcode', e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5f5',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Country</label>
              <input
                type="text"
                value={formData.country || ''}
                onChange={(e) => handleChange('country', e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5f5',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.65rem',
                borderRadius: '10px',
                border: '1px solid #cbd5f5',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={onClose}
            style={{
              border: '1px solid #cbd5f5',
              background: 'white',
              padding: '0.65rem 1.25rem',
              borderRadius: '999px',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: 'none',
              background: 'black',
              color: 'white',
              borderRadius: '999px',
              padding: '0.65rem 1.4rem',
              fontWeight: 600,
              opacity: isSaving ? 0.7 : 1,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={18} />
            {contact ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { SupportContactFormData, SupportContactType };
