import type { CDSDeclaration } from '@/types';

export interface ManifestSummary {
  totalDeclarations: number;
  uniqueMrns: number;
  matchedClients: number;
  issues: number;
  totalDuties: number;
  lastImport?: string;
  unchecked?: number;
  checked?: number;
  adjusted?: number;
}

export interface ImportBatch {
  id: string;
  file_names?: string[];
  status: string;
  declarations: number;
  items: number;
  tax_lines: number;
  documents?: number;
  created_at: string;
  completed_at?: string;
}

export interface ManifestFilters {
  mrn?: string;
  client?: string;
  status?: string;
  batchId?: string;
  hasIssues?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ManifestDeclaration extends CDSDeclaration {
  batch_id?: string;
  client_name?: string;
  issue_count?: number;
  items_count?: number;
  has_issues?: boolean;
  total_vat_value?: number;
  total_customs_value?: number;
  total_duty_paid: number;
  total_vat_paid: number;
  total_taxes_paid: number;
}

export interface DeclarationVersion {
  id: string;
  declaration_id: string;
  mrn: string;
  version_number: number;
  source: string;
  snapshot_before?: Record<string, unknown> | null;
  snapshot_after: Record<string, unknown>;
  created_at: string;
}

export interface DeclarationEvent {
  id: string;
  declaration_id?: string | null;
  mrn?: string | null;
  event_type: string;
  source: string;
  payload: Record<string, unknown> | string;
  received_at: string;
  created_at: string;
}

export type DeclarationDetail = CDSDeclaration & {
  items?: Array<{
    id: string;
    declaration_mrn?: string;
    item_number: number;
    commodity_code: string;
    description?: string;
    goods_description?: string;
    net_mass?: number;
    gross_mass?: number;
    origin_country?: string;
    invoice_value?: number;
    invoice_currency?: string;
    statistical_value?: number;
    customs_value?: number;
    supplementary_units?: number;
    taxes?: Array<{
      id: string;
      item_number?: number;
      tax_type: string;
      tax_amount?: number;
      tax_base?: number;
      tax_rate?: number;
      calculation_method?: string;
    }>;
  }>;
  taxes?: Array<{
    id: string;
    item_number: number;
    tax_type: string;
    tax_amount?: number;
    tax_base?: number;
    tax_rate?: number;
  }>;
};

export interface AuditFlag {
  type: 'value_discrepancy' | 'potential_refund' | 'underpayment_risk' | string;
  severity: 'warning' | 'fail' | string;
  message: string;
  imported?: number;
  calculated?: number;
  sufferedDuty?: number;
  expectedDuty?: number;
  variance?: number;
}

export interface AnalysisRecord {
  id: string;
  declaration_id: string;
  mrn: string;
  entry_identifier: string;
  item_number: number;
  commodity_code?: string;
  cpc?: string;
  country_of_origin?: string;
  goods_description?: string;
  customs_value?: number;
  duty_paid?: number;
  vat_paid?: number;
  vat_value?: number;
  calculated_vat_base?: number;
  declared_vat_value?: number;
  suffered_duty_rate?: number;
  expected_duty_rate?: number;
  expected_duty?: number;
  duty_variance?: number;
  audit_status: 'unchecked' | 'pass' | 'flagged' | 'fail' | string;
  human_review_status?: string;
  allocation_status?: string;
  audit_flags?: AuditFlag[];
  original_record?: Record<string, unknown> | null;
  adjusted_record?: Record<string, unknown> | null;
}
