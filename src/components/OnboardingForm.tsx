import { useState } from 'react';
import { X, Building2, MapPin, FileText, CreditCard, User } from 'lucide-react';

interface OnboardingFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type ClientType = 'individual' | 'business';
type LegalEntityType = 'ltd' | 'plc' | 'llp' | 'partnership' | 'sole_trader' | 'charity' | 'other';

interface ClientFormData {
  // Type
  clientType: ClientType;
  legalEntityType: LegalEntityType | '';

  // Basic Information (Business)
  companyName: string;
  tradingName: string;
  companyNumber: string;

  // Basic Information (Individual)
  firstName: string;
  lastName: string;
  dateOfBirth: string;

  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone: string;

  // Address
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;

  // Tax & Customs
  eori: string;
  vatNumber: string;

  // Banking (optional for now)
  bankName: string;
  accountNumber: string;
  sortCode: string;

  // Additional
  notes: string;
}

export default function OnboardingForm({ onClose, onSuccess }: OnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    clientType: 'business',
    legalEntityType: '',
    companyName: '',
    tradingName: '',
    companyNumber: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    eori: '',
    vatNumber: '',
    bankName: '',
    accountNumber: '',
    sortCode: '',
    notes: '',
  });

  const updateField = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Import the contacts API
      const { contactsAPI } = await import('@/lib/api-service');

      // Build the contact object
      const newContact = {
        type: formData.clientType as 'business' | 'individual',
        name:
          formData.clientType === 'business'
            ? formData.companyName
            : `${formData.firstName} ${formData.lastName}`,
        email: formData.contactEmail,
        phone: formData.contactPhone,
        address: formData.addressLine1,
        address_line_2: formData.addressLine2,
        city: formData.city,
        postcode: formData.postcode,
        country: formData.country,

        // Business-specific fields
        ...(formData.clientType === 'business' && {
          legal_entity_type: formData.legalEntityType as any,
          company_number: formData.companyNumber,
          contact_person: formData.contactName,
        }),

        // Tax details
        eori: formData.eori || undefined,
        vat_number: formData.vatNumber || undefined,

        // Bank details
        bank_account_name: formData.bankName || undefined,
        bank_account_number: formData.accountNumber || undefined,
        bank_sort_code: formData.sortCode || undefined,

        // Additional
        notes: formData.notes || undefined,
        allows_agent_refund: true,
      };

      // Create the contact
      await contactsAPI.createContact(newContact);

      onSuccess();
    } catch (error) {
      console.error('Failed to create client:', error);
      alert('Failed to create client. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid =
    formData.clientType === 'business'
      ? formData.companyName && formData.contactEmail
      : formData.firstName && formData.lastName && formData.contactEmail;
  const isStep2Valid = formData.addressLine1 && formData.city && formData.postcode;
  const isStep3Valid = formData.eori || formData.vatNumber;

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
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Start Client Onboarding
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Step {step} of 4 - {getStepTitle(step, formData.clientType)}
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

        {/* Progress Bar */}
        <div style={{ padding: '0 2rem' }}>
          <div
            style={{
              height: '4px',
              background: '#e2e8f0',
              borderRadius: '999px',
              overflow: 'hidden',
              marginTop: '1rem',
            }}
          >
            <div
              style={{
                width: `${(step / 4) * 100}%`,
                height: '100%',
                background: 'var(--accent-purple)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Client Type Selection */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                >
                  Client Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => updateField('clientType', 'business')}
                    style={{
                      padding: '1rem',
                      border: `2px solid ${formData.clientType === 'business' ? 'var(--accent-purple)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      background:
                        formData.clientType === 'business' ? 'rgba(124, 58, 237, 0.1)' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Building2
                      size={24}
                      style={{
                        color:
                          formData.clientType === 'business'
                            ? 'var(--accent-purple)'
                            : 'var(--text-muted)',
                      }}
                    />
                    <span style={{ fontWeight: 600 }}>Business / Company</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Ltd, PLC, LLP, etc.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('clientType', 'individual')}
                    style={{
                      padding: '1rem',
                      border: `2px solid ${formData.clientType === 'individual' ? 'var(--accent-purple)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      background:
                        formData.clientType === 'individual' ? 'rgba(124, 58, 237, 0.1)' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <User
                      size={24}
                      style={{
                        color:
                          formData.clientType === 'individual'
                            ? 'var(--accent-purple)'
                            : 'var(--text-muted)',
                      }}
                    />
                    <span style={{ fontWeight: 600 }}>Individual</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Sole trader, person
                    </span>
                  </button>
                </div>
              </div>

              {/* Business Information */}
              {formData.clientType === 'business' && (
                <div>
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Building2 size={20} style={{ color: 'var(--accent-purple)' }} />
                    Company Information
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Legal Entity Type
                      </label>
                      <select
                        className="authInput"
                        value={formData.legalEntityType}
                        onChange={(e) => updateField('legalEntityType', e.target.value)}
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

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Company Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="authInput"
                        value={formData.companyName}
                        onChange={(e) => updateField('companyName', e.target.value)}
                        placeholder="Enter registered company name"
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Trading Name
                      </label>
                      <input
                        type="text"
                        className="authInput"
                        value={formData.tradingName}
                        onChange={(e) => updateField('tradingName', e.target.value)}
                        placeholder="If different from company name"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Company Number
                      </label>
                      <input
                        type="text"
                        className="authInput"
                        value={formData.companyNumber}
                        onChange={(e) => updateField('companyNumber', e.target.value)}
                        placeholder="Companies House number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Information */}
              {formData.clientType === 'individual' && (
                <div>
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <User size={20} style={{ color: 'var(--accent-purple)' }} />
                    Personal Information
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label
                          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                        >
                          First Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="authInput"
                          value={formData.firstName}
                          onChange={(e) => updateField('firstName', e.target.value)}
                          placeholder="First name"
                          required
                        />
                      </div>

                      <div>
                        <label
                          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                        >
                          Last Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="authInput"
                          value={formData.lastName}
                          onChange={(e) => updateField('lastName', e.target.value)}
                          placeholder="Last name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        className="authInput"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateField('dateOfBirth', e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Trading Name (if applicable)
                      </label>
                      <input
                        type="text"
                        className="authInput"
                        value={formData.tradingName}
                        onChange={(e) => updateField('tradingName', e.target.value)}
                        placeholder="Business trading name"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <User size={20} style={{ color: 'var(--accent-purple)' }} />
                  {formData.clientType === 'business' ? 'Primary Contact' : 'Contact Details'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {formData.clientType === 'business' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        className="authInput"
                        value={formData.contactName}
                        onChange={(e) => updateField('contactName', e.target.value)}
                        placeholder="Primary contact person"
                      />
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: '0.25rem',
                        }}
                      >
                        Main point of contact at the company
                      </p>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Email Address <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="authInput"
                      value={formData.contactEmail}
                      onChange={(e) => updateField('contactEmail', e.target.value)}
                      placeholder={
                        formData.clientType === 'business'
                          ? 'contact@company.com'
                          : 'your@email.com'
                      }
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="authInput"
                      value={formData.contactPhone}
                      onChange={(e) => updateField('contactPhone', e.target.value)}
                      placeholder="+44 20 1234 5678"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <MapPin size={20} style={{ color: 'var(--accent-purple)' }} />
                Business Address
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Address Line 1 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="authInput"
                    value={formData.addressLine1}
                    onChange={(e) => updateField('addressLine1', e.target.value)}
                    placeholder="Street address"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    className="authInput"
                    value={formData.addressLine2}
                    onChange={(e) => updateField('addressLine2', e.target.value)}
                    placeholder="Building, suite, etc."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                      City <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="authInput"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="City"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Postcode <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="authInput"
                      value={formData.postcode}
                      onChange={(e) => updateField('postcode', e.target.value)}
                      placeholder="SW1A 1AA"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Country
                  </label>
                  <input
                    type="text"
                    className="authInput"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <FileText size={20} style={{ color: 'var(--accent-purple)' }} />
                Tax & Customs Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    EORI Number
                  </label>
                  <input
                    type="text"
                    className="authInput"
                    value={formData.eori}
                    onChange={(e) => updateField('eori', e.target.value)}
                    placeholder="GB123456789000"
                    style={{ fontFamily: 'monospace' }}
                  />
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.25rem',
                    }}
                  >
                    Economic Operators Registration and Identification number
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    VAT Number
                  </label>
                  <input
                    type="text"
                    className="authInput"
                    value={formData.vatNumber}
                    onChange={(e) => updateField('vatNumber', e.target.value)}
                    placeholder="GB123456789"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div
                  style={{
                    background: 'rgba(124, 58, 237, 0.1)',
                    border: '1px solid rgba(124, 58, 237, 0.2)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginTop: '1rem',
                  }}
                >
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>
                    <strong>Note:</strong> At least one of EORI or VAT number is required to proceed
                    with customs declarations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CreditCard size={20} style={{ color: 'var(--accent-purple)' }} />
                Banking Details (Optional)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    className="authInput"
                    value={formData.bankName}
                    onChange={(e) => updateField('bankName', e.target.value)}
                    placeholder="e.g., Barclays, HSBC"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      className="authInput"
                      value={formData.accountNumber}
                      onChange={(e) => updateField('accountNumber', e.target.value)}
                      placeholder="12345678"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Sort Code
                    </label>
                    <input
                      type="text"
                      className="authInput"
                      value={formData.sortCode}
                      onChange={(e) => updateField('sortCode', e.target.value)}
                      placeholder="12-34-56"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Additional Notes
                  </label>
                  <textarea
                    className="authInput"
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Any additional information about this client..."
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    padding: '1rem',
                  }}
                >
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>
                    Banking details can be added later. They're required for duty repayment claims.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="btn-primary"
                disabled={
                  (step === 1 && !isStep1Valid) ||
                  (step === 2 && !isStep2Valid) ||
                  (step === 3 && !isStep3Valid)
                }
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary btn-onboarding"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Client...' : 'Create Client'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStepTitle(step: number, clientType: ClientType): string {
  switch (step) {
    case 1:
      return clientType === 'business' ? 'Company & Contact' : 'Personal & Contact';
    case 2:
      return clientType === 'business' ? 'Business Address' : 'Address';
    case 3:
      return 'Tax & Customs';
    case 4:
      return 'Banking & Notes';
    default:
      return '';
  }
}
