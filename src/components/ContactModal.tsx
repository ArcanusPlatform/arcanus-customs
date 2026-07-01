import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { contactsAPI } from '@/lib/api-service';
import type { Contact, ContactType } from '@/types';
import { validateContactForClaim } from '@/types';

interface ContactModalProps {
  contact: Contact | null;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  requireEori?: boolean;
  requireBankDetails?: boolean;
}

export default function ContactModal({
  contact,
  onClose,
  onSave,
  requireEori = false,
  requireBankDetails = false,
}: ContactModalProps) {
  const [formData, setFormData] = useState<Partial<Contact>>({
    type: 'business',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    address_line_2: '',
    city: '',
    postcode: '',
    country: 'GB',
    eori: '',
    vat_number: '',
    company_number: '',
    // 🆕 Enhanced business identity (Group B)
    legal_entity_type: undefined,
    registered_address_line_1: '',
    registered_address_line_2: '',
    registered_city: '',
    registered_postcode: '',
    registered_country: 'GB',
    company_country_of_establishment: 'GB',
    // 🆕 Individual fields
    date_of_birth: '',
    national_id_passport: '',
    // 🆕 Contact preferences
    preferred_contact_method: 'email',
    alternative_email: '',
    // 🆕 Deferment
    has_deferment_account: false,
    deferment_account_number: '',
    // Bank details
    bank_account_name: '',
    bank_account_number: '',
    bank_sort_code: '',
    bank_iban: '',
    bank_swift: '',
    allows_agent_refund: false,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showRegisteredAddress, setShowRegisteredAddress] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData(contact);
      setShowBankDetails(!!(contact.bank_account_number || contact.bank_sort_code));
      // Show registered address section if any registered address field is filled
      setShowRegisteredAddress(
        !!(
          contact.registered_address_line_1 ||
          contact.registered_address_line_2 ||
          contact.registered_city ||
          contact.registered_postcode
        )
      );
    }
  }, [contact]);

  const handleChange = (field: keyof Contact, value: string | boolean | undefined) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = (): boolean => {
    const validation = validateContactForClaim(
      formData as Contact,
      requireEori,
      requireBankDetails
    );

    if (!validation.valid) {
      const newErrors: Record<string, string> = {};
      validation.errors.forEach((err) => {
        newErrors[err.field] = err.message;
      });
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      let savedContact: Contact;

      if (contact) {
        // Update existing
        savedContact = await contactsAPI.updateContact(contact.id, formData);
      } else {
        // Create new
        savedContact = await contactsAPI.createContact(
          formData as Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'created_by'>
        );
      }

      onSave(savedContact);
    } catch (error) {
      console.error('Failed to save contact:', error);
      alert('Failed to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  const contactTypes: { value: ContactType; label: string }[] = [
    { value: 'individual', label: 'Individual' },
    { value: 'business', label: 'Business' },
    { value: 'agent', label: 'Agent' },
    { value: 'hmrc', label: 'HMRC' },
  ];

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
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            {contact ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '2rem' }}>
          {/* Contact Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              Contact Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              {contactTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              {formData.type === 'individual' ? 'Full Name' : 'Business Name'}{' '}
              <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Smith or XYZ Ltd"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${errors.name ? '#ef4444' : 'var(--border)'}`,
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            />
            {errors.name && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                {errors.name}
              </span>
            )}
          </div>

          {/* Contact Person (for business/agent) */}
          {(formData.type === 'business' || formData.type === 'agent') && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                placeholder="Person responsible"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          )}

          {/* Email & Phone */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
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
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.email ? '#ef4444' : 'var(--border)'}`,
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
              {errors.email && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    marginTop: '0.25rem',
                    display: 'block',
                  }}
                >
                  {errors.email}
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
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+44 7000 000000"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Trading/Business Address */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              {formData.type === 'business' || formData.type === 'agent'
                ? 'Trading Address'
                : 'Address'}{' '}
              <span style={{ color: '#ef4444' }}>*</span>
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
                  Address Line 1 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 High Street"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.address ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                />
                {errors.address && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    {errors.address}
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
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.address_line_2 || ''}
                  onChange={(e) => handleChange('address_line_2', e.target.value)}
                  placeholder="Suite 100"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                    }}
                  >
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="London"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
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
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => handleChange('postcode', e.target.value)}
                    placeholder="SW1A 1AA"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
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
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="GB"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tax Registration */}
          {(formData.type === 'business' || formData.type === 'agent') && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Tax Registration
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                    }}
                  >
                    EORI {requireEori && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.eori}
                    onChange={(e) => handleChange('eori', e.target.value)}
                    placeholder="GB123456789000"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.eori ? '#ef4444' : 'var(--border)'}`,
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                  {errors.eori && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#ef4444',
                        marginTop: '0.25rem',
                        display: 'block',
                      }}
                    >
                      {errors.eori}
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
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.vat_number}
                    onChange={(e) => handleChange('vat_number', e.target.value)}
                    placeholder="GB123 4567 89"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
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
                    Company Number
                  </label>
                  <input
                    type="text"
                    value={formData.company_number}
                    onChange={(e) => handleChange('company_number', e.target.value)}
                    placeholder="12345678"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 🆕 Group B: Enhanced Business Identity */}
          {(formData.type === 'business' || formData.type === 'agent') && (
            <>
              {/* B1. Legal Entity Type */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  Legal Entity Type
                </label>
                <select
                  value={formData.legal_entity_type || ''}
                  onChange={(e) => handleChange('legal_entity_type', e.target.value || undefined)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">Select entity type</option>
                  <option value="ltd">Limited Company (Ltd)</option>
                  <option value="plc">Public Limited Company (PLC)</option>
                  <option value="llp">Limited Liability Partnership (LLP)</option>
                  <option value="partnership">Partnership</option>
                  <option value="sole_trader">Sole Trader</option>
                  <option value="charity">Charity</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* B2. Registered Business Address (with toggle) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showRegisteredAddress}
                      onChange={(e) => setShowRegisteredAddress(e.target.checked)}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Registered address is different from trading address
                    </span>
                  </label>
                </div>

                {showRegisteredAddress && (
                  <div
                    style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                      Registered Business Address
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
                          Address Line 1
                        </label>
                        <input
                          type="text"
                          value={formData.registered_address_line_1}
                          onChange={(e) =>
                            handleChange('registered_address_line_1', e.target.value)
                          }
                          placeholder="123 Business Street"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            background: 'var(--card-bg)',
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
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={formData.registered_address_line_2}
                          onChange={(e) =>
                            handleChange('registered_address_line_2', e.target.value)
                          }
                          placeholder="Suite 100"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            background: 'var(--card-bg)',
                          }}
                        />
                      </div>
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}
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
                            City
                          </label>
                          <input
                            type="text"
                            value={formData.registered_city}
                            onChange={(e) => handleChange('registered_city', e.target.value)}
                            placeholder="London"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              background: 'var(--card-bg)',
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
                            Postcode
                          </label>
                          <input
                            type="text"
                            value={formData.registered_postcode}
                            onChange={(e) => handleChange('registered_postcode', e.target.value)}
                            placeholder="SW1A 1AA"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              background: 'var(--card-bg)',
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
                            Country
                          </label>
                          <input
                            type="text"
                            value={formData.registered_country}
                            onChange={(e) => handleChange('registered_country', e.target.value)}
                            placeholder="GB"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              background: 'var(--card-bg)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* B3. Company Country of Establishment */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  Country of Establishment
                </label>
                <input
                  type="text"
                  value={formData.company_country_of_establishment}
                  onChange={(e) => handleChange('company_country_of_establishment', e.target.value)}
                  placeholder="GB"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                    display: 'block',
                  }}
                >
                  Country where the company is legally incorporated
                </span>
              </div>
            </>
          )}

          {/* 🆕 Group B: Individual Additional Fields */}
          {formData.type === 'individual' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Additional Information
              </h3>
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
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
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
                    National ID / Passport Number
                  </label>
                  <input
                    type="text"
                    value={formData.national_id_passport}
                    onChange={(e) => handleChange('national_id_passport', e.target.value)}
                    placeholder="AB123456C or 123456789"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 🆕 Group B: Contact Preferences */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Contact Preferences
            </h3>
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
                  Preferred Contact Method
                </label>
                <select
                  value={formData.preferred_contact_method}
                  onChange={(e) => handleChange('preferred_contact_method', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="post">Post</option>
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
                  Alternative Email
                </label>
                <input
                  type="email"
                  value={formData.alternative_email}
                  onChange={(e) => handleChange('alternative_email', e.target.value)}
                  placeholder="alternative@example.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 🆕 Group B: Deferment Account */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Deferment Account
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={formData.has_deferment_account}
                  onChange={(e) => handleChange('has_deferment_account', e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Has Deferment Account</span>
              </label>
            </div>
            {formData.has_deferment_account && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  Deferment Account Number
                </label>
                <input
                  type="text"
                  value={formData.deferment_account_number}
                  onChange={(e) => handleChange('deferment_account_number', e.target.value)}
                  placeholder="1234567"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            )}
          </div>

          {/* Bank Details */}
          {(formData.type === 'individual' || formData.type === 'business') && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Bank Details (Optional)
                </h3>
                <button
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {showBankDetails ? 'Hide' : 'Show'}
                </button>
              </div>
              {showBankDetails && (
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
                      Account Holder{' '}
                      {requireBankDetails && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_name}
                      onChange={(e) => handleChange('bank_account_name', e.target.value)}
                      placeholder="John Smith"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${errors.bank_account_name ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '8px',
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
                      Sort Code {requireBankDetails && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.bank_sort_code}
                      onChange={(e) => handleChange('bank_sort_code', e.target.value)}
                      placeholder="00-00-00"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${errors.bank_sort_code ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '8px',
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
                      Account Number{' '}
                      {requireBankDetails && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => handleChange('bank_account_number', e.target.value)}
                      placeholder="12345678"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${errors.bank_account_number ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '8px',
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
                      IBAN (International)
                    </label>
                    <input
                      type="text"
                      value={formData.bank_iban}
                      onChange={(e) => handleChange('bank_iban', e.target.value)}
                      placeholder="GB00 ABCD 1234 5678 9012 34"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Agent Authority */}
          {formData.type === 'business' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={formData.allows_agent_refund}
                  onChange={(e) => handleChange('allows_agent_refund', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Allow agent to receive refunds (requires signed authority)</span>
              </label>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional information..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
          </div>
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
            onClick={handleSave}
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
            {isSaving ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}
