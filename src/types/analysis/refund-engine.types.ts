/**
 * Refund Calculation Engine Types
 *
 * Types for the intelligent refund detection and calculation engine
 * Analyzes CDS declarations and generates draft C285 claims
 */

import type { CDSDeclaration } from '../declarations/cds.types';
import type { C285Claim, ClaimReason } from '../claims/c285.types';
import type { TariffEntry } from '../tariffs/tariff.types';

// ============================================
// ELIGIBILITY ANALYSIS
// ============================================

export interface TimeEligibility {
  eligible: boolean;
  days_remaining: number;
  deadline: string; // ISO date
  urgency: 'low' | 'medium' | 'high' | 'critical';
  warning_message?: string;
}

export interface CPCAnalysis {
  eligible: boolean;
  current_cpc: string;
  expected_cpc?: string;
  reason_code?: ClaimReason;
  confidence: number; // 0-1
  explanation?: string;
}

export interface PreferenceEligibility {
  eligible: boolean;
  current_rate: number;
  preferential_rate?: number;
  potential_saving?: number;
  origin_country?: string;
  certificate_required: boolean;
  certificate_available: boolean;
  trade_agreement?: string;
}

export interface VATEligibility {
  eligible: boolean;
  vat_paid: number;
  vat_correct: number;
  difference: number;
  reason: 'incorrect_calculation' | 'postponed_vat' | 'wrong_rate' | 'other';
  explanation?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  time: TimeEligibility;
  cpc: CPCAnalysis;
  preference?: PreferenceEligibility;
  vat?: VATEligibility;
  overall_confidence: number;
  blocking_issues: string[];
  warnings: string[];
}

// ============================================
// DUTY RECALCULATION
// ============================================

export interface DutyCalculation {
  method: 'ad_valorem' | 'specific' | 'mixed' | 'preferential' | 'zero';
  customs_value?: number;
  quantity?: number;
  unit?: string;
  rate: number;
  calculated_duty: number;
  breakdown?: {
    ad_valorem_component?: number;
    specific_component?: number;
    preferential_reduction?: number;
  };
}

export interface ItemRecalculation {
  item_id: string;
  item_number: number;
  commodity_code: string;

  // Original amounts
  duty_paid: number;
  vat_paid: number;
  excise_paid: number;

  // Recalculated amounts
  duty_correct: number;
  vat_correct: number;
  excise_correct: number;

  // Differences
  duty_difference: number;
  vat_difference: number;
  excise_difference: number;
  total_difference: number;

  // Calculation details
  calculation: DutyCalculation;
  tariff_used: TariffEntry;

  // Reason for difference
  error_type?: 'tariff_code' | 'cpc' | 'preference' | 'valuation' | 'rate' | 'other';
  explanation?: string;
}

export interface DeclarationRecalculation {
  declaration_id: string;
  mrn: string;

  // Item-level recalculations
  items: ItemRecalculation[];

  // Totals
  total_duty_paid: number;
  total_duty_correct: number;
  total_duty_difference: number;

  total_vat_paid: number;
  total_vat_correct: number;
  total_vat_difference: number;

  total_excise_paid: number;
  total_excise_correct: number;
  total_excise_difference: number;

  grand_total_paid: number;
  grand_total_correct: number;
  grand_total_difference: number;

  // Metadata
  calculated_at: string;
  calculation_version: string;
}

// ============================================
// OVERPAYMENT DETECTION
// ============================================

export interface OverpaymentItem {
  item_number: number;
  commodity_code: string;
  description: string;
  duty_paid: number;
  duty_correct: number;
  overpayment: number;
  percentage_overpaid: number;
  reason: string;
}

export interface OverpaymentDetection {
  has_overpayment: boolean;
  total_overpayment: number;

  // Breakdown
  duty_overpayment: number;
  vat_overpayment: number;
  excise_overpayment: number;

  // Items
  items_with_overpayment: OverpaymentItem[];
  items_count: number;

  // Eligibility
  eligible_for_claim: boolean;
  minimum_threshold_met: boolean;
  minimum_threshold: number;

  // Confidence
  confidence_score: number; // 0-100
  confidence_level: 'low' | 'medium' | 'high' | 'very_high';

  // Primary reason
  primary_reason: ClaimReason;
  secondary_reasons?: ClaimReason[];
}

// ============================================
// REASON CLASSIFICATION
// ============================================

export interface ReasonRule {
  code: ClaimReason;
  name: string;
  detect: (decl: CDSDeclaration, calc: DeclarationRecalculation) => boolean;
  confidence: number;
  template: string;
  required_evidence: string[];
}

export interface ReasonClassification {
  reason_code: ClaimReason;
  reason_text: string;
  justification: string;
  confidence: number; // 0-1
  detection_method: 'rule-based' | 'ai-powered' | 'hybrid';

  // Supporting evidence
  evidence_found: string[];
  evidence_missing: string[];

  // Alternative reasons
  alternative_reasons?: Array<{
    code: ClaimReason;
    confidence: number;
    explanation: string;
  }>;
}

// ============================================
// DRAFT CLAIM GENERATION
// ============================================

export interface DraftClaimRequest {
  declaration_id: string;
  overpayment: OverpaymentDetection;
  reason: ReasonClassification;
  auto_attach_documents?: boolean;
  generate_evidence_pack?: boolean;
}

export interface DraftClaimResult {
  success: boolean;
  claim?: C285Claim;
  claim_id?: string;
  claim_reference?: string;

  // Documents
  documents_attached: number;
  documents_missing: string[];

  // Evidence pack
  evidence_pack_generated: boolean;
  evidence_pack_id?: string;

  // Validation
  validation_passed: boolean;
  validation_errors?: string[];
  validation_warnings?: string[];

  // Next steps
  ready_for_review: boolean;
  ready_for_submission: boolean;
  required_actions: string[];
}

// ============================================
// ANALYSIS RESULT
// ============================================

export interface RefundAnalysisResult {
  declaration_id: string;
  mrn: string;
  analyzed_at: string;

  // Eligibility
  eligible: boolean;
  eligibility: EligibilityResult;

  // Recalculation
  recalculation?: DeclarationRecalculation;

  // Overpayment
  overpayment?: OverpaymentDetection;

  // Reason
  reason?: ReasonClassification;

  // Draft claim
  draft_claim?: C285Claim;

  // Status
  status: 'not_eligible' | 'eligible' | 'draft_created' | 'error';
  message: string;

  // Recommendations
  recommendations: string[];
  next_steps: string[];
}

// ============================================
// ENGINE CONFIGURATION
// ============================================

export interface RefundEngineConfig {
  // Thresholds
  minimum_claim_amount: number; // Default: £50
  minimum_item_difference: number; // Default: £0.01

  // Confidence thresholds
  minimum_confidence_auto_draft: number; // Default: 0.80
  minimum_confidence_notify: number; // Default: 0.60

  // Time limits
  days_before_deadline_warning: number; // Default: 90
  days_before_deadline_critical: number; // Default: 30

  // Tariff database
  tariff_database_url: string;
  tariff_cache_ttl_hours: number; // Default: 24

  // AI service
  ai_service_enabled: boolean;
  ai_service_url?: string;
  ai_confidence_threshold: number; // Default: 0.70

  // Document handling
  auto_attach_documents: boolean;
  auto_generate_evidence_pack: boolean;
  ocr_enabled: boolean;

  // Notifications
  notify_on_opportunity: boolean;
  notify_on_draft_created: boolean;
  notify_on_missing_documents: boolean;
}

export const DEFAULT_ENGINE_CONFIG: RefundEngineConfig = {
  minimum_claim_amount: 50,
  minimum_item_difference: 0.01,
  minimum_confidence_auto_draft: 0.8,
  minimum_confidence_notify: 0.6,
  days_before_deadline_warning: 90,
  days_before_deadline_critical: 30,
  tariff_database_url: 'https://api.trade-tariff.service.gov.uk',
  tariff_cache_ttl_hours: 24,
  ai_service_enabled: true,
  ai_confidence_threshold: 0.7,
  auto_attach_documents: true,
  auto_generate_evidence_pack: true,
  ocr_enabled: true,
  notify_on_opportunity: true,
  notify_on_draft_created: true,
  notify_on_missing_documents: true,
};

// ============================================
// BATCH ANALYSIS
// ============================================

export interface BatchAnalysisRequest {
  declaration_ids: string[];
  config?: Partial<RefundEngineConfig>;
  priority?: 'low' | 'normal' | 'high';
}

export interface BatchAnalysisResult {
  batch_id: string;
  total_declarations: number;
  analyzed: number;
  eligible: number;
  drafts_created: number;
  errors: number;

  results: RefundAnalysisResult[];

  summary: {
    total_potential_refunds: number;
    average_refund_amount: number;
    most_common_reason: ClaimReason;
    processing_time_ms: number;
  };

  started_at: string;
  completed_at: string;
}

// ============================================
// STATISTICS
// ============================================

export interface RefundEngineStatistics {
  period: 'day' | 'week' | 'month';
  start_date: string;
  end_date: string;

  declarations_analyzed: number;
  opportunities_detected: number;
  drafts_created: number;

  total_potential_refunds: number;
  average_refund_amount: number;
  median_refund_amount: number;

  by_reason: Record<
    ClaimReason,
    {
      count: number;
      total_amount: number;
      average_confidence: number;
    }
  >;

  confidence_distribution: {
    very_high: number; // > 0.90
    high: number; // 0.80-0.90
    medium: number; // 0.60-0.80
    low: number; // < 0.60
  };

  processing_performance: {
    average_time_ms: number;
    p50_time_ms: number;
    p95_time_ms: number;
    p99_time_ms: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePercentageDifference(original: number, correct: number): number {
  if (original === 0) return 0;
  return ((original - correct) / original) * 100;
}

export function determineConfidenceLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (score >= 0.9) return 'very_high';
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}
