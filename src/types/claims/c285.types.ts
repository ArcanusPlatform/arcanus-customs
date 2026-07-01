/**
 * C285 Claim Data Types
 *
 * This file defines the data model for HMRC C285 duty repayment claims
 * Links to CDS declarations and supports the full claim lifecycle
 */

import type { CDSDeclaration, CDSItem } from '../declarations/cds.types';
import type { DeclarantCapacity } from '../user.types';

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type ClaimStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'evidence_required'
  | 'hmrc_query'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'withdrawn'
  | 'paid';

export type ClaimReason =
  | 'tariff_code_error'
  | 'origin_relief'
  | 'goods_return'
  | 'goods_destroyed'
  | 'vat_postponement'
  | 'incorrect_valuation'
  | 'preference_not_claimed'
  | 'relief_not_applied'
  | 'system_error'
  | 'duplicate_payment'
  | 'rate_change'
  | 'other';

export type ReliefScheme =
  | 'RGR' // Returned Goods Relief
  | 'IP' // Inward Processing
  | 'TA' // Temporary Admission
  | 'END_USE' // End Use
  | 'OPR' // Outward Processing Relief
  | 'PREFERENCE' // Preferential Origin
  | 'QUOTA' // Tariff Quota
  | 'SUSPENSION'; // Duty Suspension

export type DocumentCategory =
  | 'commercial_invoice'
  | 'packing_list'
  | 'bill_of_lading'
  | 'eur1_certificate'
  | 'origin_statement'
  | 'proof_of_reexport'
  | 'c88_form'
  | 'credit_note'
  | 'classification_justification'
  | 'destruction_certificate'
  | 'c79_statement'
  | 'pva_statement'
  | 'hmrc_correspondence'
  | 'bank_details'
  | 'other';

export type ClaimPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================
// 1. C285 CLAIM (Main Claim Record)
// ============================================

export interface C285Claim {
  id: string;
  reference: string; // e.g., "CLM-2024-001234"

  // ===== SECTION 1: CLAIMANT =====
  trader_eori: string;
  trader_name: string;
  company_number?: string;
  trader_address?: string;
  trader_city?: string;
  trader_postcode?: string;
  trader_country?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;

  // 🆕 Enhanced claimant identity
  legal_entity_type?: 'ltd' | 'plc' | 'llp' | 'partnership' | 'sole_trader' | 'charity' | 'other';
  registered_address_line_1?: string;
  registered_address_line_2?: string;
  registered_city?: string;
  registered_postcode?: string;
  registered_country?: string;
  company_country_of_establishment?: string;
  date_of_birth?: string; // For individuals
  national_id_passport?: string; // For individuals
  preferred_contact_method?: string;
  alternative_email?: string;
  has_deferment_account?: boolean;

  // 🆕 Declarant (person completing claim) - CRITICAL
  declarant_id: string; // User ID of person completing claim (MANDATORY)
  declarant_name: string; // MANDATORY - HMRC requires human signatory
  declarant_capacity: DeclarantCapacity;

  // 🆕 Identity fields for user type enforcement
  claimant_id: string; // Either user.entity_id or contact.id
  claimant_type: 'self_entity' | 'contact'; // Identifies if claim is for self or client
  identity_source: 'SETTINGS'; // Always from settings
  identity_locked_at: string; // ISO timestamp when identity was locked

  // Agent details (if applicable)
  agent_eori?: string;
  agent_name?: string;

  // ===== SECTION 2: DECLARATION =====
  // Link to CDS declaration
  declaration_id?: string;
  mrn?: string;
  entry_number?: string; // EPU + Entry Sequence
  acceptance_date?: string; // ISO date - controls time-limit eligibility
  cpc?: string; // Procedure code used
  previous_cpc?: string; // Needed for CPC-related refund checks
  importer_eori?: string; // Importer (may differ from trader)
  declarant_eori?: string; // Agent submitting entry

  // 🆕 Enhanced declaration data
  office_of_import?: string; // e.g., GB000435 - Required for most C285
  customs_regime_code?: string; // e.g., 4000, 6123, 4900
  country_of_export?: string; // Country goods were exported FROM
  preferential_scheme?: string; // e.g., EU-UK TCA, GSP
  preference_claimed_import?: 'yes' | 'no' | 'not_applicable';
  vat_method?: 'postponed_vat' | 'import_vat_paid' | 'other';
  goods_released_free_circulation?: 'yes' | 'no';
  claim_type?: 'full' | 'partial'; // Full or partial claim
  import_type?: 'standard_import' | 'returned_goods' | 'warehouse_release' | 'ppe_relief' | 'other';

  // ===== SECTION 3: REFUND =====
  // Claim details
  reason: ClaimReason;
  reason_description: string;
  refund_reason_code?: string; // HMRC reason code (e.g., CPC error, preference, returned goods)
  refund_reason_text?: string; // Official description
  justification?: string; // AI-generated explanation for HMRC
  relief_scheme?: ReliefScheme;

  // Financial details
  original_duty: number;
  original_vat: number;
  original_excise: number;
  original_total: number;

  correct_duty: number;
  correct_vat: number;
  correct_excise: number;
  correct_total: number;

  duty_overpayment: number;
  vat_overpayment: number;
  excise_overpayment: number;
  total_claim_amount: number;

  // Status and tracking
  status: ClaimStatus;
  priority: ClaimPriority;
  submitted_date?: string; // ISO date
  hmrc_received_date?: string;
  target_decision_date?: string;
  actual_decision_date?: string;
  payment_date?: string;

  // HMRC reference
  hmrc_reference?: string;
  hmrc_case_officer?: string;

  // ===== BANK DETAILS =====
  bank_account_name?: string;
  bank_account_number?: string;
  bank_sort_code?: string;
  bank_iban?: string;
  bank_swift?: string;
  payment_method?: 'bank_transfer' | 'cheque' | 'deferment_account';

  // 🆕 Enhanced payment details
  refund_currency?: 'GBP'; // MUST be GBP only - HMRC does not support EUR
  payment_reference?: string;
  deferment_account_number?: string;

  // ===== SUBMISSION =====
  submitted_by?: string; // Responsible person (e.g., "Neil Jones, MDJ Consultants Ltd")
  submitted_by_role?: string; // e.g., "Director", "Customs Agent"
  declaration_of_accuracy?: boolean;

  // 🆕 Compliance & Evidence
  evidence_will_follow?: boolean; // HMRC sometimes allows this

  // 🆕 Optional HMRC fields
  previous_submission_reference?: string; // For amendments
  notes_to_hmrc?: string;
  attachments_description?: string;
  import_entry_type?: 'CHIEF' | 'CDS';
  transport_mode?: string;
  location_of_goods?: string;
  special_circumstances?: string;

  // 🆕 Optional but beneficial
  invoice_number?: string;
  supplier_name?: string;
  proof_of_export?: string;
  duty_method_at_import?: 'EPU' | 'CDS' | 'Deferment';

  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;

  // Related data
  items?: C285ClaimItem[];
  documents?: C285Document[];
  notes?: C285Note[];
  history?: C285StatusHistory[];
  correspondence?: C285Correspondence[];
}

// ============================================
// 2. C285 CLAIM ITEM (Line Items)
// ============================================

export interface C285ClaimItem {
  id: string;
  claim_id: string;

  // Link to CDS item
  cds_item_id?: string;
  item_number: number;

  // Goods details
  commodity_code: string;
  description: string;
  origin_country?: string;

  // Quantities and values
  quantity?: number;
  net_mass?: number;
  invoice_value: number;
  invoice_currency: string;

  // Original amounts
  original_duty: number;
  original_vat: number;
  original_excise: number;

  // Correct amounts
  correct_duty: number;
  correct_vat: number;
  correct_excise: number;

  // Overpayment
  duty_overpayment: number;
  vat_overpayment: number;
  excise_overpayment: number;
  item_claim_amount: number;

  // Justification
  error_explanation: string;
  correct_classification?: string;
  correct_origin?: string;
  correct_value?: number;

  // 🆕 Enhanced item-level data
  country_of_origin?: string; // Required for preference/returned goods
  measure_explanation?: string; // TARIC measure explanation
  supplementary_units?: number; // Sometimes required
  invoice_number?: string; // Per-item invoice tracking
}

// ============================================
// 3. C285 DOCUMENT (Supporting Evidence)
// ============================================

export interface C285Document {
  id: string;
  claim_id: string;
  category: DocumentCategory;
  filename: string;
  file_size: number;
  file_type: string; // MIME type
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
  is_required: boolean;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

// ============================================
// 4. C285 NOTE (Internal Notes)
// ============================================

export interface C285Note {
  id: string;
  claim_id: string;
  note_type: 'internal' | 'hmrc_query' | 'response' | 'decision';
  content: string;
  created_by: string;
  created_at: string;
  is_important: boolean;
  attachments?: string[]; // Document IDs
}

// ============================================
// 5. C285 STATUS HISTORY
// ============================================

export interface C285StatusHistory {
  id: string;
  claim_id: string;
  status: ClaimStatus;
  changed_by: string;
  changed_at: string;
  reason?: string;
  notes?: string;
}

// ============================================
// 6. C285 CORRESPONDENCE (HMRC Communication)
// ============================================

export interface C285Correspondence {
  id: string;
  claim_id: string;
  direction: 'inbound' | 'outbound';
  type: 'email' | 'letter' | 'phone' | 'portal';
  subject: string;
  content: string;
  sent_date?: string;
  received_date?: string;
  from_name: string;
  to_name: string;
  attachments?: string[]; // Document IDs
}

// ============================================
// CLAIM CREATION & VALIDATION
// ============================================

export interface C285ClaimDraft {
  // Declaration reference
  mrn?: string;
  declaration_id?: string;

  // Claimant
  trader_eori: string;
  trader_name: string;
  agent_eori?: string;
  agent_name?: string;

  // Claim details
  reason: ClaimReason;
  reason_description: string;
  relief_scheme?: ReliefScheme;

  // Items
  items: Partial<C285ClaimItem>[];

  // Documents
  documents?: File[];
  document_categories?: DocumentCategory[];
}

// ============================================
// CLAIM SUBMISSION
// ============================================

export interface C285SubmissionRequest {
  claim_id: string;
  declaration_of_accuracy: boolean;
  contact_email: string;
  contact_phone?: string;
  preferred_payment_method: 'bank_transfer' | 'cheque';
  bank_details?: {
    account_name: string;
    account_number: string;
    sort_code: string;
    iban?: string;
    swift?: string;
  };
}

// CLAIM ANALYTICS
// ============================================

export interface C285ClaimSummary {
  reference: string;
  mrn?: string;
  trader_name: string;
  reason: ClaimReason;
  total_claim_amount: number;
  status: ClaimStatus;
  submitted_date?: string;
  days_pending?: number;
}

export interface C285Analytics {
  total_claims: number;
  total_value: number;
  approved_claims: number;
  approved_value: number;
  rejected_claims: number;
  pending_claims: number;
  average_processing_days: number;
  success_rate: number;
  by_reason: Record<
    ClaimReason,
    {
      count: number;
      value: number;
      success_rate: number;
    }
  >;
  by_month: Array<{
    month: string;
    claims: number;
    value: number;
    approved: number;
  }>;
}

// ============================================
// QUERY FILTERS
// ============================================

export interface C285ClaimFilter {
  reference?: string;
  mrn?: string;
  trader_eori?: string;
  status?: ClaimStatus | ClaimStatus[];
  reason?: ClaimReason | ClaimReason[];
  priority?: ClaimPriority | ClaimPriority[];
  submitted_date_from?: string;
  submitted_date_to?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'submitted_date' | 'total_claim_amount' | 'reference' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface C285ClaimListResponse {
  claims: C285Claim[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
  summary: {
    total_value: number;
    pending_value: number;
    approved_value: number;
  };
}

// ============================================
// BULK OPERATIONS
// ============================================

export interface C285BulkOperation {
  operation: 'update_status' | 'assign_priority' | 'export' | 'delete';
  claim_ids: string[];
  parameters?: {
    new_status?: ClaimStatus;
    new_priority?: ClaimPriority;
    export_format?: 'csv' | 'excel' | 'pdf';
  };
}

export interface C285BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    claim_id: string;
    error: string;
  }>;
}

// ============================================
// INTEGRATION WITH CDS
// ============================================

export interface CDSToC285Mapping {
  declaration: CDSDeclaration;
  suggested_reason: ClaimReason;
  potential_overpayment: number;
  items_with_errors: Array<{
    item: CDSItem;
    error_type: string;
    potential_saving: number;
  }>;
  confidence_score: number; // 0-100
}

/**
 * Complete C285 Payload for HMRC Submission
 * Maps all CDS data to C285 format with evidence pack
 */
