/**
 * Claims CSV Parser
 * Handles parsing and validation of CSV files containing C285 claim data
 * Supports multiple claims with multiple items per claim
 */

import type { C285Claim, C285ClaimItem, ClaimReason } from '@/types';

export interface ClaimsCSVParseResult {
  success: boolean;
  data?: C285Claim[];
  errors?: ClaimsCSVParseError[];
  warnings?: ClaimsCSVParseWarning[];
  stats: {
    totalRows: number;
    validClaims: number;
    invalidClaims: number;
    totalItems: number;
  };
}

export interface ClaimsCSVParseError {
  row: number;
  field?: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ClaimsCSVParseWarning {
  row: number;
  field?: string;
  message: string;
}

interface CSVRow {
  [key: string]: string | number;
}

/**
 * Expected CSV column mappings for claims
 */
const COLUMN_MAPPINGS = {
  // Claim header fields
  claim_reference: ['claim_reference', 'reference', 'claim_ref'],
  mrn: ['mrn', 'movement_reference_number'],
  entry_number: ['entry_number', 'entry_no', 'epu_entry'],
  acceptance_date: ['acceptance_date', 'declaration_date', 'accepted_date'],

  trader_eori: ['trader_eori', 'eori', 'importer_eori'],
  trader_name: ['trader_name', 'trader', 'importer_name'],
  trader_address: ['trader_address', 'address', 'importer_address'],
  trader_city: ['trader_city', 'city'],
  trader_postcode: ['trader_postcode', 'postcode', 'postal_code'],
  trader_country: ['trader_country', 'country'],
  company_number: ['company_number', 'company_no', 'registration_number'],
  contact_name: ['contact_name', 'contact_person', 'contact'],
  contact_email: ['contact_email', 'email'],
  contact_phone: ['contact_phone', 'phone', 'telephone'],

  agent_eori: ['agent_eori', 'agent_eori_number'],
  agent_name: ['agent_name', 'agent_company'],

  reason: ['reason', 'claim_reason', 'reason_code'],
  reason_description: ['reason_description', 'description', 'reason_desc'],

  // Payment details
  payment_method: ['payment_method', 'payment_type'],
  bank_account_name: ['bank_account_name', 'account_name', 'account_holder'],
  bank_account_number: ['bank_account_number', 'account_number', 'account_no'],
  bank_sort_code: ['bank_sort_code', 'sort_code', 'sortcode'],
  bank_iban: ['bank_iban', 'iban'],
  bank_swift: ['bank_swift', 'swift', 'bic'],

  // Item fields
  item_number: ['item_number', 'item_no', 'line_number'],
  commodity_code: ['commodity_code', 'hs_code', 'tariff_code'],
  item_description: ['item_description', 'description', 'goods_description'],
  invoice_value: ['invoice_value', 'value', 'item_value'],
  invoice_currency: ['invoice_currency', 'currency'],

  // Original amounts
  original_duty: ['original_duty', 'duty_paid', 'original_customs_duty'],
  original_vat: ['original_vat', 'vat_paid', 'original_vat_amount'],
  original_excise: ['original_excise', 'excise_paid', 'original_excise_duty'],

  // Correct amounts
  correct_duty: ['correct_duty', 'duty_correct', 'correct_customs_duty'],
  correct_vat: ['correct_vat', 'vat_correct', 'correct_vat_amount'],
  correct_excise: ['correct_excise', 'excise_correct', 'correct_excise_duty'],
};

/**
 * Parse CSV file content into C285 claims
 */
export async function parseClaimsCSV(fileContent: string): Promise<ClaimsCSVParseResult> {
  const errors: ClaimsCSVParseError[] = [];
  const warnings: ClaimsCSVParseWarning[] = [];
  const claims: C285Claim[] = [];
  const seenReferences = new Set<string>();

  try {
    // Parse CSV into rows
    const rows = parseCSVContent(fileContent);

    if (rows.length === 0) {
      return {
        success: false,
        errors: [{ row: 0, message: 'CSV file is empty', severity: 'critical' }],
        stats: { totalRows: 0, validClaims: 0, invalidClaims: 0, totalItems: 0 },
      };
    }

    // Validate headers
    const headerValidation = validateHeaders(rows[0]);
    if (!headerValidation.valid) {
      return {
        success: false,
        errors: headerValidation.errors,
        stats: {
          totalRows: rows.length,
          validClaims: 0,
          invalidClaims: rows.length,
          totalItems: 0,
        },
      };
    }

    // Group rows by claim reference (each claim can have multiple items)
    const claimGroups = groupRowsByReference(rows);

    let totalItems = 0;

    // Process each claim
    for (const [reference, claimRows] of claimGroups.entries()) {
      // Check for duplicates
      if (seenReferences.has(reference)) {
        warnings.push({
          row: claimRows[0].rowNumber,
          field: 'claim_reference',
          message: `Duplicate claim reference: ${reference}`,
        });
        continue;
      }
      seenReferences.add(reference);

      // Parse claim
      const parseResult = parseClaim(reference, claimRows);

      if (parseResult.claim) {
        claims.push(parseResult.claim);
        totalItems += parseResult.claim.items?.length || 0;
      }

      errors.push(...parseResult.errors);
      warnings.push(...parseResult.warnings);
    }

    const validClaims = claims.length;
    const invalidClaims = claimGroups.size - validClaims;

    return {
      success: errors.filter((e) => e.severity === 'critical').length === 0,
      data: claims,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      stats: {
        totalRows: rows.length,
        validClaims,
        invalidClaims,
        totalItems,
      },
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          row: 0,
          message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
        },
      ],
      stats: { totalRows: 0, validClaims: 0, invalidClaims: 0, totalItems: 0 },
    };
  }
}

/**
 * Parse CSV content into rows
 */
function parseCSVContent(content: string): Array<CSVRow & { rowNumber: number }> {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Array<CSVRow & { rowNumber: number }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: CSVRow & { rowNumber: number } = { rowNumber: i + 1 };
    headers.forEach((header, index) => {
      row[header.toLowerCase().trim()] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Validate CSV headers
 */
function validateHeaders(firstRow: CSVRow): { valid: boolean; errors: ClaimsCSVParseError[] } {
  const errors: ClaimsCSVParseError[] = [];
  const headers = Object.keys(firstRow).filter((k) => k !== 'rowNumber');

  // Check for required fields
  const requiredFields = ['trader_eori', 'trader_name', 'reason', 'item_number', 'commodity_code'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const mappings = COLUMN_MAPPINGS[field as keyof typeof COLUMN_MAPPINGS];
    const found = headers.some((h) => mappings.includes(h.toLowerCase()));
    if (!found) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    errors.push({
      row: 1,
      message: `Missing required columns: ${missingFields.join(', ')}`,
      severity: 'critical',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Group CSV rows by claim reference
 */
function groupRowsByReference(
  rows: Array<CSVRow & { rowNumber: number }>
): Map<string, Array<CSVRow & { rowNumber: number }>> {
  const groups = new Map<string, Array<CSVRow & { rowNumber: number }>>();

  for (const row of rows) {
    // Try to find claim reference, or generate one
    let reference = findFieldValue(row, 'claim_reference');

    // If no reference, generate one from trader_eori + row number
    if (!reference) {
      const eori = findFieldValue(row, 'trader_eori') || 'UNKNOWN';
      reference = `CLM-${eori.slice(-6)}-${row.rowNumber}`;
    }

    if (!groups.has(reference)) {
      groups.set(reference, []);
    }
    groups.get(reference)!.push(row);
  }

  return groups;
}

/**
 * Parse a single claim from grouped rows
 */
function parseClaim(
  reference: string,
  rows: Array<CSVRow & { rowNumber: number }>
): {
  claim?: C285Claim;
  errors: ClaimsCSVParseError[];
  warnings: ClaimsCSVParseWarning[];
} {
  const errors: ClaimsCSVParseError[] = [];
  const warnings: ClaimsCSVParseWarning[] = [];
  const firstRow = rows[0];

  try {
    // Parse header data from first row
    const trader_eori = findFieldValue(firstRow, 'trader_eori');
    const trader_name = findFieldValue(firstRow, 'trader_name');
    const reason = findFieldValue(firstRow, 'reason');
    const reason_description = findFieldValue(firstRow, 'reason_description') || '';

    if (!trader_eori || !trader_name || !reason) {
      errors.push({
        row: firstRow.rowNumber,
        message: 'Missing required fields: trader_eori, trader_name, or reason',
        severity: 'error',
      });
      return { errors, warnings };
    }

    // Validate reason
    const validReasons: ClaimReason[] = [
      'tariff_code_error',
      'origin_relief',
      'goods_return',
      'goods_destroyed',
      'vat_postponement',
      'incorrect_valuation',
      'preference_not_claimed',
      'relief_not_applied',
      'system_error',
      'duplicate_payment',
      'rate_change',
      'other',
    ];

    if (!validReasons.includes(reason as ClaimReason)) {
      warnings.push({
        row: firstRow.rowNumber,
        field: 'reason',
        message: `Unknown reason code: ${reason}. Using 'other'.`,
      });
    }

    // Parse declaration details
    const mrn = findFieldValue(firstRow, 'mrn');
    const entry_number = findFieldValue(firstRow, 'entry_number');
    const acceptance_date = findFieldValue(firstRow, 'acceptance_date');

    // Validate acceptance date (3-year rule)
    if (acceptance_date) {
      const acceptDate = new Date(acceptance_date);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      if (acceptDate < threeYearsAgo) {
        warnings.push({
          row: firstRow.rowNumber,
          field: 'acceptance_date',
          message: 'Declaration is older than 3 years - claim may not be eligible',
        });
      }
    }

    // Parse complete trader metadata
    const trader_address = findFieldValue(firstRow, 'trader_address');
    const trader_city = findFieldValue(firstRow, 'trader_city');
    const trader_postcode = findFieldValue(firstRow, 'trader_postcode');
    const trader_country = findFieldValue(firstRow, 'trader_country') || 'GB';
    const company_number = findFieldValue(firstRow, 'company_number');
    const contact_name = findFieldValue(firstRow, 'contact_name');
    const contact_email = findFieldValue(firstRow, 'contact_email');
    const contact_phone = findFieldValue(firstRow, 'contact_phone');

    // Parse agent details
    const agent_eori = findFieldValue(firstRow, 'agent_eori');
    const agent_name = findFieldValue(firstRow, 'agent_name');

    // Parse payment details
    const payment_method = findFieldValue(firstRow, 'payment_method') as
      | 'bank_transfer'
      | 'cheque'
      | 'deferment_account'
      | undefined;
    const bank_account_name = findFieldValue(firstRow, 'bank_account_name');
    const bank_account_number = findFieldValue(firstRow, 'bank_account_number');
    const bank_sort_code = findFieldValue(firstRow, 'bank_sort_code');
    const bank_iban = findFieldValue(firstRow, 'bank_iban');
    const bank_swift = findFieldValue(firstRow, 'bank_swift');

    // Parse items
    const items: C285ClaimItem[] = [];
    for (const row of rows) {
      const item = parseClaimItem(row, errors, warnings);
      if (item) items.push(item);
    }

    if (items.length === 0) {
      errors.push({
        row: firstRow.rowNumber,
        message: 'No valid items found for claim',
        severity: 'error',
      });
      return { errors, warnings };
    }

    // Calculate totals
    const original_duty = items.reduce((sum, item) => sum + item.original_duty, 0);
    const correct_duty = items.reduce((sum, item) => sum + item.correct_duty, 0);
    const original_vat = items.reduce((sum, item) => sum + item.original_vat, 0);
    const correct_vat = items.reduce((sum, item) => sum + item.correct_vat, 0);
    const original_excise = items.reduce((sum, item) => sum + item.original_excise, 0);
    const correct_excise = items.reduce((sum, item) => sum + item.correct_excise, 0);

    const duty_overpayment = original_duty - correct_duty;
    const vat_overpayment = original_vat - correct_vat;
    const excise_overpayment = original_excise - correct_excise;

    const identityTimestamp = new Date().toISOString();

    const claim: C285Claim = {
      id: crypto.randomUUID(),
      reference,

      // Declaration details
      mrn,
      entry_number,
      acceptance_date,

      // Trader details (complete metadata)
      trader_eori,
      trader_name,
      trader_address,
      trader_city,
      trader_postcode,
      trader_country,
      company_number,
      contact_name,
      contact_email,
      contact_phone,

      // Agent details
      agent_eori,
      agent_name,

      // Claim reason
      reason: (validReasons.includes(reason as ClaimReason) ? reason : 'other') as ClaimReason,
      reason_description: reason_description || `Imported claim: ${reason}`,

      // Financial totals
      original_duty,
      correct_duty,
      duty_overpayment,
      original_vat,
      correct_vat,
      vat_overpayment,
      original_excise,
      correct_excise,
      excise_overpayment,
      original_total: original_duty + original_vat + original_excise,
      correct_total: correct_duty + correct_vat + correct_excise,
      total_claim_amount: duty_overpayment + vat_overpayment + excise_overpayment,

      // Payment details
      payment_method,
      bank_account_name,
      bank_account_number,
      bank_sort_code,
      bank_iban,
      bank_swift,

      // Status
      status: 'draft',
      priority: 'normal',

      // Related data
      items,

      // 🆕 Declarant (CSV imports need defaults - user can edit later)
      declarant_id: 'csv_import',
      declarant_name: trader_name, // Default to trader name
      declarant_capacity: agent_eori ? 'agent' : 'importer',
      claimant_id: trader_eori || 'csv-claimant',
      claimant_type: 'self_entity',
      identity_source: 'SETTINGS',
      identity_locked_at: identityTimestamp,

      // Metadata
      created_by: 'csv_import',
      created_at: identityTimestamp,
      updated_at: identityTimestamp,
    };

    return { claim, errors, warnings };
  } catch (error) {
    errors.push({
      row: firstRow.rowNumber,
      message: `Failed to parse claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
    return { errors, warnings };
  }
}

/**
 * Parse a single claim item from a CSV row
 */
function parseClaimItem(
  row: CSVRow & { rowNumber: number },
  errors: ClaimsCSVParseError[],
  warnings: ClaimsCSVParseWarning[]
): C285ClaimItem | null {
  try {
    const item_number = parseInt(findFieldValue(row, 'item_number') || '1');
    const commodity_code = findFieldValue(row, 'commodity_code');
    const description = findFieldValue(row, 'item_description') || '';

    if (!commodity_code) {
      warnings.push({
        row: row.rowNumber,
        field: 'commodity_code',
        message: 'Missing commodity code',
      });
      return null;
    }

    // Validate commodity code format (8 or 10 digits)
    if (!/^\d{8}$|^\d{10}$/.test(commodity_code)) {
      warnings.push({
        row: row.rowNumber,
        field: 'commodity_code',
        message: `Invalid commodity code format: ${commodity_code} (should be 8 or 10 digits)`,
      });
    }

    const invoice_value = parseFloat(findFieldValue(row, 'invoice_value') || '0');
    const invoice_currency = findFieldValue(row, 'invoice_currency') || 'GBP';
    const original_duty = parseFloat(findFieldValue(row, 'original_duty') || '0');
    const correct_duty = parseFloat(findFieldValue(row, 'correct_duty') || '0');
    const original_vat = parseFloat(findFieldValue(row, 'original_vat') || '0');
    const correct_vat = parseFloat(findFieldValue(row, 'correct_vat') || '0');
    const original_excise = parseFloat(findFieldValue(row, 'original_excise') || '0');
    const correct_excise = parseFloat(findFieldValue(row, 'correct_excise') || '0');

    // Validate that correct amounts don't exceed original
    if (correct_duty > original_duty) {
      warnings.push({
        row: row.rowNumber,
        field: 'correct_duty',
        message: 'Correct duty exceeds original duty',
      });
    }
    if (correct_vat > original_vat) {
      warnings.push({
        row: row.rowNumber,
        field: 'correct_vat',
        message: 'Correct VAT exceeds original VAT',
      });
    }
    if (correct_excise > original_excise) {
      warnings.push({
        row: row.rowNumber,
        field: 'correct_excise',
        message: 'Correct excise exceeds original excise',
      });
    }

    const item: C285ClaimItem = {
      id: crypto.randomUUID(),
      claim_id: '', // Will be set when claim is saved
      item_number,
      commodity_code,
      description,
      invoice_value,
      invoice_currency,
      original_duty,
      correct_duty,
      duty_overpayment: original_duty - correct_duty,
      original_vat,
      correct_vat,
      vat_overpayment: original_vat - correct_vat,
      original_excise,
      correct_excise,
      excise_overpayment: original_excise - correct_excise,
      item_claim_amount:
        original_duty -
        correct_duty +
        (original_vat - correct_vat) +
        (original_excise - correct_excise),
      error_explanation: '',
    };

    return item;
  } catch (error) {
    errors.push({
      row: row.rowNumber,
      message: `Failed to parse item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
    return null;
  }
}

/**
 * Find field value using column mappings
 */
function findFieldValue(row: CSVRow, field: keyof typeof COLUMN_MAPPINGS): string | undefined {
  const mappings = COLUMN_MAPPINGS[field];
  for (const mapping of mappings) {
    const value = row[mapping.toLowerCase()];
    if (value !== undefined && value !== '') {
      return String(value);
    }
  }
  return undefined;
}
