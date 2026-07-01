/**
 * CSV Parser for CDS Declaration Data
 * Handles parsing, validation, and transformation of CSV files into CDSDeclaration objects
 */

import type { CDSDeclaration, CDSItem, CDSItemTax, DeclarationType } from '@/types';

export interface CSVParseResult {
  success: boolean;
  data?: CDSDeclaration[];
  errors?: CSVParseError[];
  warnings?: CSVParseWarning[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicates: number;
  };
}

export interface CSVParseError {
  row: number;
  field?: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface CSVParseWarning {
  row: number;
  field?: string;
  message: string;
}

interface CSVRow {
  [key: string]: string | number;
}

/**
 * Expected CSV column mappings for CDS declarations - HMRC format
 */
const COLUMN_MAPPINGS = {
  // Declaration header fields (from IMPORTS-HEADER-REPORT)
  entry_identifier: ['entry identifier', 'entry_identifier', 'entryidentifier'],
  ducr: ['ducr', 'declarant unique consignment reference'],
  entry_date: ['entry date', 'entry_date', 'entrydate'],
  acceptance_date: ['acceptance date', 'acceptance_date', 'acceptancedate'],
  clearance_date: ['clearance date', 'clearance_date', 'clearancedate'],
  importer_eori: ['importer eori', 'importer_eori', 'importereori'],
  declarant_eori: ['declarant eori', 'declarant_eori', 'declaranteori'],
  declarant_name: ['declarant name', 'declarant_name', 'declarantname'],
  paying_agent_eori: ['paying agent eori', 'paying_agent_eori'],
  customs_value: ['customs value', 'customs_value', 'customsvalue'],
  total_duty: ['total duty', 'total_duty', 'totalduty'],
  total_vat_paid: ['total vat paid', 'total_vat_paid', 'totalvatpaid'],
  total_excise: ['total excise', 'total_excise', 'totalexcise'],
  invoice_currency: ['invoice currency', 'invoice_currency'],
  transport_country: ['transport country', 'transport_country'],
  transport_mode: ['transport mode', 'transport_mode'],

  // Item fields (from IMPORTS-ITEM-REPORT)
  item_number: ['item number', 'item_number', 'itemnumber', 'item_no', 'line_number'],
  commodity_code: ['commodity code', 'commodity_code', 'commoditycode', 'hs_code'],
  goods_description: ['goods description', 'goods_description', 'goodsdescription'],
  origin_country: ['country of origin', 'origin_country', 'countryoforigin'],
  net_mass: ['net mass', 'net_mass', 'netmass', 'net_weight'],
  gross_mass: ['gross mass', 'gross_mass', 'grossmass'],
  supplementary_units: ['supplementary units', 'supplementary_units'],
  invoice_value: ['invoice value', 'invoice_value', 'invoicevalue'],
  consignor: ['consignor', 'consignor_name'],
  location_of_goods: ['location of goods', 'location_of_goods'],

  // Tax fields (from IMPORTS-TAXLINE-REPORT)
  vat_value: ['vat value', 'vat_value', 'vatvalue'],
  vat_paid: ['vat paid', 'vat_paid', 'vatpaid'],
};

/**
 * Parse CSV file content into CDS declarations
 */
export async function parseCSV(fileContent: string): Promise<CSVParseResult> {
  const errors: CSVParseError[] = [];
  const warnings: CSVParseWarning[] = [];
  const declarations: CDSDeclaration[] = [];
  const seenIds = new Set<string>();
  let duplicates = 0;

  try {
    // Parse CSV into rows
    const rows = parseCSVContent(fileContent);

    if (rows.length === 0) {
      return {
        success: false,
        errors: [{ row: 0, message: 'CSV file is empty', severity: 'critical' }],
        stats: { totalRows: 0, validRows: 0, invalidRows: 0, duplicates: 0 },
      };
    }

    // Validate headers
    const headerValidation = validateHeaders(rows[0]);
    if (!headerValidation.valid) {
      return {
        success: false,
        errors: headerValidation.errors,
        stats: { totalRows: rows.length, validRows: 0, invalidRows: rows.length, duplicates: 0 },
      };
    }

    // Group rows by Entry Identifier (each declaration can have multiple items)
    const declarationGroups = groupRowsByEntryIdentifier(rows);

    // Process each declaration
    for (const [entry_id, declarationRows] of declarationGroups.entries()) {
      // Check for duplicates
      if (seenIds.has(entry_id)) {
        duplicates++;
        warnings.push({
          row: declarationRows[0].rowNumber,
          field: 'entry_identifier',
          message: `Duplicate Entry Identifier: ${entry_id}`,
        });
        continue;
      }
      seenIds.add(entry_id);

      // Parse declaration
      const parseResult = parseDeclaration(entry_id, declarationRows);

      if (parseResult.declaration) {
        declarations.push(parseResult.declaration);
      }

      errors.push(...parseResult.errors);
      warnings.push(...parseResult.warnings);
    }

    const validRows = declarations.length;
    const invalidRows = declarationGroups.size - validRows;

    return {
      success: errors.filter((e) => e.severity === 'critical').length === 0,
      data: declarations,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      stats: {
        totalRows: rows.length,
        validRows,
        invalidRows,
        duplicates,
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
      stats: { totalRows: 0, validRows: 0, invalidRows: 0, duplicates: 0 },
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
function validateHeaders(firstRow: CSVRow): { valid: boolean; errors: CSVParseError[] } {
  const errors: CSVParseError[] = [];
  const headers = Object.keys(firstRow).filter((k) => k !== 'rowNumber');

  // Check for required fields - HMRC format requires entry_identifier and importer_eori
  const requiredFields = ['entry_identifier', 'importer_eori'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const mappings = COLUMN_MAPPINGS[field as keyof typeof COLUMN_MAPPINGS];
    const found = headers.some((h) => {
      const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      const mappingNormalized = mappings.map((m) => m.toLowerCase().replace(/[^a-z0-9]/g, ''));
      return mappingNormalized.includes(normalized);
    });
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
 * Group CSV rows by Entry Identifier
 */
function groupRowsByEntryIdentifier(
  rows: Array<CSVRow & { rowNumber: number }>
): Map<string, Array<CSVRow & { rowNumber: number }>> {
  const groups = new Map<string, Array<CSVRow & { rowNumber: number }>>();

  for (const row of rows) {
    const entry_id = findFieldValue(row, 'entry_identifier');
    if (!entry_id) continue;

    if (!groups.has(entry_id)) {
      groups.set(entry_id, []);
    }
    groups.get(entry_id)!.push(row);
  }

  return groups;
}

/**
 * Parse a single declaration from grouped rows
 */
function parseDeclaration(
  entry_id: string,
  rows: Array<CSVRow & { rowNumber: number }>
): {
  declaration?: CDSDeclaration;
  errors: CSVParseError[];
  warnings: CSVParseWarning[];
} {
  const errors: CSVParseError[] = [];
  const warnings: CSVParseWarning[] = [];
  const firstRow = rows[0];

  try {
    // Parse header data from first row
    const importer_eori = findFieldValue(firstRow, 'importer_eori');
    const acceptance_date = findFieldValue(firstRow, 'acceptance_date');
    const consignee_name = findFieldValue(firstRow, 'consignee_name') || '';
    const customs_value = parseFloat(findFieldValue(firstRow, 'customs_value') || '0');
    const total_duty = parseFloat(findFieldValue(firstRow, 'total_duty') || '0');
    const total_vat = parseFloat(findFieldValue(firstRow, 'total_vat_paid') || '0');
    const total_excise = parseFloat(findFieldValue(firstRow, 'total_excise') || '0');

    if (!importer_eori) {
      errors.push({
        row: firstRow.rowNumber,
        message: 'Missing required field: importer_eori',
        severity: 'error',
      });
      return { errors, warnings };
    }

    // Parse items
    const items: CDSItem[] = [];
    for (const row of rows) {
      const item = parseItem(row, errors, warnings);
      if (item) items.push(item);
    }

    if (items.length === 0) {
      errors.push({
        row: firstRow.rowNumber,
        message: 'No valid items found for declaration',
        severity: 'error',
      });
      return { errors, warnings };
    }

    // Get first item's consignor as fallback for consignor_name
    const consignor_name = items[0].consignor_name || '';

    const declaration: CDSDeclaration = {
      id: crypto.randomUUID(),
      mrn: entry_id, // Use entry_identifier as MRN equivalent
      declaration_type: 'IM4' as DeclarationType,
      acceptance_date: acceptance_date || new Date().toISOString().split('T')[0],
      trader_eori: importer_eori,
      importer_eori,
      consignee_name,
      consignor_name,
      procedure_code: '4000C07', // Default procedure code
      status: 'accepted',
      total_duty_paid: total_duty,
      total_vat_paid: total_vat,
      total_excise_paid: total_excise,
      total_taxes_paid: total_duty + total_vat + total_excise,
      declaration_source: 'hmrc_csv',
      items,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return { declaration, errors, warnings };
  } catch (error) {
    errors.push({
      row: firstRow.rowNumber,
      message: `Failed to parse declaration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
    return { errors, warnings };
  }
}

/**
 * Parse a single item from a CSV row
 */
function parseItem(
  row: CSVRow & { rowNumber: number },
  errors: CSVParseError[],
  warnings: CSVParseWarning[]
): CDSItem | null {
  try {
    const item_number = parseInt(findFieldValue(row, 'item_number') || '1');
    const commodity_code = findFieldValue(row, 'commodity_code');

    if (!commodity_code) {
      warnings.push({
        row: row.rowNumber,
        field: 'commodity_code',
        message: 'Missing commodity code',
      });
      return null;
    }

    // Parse taxes from HMRC format
    const taxes: CDSItemTax[] = [];

    // VAT Value and VAT Paid from tax file
    const vat_value = parseFloat(findFieldValue(row, 'vat_value') || '0');
    const vat_paid = parseFloat(findFieldValue(row, 'vat_paid') || '0');

    if (vat_paid > 0) {
      taxes.push({
        id: crypto.randomUUID(),
        item_id: '', // Will be set later
        tax_type: 'VAT',
        tax_base: vat_value,
        tax_rate: 0, // Will be calculated if needed
        tax_amount: vat_paid,
        calculation_method: 'ad_valorem',
      });
    }

    const invoice_value = parseFloat(findFieldValue(row, 'invoice_value') || '0');
    const customs_value = parseFloat(findFieldValue(row, 'customs_value') || String(invoice_value));
    const consignor = findFieldValue(row, 'consignor');

    const item: CDSItem = {
      id: crypto.randomUUID(),
      declaration_id: '', // Will be set later
      item_number,
      commodity_code,
      description: findFieldValue(row, 'goods_description') || '',
      origin_country: findFieldValue(row, 'origin_country'),
      gross_mass: parseFloat(findFieldValue(row, 'gross_mass') || '0'),
      net_mass: parseFloat(findFieldValue(row, 'net_mass') || '0'),
      quantity: parseFloat(findFieldValue(row, 'supplementary_units') || '0'),
      statistical_value: customs_value, // Maps to customs_value from HMRC
      invoice_value,
      invoice_currency: findFieldValue(row, 'invoice_currency') || 'GBP',
      procedure_code: '4000C07',
      consignor_name: consignor, // Store consignor for declaration fallback
      taxes: taxes.length > 0 ? taxes : undefined,
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
 * Find field value using column mappings with normalization
 */
function findFieldValue(row: CSVRow, field: keyof typeof COLUMN_MAPPINGS): string | undefined {
  const mappings = COLUMN_MAPPINGS[field];

  // Try normalized matching for more flexible field name matching
  for (const mapping of mappings) {
    const normalizedMapping = mapping.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (normalizedKey === normalizedMapping) {
        if (value !== undefined && value !== '') {
          return String(value);
        }
      }
    }
  }
  return undefined;
}

/**
 * Validate Entry Identifier format (HMRC)
 */
export function validateEntryIdentifier(id: string): boolean {
  // Entry Identifier format: YYCC + 15 alphanumeric (23 total chars)
  // Example: 26GB516O2KZOJC5AR9
  const entryRegex = /^\d{2}[A-Z]{2}[A-Z0-9]{15}$/;
  return entryRegex.test(id);
}

/**
 * Validate MRN format (legacy)
 */
export function validateMRN(mrn: string): boolean {
  // Can be either MRN or Entry Identifier format
  const mrnRegex = /^\d{2}GB[A-Z0-9]{15}$/;
  const entryRegex = /^\d{2}[A-Z]{2}[A-Z0-9]{15}$/;
  return mrnRegex.test(mrn) || entryRegex.test(mrn);
}

/**
 * Validate EORI format
 */
export function validateEORI(eori: string): boolean {
  // EORI format: GB followed by 12 digits
  const eoriRegex = /^GB\d{12}$/;
  return eoriRegex.test(eori);
}
