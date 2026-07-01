/**
 * Evidence Automation & OCR Engine Types
 *
 * Types for intelligent document processing, OCR extraction,
 * automatic matching, and evidence pack assembly
 */

// import type { CDSDeclaration } from '../declarations/cds.types';
// import type { C285Claim } from '../claims/c285.types';
import type { DocumentCategory } from '../claims/c285.types';

// ============================================
// DOCUMENT INTAKE
// ============================================

export type DocumentIntakeMethod =
  | 'upload' // User drag-and-drop
  | 'email' // Email ingestion
  | 'api' // Agent API push
  | 'sftp' // SFTP drop
  | 'extraction'; // Extracted from ZIP/PDF

export type DocumentClassification =
  | 'invoice' // Commercial invoice
  | 'c88' // Import entry summary
  | 'c79' // VAT certificate
  | 'packing_list' // Packing list
  | 'awb' // Air waybill
  | 'cmr' // Road consignment note
  | 'bill_of_lading' // Bill of lading
  | 'proof_of_return' // Export evidence
  | 'proof_of_export' // Export declaration
  | 'credit_note' // Supplier correction
  | 'origin_certificate' // CO, REX, EUR1
  | 'correspondence' // Emails, letters
  | 'calculation_sheet' // Duty calculation
  | 'justification_letter' // Claim justification
  | 'bank_details' // Payment information
  | 'other' // Unclassified
  | 'unknown'; // Cannot classify

export interface DocumentIntake {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string; // MIME type
  pages: number;

  // Intake details
  intake_method: DocumentIntakeMethod;
  received_at: string;
  received_from?: string; // Email address, API client, etc.

  // Storage
  storage_path: string;
  storage_bucket?: string;
  file_hash: string; // SHA-256

  // Classification
  classification: DocumentClassification;
  classification_confidence: number; // 0-1
  classification_method: 'ai' | 'rules' | 'manual';

  // Status
  status: 'pending' | 'processing' | 'classified' | 'extracted' | 'matched' | 'failed';

  // Processing
  ocr_completed: boolean;
  ocr_confidence?: number;
  extraction_completed: boolean;
  matching_completed: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  processed_by?: string;
}

// ============================================
// OCR EXTRACTION
// ============================================

export type OCRProvider = 'google_vision' | 'aws_textract' | 'azure_ocr' | 'tesseract';

export interface OCRConfig {
  provider: OCRProvider;
  language: string; // ISO 639-1 code
  enable_preprocessing: boolean;
  enable_deskew: boolean;
  enable_denoising: boolean;
  confidence_threshold: number; // 0-1
}

export interface OCRResult {
  document_id: string;
  provider: OCRProvider;

  // Raw text
  full_text: string;

  // Structured extraction
  extracted_data: ExtractedData;

  // Confidence
  overall_confidence: number;
  field_confidences: Record<string, number>;

  // Processing
  processing_time_ms: number;
  pages_processed: number;

  // Quality
  quality_score: number; // 0-100
  issues: string[];

  // Metadata
  extracted_at: string;
  version: string;
}

export interface ExtractedData {
  // Common fields
  document_type?: DocumentClassification;
  document_number?: string;
  document_date?: string;

  // Invoice fields
  invoice?: InvoiceData;

  // C88 fields
  c88?: C88Data;

  // Packing list fields
  packing_list?: PackingListData;

  // Transport document fields
  transport?: TransportData;

  // Origin certificate fields
  origin_certificate?: OriginCertificateData;

  // Proof of return fields
  proof_of_return?: ProofOfReturnData;
}

export interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  supplier_address?: string;
  buyer_name?: string;
  buyer_address?: string;

  currency: string;
  total_value: number;
  subtotal?: number;
  tax_amount?: number;

  line_items: Array<{
    item_number?: number;
    sku?: string;
    description: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
    weight?: number;
  }>;

  payment_terms?: string;
  incoterm?: string;
}

export interface C88Data {
  mrn: string;
  entry_number?: string;
  acceptance_date: string;
  importer_eori: string;
  declarant_eori?: string;

  procedure_code?: string;

  total_duty: number;
  total_vat: number;
  total_excise?: number;
  total_taxes: number;

  items: Array<{
    item_number: number;
    commodity_code: string;
    description: string;
    origin_country?: string;
    net_mass?: number;
    customs_value?: number;
  }>;
}

export interface PackingListData {
  packing_list_number?: string;
  date?: string;
  total_packages: number;
  total_weight?: number;
  total_volume?: number;

  items: Array<{
    item_number?: number;
    description: string;
    quantity: number;
    weight?: number;
    dimensions?: string;
  }>;
}

export interface TransportData {
  document_type: 'awb' | 'cmr' | 'bill_of_lading';
  document_number: string;
  date?: string;

  shipper?: string;
  consignee?: string;

  origin?: string;
  destination?: string;

  container_number?: string;
  vessel_name?: string;
  flight_number?: string;
}

export interface OriginCertificateData {
  certificate_type: 'EUR1' | 'REX' | 'CO' | 'Form_A' | 'other';
  certificate_number: string;
  issue_date: string;

  exporter: string;
  importer?: string;

  origin_country: string;

  goods_description: string;

  issuing_authority?: string;
}

export interface ProofOfReturnData {
  export_mrn?: string;
  export_date: string;

  original_import_mrn?: string;
  original_import_date?: string;

  goods_description: string;

  reason_for_return?: string;
}

// ============================================
// DOCUMENT MATCHING
// ============================================

export interface MatchingCriteria {
  // Field matching
  mrn_match: boolean;
  invoice_number_match: boolean;
  supplier_match: boolean;
  date_proximity_match: boolean;
  value_match: boolean;
  commodity_match: boolean;
  transport_number_match: boolean;

  // Scores
  mrn_score: number;
  invoice_score: number;
  supplier_score: number;
  date_score: number;
  value_score: number;
  commodity_score: number;
  transport_score: number;

  // Total
  total_score: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
}

export interface DocumentMatch {
  document_id: string;
  declaration_id: string;
  mrn: string;

  // Matching details
  criteria: MatchingCriteria;
  match_score: number; // 0-100
  match_confidence: 'high' | 'medium' | 'low';

  // Status
  status: 'auto_matched' | 'manual_review' | 'rejected' | 'confirmed';

  // Item-level matching (optional)
  item_matches?: Array<{
    document_line: number;
    declaration_item: number;
    confidence: number;
  }>;

  // Metadata
  matched_at: string;
  matched_by: 'system' | 'user';
  confirmed_by?: string;
  confirmed_at?: string;
}

export interface MatchingResult {
  document_id: string;

  // Matches found
  matches: DocumentMatch[];
  best_match?: DocumentMatch;

  // Status
  auto_matched: boolean;
  requires_review: boolean;

  // Recommendations
  recommended_action: 'accept' | 'review' | 'reject';
  reason: string;
}

// ============================================
// EVIDENCE PACK ASSEMBLY
// ============================================

export interface EvidencePack {
  pack_id: string;
  claim_id: string;
  claim_reference: string;

  // Format
  format: 'PDF' | 'ZIP';

  // Contents
  documents: EvidenceDocument[];

  // Structure
  has_cover_page: boolean;
  has_calculation_sheet: boolean;
  has_justification_letter: boolean;

  // Completeness
  required_documents_present: boolean;
  missing_documents: string[];
  completeness_score: number; // 0-100

  // File details
  filename: string;
  file_size: number;
  file_hash: string;
  storage_path: string;

  // Status
  status: 'draft' | 'complete' | 'submitted';
  ready_for_submission: boolean;

  // Metadata
  generated_at: string;
  generated_by: string;
  version: number;
}

export interface EvidenceDocument {
  document_id: string;
  type: DocumentCategory;
  filename: string;
  pages: number;
  file_size: number;
  hash: string;

  // Position in pack
  order: number;
  section: 'mandatory' | 'supporting' | 'additional';

  // Status
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface CoverPage {
  claim_reference: string;
  mrn: string;
  importer_eori: string;
  importer_name: string;
  declarant_eori?: string;

  duty_overpaid: number;
  vat_overpaid: number;
  total_claim_amount: number;

  reason_for_claim: string;

  contact_name: string;
  contact_email: string;
  contact_phone?: string;

  submission_date: string;

  document_count: number;
  total_pages: number;
}

export interface CalculationSheet {
  claim_reference: string;
  mrn: string;

  items: Array<{
    item_number: number;
    commodity_code: string;
    description: string;

    duty_paid: number;
    duty_correct: number;
    duty_difference: number;

    vat_paid: number;
    vat_correct: number;
    vat_difference: number;

    explanation: string;
  }>;

  totals: {
    total_duty_paid: number;
    total_duty_correct: number;
    total_duty_difference: number;

    total_vat_paid: number;
    total_vat_correct: number;
    total_vat_difference: number;

    grand_total_claim: number;
  };

  calculation_method: string;
  tariff_reference?: string;
}

export interface JustificationLetter {
  claim_reference: string;
  mrn: string;

  introduction: string;
  background: string;
  error_explanation: string;
  supporting_evidence: string;
  conclusion: string;

  full_text: string;

  generated_by: 'ai' | 'template' | 'manual';
  reviewed_by?: string;
}

// ============================================
// MISSING EVIDENCE DETECTION
// ============================================

export interface MissingEvidenceCheck {
  claim_id: string;
  claim_reference: string;
  reason_code: string;

  // Required documents
  required_documents: DocumentCategory[];
  present_documents: DocumentCategory[];
  missing_documents: DocumentCategory[];

  // Status
  all_required_present: boolean;
  can_submit: boolean;

  // Actions
  required_actions: Array<{
    action: 'upload' | 'request' | 'generate';
    document_type: DocumentCategory;
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;

  // Notifications
  notifications_sent: Array<{
    type: 'email' | 'sms' | 'in_app';
    recipient: string;
    sent_at: string;
  }>;
}

// ============================================
// DOCUMENT PREPROCESSING
// ============================================

export interface PreprocessingConfig {
  deskew: boolean;
  denoise: boolean;
  enhance_contrast: boolean;
  remove_background: boolean;
  binarize: boolean;
  resize: boolean;
  target_dpi?: number;
}

export interface PreprocessingResult {
  document_id: string;

  operations_applied: string[];

  quality_before: number; // 0-100
  quality_after: number; // 0-100
  improvement: number;

  processing_time_ms: number;

  output_path: string;
}

// ============================================
// EMAIL INGESTION
// ============================================

export interface EmailIngestionConfig {
  email_addresses: string[]; // e.g., invoices@mdutyrefunds.co.uk
  imap_server: string;
  imap_port: number;
  username: string;
  password: string;

  auto_classify: boolean;
  auto_extract: boolean;
  auto_match: boolean;

  allowed_senders?: string[]; // Whitelist
  blocked_senders?: string[]; // Blacklist
}

export interface EmailDocument {
  email_id: string;
  from: string;
  to: string;
  subject: string;
  received_at: string;

  attachments: Array<{
    filename: string;
    size: number;
    content_type: string;
    document_id?: string; // After processing
  }>;

  body_text?: string;

  processed: boolean;
  processed_at?: string;
}

// ============================================
// BATCH PROCESSING
// ============================================

export interface BatchDocumentProcessing {
  batch_id: string;

  total_documents: number;
  processed: number;
  classified: number;
  extracted: number;
  matched: number;
  failed: number;

  status: 'pending' | 'processing' | 'completed' | 'failed';

  started_at: string;
  completed_at?: string;

  results: Array<{
    document_id: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

// ============================================
// STATISTICS
// ============================================

export interface EvidenceEngineStatistics {
  period: 'day' | 'week' | 'month';
  start_date: string;
  end_date: string;

  documents_processed: number;
  documents_classified: number;
  documents_extracted: number;
  documents_matched: number;

  by_type: Record<DocumentClassification, number>;
  by_intake_method: Record<DocumentIntakeMethod, number>;

  ocr_accuracy: number; // Average confidence
  classification_accuracy: number;
  matching_accuracy: number;

  auto_match_rate: number; // Percentage
  manual_review_rate: number;

  evidence_packs_generated: number;
  average_pack_size_mb: number;

  processing_performance: {
    average_ocr_time_ms: number;
    average_classification_time_ms: number;
    average_matching_time_ms: number;
    average_pack_generation_time_ms: number;
  };
}

// ============================================
// API TYPES
// ============================================

export interface UploadDocumentRequest {
  file: File | Buffer;
  filename: string;
  document_type?: DocumentClassification;
  related_mrn?: string;
  related_claim_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadDocumentResponse {
  success: boolean;
  document_id: string;
  filename: string;
  classification: DocumentClassification;
  classification_confidence: number;
  message: string;
}

export interface ProcessDocumentRequest {
  document_id: string;
  force_reprocess?: boolean;
  ocr_config?: Partial<OCRConfig>;
  auto_match?: boolean;
}

export interface ProcessDocumentResponse {
  success: boolean;
  document_id: string;
  ocr_result?: OCRResult;
  matching_result?: MatchingResult;
  message: string;
}

export interface GenerateEvidencePackRequest {
  claim_id: string;
  format: 'PDF' | 'ZIP';
  include_cover_page: boolean;
  include_calculation_sheet: boolean;
  include_justification_letter: boolean;
  custom_documents?: string[]; // Document IDs
}

export interface GenerateEvidencePackResponse {
  success: boolean;
  pack_id: string;
  filename: string;
  file_size: number;
  download_url: string;
  completeness_score: number;
  missing_documents: string[];
  ready_for_submission: boolean;
}
