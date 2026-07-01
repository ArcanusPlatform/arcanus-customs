/**
 * C285 Claim Validation Logic
 *
 * Comprehensive validation before HMRC submission
 * Ensures all requirements are met and calculations are correct
 */

import type {
  C285SubmissionPayload,
  C285ValidationResult,
  C285ValidationError,
  C285ReasonCode,
  C285DocumentType,
} from '@/types';
import type { CDSDeclaration } from '@/types';

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

export function validateC285Payload(
  payload: C285SubmissionPayload,
  cdsDeclaration?: CDSDeclaration
): C285ValidationResult {
  const errors: C285ValidationError[] = [];
  const warnings: C285ValidationError[] = [];
  const infoMessages: C285ValidationError[] = [];

  // Run all validation checks
  validateClaimant(payload.claimant, errors, warnings);
  validateDeclaration(payload.declaration, cdsDeclaration, errors, warnings);
  validateRefund(payload.refund, payload.declaration, errors);
  validateDocuments(payload.documents, payload.refund.refund_reason_code, errors, warnings);
  validateBankDetails(payload.bank_details, errors, warnings);
  validateSubmitter(payload.submitted_by, errors, warnings);
  validateCalculations(payload, errors);
  validateTimeLimits(payload.declaration.acceptance_date, errors, warnings, infoMessages);

  // Calculate completeness score
  const completenessScore = calculateCompletenessScore(payload, errors, warnings);

  // Determine if submission ready
  const submissionReady = errors.length === 0 && completenessScore >= 90;

  // Identify missing requirements
  const missingRequirements = identifyMissingRequirements(payload, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info_messages: infoMessages,
    completeness_score: completenessScore,
    submission_ready: submissionReady,
    missing_requirements: missingRequirements,
  };
}

// ============================================
// CLAIMANT VALIDATION
// ============================================

function validateClaimant(
  claimant: C285SubmissionPayload['claimant'],
  errors: C285ValidationError[],
  warnings: C285ValidationError[]
): void {
  // Required fields
  if (!claimant.name || claimant.name.trim().length === 0) {
    errors.push({
      field: 'claimant.name',
      rule: 'eori_matches_claimant',
      message: 'Claimant name is required',
      severity: 'error',
      code: 'CLAIMANT_NAME_REQUIRED',
    });
  }

  // EORI validation
  if (!claimant.eori) {
    errors.push({
      field: 'claimant.eori',
      rule: 'eori_matches_claimant',
      message: 'Claimant EORI is required',
      severity: 'error',
      code: 'CLAIMANT_EORI_REQUIRED',
    });
  } else if (!isValidEORI(claimant.eori)) {
    errors.push({
      field: 'claimant.eori',
      rule: 'eori_matches_claimant',
      message: 'Invalid EORI format (should be GB followed by 12 digits)',
      severity: 'error',
      code: 'CLAIMANT_EORI_INVALID',
    });
  }

  // Contact details
  if (!claimant.contact_email || !isValidEmail(claimant.contact_email)) {
    errors.push({
      field: 'claimant.contact_email',
      rule: 'eori_matches_claimant',
      message: 'Valid contact email is required',
      severity: 'error',
      code: 'CONTACT_EMAIL_INVALID',
    });
  }

  if (!claimant.contact_name) {
    warnings.push({
      field: 'claimant.contact_name',
      rule: 'eori_matches_claimant',
      message: 'Contact name is recommended',
      severity: 'warning',
      code: 'CONTACT_NAME_MISSING',
    });
  }

  if (!claimant.address || claimant.address.trim().length < 10) {
    errors.push({
      field: 'claimant.address',
      rule: 'eori_matches_claimant',
      message: 'Complete postal address is required',
      severity: 'error',
      code: 'ADDRESS_INCOMPLETE',
    });
  }
}

// ============================================
// DECLARATION VALIDATION
// ============================================

function validateDeclaration(
  declaration: C285SubmissionPayload['declaration'],
  cdsDeclaration: CDSDeclaration | undefined,
  errors: C285ValidationError[],
  warnings: C285ValidationError[]
): void {
  // MRN validation
  if (!declaration.mrn) {
    errors.push({
      field: 'declaration.mrn',
      rule: 'mrn_exists_in_cds',
      message: 'MRN is required',
      severity: 'error',
      code: 'MRN_REQUIRED',
    });
  } else if (!isValidMRN(declaration.mrn)) {
    errors.push({
      field: 'declaration.mrn',
      rule: 'mrn_exists_in_cds',
      message: 'Invalid MRN format (should be 18 characters)',
      severity: 'error',
      code: 'MRN_INVALID',
    });
  }

  // Check if MRN exists in CDS
  if (cdsDeclaration && cdsDeclaration.mrn !== declaration.mrn) {
    errors.push({
      field: 'declaration.mrn',
      rule: 'mrn_exists_in_cds',
      message: 'MRN not found in CDS declarations',
      severity: 'error',
      code: 'MRN_NOT_FOUND',
    });
  }

  // Entry number
  if (!declaration.entry_number) {
    warnings.push({
      field: 'declaration.entry_number',
      rule: 'mrn_exists_in_cds',
      message: 'Entry number is recommended',
      severity: 'warning',
      code: 'ENTRY_NUMBER_MISSING',
    });
  }

  // Acceptance date
  if (!declaration.acceptance_date) {
    errors.push({
      field: 'declaration.acceptance_date',
      rule: 'within_time_limit',
      message: 'Acceptance date is required',
      severity: 'error',
      code: 'ACCEPTANCE_DATE_REQUIRED',
    });
  }

  // CPC validation
  if (!declaration.cpc) {
    errors.push({
      field: 'declaration.cpc',
      rule: 'cpc_supports_refund',
      message: 'Customs Procedure Code is required',
      severity: 'error',
      code: 'CPC_REQUIRED',
    });
  } else if (!isValidCPC(declaration.cpc)) {
    warnings.push({
      field: 'declaration.cpc',
      rule: 'cpc_supports_refund',
      message: 'CPC format may be invalid',
      severity: 'warning',
      code: 'CPC_FORMAT_WARNING',
    });
  }

  // EORI validation
  if (!declaration.importer_eori || !isValidEORI(declaration.importer_eori)) {
    errors.push({
      field: 'declaration.importer_eori',
      rule: 'eori_matches_claimant',
      message: 'Valid importer EORI is required',
      severity: 'error',
      code: 'IMPORTER_EORI_INVALID',
    });
  }

  // Goods items
  if (!declaration.goods_items || declaration.goods_items.length === 0) {
    errors.push({
      field: 'declaration.goods_items',
      rule: 'item_totals_match_header',
      message: 'At least one goods item is required',
      severity: 'error',
      code: 'NO_GOODS_ITEMS',
    });
  } else {
    declaration.goods_items.forEach((item, index) => {
      validateGoodsItem(item, index, errors, warnings);
    });
  }
}

function validateGoodsItem(
  item: C285SubmissionPayload['declaration']['goods_items'][0],
  index: number,
  errors: C285ValidationError[],
  warnings: C285ValidationError[]
): void {
  const prefix = `declaration.goods_items[${index}]`;

  // Commodity code
  if (!item.commodity_code || !isValidCommodityCode(item.commodity_code)) {
    errors.push({
      field: `${prefix}.commodity_code`,
      rule: 'calculations_balanced',
      message: `Item ${index + 1}: Invalid commodity code (should be 10 digits)`,
      severity: 'error',
      code: 'COMMODITY_CODE_INVALID',
    });
  }

  // Description
  if (!item.description || item.description.trim().length < 10) {
    warnings.push({
      field: `${prefix}.description`,
      rule: 'calculations_balanced',
      message: `Item ${index + 1}: Description should be more detailed`,
      severity: 'warning',
      code: 'DESCRIPTION_TOO_SHORT',
    });
  }

  // Amounts
  if (item.duty_paid < 0 || item.duty_should_have_been < 0) {
    errors.push({
      field: `${prefix}.duty`,
      rule: 'no_negative_refunds',
      message: `Item ${index + 1}: Duty amounts cannot be negative`,
      severity: 'error',
      code: 'NEGATIVE_DUTY',
    });
  }

  if (item.duty_paid <= item.duty_should_have_been) {
    errors.push({
      field: `${prefix}.duty`,
      rule: 'duty_paid_greater_than_correct',
      message: `Item ${index + 1}: Duty paid must be greater than correct duty for a refund`,
      severity: 'error',
      code: 'NO_OVERPAYMENT',
    });
  }

  // Difference calculation
  const calculatedDifference = item.duty_paid - item.duty_should_have_been;
  if (Math.abs(item.difference - calculatedDifference) > 0.01) {
    errors.push({
      field: `${prefix}.difference`,
      rule: 'calculations_balanced',
      message: `Item ${index + 1}: Difference calculation incorrect`,
      severity: 'error',
      code: 'DIFFERENCE_MISMATCH',
    });
  }

  // Tax breakdown
  if (!item.tax_breakdown || item.tax_breakdown.length === 0) {
    warnings.push({
      field: `${prefix}.tax_breakdown`,
      rule: 'calculations_balanced',
      message: `Item ${index + 1}: Tax breakdown is recommended`,
      severity: 'warning',
      code: 'TAX_BREAKDOWN_MISSING',
    });
  }
}

// ============================================
// REFUND VALIDATION
// ============================================

function validateRefund(
  refund: C285SubmissionPayload['refund'],
  declaration: C285SubmissionPayload['declaration'],
  errors: C285ValidationError[]
): void {
  // Amounts
  if (refund.total_paid <= 0) {
    errors.push({
      field: 'refund.total_paid',
      rule: 'no_negative_refunds',
      message: 'Total paid must be positive',
      severity: 'error',
      code: 'TOTAL_PAID_INVALID',
    });
  }

  if (refund.total_correct < 0) {
    errors.push({
      field: 'refund.total_correct',
      rule: 'no_negative_refunds',
      message: 'Total correct cannot be negative',
      severity: 'error',
      code: 'TOTAL_CORRECT_NEGATIVE',
    });
  }

  if (refund.total_difference <= 0) {
    errors.push({
      field: 'refund.total_difference',
      rule: 'no_negative_refunds',
      message: 'Refund amount must be positive',
      severity: 'error',
      code: 'NO_REFUND_AMOUNT',
    });
  }

  // Calculation check
  const calculatedDifference = refund.total_paid - refund.total_correct;
  if (Math.abs(refund.total_difference - calculatedDifference) > 0.01) {
    errors.push({
      field: 'refund.total_difference',
      rule: 'calculations_balanced',
      message: 'Refund calculation does not match (paid - correct)',
      severity: 'error',
      code: 'REFUND_CALCULATION_ERROR',
    });
  }

  // Check totals match items
  const itemsTotal = declaration.goods_items.reduce((sum, item) => sum + item.difference, 0);
  if (Math.abs(refund.total_difference - itemsTotal) > 0.01) {
    errors.push({
      field: 'refund.total_difference',
      rule: 'item_totals_match_header',
      message: 'Refund total does not match sum of item differences',
      severity: 'error',
      code: 'TOTALS_MISMATCH',
    });
  }

  // Reason code
  if (!refund.refund_reason_code) {
    errors.push({
      field: 'refund.refund_reason_code',
      rule: 'cpc_supports_refund',
      message: 'Refund reason code is required',
      severity: 'error',
      code: 'REASON_CODE_REQUIRED',
    });
  }

  // Justification
  if (!refund.justification || refund.justification.trim().length < 50) {
    errors.push({
      field: 'refund.justification',
      rule: 'evidence_bundle_complete',
      message: 'Detailed justification is required (minimum 50 characters)',
      severity: 'error',
      code: 'JUSTIFICATION_TOO_SHORT',
    });
  }
}

// ============================================
// DOCUMENTS VALIDATION
// ============================================

function validateDocuments(
  documents: C285SubmissionPayload['documents'],
  reasonCode: C285ReasonCode,
  errors: C285ValidationError[],
  warnings: C285ValidationError[]
): void {
  if (!documents || documents.length === 0) {
    errors.push({
      field: 'documents',
      rule: 'required_documents_uploaded',
      message: 'At least one supporting document is required',
      severity: 'error',
      code: 'NO_DOCUMENTS',
    });
    return;
  }

  // Get required documents for this reason
  const requiredDocs = getRequiredDocuments(reasonCode);
  const uploadedTypes = documents.map((d) => d.type);

  // Check for missing required documents
  requiredDocs.forEach((requiredType) => {
    if (!uploadedTypes.includes(requiredType)) {
      errors.push({
        field: 'documents',
        rule: 'required_documents_uploaded',
        message: `Required document missing: ${requiredType}`,
        severity: 'error',
        code: 'REQUIRED_DOCUMENT_MISSING',
      });
    }
  });

  // Validate each document
  documents.forEach((doc, index) => {
    if (!doc.filename || doc.filename.trim().length === 0) {
      errors.push({
        field: `documents[${index}].filename`,
        rule: 'required_documents_uploaded',
        message: `Document ${index + 1}: Filename is required`,
        severity: 'error',
        code: 'DOCUMENT_FILENAME_MISSING',
      });
    }

    if (!doc.hash || doc.hash.length !== 64) {
      errors.push({
        field: `documents[${index}].hash`,
        rule: 'document_hashes_valid',
        message: `Document ${index + 1}: Invalid SHA-256 hash`,
        severity: 'error',
        code: 'DOCUMENT_HASH_INVALID',
      });
    }

    if (doc.pages <= 0) {
      warnings.push({
        field: `documents[${index}].pages`,
        rule: 'required_documents_uploaded',
        message: `Document ${index + 1}: Page count should be specified`,
        severity: 'warning',
        code: 'DOCUMENT_PAGES_MISSING',
      });
    }
  });
}

// ============================================
// BANK DETAILS VALIDATION
// ============================================

function validateBankDetails(
  bankDetails: C285SubmissionPayload['bank_details'],
  errors: C285ValidationError[],
  warnings: C285ValidationError[]
): void {
  if (!bankDetails.account_name || bankDetails.account_name.trim().length === 0) {
    errors.push({
      field: 'bank_details.account_name',
      rule: 'evidence_bundle_complete',
      message: 'Account name is required',
      severity: 'error',
      code: 'ACCOUNT_NAME_REQUIRED',
    });
  }

  if (!bankDetails.account_number || !isValidUKAccountNumber(bankDetails.account_number)) {
    errors.push({
      field: 'bank_details.account_number',
      rule: 'evidence_bundle_complete',
      message: 'Valid UK account number is required (8 digits)',
      severity: 'error',
      code: 'ACCOUNT_NUMBER_INVALID',
    });
  }

  if (!bankDetails.sort_code || !isValidUKSortCode(bankDetails.sort_code)) {
    errors.push({
      field: 'bank_details.sort_code',
      rule: 'evidence_bundle_complete',
      message: 'Valid UK sort code is required (6 digits)',
      severity: 'error',
      code: 'SORT_CODE_INVALID',
    });
  }

  // IBAN/SWIFT for international
  if (bankDetails.iban && !isValidIBAN(bankDetails.iban)) {
    warnings.push({
      field: 'bank_details.iban',
      rule: 'evidence_bundle_complete',
      message: 'IBAN format may be invalid',
      severity: 'warning',
      code: 'IBAN_FORMAT_WARNING',
    });
  }
}

// ============================================
// SUBMITTER VALIDATION
// ============================================

function validateSubmitter(
  submitter: C285SubmissionPayload['submitted_by'],
  errors: C285ValidationError[],
  warnings: C285ValidationError[]
): void {
  if (!submitter.name || submitter.name.trim().length === 0) {
    errors.push({
      field: 'submitted_by.name',
      rule: 'evidence_bundle_complete',
      message: 'Submitter name is required',
      severity: 'error',
      code: 'SUBMITTER_NAME_REQUIRED',
    });
  }

  if (!submitter.email || !isValidEmail(submitter.email)) {
    errors.push({
      field: 'submitted_by.email',
      rule: 'evidence_bundle_complete',
      message: 'Valid submitter email is required',
      severity: 'error',
      code: 'SUBMITTER_EMAIL_INVALID',
    });
  }

  if (!submitter.role || submitter.role.trim().length === 0) {
    warnings.push({
      field: 'submitted_by.role',
      rule: 'evidence_bundle_complete',
      message: 'Submitter role is recommended',
      severity: 'warning',
      code: 'SUBMITTER_ROLE_MISSING',
    });
  }
}

// ============================================
// CALCULATIONS VALIDATION
// ============================================

function validateCalculations(payload: C285SubmissionPayload, errors: C285ValidationError[]): void {
  // All calculations are checked in individual sections
  // This is a final sanity check

  const totalFromItems = payload.declaration.goods_items.reduce(
    (sum, item) => sum + item.difference,
    0
  );

  if (Math.abs(payload.refund.total_difference - totalFromItems) > 0.01) {
    errors.push({
      field: 'refund.total_difference',
      rule: 'calculations_balanced',
      message: 'Final calculation check failed: totals do not balance',
      severity: 'error',
      code: 'FINAL_CALCULATION_ERROR',
    });
  }
}

// ============================================
// TIME LIMITS VALIDATION
// ============================================

function validateTimeLimits(
  acceptanceDate: string,
  errors: C285ValidationError[],
  warnings: C285ValidationError[],
  infoMessages: C285ValidationError[]
): void {
  const timeLimits = calculateTimeLimits(acceptanceDate);

  if (!timeLimits.within_time_limit) {
    errors.push({
      field: 'declaration.acceptance_date',
      rule: 'within_time_limit',
      message: 'Claim is outside the 3-year time limit',
      severity: 'error',
      code: 'TIME_LIMIT_EXCEEDED',
    });
  } else if (timeLimits.urgency_level === 'critical') {
    warnings.push({
      field: 'declaration.acceptance_date',
      rule: 'within_time_limit',
      message: `Urgent: Only ${timeLimits.days_remaining} days remaining to submit`,
      severity: 'warning',
      code: 'TIME_LIMIT_CRITICAL',
    });
  } else if (timeLimits.urgency_level === 'high') {
    infoMessages.push({
      field: 'declaration.acceptance_date',
      rule: 'within_time_limit',
      message: `${timeLimits.days_remaining} days remaining to submit`,
      severity: 'info',
      code: 'TIME_LIMIT_WARNING',
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateCompletenessScore(
  payload: C285SubmissionPayload,
  errors: C285ValidationError[],
  warnings: C285ValidationError[]
): number {
  let score = 100;

  // Deduct for errors
  score -= errors.length * 10;

  // Deduct for warnings
  score -= warnings.length * 2;

  // Bonus for optional fields
  if (payload.claimant.company_number) score += 2;
  if (payload.claimant.contact_phone) score += 2;
  if (payload.bank_details.iban) score += 2;
  if (payload.bank_details.swift) score += 2;

  return Math.max(0, Math.min(100, score));
}

function identifyMissingRequirements(
  _payload: C285SubmissionPayload,
  errors: C285ValidationError[]
): string[] {
  const missing: string[] = [];

  errors.forEach((error) => {
    if (error.code.includes('REQUIRED') || error.code.includes('MISSING')) {
      missing.push(error.message);
    }
  });

  return [...new Set(missing)]; // Remove duplicates
}

function getRequiredDocuments(reasonCode: C285ReasonCode): C285DocumentType[] {
  // This would import from c285-payload.types.ts
  // Simplified here for demonstration
  const baseRequired: C285DocumentType[] = [
    'invoice',
    'c88',
    'duty_calculation',
    'justification_letter',
  ];

  switch (reasonCode) {
    case 'PREFERENCE_ERROR':
    case 'ORIGIN_ERROR':
      return [...baseRequired, 'certificate_of_origin'];
    case 'RGR':
      return [...baseRequired, 'proof_of_return', 'proof_of_export'];
    case 'GOODS_DESTROYED':
      return [...baseRequired, 'destruction_certificate'];
    case 'VAT_POSTPONEMENT':
      return [...baseRequired, 'c79'];
    default:
      return baseRequired;
  }
}

// ============================================
// VALIDATION UTILITIES
// ============================================

function isValidEORI(eori: string): boolean {
  return /^GB\d{12}$/.test(eori);
}

function isValidMRN(mrn: string): boolean {
  return /^\d{2}[A-Z]{2}\d{14}$/.test(mrn);
}

function isValidCPC(cpc: string): boolean {
  return /^\d{4}[A-Z]\d{2}$/.test(cpc);
}

function isValidCommodityCode(code: string): boolean {
  return /^\d{10}$/.test(code);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUKAccountNumber(accountNumber: string): boolean {
  return /^\d{8}$/.test(accountNumber.replace(/\s/g, ''));
}

function isValidUKSortCode(sortCode: string): boolean {
  return /^\d{6}$/.test(sortCode.replace(/-/g, ''));
}

function isValidIBAN(iban: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban.replace(/\s/g, ''));
}

function calculateTimeLimits(acceptanceDate: string): {
  days_remaining: number;
  within_time_limit: boolean;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
} {
  const acceptance = new Date(acceptanceDate);
  const deadline = new Date(acceptance);
  deadline.setFullYear(deadline.getFullYear() + 3);

  const today = new Date();
  const daysRemaining = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (daysRemaining < 30) urgencyLevel = 'critical';
  else if (daysRemaining < 90) urgencyLevel = 'high';
  else if (daysRemaining < 180) urgencyLevel = 'medium';

  return {
    days_remaining: daysRemaining,
    within_time_limit: daysRemaining > 0,
    urgency_level: urgencyLevel,
  };
}
