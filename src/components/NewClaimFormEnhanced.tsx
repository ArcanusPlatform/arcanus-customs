import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertCircle, CheckCircle2, Info, Lock } from 'lucide-react';
import { claimsAPI, contactsAPI } from '@/lib/api-service';
import { useSettings } from '@/contexts/SettingsContext';
import type { C285Claim, C285ClaimItem, ClaimReason, DeclarantCapacity } from '@/types';
import type { Contact } from '@/types';
import { determineAuthorityRequirement, determineRefundDestinations } from '@/lib/authority-logic';
import { validateClaimIdentity } from '@/lib/identity-validator';
import ContactModal from '@/components/ContactModal';

interface NewClaimFormProps {
  onClose: () => void;
  onSuccess: (claim: C285Claim) => void;
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
  // 🆕 Enhanced item-level data (Group D)
  country_of_origin?: string;
  measure_explanation?: string;
  net_mass?: number;
  supplementary_units?: number;
  invoice_number?: string;
}

export default function NewClaimForm({ onClose, onSuccess }: NewClaimFormProps) {
  const { settings } = useSettings();

  // Contact management
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // STAGE 1: Declaration fields (MANDATORY)
  const [mrn, setMrn] = useState('');
  const [entryNumber, setEntryNumber] = useState('');
  const [acceptanceDate, setAcceptanceDate] = useState('');

  // 🆕 Enhanced declaration data (Group A)
  const [officeOfImport, setOfficeOfImport] = useState('');
  const [customsRegimeCode, setCustomsRegimeCode] = useState('');
  const [countryOfExport, setCountryOfExport] = useState('');
  const [preferentialScheme, setPreferentialScheme] = useState('');
  const [preferenceClaimedImport, setPreferenceClaimedImport] = useState<
    'yes' | 'no' | 'not_applicable'
  >('not_applicable');
  const [vatMethod, setVatMethod] = useState<'postponed_vat' | 'import_vat_paid' | 'other'>(
    'import_vat_paid'
  );
  const [goodsReleased, setGoodsReleased] = useState<'yes' | 'no'>('yes');
  const [claimType, setClaimType] = useState<'full' | 'partial'>('full');
  const [importType, setImportType] = useState<
    'standard_import' | 'returned_goods' | 'warehouse_release' | 'ppe_relief' | 'other'
  >('standard_import');

  // Claim details
  const [reason, setReason] = useState<ClaimReason>('tariff_code_error');
  const [reasonDescription, setReasonDescription] = useState('');
  const [items, setItems] = useState<ClaimItemFormData[]>([]);

  // STAGE 4: Payment routing (MANDATORY)
  const [paymentMethod, setPaymentMethod] = useState<
    'bank_transfer' | 'cheque' | 'deferment_account'
  >('bank_transfer');
  const [refundDestination, setRefundDestination] = useState<'claimant' | 'agent'>('claimant');
  const [bankDetails, setBankDetails] = useState({
    account_name: '',
    account_number: '',
    sort_code: '',
    iban: '',
    swift: '',
  });

  // 🆕 Enhanced payment details (Group C)
  const [paymentReference, setPaymentReference] = useState('');
  const [defermentAccountNumber, setDefermentAccountNumber] = useState('');

  // 🆕 Compliance & Evidence (Group F)
  const [evidenceWillFollow, setEvidenceWillFollow] = useState(false);

  // 🆕 Optional HMRC fields (Group G)
  const [previousSubmissionRef, setPreviousSubmissionRef] = useState('');
  const [notesToHmrc, setNotesToHmrc] = useState('');
  const [importEntryType, setImportEntryType] = useState<'CHIEF' | 'CDS'>('CDS');

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Load Contacts for AGENT Users
   *
   * AGENT users need to select a contact (client) for each claim.
   * This effect loads the agent's contact list when the component mounts.
   *
   * SELF users skip this step because they don't have contacts - they only
   * submit claims for their own entity.
   *
   * Requirements: 3.1, 3.2, 3.3, 8.1, 8.2
   */
  useEffect(() => {
    if (settings.userType === 'agent') {
      loadContacts();
    }
  }, [settings.userType]);

  // Auto-load bank details when contact/destination changes
  useEffect(() => {
    if (refundDestination === 'claimant' && selectedContact) {
      setBankDetails({
        account_name: selectedContact.bank_account_name || '',
        account_number: selectedContact.bank_account_number || '',
        sort_code: selectedContact.bank_sort_code || '',
        iban: selectedContact.bank_iban || '',
        swift: selectedContact.bank_swift || '',
      });
    } else if (refundDestination === 'agent') {
      setBankDetails({
        account_name: settings.bankAccountName || '',
        account_number: settings.bankAccountNumber || '',
        sort_code: settings.bankSortCode || '',
        iban: '',
        swift: '',
      });
    } else if (settings.userType === 'self') {
      setBankDetails({
        account_name: settings.bankAccountName || '',
        account_number: settings.bankAccountNumber || '',
        sort_code: settings.bankSortCode || '',
        iban: '',
        swift: '',
      });
    }
  }, [refundDestination, selectedContact, settings]);

  const loadContacts = async () => {
    try {
      const response = await contactsAPI.getContacts({
        type: ['individual', 'business'],
        sort_by: 'name',
        sort_order: 'asc',
      });
      setContacts(response.contacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  // Authority and refund logic
  const authorityReq = determineAuthorityRequirement(
    settings.userType,
    selectedContact || undefined
  );
  const refundOptions = determineRefundDestinations(
    settings.userType,
    selectedContact || undefined,
    settings.agentRefundAllowed
  );

  /**
   * Get Trader Details Based on User Type
   *
   * This function determines who the claimant (trader/importer) is based on user type:
   *
   * For SELF users:
   * - Claimant is always the user themselves
   * - Details pulled from user settings (name, EORI, address, etc.)
   * - entity_id is set to 'self_entity' to indicate self-submission
   * - No contact selection needed
   *
   * For AGENT users:
   * - Claimant is the selected contact (client)
   * - Details pulled from the selected contact record
   * - entity_id is the contact's ID
   * - Contact must be selected before submission
   *
   * This ensures HMRC compliance by correctly identifying the importer
   * for each claim submission.
   *
   * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 8.1, 8.2
   */
  const getTraderDetails = () => {
    // SELF user: Use user's own entity information
    if (settings.userType === 'self') {
      return {
        name: settings.fullName,
        eori: settings.eori,
        address: settings.address,
        email: settings.email,
        phone: settings.phone,
        entity_id: 'self_entity', // Fixed entity_id for SELF users
      };
    }
    // AGENT user: Use selected contact's information
    else if (selectedContact) {
      return {
        name: selectedContact.name,
        eori: selectedContact.eori,
        address: selectedContact.address,
        email: selectedContact.email,
        phone: selectedContact.phone,
        entity_id: selectedContact.id, // Contact's ID becomes entity_id
      };
    }
    // No valid claimant (AGENT with no contact selected)
    return null;
  };

  const traderDetails = getTraderDetails();

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
      item_number: items.length + 1,
      commodity_code: '',
      description: '',
      invoice_value: 0,
      original_duty: 0,
      correct_duty: 0,
      original_vat: 0,
      correct_vat: 0,
      original_excise: 0,
      correct_excise: 0,
      // 🆕 New item fields
      country_of_origin: '',
      measure_explanation: '',
      net_mass: 0,
      supplementary_units: 0,
      invoice_number: '',
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ClaimItemFormData, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleContactSelect = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    setSelectedContact(contact || null);
  };

  const handleNewContact = async (contact: Contact) => {
    setShowContactModal(false);
    setSelectedContact(contact);
    loadContacts();
  };

  // STAGE 2: MRN Validator
  const validateMRN = (value: string): boolean => {
    if (!value) return true;
    // 🆕 FIXED: Correct MRN format is 14 characters after GB (not 17)
    const mrnRegex = /^\d{2}GB[A-Z0-9]{14}$/;
    return mrnRegex.test(value);
  };

  // STAGE 6: Item validation
  const validateItem = (item: ClaimItemFormData, index: number): Record<string, string> => {
    const itemErrors: Record<string, string> = {};

    if (item.commodity_code && !/^\d{8}$|^\d{10}$/.test(item.commodity_code)) {
      itemErrors[`item_${index}_commodity_format`] = 'Commodity code must be 8 or 10 digits';
    }

    if (item.correct_duty > item.original_duty) {
      itemErrors[`item_${index}_duty`] = 'Correct duty cannot exceed original';
    }
    if (item.correct_vat > item.original_vat) {
      itemErrors[`item_${index}_vat`] = 'Correct VAT cannot exceed original';
    }
    if (item.correct_excise > item.original_excise) {
      itemErrors[`item_${index}_excise`] = 'Correct excise cannot exceed original';
    }

    const totalOverpayment =
      item.original_duty -
      item.correct_duty +
      (item.original_vat - item.correct_vat) +
      (item.original_excise - item.correct_excise);

    if (totalOverpayment < 0) {
      itemErrors[`item_${index}_total`] = 'Total overpayment cannot be negative';
    }

    return itemErrors;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // STAGE 1: Declaration date validation
    if (!acceptanceDate) {
      newErrors.acceptanceDate = 'Declaration acceptance date is required';
    } else {
      const acceptDate = new Date(acceptanceDate);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      if (acceptDate < threeYearsAgo) {
        newErrors.acceptanceDate = 'Declaration is older than 3 years - claim may not be eligible';
      }

      if (acceptDate > new Date()) {
        newErrors.acceptanceDate = 'Acceptance date cannot be in the future';
      }
    }

    if (!mrn && !entryNumber) {
      newErrors.declaration = 'Either MRN or Entry Number is required';
    }

    if (mrn && !validateMRN(mrn)) {
      newErrors.mrn = 'Invalid MRN format (should be YYGBXXXXXXXXXXXXXXXXX)';
    }

    // 🆕 Enhanced declaration validation (Group A)
    if (!officeOfImport) {
      newErrors.officeOfImport = 'Office of Import is required';
    }
    if (!customsRegimeCode) {
      newErrors.customsRegimeCode = 'Customs Regime Code is required';
    }
    if (!vatMethod) {
      newErrors.vatMethod = 'VAT accounting method is required';
    }
    if (!goodsReleased) {
      newErrors.goodsReleased = 'Please confirm if goods were released to free circulation';
    }
    if (!claimType) {
      newErrors.claimType = 'Claim type (full/partial) is required';
    }
    if (!importType) {
      newErrors.importType = 'Import type is required';
    }

    // Conditional validation for origin/preference claims
    if (reason === 'origin_relief' || reason === 'preference_not_claimed') {
      if (!countryOfExport) {
        newErrors.countryOfExport = 'Country of export is required for origin/preference claims';
      }
      if (!preferentialScheme) {
        newErrors.preferentialScheme =
          'Preferential scheme is required for origin/preference claims';
      }
    }

    /**
     * Identity Validation
     *
     * This validates that the claim meets HMRC identity requirements:
     *
     * For SELF users:
     * - Must have entity_id configured
     * - Cannot have a contact selected
     * - Claimant must be the user themselves
     *
     * For AGENT users:
     * - Must have a contact selected
     * - Contact must have required information (name, EORI, address)
     * - Claimant is the selected contact
     *
     * Validation errors are blocking (prevent submission).
     * Validation warnings are non-blocking (logged but don't prevent submission).
     *
     * Requirements: 2.4, 2.5, 3.4, 7.4, 7.5, 8.4, 11.1, 11.2, 11.3, 11.4
     */
    const identityValidation = validateClaimIdentity(
      settings.userType,
      settings.userType === 'self' ? 'self_entity' : undefined,
      selectedContact || undefined
    );

    // Add identity validation errors to form errors (blocking)
    if (!identityValidation.valid) {
      identityValidation.errors.forEach((error, index) => {
        newErrors[`identity_${index}`] = error;
      });
    }

    // Log identity validation warnings (non-blocking)
    // These warn about missing optional data but don't prevent submission
    if (identityValidation.warnings.length > 0) {
      console.warn('Identity validation warnings:', identityValidation.warnings);
    }

    // STAGE 4: Bank details validation
    if (paymentMethod === 'bank_transfer') {
      if (!bankDetails.account_name) {
        newErrors.bank_account_name = 'Account holder name is required';
      }
      if (!bankDetails.sort_code) {
        newErrors.bank_sort_code = 'Sort code is required';
      }
      if (!bankDetails.account_number) {
        newErrors.bank_account_number = 'Account number is required';
      }
    }

    // 🆕 Deferment account validation
    if (paymentMethod === 'deferment_account' && !defermentAccountNumber) {
      newErrors.defermentAccountNumber = 'Deferment account number is required';
    }

    if (!reasonDescription) {
      newErrors.reason_description = 'Description is required';
    }

    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    // STAGE 6: Per-item validation
    items.forEach((item, index) => {
      if (!item.commodity_code) {
        newErrors[`item_${index}_commodity`] = 'Commodity code required';
      }
      if (!item.description) {
        newErrors[`item_${index}_description`] = 'Description required';
      }

      const itemErrors = validateItem(item, index);
      Object.assign(newErrors, itemErrors);
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      alert('Please fix validation errors before submitting');
      return;
    }

    setIsSaving(true);
    try {
      const original_duty = items.reduce((sum, item) => sum + item.original_duty, 0);
      const correct_duty = items.reduce((sum, item) => sum + item.correct_duty, 0);
      const original_vat = items.reduce((sum, item) => sum + item.original_vat, 0);
      const correct_vat = items.reduce((sum, item) => sum + item.correct_vat, 0);
      const original_excise = items.reduce((sum, item) => sum + item.original_excise, 0);
      const correct_excise = items.reduce((sum, item) => sum + item.correct_excise, 0);

      const duty_overpayment = original_duty - correct_duty;
      const vat_overpayment = original_vat - correct_vat;
      const excise_overpayment = original_excise - correct_excise;

      const claimItems: Omit<C285ClaimItem, 'claim_id'>[] = items.map((item) => ({
        id: crypto.randomUUID(),
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
        error_explanation: reasonDescription,
        // 🆕 Enhanced item-level data (Group D)
        country_of_origin: item.country_of_origin || undefined,
        measure_explanation: item.measure_explanation || undefined,
        net_mass: item.net_mass || undefined,
        supplementary_units: item.supplementary_units || undefined,
        invoice_number: item.invoice_number || undefined,
      }));

      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const reference = `C285-${year}-${month}-${random}`;

      // STAGE 7: Importer snapshot (stored in claim for historical accuracy)
      // Snapshot is embedded in the claim data below

      const claim = await claimsAPI.createClaim({
        reference,

        // STAGE 1: Declaration details
        mrn: mrn || undefined,
        entry_number: entryNumber || undefined,
        acceptance_date: acceptanceDate,

        // 🆕 Enhanced declaration data (Group A)
        office_of_import: officeOfImport || undefined,
        customs_regime_code: customsRegimeCode || undefined,
        country_of_export: countryOfExport || undefined,
        preferential_scheme: preferentialScheme || undefined,
        preference_claimed_import: preferenceClaimedImport,
        vat_method: vatMethod,
        goods_released_free_circulation: goodsReleased,
        claim_type: claimType,
        import_type: importType,

        /**
         * Identity Fields (HMRC Compliance)
         *
         * These fields identify who is completing the claim (declarant) and
         * who the claim is for (claimant). They are critical for HMRC compliance.
         *
         * declarant_id: ID of the logged-in user (person completing the form)
         * claimant_id: ID of the entity claiming (user's entity or contact)
         * claimant_type: 'self_entity' for SELF users, 'contact' for AGENT users
         * identity_source: Always 'SETTINGS' (pulled from user settings, not form input)
         * identity_locked_at: Timestamp when identity was locked (prevents tampering)
         *
         * For SELF users:
         * - declarant_id = user ID
         * - claimant_id = user's entity_id ('self_entity')
         * - claimant_type = 'self_entity'
         *
         * For AGENT users:
         * - declarant_id = agent's user ID
         * - claimant_id = selected contact's ID
         * - claimant_type = 'contact'
         *
         * Backend will validate these fields and inject declarant information
         * from user settings to prevent client-side tampering.
         *
         * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.5, 8.5
         */
        declarant_id: settings.email || 'current_user', // Use email as user identifier until proper auth is implemented
        claimant_id: traderDetails?.entity_id || '',
        claimant_type: settings.userType === 'self' ? 'self_entity' : 'contact',
        identity_source: 'SETTINGS' as const,
        identity_locked_at: new Date().toISOString(),

        // STAGE 2: Complete trader metadata
        trader_eori: traderDetails?.eori || '',
        trader_name: traderDetails?.name || '',
        trader_address: traderDetails?.address,
        trader_city: selectedContact?.city,
        trader_postcode: selectedContact?.postcode,
        trader_country: selectedContact?.country || 'GB',
        company_number: selectedContact?.company_number,
        contact_name: selectedContact?.contact_person || traderDetails?.name,
        contact_email: traderDetails?.email,
        contact_phone: traderDetails?.phone,

        agent_eori: settings.userType === 'agent' ? settings.eori : undefined,
        agent_name:
          settings.userType === 'agent' ? settings.companyName || settings.fullName : undefined,

        reason,
        reason_description: reasonDescription,

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

        // STAGE 4: Payment details
        payment_method: paymentMethod,
        bank_account_name: bankDetails.account_name,
        bank_account_number: bankDetails.account_number,
        bank_sort_code: bankDetails.sort_code,
        bank_iban: bankDetails.iban,
        bank_swift: bankDetails.swift,

        // 🆕 Enhanced payment details (Group C)
        refund_currency: 'GBP', // MUST be GBP only
        payment_reference: paymentReference || undefined,
        deferment_account_number: defermentAccountNumber || undefined,

        // 🆕 Compliance & Evidence (Group F)
        evidence_will_follow: evidenceWillFollow,

        // 🆕 Optional HMRC fields (Group G)
        previous_submission_reference: previousSubmissionRef || undefined,
        notes_to_hmrc: notesToHmrc || undefined,
        import_entry_type: importEntryType,

        status: 'draft',
        priority: 'normal',
        items: claimItems as C285ClaimItem[],

        // 🆕 Declarant (person completing claim) - REQUIRED
        // Note: In production, these fields should be stripped by backend and injected from user settings
        // For now, we include them for the mock API to work correctly
        declarant_name: settings.fullName,
        declarant_capacity: (settings.userType === 'agent'
          ? 'agent'
          : 'importer') as DeclarantCapacity,

        submitted_by:
          settings.userType === 'agent'
            ? `${settings.fullName}, ${settings.companyName || 'Agent'}`
            : settings.fullName,

        created_by: 'user',
      });

      if (settings.userType === 'agent' && selectedContact) {
        await contactsAPI.recordContactUsage(selectedContact.id);
      }

      onSuccess(claim);
    } catch (error) {
      console.error('Failed to create claim:', error);
      alert('Failed to create claim. Please try again.');
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
          maxWidth: '1200px',
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
            position: 'sticky',
            top: 0,
            background: 'var(--card-bg)',
            zIndex: 10,
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>New Manual Claim</h2>
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
          {/* Info Banner for SELF Users */}
          {settings.userType === 'self' && (
            <div
              style={{
                padding: '1rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'start',
                gap: '0.75rem',
              }}
            >
              <Info size={20} style={{ color: '#3b82f6', marginTop: '0.25rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem' }}>
                  Submitting for Your Own Entity
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                  Your claim is being submitted for your own entity. To update this information, go
                  to Settings.
                </div>
              </div>
            </div>
          )}

          {/* Claimant Section for SELF Users (Locked) */}
          {settings.userType === 'self' && (
            <div style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                }}
              >
                <label style={{ fontWeight: 600 }}>Claimant Information</label>
                <Lock size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div
                style={{
                  padding: '1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Name
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {settings.fullName || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      EORI
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {settings.eori || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {settings.email || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Phone
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {settings.phone || 'Not set'}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Address
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {[
                        settings.address,
                        settings.address_line_2,
                        settings.city,
                        settings.postcode,
                        settings.country,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Not set'}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #d1d5db',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Lock size={12} />
                  <span>This information is locked and pulled from your Settings profile</span>
                </div>
              </div>
            </div>
          )}

          {/* Contact Section (Agents Only) */}
          {settings.userType === 'agent' && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Claiming For <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select
                  value={selectedContact?.id || ''}
                  onChange={(e) => handleContactSelect(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: `1px solid ${errors.identity_0 ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '8px',
                  }}
                >
                  <option value="">Select Contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.eori && `(${c.eori})`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowContactModal(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--accent-purple)',
                    color: 'var(--text-light)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Add New Contact
                </button>
              </div>

              {traderDetails && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#f0f9ff',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    {traderDetails.name}
                  </div>
                  {traderDetails.eori && (
                    <div style={{ fontSize: '0.875rem' }}>EORI: {traderDetails.eori}</div>
                  )}
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {traderDetails.address}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {traderDetails.email}
                  </div>
                </div>
              )}

              {Object.keys(errors).some((k) => k.startsWith('identity_')) && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    marginTop: '0.5rem',
                    display: 'block',
                  }}
                >
                  Please select a contact to continue
                </span>
              )}
            </div>
          )}

          {/* Info Banner for AGENT Users */}
          {settings.userType === 'agent' && selectedContact && (
            <div
              style={{
                padding: '1rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'start',
                gap: '0.75rem',
              }}
            >
              <Info size={20} style={{ color: '#3b82f6', marginTop: '0.25rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem' }}>
                  Submitting on Behalf of Client
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                  You are submitting as <strong>{settings.fullName}</strong>{' '}
                  {settings.companyName && `(${settings.companyName})`} on behalf of{' '}
                  <strong>{selectedContact.name}</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Declarant Information (AGENT users - read-only) */}
          {settings.userType === 'agent' && selectedContact && (
            <div style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                }}
              >
                <label style={{ fontWeight: 600 }}>
                  Declarant Information (Person Completing Claim)
                </label>
                <Lock size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div
                style={{
                  padding: '1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Declarant Name
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {settings.fullName || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Declarant Capacity
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {settings.userType === 'agent' ? 'Agent' : 'Importer'}
                    </div>
                  </div>
                  {settings.companyName && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Organisation Name
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {settings.companyName}
                      </div>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #d1d5db',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Lock size={12} />
                  <span>This information is locked and pulled from your Settings profile</span>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: Authority Requirement Banner */}
          {settings.userType === 'agent' && selectedContact && authorityReq.required && (
            <div
              style={{
                padding: '1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'start',
                gap: '0.75rem',
              }}
            >
              <AlertCircle
                size={20}
                style={{ color: '#ef4444', marginTop: '0.25rem', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>
                  Authority Required
                </div>
                <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>{authorityReq.reason}</div>
                <div style={{ fontSize: '0.875rem', color: '#991b1b', marginTop: '0.5rem' }}>
                  You will need to upload a signed authority document before submitting this claim
                  to HMRC.
                </div>
              </div>
            </div>
          )}

          {settings.userType === 'agent' &&
            selectedContact &&
            !authorityReq.required &&
            authorityReq.type === 'standing_authority' && (
              <div
                style={{
                  padding: '1rem',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  marginBottom: '2rem',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '0.75rem',
                }}
              >
                <CheckCircle2
                  size={20}
                  style={{ color: '#22c55e', marginTop: '0.25rem', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#166534', marginBottom: '0.5rem' }}>
                    Standing Authority on File
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                    {authorityReq.reason}
                  </div>
                </div>
              </div>
            )}

          {/* STAGE 1: Declaration Details */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Declaration Details
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem',
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
                  MRN
                </label>
                <input
                  type="text"
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  placeholder="23GB001XYZ123456789"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.mrn ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '8px',
                  }}
                />
                {errors.mrn && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    {errors.mrn}
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
                  Entry Number (EPU + Entry)
                </label>
                <input
                  type="text"
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  placeholder="123 1234567"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
              </div>
            </div>

            {errors.declaration && (
              <div
                style={{
                  padding: '0.75rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '0.875rem', color: '#ef4444' }}>{errors.declaration}</span>
              </div>
            )}

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                Declaration Acceptance Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={acceptanceDate}
                onChange={(e) => setAcceptanceDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.acceptanceDate ? '#ef4444' : 'var(--border)'}`,
                  borderRadius: '8px',
                }}
              />
              {errors.acceptanceDate && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    marginTop: '0.25rem',
                    display: 'block',
                  }}
                >
                  {errors.acceptanceDate}
                </span>
              )}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Claims must be made within 3 years of acceptance date
              </p>
            </div>

            {/* 🆕 Enhanced Declaration Fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '1rem',
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
                  Office of Import <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={officeOfImport}
                  onChange={(e) => setOfficeOfImport(e.target.value)}
                  placeholder="GB000435"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.officeOfImport ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '8px',
                  }}
                />
                {errors.officeOfImport && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    {errors.officeOfImport}
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
                  Customs Regime Code <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={customsRegimeCode}
                  onChange={(e) => setCustomsRegimeCode(e.target.value)}
                  placeholder="4000"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.customsRegimeCode ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '8px',
                  }}
                />
                {errors.customsRegimeCode && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    {errors.customsRegimeCode}
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '1rem',
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
                  Claim Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="claimType"
                      value="full"
                      checked={claimType === 'full'}
                      onChange={() => setClaimType('full')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Full Claim</span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="claimType"
                      value="partial"
                      checked={claimType === 'partial'}
                      onChange={() => setClaimType('partial')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Partial Claim</span>
                  </label>
                </div>
                {errors.claimType && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    {errors.claimType}
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
                  Import Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as typeof importType)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.importType ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '8px',
                  }}
                >
                  <option value="standard_import">Standard Import</option>
                  <option value="returned_goods">Returned Goods</option>
                  <option value="warehouse_release">Warehouse Release</option>
                  <option value="ppe_relief">PPE Relief</option>
                  <option value="other">Other</option>
                </select>
                {errors.importType && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    {errors.importType}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                VAT Accounting Method <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="vatMethod"
                    value="postponed_vat"
                    checked={vatMethod === 'postponed_vat'}
                    onChange={() => setVatMethod('postponed_vat')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Postponed VAT</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="vatMethod"
                    value="import_vat_paid"
                    checked={vatMethod === 'import_vat_paid'}
                    onChange={() => setVatMethod('import_vat_paid')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Import VAT Paid</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="vatMethod"
                    value="other"
                    checked={vatMethod === 'other'}
                    onChange={() => setVatMethod('other')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Other</span>
                </label>
              </div>
              {errors.vatMethod && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    marginTop: '0.25rem',
                    display: 'block',
                  }}
                >
                  {errors.vatMethod}
                </span>
              )}
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                Were goods released to free circulation? <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="goodsReleased"
                    value="yes"
                    checked={goodsReleased === 'yes'}
                    onChange={() => setGoodsReleased('yes')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Yes</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="goodsReleased"
                    value="no"
                    checked={goodsReleased === 'no'}
                    onChange={() => setGoodsReleased('no')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>No</span>
                </label>
              </div>
              {errors.goodsReleased && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    marginTop: '0.25rem',
                    display: 'block',
                  }}
                >
                  {errors.goodsReleased}
                </span>
              )}
            </div>
          </div>

          {/* Claim Reason */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Claim Reason
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ClaimReason)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              >
                {claimReasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
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
                value={reasonDescription}
                onChange={(e) => setReasonDescription(e.target.value)}
                placeholder="Explain the reason for the claim..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.reason_description ? '#ef4444' : 'var(--border)'}`,
                  borderRadius: '8px',
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

            {/* 🆕 Conditional: Origin/Preference Fields */}
            {(reason === 'origin_relief' || reason === 'preference_not_claimed') && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                }}
              >
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    color: '#1e40af',
                  }}
                >
                  Origin/Preference Information
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '1rem',
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
                      Country of Export <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={countryOfExport}
                      onChange={(e) => setCountryOfExport(e.target.value)}
                      placeholder="GB, FR, DE, etc."
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${errors.countryOfExport ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '8px',
                      }}
                    />
                    {errors.countryOfExport && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                      >
                        {errors.countryOfExport}
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
                      Preferential Scheme <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={preferentialScheme}
                      onChange={(e) => setPreferentialScheme(e.target.value)}
                      placeholder="EU-UK TCA, GSP, etc."
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${errors.preferentialScheme ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '8px',
                      }}
                    />
                    {errors.preferentialScheme && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                      >
                        {errors.preferentialScheme}
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
                    Was preference claimed at import?
                  </label>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="preferenceClaimedImport"
                        value="yes"
                        checked={preferenceClaimedImport === 'yes'}
                        onChange={() => setPreferenceClaimedImport('yes')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Yes</span>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="preferenceClaimedImport"
                        value="no"
                        checked={preferenceClaimedImport === 'no'}
                        onChange={() => setPreferenceClaimedImport('no')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>No</span>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="preferenceClaimedImport"
                        value="not_applicable"
                        checked={preferenceClaimedImport === 'not_applicable'}
                        onChange={() => setPreferenceClaimedImport('not_applicable')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Not Applicable</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 4: Payment Details */}
          <div
            style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              background: '#f9fafb',
              borderRadius: '8px',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Payment Details
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                Payment Method <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as 'bank_transfer' | 'cheque' | 'deferment_account'
                  )
                }
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="deferment_account">Deferment Account</option>
              </select>
            </div>

            {refundOptions.canPayToAgent && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  Refund Destination <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="refundDestination"
                      value="claimant"
                      checked={refundDestination === 'claimant'}
                      onChange={() => setRefundDestination('claimant')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Pay to Claimant ({traderDetails?.name})</span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="refundDestination"
                      value="agent"
                      checked={refundDestination === 'agent'}
                      onChange={() => setRefundDestination('agent')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Pay to Agent ({settings.companyName || settings.fullName})</span>
                  </label>
                </div>
              </div>
            )}

            {paymentMethod === 'bank_transfer' && (
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--card-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Bank Account Details
                </h4>
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
                      Account Holder <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={bankDetails.account_name}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, account_name: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${errors.bank_account_name ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '8px',
                      }}
                    />
                    {errors.bank_account_name && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                      >
                        {errors.bank_account_name}
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
                      Sort Code <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={bankDetails.sort_code}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, sort_code: e.target.value })
                      }
                      placeholder="00-00-00"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${errors.bank_sort_code ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '8px',
                      }}
                    />
                    {errors.bank_sort_code && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                      >
                        {errors.bank_sort_code}
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
                      Account Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={bankDetails.account_number}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, account_number: e.target.value })
                      }
                      placeholder="12345678"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${errors.bank_account_number ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '8px',
                      }}
                    />
                    {errors.bank_account_number && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                      >
                        {errors.bank_account_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 🆕 Additional Payment Fields */}
            <div style={{ marginTop: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                Payment Reference (Optional)
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Your reference for this payment"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
            </div>

            {/* 🆕 Deferment Account Number (conditional) */}
            {paymentMethod === 'deferment_account' && (
              <div style={{ marginTop: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  Deferment Account Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={defermentAccountNumber}
                  onChange={(e) => setDefermentAccountNumber(e.target.value)}
                  placeholder="Enter deferment account number"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.defermentAccountNumber ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '8px',
                  }}
                />
                {errors.defermentAccountNumber && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      marginTop: '0.25rem',
                      display: 'block',
                    }}
                  >
                    {errors.defermentAccountNumber}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* STAGE 5: Evidence Placeholder */}
          <div
            style={{
              padding: '1rem',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'start',
              gap: '0.75rem',
            }}
          >
            <Info size={20} style={{ color: '#3b82f6', marginTop: '0.25rem', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem' }}>
                Evidence Requirements
              </div>
              <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                Evidence requirements will be automatically generated based on:
              </div>
              <ul
                style={{
                  fontSize: '0.875rem',
                  color: '#1e40af',
                  marginTop: '0.5rem',
                  marginLeft: '1.5rem',
                }}
              >
                <li>Reason for claim</li>
                <li>Importer type</li>
                <li>Authority status</li>
                <li>MRN acceptance date</li>
                <li>Tariff rules</li>
              </ul>
              <div style={{ fontSize: '0.875rem', color: '#1e40af', marginTop: '0.5rem' }}>
                You will be able to upload documents in the Compliance page after saving this draft.
              </div>

              {/* 🆕 Evidence Will Follow Toggle */}
              <div
                style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #bfdbfe' }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={evidenceWillFollow}
                    onChange={(e) => setEvidenceWillFollow(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, color: '#1e40af' }}>Evidence will follow</span>
                </label>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#1e40af',
                    marginTop: '0.25rem',
                    marginLeft: '1.75rem',
                  }}
                >
                  Check this if you will submit evidence after the initial claim submission
                </p>
              </div>
            </div>
          </div>

          {/* 🆕 Optional HMRC Fields */}
          <div
            style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px dashed var(--border)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Optional Information
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              These fields are optional but may be helpful for HMRC processing
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem',
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
                  Previous Submission Reference
                </label>
                <input
                  type="text"
                  value={previousSubmissionRef}
                  onChange={(e) => setPreviousSubmissionRef(e.target.value)}
                  placeholder="For amendments only"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
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
                  Import Entry Type
                </label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="importEntryType"
                      value="CDS"
                      checked={importEntryType === 'CDS'}
                      onChange={() => setImportEntryType('CDS')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>CDS</span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="importEntryType"
                      value="CHIEF"
                      checked={importEntryType === 'CHIEF'}
                      onChange={() => setImportEntryType('CHIEF')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>CHIEF</span>
                  </label>
                </div>
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
                Notes to HMRC
              </label>
              <textarea
                value={notesToHmrc}
                onChange={(e) => setNotesToHmrc(e.target.value)}
                placeholder="Any additional information for HMRC..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  resize: 'vertical',
                }}
              />
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

            {items.map((item, index) => (
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
                          border: `1px solid ${errors[`item_${index}_commodity`] || errors[`item_${index}_commodity_format`] ? '#ef4444' : 'var(--border)'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                      {(errors[`item_${index}_commodity`] ||
                        errors[`item_${index}_commodity_format`]) && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            marginTop: '0.25rem',
                            display: 'block',
                          }}
                        >
                          {errors[`item_${index}_commodity`] ||
                            errors[`item_${index}_commodity_format`]}
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

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        marginBottom: '0.5rem',
                      }}
                    >
                      Invoice Value (£)
                    </label>
                    <input
                      type="number"
                      value={item.invoice_value}
                      onChange={(e) =>
                        updateItem(item.id, 'invoice_value', parseFloat(e.target.value) || 0)
                      }
                      step="0.01"
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                      }}
                    />
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
                          border: `1px solid ${errors[`item_${index}_duty`] ? '#ef4444' : 'var(--border)'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                      {errors[`item_${index}_duty`] && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            marginTop: '0.25rem',
                            display: 'block',
                          }}
                        >
                          {errors[`item_${index}_duty`]}
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
                          border: `1px solid ${errors[`item_${index}_vat`] ? '#ef4444' : 'var(--border)'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                      {errors[`item_${index}_vat`] && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            marginTop: '0.25rem',
                            display: 'block',
                          }}
                        >
                          {errors[`item_${index}_vat`]}
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
                        Original Excise (£)
                      </label>
                      <input
                        type="number"
                        value={item.original_excise}
                        onChange={(e) =>
                          updateItem(item.id, 'original_excise', parseFloat(e.target.value) || 0)
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
                        Correct Excise (£)
                      </label>
                      <input
                        type="number"
                        value={item.correct_excise}
                        onChange={(e) =>
                          updateItem(item.id, 'correct_excise', parseFloat(e.target.value) || 0)
                        }
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: `1px solid ${errors[`item_${index}_excise`] ? '#ef4444' : 'var(--border)'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                      {errors[`item_${index}_excise`] && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            marginTop: '0.25rem',
                            display: 'block',
                          }}
                        >
                          {errors[`item_${index}_excise`]}
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
                          color: 'var(--accent-purple)',
                        }}
                      >
                        Excise Overpayment
                      </label>
                      <input
                        type="text"
                        value={`£${(item.original_excise - item.correct_excise).toFixed(2)}`}
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

                  {errors[`item_${index}_total`] && (
                    <div
                      style={{
                        padding: '0.75rem',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', color: '#ef4444' }}>
                        {errors[`item_${index}_total`]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {items.length === 0 && (
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
          {items.length > 0 && (
            <div
              style={{
                padding: '1.5rem',
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '8px',
                marginBottom: '2rem',
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
                  {items
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
            position: 'sticky',
            bottom: 0,
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
            {isSaving ? 'Saving...' : 'Save as Draft'}
          </button>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          contact={null}
          onClose={() => setShowContactModal(false)}
          onSave={handleNewContact}
        />
      )}
    </div>
  );
}
