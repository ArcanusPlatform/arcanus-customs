/**
 * Refund Calculation Engine
 *
 * Analyzes CDS declarations to detect overpayments and calculate refund amounts
 * Supports multiple refund scenarios and generates draft C285 claims
 */

import type { CDSDeclaration, CDSItem } from '@/types';
import type { ClaimReason } from '@/types';

// ============================================
// TYPES
// ============================================

export interface RefundAnalysis {
  declaration: CDSDeclaration;
  has_overpayment: boolean;
  total_overpayment: number;
  overpayment_breakdown: {
    duty: number;
    vat: number;
    excise: number;
  };
  detected_issues: DetectedIssue[];
  confidence_score: number; // 0-100
  recommended_action: 'claim' | 'review' | 'ignore';
}

export interface DetectedIssue {
  item_number: number;
  issue_type: ClaimReason;
  description: string;
  original_amount: number;
  correct_amount: number;
  overpayment: number;
  confidence: number; // 0-100
  evidence_required: string[];
  auto_fixable: boolean;
}

export interface RefundCalculationResult {
  original_duty: number;
  correct_duty: number;
  duty_overpayment: number;
  original_vat: number;
  correct_vat: number;
  vat_overpayment: number;
  original_excise: number;
  correct_excise: number;
  excise_overpayment: number;
  total_overpayment: number;
  calculation_method: string;
  assumptions: string[];
}

// ============================================
// TARIFF DATABASE (Simplified - would be real DB)
// ============================================

interface TariffRate {
  commodity_code: string;
  description: string;
  duty_rate: number; // percentage
  vat_rate: number; // percentage
  origin_preferences: Record<string, number>; // country code -> preferential rate
}

const TARIFF_DATABASE: Record<string, TariffRate> = {
  '8471300000': {
    commodity_code: '8471300000',
    description: 'Portable automatic data processing machines',
    duty_rate: 0, // Free duty
    vat_rate: 20,
    origin_preferences: {
      CN: 0,
      US: 0,
      JP: 0,
    },
  },
  '6203420000': {
    commodity_code: '6203420000',
    description: "Men's or boys' trousers of cotton",
    duty_rate: 12,
    vat_rate: 20,
    origin_preferences: {
      BD: 0, // Bangladesh - GSP
      VN: 0, // Vietnam - FTA
      TR: 0, // Turkey - Customs Union
    },
  },
  '8703230000': {
    commodity_code: '8703230000',
    description: 'Motor cars with spark-ignition engine 1500-3000cc',
    duty_rate: 10,
    vat_rate: 20,
    origin_preferences: {
      JP: 0, // Japan - EPA
      KR: 0, // South Korea - FTA
    },
  },
  '2204210000': {
    commodity_code: '2204210000',
    description: 'Wine in containers <= 2 litres',
    duty_rate: 0,
    vat_rate: 20,
    origin_preferences: {},
  },
};

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyze a declaration for potential overpayments
 */
export async function analyzeDeclaration(declaration: CDSDeclaration): Promise<RefundAnalysis> {
  const detected_issues: DetectedIssue[] = [];
  let total_overpayment = 0;
  const breakdown = { duty: 0, vat: 0, excise: 0 };

  // Analyze each item
  if (declaration.items) {
    for (const item of declaration.items) {
      const issues = await analyzeItem(item, declaration);
      detected_issues.push(...issues);

      // Accumulate overpayments
      issues.forEach((issue) => {
        total_overpayment += issue.overpayment;

        // Categorize by tax type
        if (issue.issue_type.includes('tariff') || issue.issue_type.includes('duty')) {
          breakdown.duty += issue.overpayment;
        } else if (issue.issue_type.includes('vat')) {
          breakdown.vat += issue.overpayment;
        } else {
          breakdown.excise += issue.overpayment;
        }
      });
    }
  }

  // Calculate confidence score
  const confidence_score = calculateConfidenceScore(detected_issues);

  // Determine recommended action
  let recommended_action: 'claim' | 'review' | 'ignore' = 'ignore';
  if (total_overpayment >= 100 && confidence_score >= 80) {
    recommended_action = 'claim';
  } else if (total_overpayment >= 50 && confidence_score >= 60) {
    recommended_action = 'review';
  }

  return {
    declaration,
    has_overpayment: total_overpayment > 0,
    total_overpayment,
    overpayment_breakdown: breakdown,
    detected_issues,
    confidence_score,
    recommended_action,
  };
}

/**
 * Analyze a single item for issues
 */
async function analyzeItem(item: CDSItem, declaration: CDSDeclaration): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  // Check for tariff code errors
  const tariffIssue = checkTariffCodeError(item);
  if (tariffIssue) issues.push(tariffIssue);

  // Check for origin preference not applied
  const originIssue = checkOriginPreference(item, declaration);
  if (originIssue) issues.push(originIssue);

  // Check for incorrect valuation
  const valuationIssue = checkValuation(item);
  if (valuationIssue) issues.push(valuationIssue);

  // Check for VAT calculation errors
  const vatIssue = checkVATCalculation(item);
  if (vatIssue) issues.push(vatIssue);

  return issues;
}

// ============================================
// ISSUE DETECTION FUNCTIONS
// ============================================

/**
 * Check if wrong tariff code was used
 */
function checkTariffCodeError(item: CDSItem): DetectedIssue | null {
  const tariff = TARIFF_DATABASE[item.commodity_code];
  if (!tariff) return null; // Unknown tariff, can't validate

  const dutyTax = item.taxes?.find((t) => t.tax_type === 'CUST');
  if (!dutyTax) return null;

  // Calculate what duty should be
  const correct_duty = (item.invoice_value * tariff.duty_rate) / 100;
  const overpayment = dutyTax.tax_amount - correct_duty;

  // Only flag if overpayment is significant (>£10 or >5%)
  if (overpayment < 10 && overpayment / dutyTax.tax_amount < 0.05) {
    return null;
  }

  return {
    item_number: item.item_number,
    issue_type: 'tariff_code_error',
    description: `Incorrect duty rate applied. Should be ${tariff.duty_rate}% but ${dutyTax.tax_rate}% was charged.`,
    original_amount: dutyTax.tax_amount,
    correct_amount: correct_duty,
    overpayment,
    confidence: 85,
    evidence_required: ['commercial_invoice', 'tariff_classification', 'duty_calculation'],
    auto_fixable: true,
  };
}

/**
 * Check if origin preference should have been applied
 */
function checkOriginPreference(item: CDSItem, declaration: CDSDeclaration): DetectedIssue | null {
  const tariff = TARIFF_DATABASE[item.commodity_code];
  if (!tariff) return null;

  const origin = item.origin_country || declaration.consignor_name?.substring(0, 2);
  if (!origin) return null;

  const preferential_rate = tariff.origin_preferences[origin];
  if (preferential_rate === undefined) return null; // No preference available

  const dutyTax = item.taxes?.find((t) => t.tax_type === 'CUST');
  if (!dutyTax) return null;

  // Check if standard rate was applied instead of preferential
  const preferential_duty = (item.invoice_value * preferential_rate) / 100;
  const overpayment = dutyTax.tax_amount - preferential_duty;

  if (overpayment < 10) return null;

  return {
    item_number: item.item_number,
    issue_type: 'origin_relief',
    description: `Origin preference for ${origin} not applied. Preferential rate ${preferential_rate}% available.`,
    original_amount: dutyTax.tax_amount,
    correct_amount: preferential_duty,
    overpayment,
    confidence: 75,
    evidence_required: ['certificate_of_origin', 'commercial_invoice', 'preference_declaration'],
    auto_fixable: false, // Requires origin certificate
  };
}

/**
 * Check for valuation errors
 */
function checkValuation(item: CDSItem): DetectedIssue | null {
  // Check if statistical value seems incorrect
  // This is a simplified check - real system would have more sophisticated logic

  if (!item.statistical_value || !item.invoice_value) return null;

  const difference = Math.abs(item.statistical_value - item.invoice_value);
  const percentDiff = (difference / item.invoice_value) * 100;

  // Flag if values differ by more than 10%
  if (percentDiff < 10) return null;

  const dutyTax = item.taxes?.find((t) => t.tax_type === 'CUST');
  if (!dutyTax) return null;

  // Recalculate duty based on correct value
  const correct_duty = (item.invoice_value * dutyTax.tax_rate) / 100;
  const overpayment = dutyTax.tax_amount - correct_duty;

  if (overpayment < 10) return null;

  return {
    item_number: item.item_number,
    issue_type: 'incorrect_valuation',
    description: `Customs value appears incorrect. Invoice value £${item.invoice_value} vs declared £${item.statistical_value}.`,
    original_amount: dutyTax.tax_amount,
    correct_amount: correct_duty,
    overpayment,
    confidence: 60,
    evidence_required: ['commercial_invoice', 'valuation_method', 'price_list'],
    auto_fixable: false,
  };
}

/**
 * Check VAT calculation
 */
function checkVATCalculation(item: CDSItem): DetectedIssue | null {
  const vatTax = item.taxes?.find((t) => t.tax_type === 'VAT');
  if (!vatTax) return null;

  const dutyTax = item.taxes?.find((t) => t.tax_type === 'CUST');
  const duty_amount = dutyTax?.tax_amount || 0;

  // VAT should be calculated on (customs value + duty)
  const vat_base = item.invoice_value + duty_amount;
  const correct_vat = (vat_base * 20) / 100; // Standard UK VAT rate
  const overpayment = vatTax.tax_amount - correct_vat;

  // Only flag if overpayment is significant
  if (Math.abs(overpayment) < 5) return null;

  return {
    item_number: item.item_number,
    issue_type: 'system_error',
    description: `VAT calculated incorrectly. Should be 20% of £${vat_base.toFixed(2)}.`,
    original_amount: vatTax.tax_amount,
    correct_amount: correct_vat,
    overpayment: overpayment > 0 ? overpayment : 0,
    confidence: 90,
    evidence_required: ['commercial_invoice', 'duty_calculation'],
    auto_fixable: true,
  };
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate detailed refund amounts
 */
export function calculateRefund(item: CDSItem, issue: DetectedIssue): RefundCalculationResult {
  const assumptions: string[] = [];

  // Get original taxes
  const original_duty = item.taxes?.find((t) => t.tax_type === 'CUST')?.tax_amount || 0;
  const original_vat = item.taxes?.find((t) => t.tax_type === 'VAT')?.tax_amount || 0;
  const original_excise = item.taxes?.find((t) => t.tax_type === 'EXCISE')?.tax_amount || 0;

  let correct_duty = original_duty;
  let correct_vat = original_vat;
  const correct_excise = original_excise;

  // Apply corrections based on issue type
  if (issue.issue_type === 'tariff_code_error' || issue.issue_type === 'origin_relief') {
    correct_duty = issue.correct_amount;
    assumptions.push(`Duty recalculated based on correct rate`);

    // VAT needs to be recalculated if duty changes
    const vat_base = item.invoice_value + correct_duty;
    correct_vat = (vat_base * 20) / 100;
    assumptions.push(`VAT recalculated on corrected duty base`);
  } else if (issue.issue_type === 'system_error' && issue.description.includes('VAT')) {
    correct_vat = issue.correct_amount;
    assumptions.push(`VAT corrected to 20% of (value + duty)`);
  } else if (issue.issue_type === 'incorrect_valuation') {
    correct_duty = issue.correct_amount;
    const vat_base = item.invoice_value + correct_duty;
    correct_vat = (vat_base * 20) / 100;
    assumptions.push(`Duty and VAT recalculated on correct customs value`);
  }

  return {
    original_duty,
    correct_duty,
    duty_overpayment: original_duty - correct_duty,
    original_vat,
    correct_vat,
    vat_overpayment: original_vat - correct_vat,
    original_excise,
    correct_excise,
    excise_overpayment: original_excise - correct_excise,
    total_overpayment:
      original_duty -
      correct_duty +
      (original_vat - correct_vat) +
      (original_excise - correct_excise),
    calculation_method: issue.issue_type,
    assumptions,
  };
}

/**
 * Calculate confidence score for analysis
 */
function calculateConfidenceScore(issues: DetectedIssue[]): number {
  if (issues.length === 0) return 0;

  // Average confidence of all issues
  const avgConfidence = issues.reduce((sum, issue) => sum + issue.confidence, 0) / issues.length;

  // Boost confidence if multiple issues detected
  const multipleIssuesBoost = Math.min(issues.length * 5, 15);

  // Boost confidence if issues are auto-fixable
  const autoFixableCount = issues.filter((i) => i.auto_fixable).length;
  const autoFixableBoost = (autoFixableCount / issues.length) * 10;

  return Math.min(avgConfidence + multipleIssuesBoost + autoFixableBoost, 100);
}

// ============================================
// BATCH ANALYSIS
// ============================================

/**
 * Analyze multiple declarations in batch
 */
export async function analyzeBatch(
  declarations: CDSDeclaration[],
  onProgress?: (current: number, total: number) => void
): Promise<RefundAnalysis[]> {
  const results: RefundAnalysis[] = [];

  for (let i = 0; i < declarations.length; i++) {
    const analysis = await analyzeDeclaration(declarations[i]);
    results.push(analysis);

    if (onProgress) {
      onProgress(i + 1, declarations.length);
    }
  }

  return results;
}

/**
 * Get summary statistics for batch analysis
 */
export function getBatchSummary(analyses: RefundAnalysis[]): {
  total_declarations: number;
  declarations_with_overpayments: number;
  total_potential_refund: number;
  high_confidence_claims: number;
  requires_review: number;
  by_issue_type: Record<string, number>;
} {
  const by_issue_type: Record<string, number> = {};

  analyses.forEach((analysis) => {
    analysis.detected_issues.forEach((issue) => {
      by_issue_type[issue.issue_type] = (by_issue_type[issue.issue_type] || 0) + 1;
    });
  });

  return {
    total_declarations: analyses.length,
    declarations_with_overpayments: analyses.filter((a) => a.has_overpayment).length,
    total_potential_refund: analyses.reduce((sum, a) => sum + a.total_overpayment, 0),
    high_confidence_claims: analyses.filter((a) => a.recommended_action === 'claim').length,
    requires_review: analyses.filter((a) => a.recommended_action === 'review').length,
    by_issue_type,
  };
}
