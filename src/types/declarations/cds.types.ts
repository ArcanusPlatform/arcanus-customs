/**
 * CDS (Customs Declaration Service) Data Types
 *
 * This file defines the complete data model for CDS declarations
 * matching HMRC's CDS API structure and supporting multiple data sources
 * (HMRC API, agent API, SFTP, CSV, ERP feeds)
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type DeclarationType = 'IM4' | 'EX1' | 'CO' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6';

export type DeclarationStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'released'
  | 'amended'
  | 'cancelled'
  | 'rejected'
  | 'under_review';

export type DeclarationSource =
  | 'hmrc_api'
  | 'hmrc_information_api'
  | 'hmrc_notification'
  | 'agent_api'
  | 'csv'
  | 'sftp'
  | 'erp_feed'
  | 'manual';

export type PartyRole =
  | 'importer'
  | 'declarant'
  | 'consignor'
  | 'consignee'
  | 'agent'
  | 'representative';

export type TaxType =
  | 'CUST' // Customs Duty
  | 'VAT' // Value Added Tax
  | 'EXCISE' // Excise Duty
  | 'ADD' // Additional Duty
  | 'ANTIDUMP' // Anti-Dumping Duty
  | 'COUNTERVAIL' // Countervailing Duty
  | 'SAFEGUARD'; // Safeguard Duty

export type CalculationMethod =
  | 'ad_valorem' // Percentage of value
  | 'specific' // Fixed amount per unit
  | 'mixed' // Combination
  | 'compound'; // Complex calculation

export type DocumentType =
  | 'N380' // Commercial Invoice
  | 'N325' // Packing List
  | 'N703' // Bill of Lading
  | 'N704' // Air Waybill
  | 'N730' // Road Consignment Note (CMR)
  | 'N935' // EUR1 Certificate
  | 'N954' // Statement of Origin
  | 'C505' // Import Licence
  | 'C514' // Export Licence
  | 'Y900' // Previous Document
  | 'OTHER';

export type PaymentMethod =
  | 'cash_account'
  | 'duty_deferment'
  | 'guarantee'
  | 'postponed_vat'
  | 'immediate_payment';

export type AmendmentType = 'correction' | 'cancellation' | 'supplementary' | 'invalidation';

// ============================================
// 1. CDS DECLARATION (Header)
// ============================================

export interface CDSDeclaration {
  id: string;
  mrn: string;
  entry_number?: string;
  acceptance_date: string; // ISO date
  declaration_type: DeclarationType;
  trader_eori: string;
  importer_eori: string;
  consignee_name?: string;
  consignor_name?: string;
  incoterm?: string; // CIF, FOB, EXW, etc.
  procedure_code: string; // Combined Procedure Code (e.g., "4000C07")
  previous_procedure_code?: string;
  soe_code?: string;
  roe_code?: string;
  status: DeclarationStatus;

  // Financial totals
  total_duty_paid: number;
  total_vat_paid: number;
  total_excise_paid: number;
  total_taxes_paid: number;

  // Metadata
  declaration_source: DeclarationSource;
  last_updated_from_hmrc?: string;
  raw_data?: Record<string, unknown>;
  source_columns?: string[];
  unmapped_fields?: string[];
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp

  // Related data (populated via joins)
  parties?: CDSParty[];
  items?: CDSItem[];
  documents?: CDSDocumentReference[];
  payments?: CDSPayment[];
  amendments?: CDSAmendment[];
  status_history?: CDSStatusHistory[];
}

// ============================================
// 2. CDS PARTY (Parties Involved)
// ============================================

export interface CDSParty {
  id: string;
  declaration_id: string;
  role: PartyRole;
  eori?: string;
  name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  postcode?: string;
}

// ============================================
// 3. CDS ITEM (Goods Items)
// ============================================

export interface CDSItem {
  id: string;
  declaration_id: string;
  item_number: number;
  commodity_code: string; // 10-digit HS code
  description: string;
  origin_country?: string;

  // Weights and quantities
  gross_mass?: number;
  net_mass?: number;
  quantity?: number; // Supplementary units

  // Values
  statistical_value?: number;
  invoice_value: number;
  invoice_currency: string; // ISO currency code

  // Procedures and preferences
  preference?: string; // Preference code
  procedure_code: string;
  previous_procedure_code?: string;

  // Related data
  taxes?: CDSItemTax[];
}

// ============================================
// 4. CDS ITEM TAX (Duty/VAT/Charges per Item)
// ============================================

export interface CDSItemTax {
  id: string;
  item_id: string;
  tax_type: TaxType;
  tax_base: number; // Value HMRC used for calculation
  tax_rate: number; // Rate (e.g., 2.5%, £1.77/kg)
  tax_amount: number; // Actual tax charged
  calculation_method: CalculationMethod;
}

// ============================================
// 5. CDS DOCUMENT REFERENCE (Linked Docs)
// ============================================

export interface CDSDocumentReference {
  id: string;
  declaration_id: string;
  document_type: DocumentType;
  document_reference: string;
  document_status?: string;
  issue_date?: string; // ISO date
}

// ============================================
// 6. CDS PAYMENT
// ============================================

export interface CDSPayment {
  id: string;
  declaration_id: string;
  payment_type: string;
  amount: number;
  account_number?: string;
  method: PaymentMethod;
}

// ============================================
// 7. CDS AMENDMENT
// ============================================

export interface CDSAmendment {
  id: string;
  declaration_id: string;
  amendment_date: string; // ISO date
  amendment_type: AmendmentType;
  notes?: string;
}

// ============================================
// 8. CDS STATUS HISTORY
// ============================================

export interface CDSStatusHistory {
  id: string;
  declaration_id: string;
  status: DeclarationStatus;
  timestamp: string; // ISO timestamp
}

// ============================================
// HELPER TYPES FOR API RESPONSES
// ============================================

export interface CDSDeclarationWithRelations extends CDSDeclaration {
  parties: CDSParty[];
  items: CDSItemWithTaxes[];
  documents: CDSDocumentReference[];
  payments: CDSPayment[];
  amendments: CDSAmendment[];
  status_history: CDSStatusHistory[];
}

export interface CDSItemWithTaxes extends CDSItem {
  taxes: CDSItemTax[];
}

// ============================================
// DATA IMPORT/EXPORT TYPES
// ============================================

export interface CDSImportRequest {
  source: DeclarationSource;
  data: Partial<CDSDeclaration> | CDSDeclaration[];
  validate?: boolean;
  auto_create_claim?: boolean;
}

export interface CDSImportResponse {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors?: Array<{
    mrn?: string;
    error: string;
    details?: Record<string, unknown>;
  }>;
  declarations?: CDSDeclaration[];
}

export interface CDSValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CDSValidationResult {
  valid: boolean;
  errors: CDSValidationError[];
  warnings?: CDSValidationError[];
}

// ============================================
// QUERY FILTERS
// ============================================

export interface CDSDeclarationFilter {
  mrn?: string;
  trader_eori?: string;
  importer_eori?: string;
  status?: DeclarationStatus | DeclarationStatus[];
  declaration_type?: DeclarationType | DeclarationType[];
  acceptance_date_from?: string;
  acceptance_date_to?: string;
  source?: DeclarationSource | DeclarationSource[];
  min_value?: number;
  max_value?: number;
  commodity_code?: string;
  search?: string; // Full-text search
  limit?: number;
  offset?: number;
  sort_by?: 'acceptance_date' | 'mrn' | 'total_taxes_paid' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface CDSDeclarationListResponse {
  declarations: CDSDeclaration[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ============================================
// CALCULATION HELPERS
// ============================================

export interface CDSTaxCalculation {
  item_id: string;
  commodity_code: string;
  customs_value: number;
  duty_rate: number;
  duty_amount: number;
  vat_rate: number;
  vat_amount: number;
  excise_rate?: number;
  excise_amount?: number;
  total_tax: number;
}

export interface CDSDeclarationSummary {
  mrn: string;
  acceptance_date: string;
  importer_name: string;
  total_items: number;
  total_value: number;
  total_duty: number;
  total_vat: number;
  total_taxes: number;
  status: DeclarationStatus;
}
