/**
 * Multi-Step Registration Component
 *
 * Implements HMRC-compliant user onboarding with:
 * - Step 1: Basic account information
 * - Step 2: User type selection (SELF vs AGENT)
 * - Step 3: Declarant information (name, capacity, organisation)
 * - Step 4: Entity type selection (SELF users only)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 10.1, 10.2
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { validateDeclarantCapacity } from '@/lib/identity-validator';
import type { SignupFormData } from '@/types';
import BrandingHeader from '@/components/auth/BrandingHeader';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Current step (1-4)
  const [step, setStep] = useState(1);

  // Form data
  const [formData, setFormData] = useState<SignupFormData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
    user_type: '',
    declarant_name: '',
    declarant_capacity: '',
    declarant_organisation_name: '',
    entity_type: '',
  });

  // Terms agreement
  const [agree, setAgree] = useState(false);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form field
  const updateField = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  // Validate step 1: Basic account info
  const validateStep1 = (): boolean => {
    if (!formData.first_name.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email address is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      return false;
    }
    if (!agree) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return false;
    }
    return true;
  };

  // Validate step 2: User type selection
  const validateStep2 = (): boolean => {
    if (!formData.user_type) {
      setError('Please select a user type');
      return false;
    }
    return true;
  };

  // Validate step 3: Declarant information
  const validateStep3 = (): boolean => {
    if (!formData.declarant_name.trim()) {
      setError('Declarant name is required');
      return false;
    }
    if (!formData.declarant_capacity) {
      setError('Declarant capacity is required');
      return false;
    }

    // Validate declarant capacity against HMRC-approved values
    const capacityValidation = validateDeclarantCapacity(formData.declarant_capacity);
    if (!capacityValidation.valid) {
      setError(capacityValidation.error || 'Invalid declarant capacity');
      return false;
    }

    // Organisation name required for AGENT users
    if (formData.user_type === 'AGENT' && !formData.declarant_organisation_name.trim()) {
      setError('Organisation name is required for agent users');
      return false;
    }

    return true;
  };

  // Validate step 4: Entity type (SELF users only)
  const validateStep4 = (): boolean => {
    if (formData.user_type === 'SELF' && !formData.entity_type) {
      setError('Entity type is required');
      return false;
    }
    return true;
  };

  // Handle next step
  const handleNext = () => {
    setError(null);

    // Validate current step
    let isValid = false;
    if (step === 1) isValid = validateStep1();
    else if (step === 2) isValid = validateStep2();
    else if (step === 3) isValid = validateStep3();

    if (!isValid) return;

    // Move to next step
    if (step === 3 && formData.user_type === 'AGENT') {
      // AGENT users skip step 4 (entity type)
      handleSubmit();
    } else if (step === 3 && formData.user_type === 'SELF') {
      // SELF users go to step 4 (entity type)
      setStep(4);
    } else {
      setStep(step + 1);
    }
  };

  // Handle back
  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  // Handle final submission
  const handleSubmit = async () => {
    setError(null);

    // Validate final step if on step 4
    if (step === 4 && !validateStep4()) {
      return;
    }

    setLoading(true);
    try {
      // Call register function from AuthContext
      await register(formData);

      // Navigate to dashboard after successful registration
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render progress indicator
  const renderProgress = () => {
    const totalSteps = formData.user_type === 'AGENT' ? 3 : 4;
    const currentStep = step;

    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: index < currentStep ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)',
                marginRight: index < totalSteps - 1 ? '8px' : '0',
                borderRadius: '2px',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
        <p style={{ fontSize: '0.85rem', color: '#ffffff', textAlign: 'center' }}>
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    );
  };

  // Render step 1: Basic account info
  const renderStep1 = () => (
    <>
      <h1 className="authTitle">Create Your Account</h1>

      <input
        type="text"
        className="authInput"
        placeholder="First Name *"
        value={formData.first_name}
        onChange={(e) => updateField('first_name', e.target.value)}
        required
      />

      <input
        type="text"
        className="authInput"
        placeholder="Last Name *"
        value={formData.last_name}
        onChange={(e) => updateField('last_name', e.target.value)}
        required
      />

      <input
        type="email"
        className="authInput"
        placeholder="Email Address *"
        value={formData.email}
        onChange={(e) => updateField('email', e.target.value)}
        required
      />

      <input
        type="password"
        className="authInput"
        placeholder="Password (min 8 characters) *"
        value={formData.password}
        onChange={(e) => updateField('password', e.target.value)}
        required
      />

      <input
        type="password"
        className="authInput"
        placeholder="Confirm Password *"
        value={formData.password_confirm}
        onChange={(e) => updateField('password_confirm', e.target.value)}
        required
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '1rem',
        }}
      >
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          style={{ width: '16px', height: '16px', accentColor: '#8b5cf6', flexShrink: 0 }}
        />
        <label style={{ fontSize: '0.8rem', lineHeight: 1.3, textAlign: 'left' }}>
          I agree to the{' '}
          <a href="/terms" style={{ color: '#a78bfa' }}>
            Terms of Service
          </a>
          <br />
          and{' '}
          <a href="/privacy" style={{ color: '#a78bfa' }}>
            Privacy Policy
          </a>
        </label>
      </div>
    </>
  );

  // Render step 2: User type selection
  const renderStep2 = () => (
    <>
      <h1 className="authTitle">Select User Type</h1>

      <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
        {/* SELF User Option */}
        <div
          onClick={() => updateField('user_type', 'SELF')}
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            border: `2px solid ${formData.user_type === 'SELF' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor:
              formData.user_type === 'SELF'
                ? 'rgba(139, 92, 246, 0.14)'
                : 'rgba(255, 255, 255, 0.05)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <input
              type="radio"
              name="user_type"
              value="SELF"
              checked={formData.user_type === 'SELF'}
              onChange={() => updateField('user_type', 'SELF')}
              style={{ marginRight: '0.75rem', accentColor: '#8b5cf6' }}
            />
            <strong style={{ fontSize: '1.1rem' }}>SELF User</strong>
          </div>
          <p
            style={{ fontSize: '0.9rem', marginLeft: '1.75rem', color: 'rgba(255, 255, 255, 0.8)' }}
          >
            I submit duty repayment claims for my own entity (individual, sole trader, partnership,
            company, etc.)
          </p>
        </div>

        {/* AGENT User Option */}
        <div
          onClick={() => updateField('user_type', 'AGENT')}
          style={{
            padding: '1rem',
            border: `2px solid ${formData.user_type === 'AGENT' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor:
              formData.user_type === 'AGENT'
                ? 'rgba(139, 92, 246, 0.14)'
                : 'rgba(255, 255, 255, 0.05)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <input
              type="radio"
              name="user_type"
              value="AGENT"
              checked={formData.user_type === 'AGENT'}
              onChange={() => updateField('user_type', 'AGENT')}
              style={{ marginRight: '0.75rem', accentColor: '#8b5cf6' }}
            />
            <strong style={{ fontSize: '1.1rem' }}>AGENT User</strong>
          </div>
          <p
            style={{ fontSize: '0.9rem', marginLeft: '1.75rem', color: 'rgba(255, 255, 255, 0.8)' }}
          >
            I submit duty repayment claims on behalf of clients (customs broker, freight forwarder,
            accountant, duty representative)
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '0.75rem',
          backgroundColor: 'rgba(139, 92, 246, 0.14)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: '4px',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        ⚠️ <strong>Important:</strong> User type cannot be changed after signup. Choose carefully!
      </div>
    </>
  );

  // Render step 3: Declarant information
  const renderStep3 = () => (
    <>
      <h1 className="authTitle">Declarant Information</h1>

      <input
        type="text"
        className="authInput"
        placeholder="Declarant Full Name *"
        value={formData.declarant_name}
        onChange={(e) => updateField('declarant_name', e.target.value)}
        required
      />

      <select
        className="authInput"
        value={formData.declarant_capacity}
        onChange={(e) => updateField('declarant_capacity', e.target.value)}
        required
        style={{ color: formData.declarant_capacity ? '#fff' : 'rgba(255, 255, 255, 0.5)' }}
      >
        <option value="">Select Declarant Capacity *</option>
        <option value="importer">Importer - I am the importer submitting my own claims</option>
        <option value="agent">Agent - I am a customs broker, freight forwarder, or agent</option>
        <option value="duty_representative">
          Duty Representative - I am a registered duty representative
        </option>
        <option value="employee_of_importer">
          Employee of Importer - I work for the importing company
        </option>
      </select>

      {/* Conditional organisation name field for AGENT users */}
      {formData.user_type === 'AGENT' && (
        <input
          type="text"
          className="authInput"
          placeholder="Organisation Name *"
          value={formData.declarant_organisation_name}
          onChange={(e) => updateField('declarant_organisation_name', e.target.value)}
          required
        />
      )}

      <div
        style={{
          padding: '0.75rem',
          backgroundColor: 'rgba(139, 92, 246, 0.14)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: '4px',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        🔒 <strong>Note:</strong> Declarant information is locked after signup and can only be
        changed by administrators.
      </div>
    </>
  );

  // Render step 4: Entity type (SELF users only)
  const renderStep4 = () => (
    <>
      <h1 className="authTitle">Entity Type</h1>

      <select
        className="authInput"
        value={formData.entity_type}
        onChange={(e) => updateField('entity_type', e.target.value)}
        required
        style={{ color: formData.entity_type ? '#fff' : 'rgba(255, 255, 255, 0.5)' }}
      >
        <option value="">Select Entity Type *</option>
        <option value="PERSON">Individual Person</option>
        <option value="SOLE_TRADER">Sole Trader / Self-Employed</option>
        <option value="PARTNERSHIP">Partnership</option>
        <option value="LTD_COMPANY">Limited Company (Ltd)</option>
        <option value="LLP">Limited Liability Partnership (LLP)</option>
        <option value="CHARITY">Registered Charity</option>
        <option value="TRUST">Trust</option>
        <option value="OTHER_ORGANISATION">Other Organisation</option>
      </select>

      <div
        style={{
          padding: '0.75rem',
          backgroundColor: 'rgba(139, 92, 246, 0.14)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: '4px',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        🔒 <strong>Note:</strong> Entity type is locked after signup and can only be changed by
        administrators.
      </div>
    </>
  );

  // Render error message
  const renderError = () => {
    if (!error) return null;

    return (
      <div
        style={{
          color: '#ffb3b3',
          fontSize: '0.9rem',
          marginBottom: '0.75rem',
          padding: '0.75rem',
          backgroundColor: 'rgba(255, 179, 179, 0.1)',
          border: '1px solid rgba(255, 179, 179, 0.3)',
          borderRadius: '4px',
          textAlign: 'center',
        }}
        role="alert"
      >
        {error}
      </div>
    );
  };

  // Render action buttons
  const renderButtons = () => {
    const isLastStep = step === 4 || (step === 3 && formData.user_type === 'AGENT');

    return (
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="authButton"
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={isLastStep ? handleSubmit : handleNext}
          className="authButton"
          disabled={loading}
          style={{ flex: step > 1 ? 1 : undefined }}
        >
          {loading ? 'Creating Account...' : isLastStep ? 'Create Account' : 'Next'}
        </button>
      </div>
    );
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <BrandingHeader />

        {renderProgress()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {renderError()}

        {renderButtons()}

        {step === 1 && (
          <p style={{ fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#ffffff' }}>
              Sign in
            </Link>
          </p>
        )}

        <p className="authPowered" style={{ marginTop: '1rem' }}>
          Powered by Arcanus Assist
        </p>
      </div>
    </div>
  );
}
