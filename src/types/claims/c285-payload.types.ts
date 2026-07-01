/**
 * C285 Claim Payload Schema
 *
 * This file defines the exact JSON structure for C285 claim submissions
 * Ready for HMRC API integration when available
 * Maps CDS data to C285 form requirements
 */

// ============================================
// HMRC C285 SUBMISSION PAYLOAD
// ============================================

export interface C285SubmissionPayload {
  claimant: C285Claimant;
  declaration: C285Declaration;
  refund: C285Refund;
  documents: C285DocumentEvidence[];
  bank_details: C285BankDetails;
  declaration_statement: string;
  submitted_by: C285Submitter;
}

// ============================================
// 1. CLAIMANT (C285 Section 1)
// ============================================

export interface C285Claimant {
  name: string;
  eori: string;
  company_number?: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
}

// ============================================
// 2. DECLARATION (C285 Section 2 + CDS Data)
// ============================================

export interface C285Declaration {
  mrn: string;
  entry_number: string;
  acceptance_date: string; // ISO date
  cpc: string; // Combined Procedure Code
  previous_cpc?: string;
  importer_eori: string;
  declarant_eori: string;
  goods_items: C285GoodsItem[];
}

export interface C285GoodsItem {
  item_number: number;
  commodity_code: string;
  description: string;
  duty_paid: number;
  duty_should_have_been: number;
  difference: number;
  reason: string;
  tax_breakdown: C285TaxBreakdown[];
}

export interface C285TaxBreakdown {
  tax_type: 'CUST' | 'VAT' | 'EXCISE' | 'ADD' | 'ANTIDUMP';
  paid: number;
  correct: number;
  difference: number;
}

// ============================================
// 3. REFUND (C285 Section 3 + Justification)
// ============================================

export interface C285Refund {
  total_paid: number;
  total_correct: number;
  total_difference: number;
  refund_reason_code: C285ReasonCode;
  refund_reason_text: string;
  justification: string; // AI-generated explanation
}

export type C285ReasonCode =
  | 'CPC_ERROR' // Wrong procedure code
  | 'TARIFF_ERROR' // Wrong commodity code
  | 'PREFERENCE_ERROR' // Preference not applied
  | 'ORIGIN_ERROR' // Wrong origin
  | 'VALUATION_ERROR' // Incorrect valuation
  | 'RGR' // Returned Goods Relief
  | 'IP_RELIEF' // Inward Processing
  | 'TA_RELIEF' // Temporary Admission
  | 'END_USE' // End Use relief
  | 'SYSTEM_ERROR' // CDS/CHIEF error
  | 'DUPLICATE' // Duplicate payment
  | 'RATE_CHANGE' // Rate changed after payment
  | 'GOODS_DESTROYED' // Goods destroyed/abandoned
  | 'VAT_POSTPONEMENT' // VAT postponement account
  | 'OTHER'; // Other reason

// ============================================
// 4. DOCUMENTS (Evidence Bundle)
// ============================================

export interface C285DocumentEvidence {
  type: C285DocumentType;
  filename: string;
  hash: string; // SHA-256 hash for integrity
  pages: number;
  file_size?: number;
  upload_date?: string;
}

export type C285DocumentType =
  | 'invoice' // Commercial invoice (REQUIRED)
  | 'packing_list' // Packing list
  | 'c88' // Entry summary (REQUIRED)
  | 'c79' // VAT certificate
  | 'proof_of_return' // For RGR claims
  | 'proof_of_export' // Export evidence
  | 'credit_note' // Supplier credit note
  | 'certificate_of_origin' // EUR1, Form A, etc.
  | 'transport_document' // CMR, AWB, BOL
  | 'duty_calculation' // System-generated (REQUIRED)
  | 'justification_letter' // AI-generated (REQUIRED)
  | 'corrected_invoice' // Corrected invoice
  | 'destruction_certificate' // For destroyed goods
  | 'preference_certificate' // Preference documentation
  | 'valuation_evidence' // Valuation support
  | 'hmrc_correspondence' // Previous HMRC letters
  | 'other';

// ============================================
// 5. BANK DETAILS (Payment Information)
// ============================================

export interface C285BankDetails {
  account_name: string;
  account_number: string;
  sort_code: string;
  iban?: string;
  swift?: string;
  bank_name?: string;
  bank_address?: string;
}

// ============================================
// 6. SUBMITTER (Declaration Signature)
// ============================================

export interface C285Submitter {
  name: string;
  role: string; // e.g., "Director", "Customs Manager", "Agent"
  email: string;
  company?: string;
  submission_date?: string;
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface C285ValidationRules {
  // Basic validations
  mrn_exists_in_cds: boolean;
  within_time_limit: boolean; // 3 years from payment
  eori_matches_claimant: boolean;
  cpc_supports_refund: boolean;

  // Tax calculations
  duty_paid_greater_than_correct: boolean;
  preferential_tariff_applicable: boolean;
  returned_goods_cpc_valid: boolean;
  no_duplicate_refund: boolean;

  // Documents
  required_documents_uploaded: boolean;
  ocr_extraction_successful: boolean;
  evidence_bundle_complete: boolean;
  document_hashes_valid: boolean;

  // Totals
  item_totals_match_header: boolean;
  no_negative_refunds: boolean;
  calculations_balanced: boolean;
}

export interface C285ValidationError {
  field: string;
  rule: keyof C285ValidationRules;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export interface C285ValidationResult {
  valid: boolean;
  errors: C285ValidationError[];
  warnings: C285ValidationError[];
  info_messages: C285ValidationError[];
  completeness_score: number; // 0-100
  submission_ready: boolean;
  missing_requirements: string[];
}

// ============================================
// CDS TO C285 MAPPING
// ============================================

export interface CDSToC285Mapper {
  cds_declaration_id: string;
  mrn: string;

  // Automatic mappings
  claimant_from_cds: boolean;
  declaration_from_cds: boolean;
  goods_items_from_cds: boolean;

  // Calculated fields
  duty_calculations_auto: boolean;
  refund_reason_detected: C285ReasonCode | null;
  confidence_score: number; // 0-100

  // Manual overrides
  manual_adjustments: Array<{
    field: string;
    cds_value: string | number | boolean | null;
    override_value: string | number | boolean | null;
    reason: string;
  }>;
}

// ============================================
// EVIDENCE BUNDLE GENERATION
// ============================================

export interface C285EvidenceBundle {
  bundle_id: string;
  claim_reference: string;
  created_at: string;
  format: 'PDF' | 'ZIP';

  // Contents
  documents: C285DocumentEvidence[];

  // Metadata
  total_pages: number;
  total_size_bytes: number;
  bundle_hash: string;

  // Generation info
  generated_by: string;
  generation_method: 'automatic' | 'manual' | 'hybrid';

  // Quality checks
  ocr_confidence: number; // 0-100
  all_documents_verified: boolean;
  ready_for_submission: boolean;
}

// ============================================
// SUBMISSION TRACKING
// ============================================

export interface C285SubmissionTracking {
  submission_id: string;
  claim_id: string;
  payload: C285SubmissionPayload;

  // Submission details
  submitted_at: string;
  submitted_by: string;
  submission_method: 'api' | 'portal' | 'email' | 'post';

  // HMRC response
  hmrc_reference?: string;
  hmrc_acknowledgement?: string;
  hmrc_received_at?: string;

  // Status
  status: 'pending' | 'acknowledged' | 'under_review' | 'completed' | 'failed';

  // Tracking
  events: Array<{
    timestamp: string;
    event_type: string;
    description: string;
    data?: Record<string, unknown>;
  }>;
}

// ============================================
// REASON CODE MAPPINGS
// ============================================

export const C285_REASON_CODE_DESCRIPTIONS: Record<C285ReasonCode, string> = {
  CPC_ERROR: 'Incorrect Customs Procedure Code applied',
  TARIFF_ERROR: 'Wrong commodity/tariff code used',
  PREFERENCE_ERROR: 'Preferential tariff not applied',
  ORIGIN_ERROR: 'Incorrect country of origin declared',
  VALUATION_ERROR: 'Incorrect customs valuation method',
  RGR: 'Returned Goods Relief not claimed',
  IP_RELIEF: 'Inward Processing Relief not applied',
  TA_RELIEF: 'Temporary Admission Relief not applied',
  END_USE: 'End Use relief not claimed',
  SYSTEM_ERROR: 'CDS/CHIEF system error',
  DUPLICATE: 'Duplicate payment made',
  RATE_CHANGE: 'Duty rate changed after payment',
  GOODS_DESTROYED: 'Goods destroyed or abandoned',
  VAT_POSTPONEMENT: 'VAT Postponement Account applicable',
  OTHER: 'Other reason (see justification)',
};

// ============================================
// REQUIRED DOCUMENTS BY REASON
// ============================================

export const REQUIRED_DOCUMENTS_BY_REASON: Record<C285ReasonCode, C285DocumentType[]> = {
  CPC_ERROR: ['invoice', 'c88', 'duty_calculation', 'justification_letter'],
  TARIFF_ERROR: ['invoice', 'c88', 'duty_calculation', 'justification_letter', 'packing_list'],
  PREFERENCE_ERROR: [
    'invoice',
    'c88',
    'certificate_of_origin',
    'duty_calculation',
    'justification_letter',
  ],
  ORIGIN_ERROR: [
    'invoice',
    'c88',
    'certificate_of_origin',
    'duty_calculation',
    'justification_letter',
  ],
  VALUATION_ERROR: [
    'invoice',
    'c88',
    'valuation_evidence',
    'duty_calculation',
    'justification_letter',
  ],
  RGR: [
    'invoice',
    'c88',
    'proof_of_return',
    'proof_of_export',
    'duty_calculation',
    'justification_letter',
  ],
  IP_RELIEF: ['invoice', 'c88', 'duty_calculation', 'justification_letter'],
  TA_RELIEF: ['invoice', 'c88', 'duty_calculation', 'justification_letter'],
  END_USE: ['invoice', 'c88', 'duty_calculation', 'justification_letter'],
  SYSTEM_ERROR: [
    'invoice',
    'c88',
    'hmrc_correspondence',
    'duty_calculation',
    'justification_letter',
  ],
  DUPLICATE: ['invoice', 'c88', 'proof_of_return', 'duty_calculation', 'justification_letter'],
  RATE_CHANGE: ['invoice', 'c88', 'duty_calculation', 'justification_letter'],
  GOODS_DESTROYED: [
    'invoice',
    'c88',
    'destruction_certificate',
    'duty_calculation',
    'justification_letter',
  ],
  VAT_POSTPONEMENT: ['invoice', 'c88', 'c79', 'duty_calculation', 'justification_letter'],
  OTHER: ['invoice', 'c88', 'duty_calculation', 'justification_letter'],
};

// ============================================
// TIME LIMIT CALCULATIONS
// ============================================

export interface C285TimeLimits {
  acceptance_date: string;
  payment_date: string;
  claim_deadline: string; // 3 years from payment
  days_remaining: number;
  within_time_limit: boolean;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
}

export function calculateTimeLimits(acceptanceDate: string, paymentDate?: string): C285TimeLimits {
  const acceptance = new Date(acceptanceDate);
  const payment = paymentDate ? new Date(paymentDate) : acceptance;

  // 3 years from payment date
  const deadline = new Date(payment);
  deadline.setFullYear(deadline.getFullYear() + 3);

  const today = new Date();
  const daysRemaining = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (daysRemaining < 30) urgencyLevel = 'critical';
  else if (daysRemaining < 90) urgencyLevel = 'high';
  else if (daysRemaining < 180) urgencyLevel = 'medium';

  return {
    acceptance_date: acceptanceDate,
    payment_date: payment.toISOString().split('T')[0],
    claim_deadline: deadline.toISOString().split('T')[0],
    days_remaining: daysRemaining,
    within_time_limit: daysRemaining > 0,
    urgency_level: urgencyLevel,
  };
}

// ============================================
// PAYLOAD BUILDER HELPER
// ============================================

export interface C285PayloadBuilder {
  // Step 1: Set claimant
  setClaimant(claimant: C285Claimant): C285PayloadBuilder;

  // Step 2: Set declaration
  setDeclaration(declaration: C285Declaration): C285PayloadBuilder;

  // Step 3: Calculate refund
  calculateRefund(reasonCode: C285ReasonCode, justification: string): C285PayloadBuilder;

  // Step 4: Add documents
  addDocument(document: C285DocumentEvidence): C285PayloadBuilder;

  // Step 5: Set bank details
  setBankDetails(bankDetails: C285BankDetails): C285PayloadBuilder;

  // Step 6: Set submitter
  setSubmitter(submitter: C285Submitter): C285PayloadBuilder;

  // Validate
  validate(): C285ValidationResult;

  // Build final payload
  build(): C285SubmissionPayload;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface C285SubmissionResponse {
  success: boolean;
  submission_id: string;
  claim_reference: string;
  hmrc_reference?: string;
  submitted_at: string;
  estimated_decision_date?: string;
  message: string;
  warnings?: string[];
}

export interface C285SubmissionError {
  success: false;
  error_code: string;
  error_message: string;
  validation_errors?: C285ValidationError[];
  retry_allowed: boolean;
  retry_after?: string;
}
