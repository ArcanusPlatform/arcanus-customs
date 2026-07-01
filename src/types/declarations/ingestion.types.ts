/**
 * CDS Ingestion Service Types
 *
 * Types for the CDS data ingestion microservice
 * Handles data from multiple sources and normalizes to unified model
 */

import type { CDSDeclaration, CDSItem, CDSParty, CDSItemTax, DeclarationSource } from './cds.types';

// ============================================
// RAW DECLARATION (Before Normalization)
// ============================================

export interface RawDeclaration {
  source: DeclarationSource;
  source_id?: string;
  raw_data: Record<string, unknown>; // Original data from source
  received_at: string;

  // Extracted fields (may need normalization)
  mrn?: string;
  entry_number?: string;
  acceptance_date?: string;
  importer_eori?: string;
  declarant_eori?: string;
  procedure_code?: string;

  // Metadata
  broker_name?: string;
  file_name?: string;
  batch_id?: string;
}

// ============================================
// CONNECTOR CONFIGURATIONS
// ============================================

export interface HMRCConnectorConfig {
  client_id: string;
  client_secret: string;
  token_url: string;
  api_base_url: string;
  scopes: string[];
  environment: 'sandbox' | 'production';
}

export interface AgentGatewayConfig {
  broker_name: string;
  connection_type: 'sftp' | 'api' | 'webhook';
  credentials: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    api_key?: string;
    private_key?: string;
  };
  data_format: 'json' | 'xml' | 'csv';
  schedule?: string; // Cron expression
  path?: string; // SFTP path or API endpoint
}

export interface CSVConnectorConfig {
  delimiter: ',' | '\t' | ';' | '|';
  has_header: boolean;
  encoding: 'utf-8' | 'iso-8859-1' | 'windows-1252';
  date_format: string;
  decimal_separator: '.' | ',';
  thousands_separator: ',' | '.' | ' ' | '';
  skip_rows?: number;
  column_mapping?: Record<string, string>;
}

export interface ERPConnectorConfig {
  system_type: 'sap' | 'oracle' | 'sage' | 'datafreight' | 'custom';
  connection_method: 'api' | 'soap' | 'database' | 'file';
  credentials: Record<string, string>;
  mapping_config: FieldMappingConfig;
  sync_frequency?: string; // Cron expression
}

export interface FieldMappingConfig {
  field_mappings: Array<{
    source_field: string;
    target_field: string;
    transformation?: string;
    default_value?: string | number | boolean | null;
  }>;
  tax_code_mappings: Record<string, string>;
  cpc_mappings?: Record<string, string>;
}

// ============================================
// NORMALIZATION
// ============================================

export interface NormalizationResult {
  success: boolean;
  declaration?: CDSDeclaration;
  errors: NormalizationError[];
  warnings: NormalizationWarning[];
  transformations_applied: string[];
}

export interface NormalizationError {
  field: string;
  original_value: unknown;
  error: string;
  severity: 'error' | 'warning';
}

export interface NormalizationWarning {
  field: string;
  original_value: unknown;
  normalized_value: unknown;
  message: string;
}

export interface CurrencyAmount {
  amount_gbp: number;
  original_amount: number;
  original_currency: string;
  exchange_rate: number;
  conversion_date: string;
}

// ============================================
// VALIDATION
// ============================================

export interface MandatoryValidation {
  // Format checks
  mrn_format: boolean;
  eori_format: boolean;
  commodity_code_format: boolean;
  cpc_format: boolean;

  // Required fields
  has_mrn: boolean;
  has_importer_eori: boolean;
  has_acceptance_date: boolean;
  has_at_least_one_item: boolean;

  // Calculation checks
  duty_totals_match: boolean;
  vat_totals_match: boolean;
  no_negative_amounts: boolean;

  // Date validation
  valid_date_format: boolean;
  acceptance_date_not_future: boolean;
}

export interface SmartValidation {
  // Duplicate detection
  is_duplicate: boolean;
  duplicate_mrn?: string;
  duplicate_declaration_id?: string;

  // Amendment detection
  is_amendment: boolean;
  original_declaration_id?: string;
  amendment_number?: number;

  // Missing data detection
  missing_tax_lines: string[];
  missing_parties: string[];
  missing_documents: string[];

  // Inconsistency detection
  inconsistent_totals: boolean;
  inconsistent_cpc: boolean;
  impossible_values: Array<{
    field: string;
    value: unknown;
    reason: string;
  }>;
}

export interface ComplianceValidation {
  // Time limits
  within_3_year_limit: boolean;
  days_until_deadline: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';

  // Duplicate claims
  has_existing_claim: boolean;
  existing_claim_id?: string;
  existing_claim_status?: string;

  // CPC consistency
  cpc_history_consistent: boolean;
  cpc_supports_import: boolean;
  cpc_warnings: string[];

  // EORI validation
  eori_registered: boolean;
  eori_active: boolean;
  eori_warnings: string[];
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export interface IngestionValidationResult {
  valid: boolean;
  mandatory: MandatoryValidation;
  smart: SmartValidation;
  compliance: ComplianceValidation;
  errors: ValidationError[];
  warnings: ValidationError[];
  can_proceed: boolean;
  requires_quarantine: boolean;
}

// ============================================
// QUARANTINE QUEUE
// ============================================

export interface QuarantinedDeclaration {
  id: string;
  raw_data: RawDeclaration;
  source: DeclarationSource;
  received_at: string;

  // Validation results
  validation_errors: ValidationError[];
  validation_warnings: ValidationError[];

  // Status
  status: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'retry';
  reviewed_by?: string;
  reviewed_at?: string;
  resolution_notes?: string;

  // Retry logic
  retry_count: number;
  last_retry_at?: string;
  next_retry_at?: string;
  max_retries: number;

  // Assignment
  assigned_to?: string;
  assigned_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

// ============================================
// EVENTS
// ============================================

export type DeclarationEvent =
  | DeclarationNewEvent
  | DeclarationUpdatedEvent
  | DeclarationStatusChangedEvent
  | RefundOpportunityEvent
  | MissingDocumentsEvent;

export interface DeclarationNewEvent {
  type: 'declaration.new';
  declaration_id: string;
  mrn: string;
  importer_eori: string;
  total_duty: number;
  total_vat: number;
  total_excise: number;
  acceptance_date: string;
  source: DeclarationSource;
  timestamp: string;
}

export interface DeclarationUpdatedEvent {
  type: 'declaration.updated';
  declaration_id: string;
  mrn: string;
  changes: Array<{
    field: string;
    old_value: unknown;
    new_value: unknown;
  }>;
  is_amendment: boolean;
  amendment_number?: number;
  timestamp: string;
}

export interface DeclarationStatusChangedEvent {
  type: 'declaration.status.changed';
  declaration_id: string;
  mrn: string;
  old_status: string;
  new_status: string;
  reason?: string;
  timestamp: string;
}

export interface RefundOpportunityEvent {
  type: 'refund.opportunity';
  declaration_id: string;
  mrn: string;
  potential_refund: number;
  reason: string;
  confidence_score: number;
  details: {
    original_duty: number;
    correct_duty: number;
    difference: number;
    explanation: string;
  };
  timestamp: string;
}

export interface MissingDocumentsEvent {
  type: 'missing.documents';
  declaration_id: string;
  mrn: string;
  missing_documents: string[];
  required_for_claim: boolean;
  timestamp: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// POST /ingest/csv
export interface IngestCSVRequest {
  file: File | Buffer;
  config?: Partial<CSVConnectorConfig>;
  validate_only?: boolean;
  batch_id?: string;
}

export interface IngestCSVResponse {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors?: Array<{
    row: number;
    mrn?: string;
    error: string;
    details?: Record<string, unknown>;
  }>;
  declaration_ids?: string[];
  batch_id?: string;
}

// POST /ingest/hmrc
export interface IngestHMRCRequest {
  mrn: string;
  force_refresh?: boolean;
  include_amendments?: boolean;
}

export interface IngestHMRCResponse {
  success: boolean;
  declaration_id: string;
  mrn: string;
  message: string;
  is_new: boolean;
  amendments_count?: number;
}

// POST /ingest/agent
export interface IngestAgentRequest {
  broker: string;
  data_format: 'json' | 'xml' | 'csv';
  payload: Record<string, unknown>;
  batch_id?: string;
}

export interface IngestAgentResponse {
  success: boolean;
  processed_count: number;
  failed_count: number;
  declaration_ids: string[];
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

// GET /declaration/:mrn
export interface GetDeclarationResponse {
  declaration: CDSDeclaration;
  items: CDSItem[];
  parties: CDSParty[];
  taxes: CDSItemTax[];
  amendments?: Array<Record<string, unknown>>;
  status_history?: Array<Record<string, unknown>>;
}

// GET /declarations
export interface ListDeclarationsRequest {
  importer_eori?: string;
  declarant_eori?: string;
  from_date?: string;
  to_date?: string;
  status?: string | string[];
  source?: DeclarationSource | DeclarationSource[];
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'acceptance_date' | 'mrn' | 'total_taxes_paid' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface ListDeclarationsResponse {
  declarations: CDSDeclaration[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// POST /validate
export interface ValidateDeclarationRequest {
  declaration: Partial<CDSDeclaration>;
  skip_compliance?: boolean;
}

export interface ValidateDeclarationResponse {
  valid: boolean;
  mandatory: MandatoryValidation;
  smart: SmartValidation;
  compliance: ComplianceValidation;
  errors: ValidationError[];
  warnings: ValidationError[];
  can_proceed: boolean;
}

// GET /quarantine
export interface ListQuarantinedRequest {
  status?: QuarantinedDeclaration['status'];
  assigned_to?: string;
  priority?: QuarantinedDeclaration['priority'];
  limit?: number;
  offset?: number;
}

export interface ListQuarantinedResponse {
  quarantined: QuarantinedDeclaration[];
  total_count: number;
  page: number;
  page_size: number;
}

// POST /quarantine/:id/review
export interface ReviewQuarantinedRequest {
  action: 'approve' | 'reject' | 'retry';
  notes: string;
  corrections?: Record<string, unknown>;
}

export interface ReviewQuarantinedResponse {
  success: boolean;
  declaration_id?: string;
  message: string;
}

// ============================================
// RETRY CONFIGURATION
// ============================================

export interface RetryConfig {
  max_attempts: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
  retry_on_errors: string[];
  retry_on_status_codes?: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  max_attempts: 3,
  initial_delay_ms: 1000,
  max_delay_ms: 30000,
  backoff_multiplier: 2,
  retry_on_errors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'SERVICE_UNAVAILABLE'],
  retry_on_status_codes: [408, 429, 500, 502, 503, 504],
};

// ============================================
// PROCESSING STATUS
// ============================================

export interface ProcessingStatus {
  declaration_id?: string;
  mrn?: string;
  status:
    | 'queued'
    | 'processing'
    | 'normalizing'
    | 'validating'
    | 'saving'
    | 'completed'
    | 'failed'
    | 'quarantined';
  progress_percentage: number;
  current_step: string;
  started_at: string;
  completed_at?: string;
  error?: string;
  warnings?: string[];
}

// ============================================
// BATCH PROCESSING
// ============================================

export interface BatchJob {
  batch_id: string;
  source: DeclarationSource;
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  quarantined_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  errors?: Array<{
    index: number;
    mrn?: string;
    error: string;
  }>;
}

// ============================================
// STATISTICS
// ============================================

export interface IngestionStatistics {
  period: 'hour' | 'day' | 'week' | 'month';
  start_date: string;
  end_date: string;

  total_ingested: number;
  by_source: Record<DeclarationSource, number>;

  validation_success_rate: number;
  quarantine_rate: number;

  average_processing_time_ms: number;
  p50_processing_time_ms: number;
  p95_processing_time_ms: number;
  p99_processing_time_ms: number;

  error_rate: number;
  errors_by_type: Record<string, number>;

  refund_opportunities_detected: number;
  total_potential_refunds: number;
}

// ============================================
// HEALTH CHECK
// ============================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;

  components: {
    database: ComponentHealth;
    redis: ComponentHealth;
    message_queue: ComponentHealth;
    sftp_connections: ComponentHealth;
  };

  metrics: {
    uptime_seconds: number;
    declarations_processed_last_hour: number;
    quarantine_queue_size: number;
    average_processing_time_ms: number;
  };
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  last_check: string;
  response_time_ms?: number;
}
