/**
 * C285 Claim Generator
 *
 * Automatically generates draft C285 claims from refund analysis
 */

import type { CDSDeclaration } from '@/types';
import type { C285Claim, C285ClaimItem } from '@/types';
import type { RefundAnalysis, DetectedIssue } from './refund-calculator';

/**
 * Generate a draft C285 claim from refund analysis
 */
export function generateDraftClaim(analysis: RefundAnalysis): C285Claim {
  const declaration = analysis.declaration;

  // Determine primary claim reason (most significant issue)
  const primary_issue = analysis.detected_issues.reduce((max, issue) =>
    issue.overpayment > max.overpayment ? issue : max
  );

  // Generate claim items
  const claim_items = generateClaimItems(analysis.detected_issues, declaration);

  // Calculate totals
  const total_duty_overpayment = claim_items.reduce((sum, item) => sum + item.duty_overpayment, 0);
  const total_vat_overpayment = claim_items.reduce((sum, item) => sum + item.vat_overpayment, 0);
  const total_excise_overpayment = claim_items.reduce(
    (sum, item) => sum + (item.excise_overpayment || 0),
    0
  );

  // Generate reason description
  const reason_description = generateReasonDescription(analysis.detected_issues);

  const timestamp = new Date().toISOString();

  const claimantId = declaration.trader_eori || 'unknown-claimant';

  const claim: C285Claim = {
    id: crypto.randomUUID(),
    reference: generateClaimReference(),
    declaration_id: declaration.id,
    mrn: declaration.mrn,
    trader_eori: declaration.trader_eori,
    trader_name: declaration.consignee_name || 'Unknown',

    reason: primary_issue.issue_type,
    reason_description,

    original_duty: declaration.total_duty_paid,
    original_vat: declaration.total_vat_paid,
    original_excise: declaration.total_excise_paid || 0,
    original_total: declaration.total_taxes_paid,

    correct_duty: declaration.total_duty_paid - total_duty_overpayment,
    correct_vat: declaration.total_vat_paid - total_vat_overpayment,
    correct_excise: (declaration.total_excise_paid || 0) - total_excise_overpayment,
    correct_total:
      declaration.total_taxes_paid -
      (total_duty_overpayment + total_vat_overpayment + total_excise_overpayment),

    duty_overpayment: total_duty_overpayment,
    vat_overpayment: total_vat_overpayment,
    excise_overpayment: total_excise_overpayment,

    total_claim_amount: total_duty_overpayment + total_vat_overpayment + total_excise_overpayment,

    status: 'draft',
    priority: 'normal',
    submitted_date: undefined,

    items: claim_items,

    // 🆕 Declarant (system-generated claims need defaults)
    declarant_id: 'system',
    declarant_name: 'System Generated',
    declarant_capacity: 'importer',
    claimant_id: claimantId,
    claimant_type: 'self_entity',
    identity_source: 'SETTINGS',
    identity_locked_at: timestamp,

    created_by: 'system',
    created_at: timestamp,
    updated_at: timestamp,
  };

  return claim;
}

/**
 * Generate claim items from detected issues
 */
function generateClaimItems(issues: DetectedIssue[], declaration: CDSDeclaration): C285ClaimItem[] {
  const items: C285ClaimItem[] = [];

  issues.forEach((issue) => {
    const declaration_item = declaration.items?.find((i) => i.item_number === issue.item_number);
    if (!declaration_item) return;

    const duty_tax = declaration_item.taxes?.find((t) => t.tax_type === 'CUST');
    const vat_tax = declaration_item.taxes?.find((t) => t.tax_type === 'VAT');
    const excise_tax = declaration_item.taxes?.find((t) => t.tax_type === 'EXCISE');

    // Calculate overpayments based on issue type
    let duty_overpayment = 0;
    let vat_overpayment = 0;
    const excise_overpayment = 0;

    if (issue.issue_type === 'tariff_code_error' || issue.issue_type === 'origin_relief') {
      duty_overpayment = issue.overpayment;
      // VAT overpayment due to duty correction
      if (vat_tax) {
        const original_vat_base = declaration_item.invoice_value + (duty_tax?.tax_amount || 0);
        const correct_vat_base = declaration_item.invoice_value + issue.correct_amount;
        vat_overpayment = ((original_vat_base - correct_vat_base) * 20) / 100;
      }
    } else if (issue.issue_type === 'system_error' && issue.description.includes('VAT')) {
      vat_overpayment = issue.overpayment;
    }

    const item: C285ClaimItem = {
      id: crypto.randomUUID(),
      claim_id: '', // Will be set when claim is saved
      item_number: issue.item_number,
      commodity_code: declaration_item.commodity_code,
      description: declaration_item.description,

      invoice_value: declaration_item.invoice_value,
      invoice_currency: declaration_item.invoice_currency,

      original_duty: duty_tax?.tax_amount || 0,
      correct_duty:
        issue.issue_type.includes('duty') ||
        issue.issue_type.includes('tariff') ||
        issue.issue_type.includes('origin')
          ? issue.correct_amount
          : duty_tax?.tax_amount || 0,
      duty_overpayment,

      original_vat: vat_tax?.tax_amount || 0,
      correct_vat:
        issue.issue_type === 'system_error' && issue.description.includes('VAT')
          ? issue.correct_amount
          : (vat_tax?.tax_amount || 0) - vat_overpayment,
      vat_overpayment,

      original_excise: excise_tax?.tax_amount || 0,
      correct_excise: excise_tax?.tax_amount || 0,
      excise_overpayment: excise_overpayment || 0,

      item_claim_amount: duty_overpayment + vat_overpayment + (excise_overpayment || 0),

      error_explanation: issue.description,
    };

    items.push(item);
  });

  return items;
}

/**
 * Generate comprehensive reason description
 */
function generateReasonDescription(issues: DetectedIssue[]): string {
  if (issues.length === 0) return 'No issues detected';

  if (issues.length === 1) {
    return issues[0].description;
  }

  // Multiple issues - create summary
  const issue_types = [...new Set(issues.map((i) => i.issue_type))];
  const total_overpayment = issues.reduce((sum, i) => sum + i.overpayment, 0);

  let description = `Multiple overpayment issues detected totaling £${total_overpayment.toFixed(2)}:\n\n`;

  issue_types.forEach((type) => {
    const type_issues = issues.filter((i) => i.issue_type === type);
    const type_total = type_issues.reduce((sum, i) => sum + i.overpayment, 0);
    const items = type_issues.map((i) => i.item_number).join(', ');

    description += `- ${formatIssueType(type)}: £${type_total.toFixed(2)} (Items: ${items})\n`;
  });

  return description;
}

/**
 * Format issue type for display
 */
function formatIssueType(type: string): string {
  const formats: Record<string, string> = {
    tariff_code_error: 'Incorrect Tariff Classification',
    origin_relief: 'Origin Preference Not Applied',
    goods_return: 'Goods Returned/Re-exported',
    goods_destroyed: 'Goods Destroyed/Abandoned',
    vat_postponement: 'VAT Postponement Account Error',
    incorrect_valuation: 'Incorrect Customs Valuation',
    preference_not_claimed: 'Trade Preference Not Claimed',
    relief_not_applied: 'Relief Scheme Not Applied',
    system_error: 'HMRC System Error',
    other: 'Other',
    vat_calculation_error: 'VAT Calculation Error',
  };

  return formats[type] || type;
}

/**
 * Generate unique claim reference
 */
function generateClaimReference(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  // Format: C285-YY-MM-XXXX (e.g., C285-24-11-A3F2)
  return `C285-${year}-${month}-${random}`;
}

/**
 * Generate multiple claims from batch analysis
 */
export function generateBatchClaims(analyses: RefundAnalysis[]): C285Claim[] {
  return analyses
    .filter((analysis) => analysis.has_overpayment && analysis.recommended_action !== 'ignore')
    .map((analysis) => generateDraftClaim(analysis));
}

/**
 * Validate draft claim before submission
 */
export function validateDraftClaim(claim: C285Claim): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!claim.mrn) errors.push('MRN is required');
  if (!claim.trader_eori) errors.push('Trader EORI is required');
  if (!claim.reason) errors.push('Claim reason is required');
  if (!claim.reason_description) errors.push('Reason description is required');
  if (claim.total_claim_amount <= 0) errors.push('Claim amount must be greater than zero');
  if (!claim.items || claim.items.length === 0) errors.push('At least one claim item is required');

  // Warnings
  if (claim.total_claim_amount < 50) {
    warnings.push('Claim amount is below £50 - may not be worth pursuing');
  }
  if (claim.items && claim.items.length === 0) {
    warnings.push('No claim items found');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Enrich claim with additional data
 */
export function enrichClaim(claim: C285Claim, declaration: CDSDeclaration): C285Claim {
  return {
    ...claim,
    // Add any missing data from declaration
    trader_name: claim.trader_name || declaration.consignee_name || 'Unknown',
    declaration_id: claim.declaration_id || declaration.id,
  };
}

/**
 * Calculate claim priority
 */
export function calculateClaimPriority(claim: C285Claim): 'low' | 'normal' | 'high' | 'urgent' {
  const amount = claim.total_claim_amount;

  // Urgent: Very high value
  if (amount >= 10000) return 'urgent';

  // High: High value
  if (amount >= 5000) return 'high';

  // Normal: Moderate value
  if (amount >= 500) return 'normal';

  // Low: Everything else
  return 'low';
}
