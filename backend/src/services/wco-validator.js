/**
 * WCO Data Validation & Persistence Service
 * 
 * Ensures all data persisted to the database conforms to:
 * - WCO_DEC_2_DMS.xsd (Declaration schema)
 * - WCO_RES_2_DMS.xsd (Response/Notification schema)
 * - HMRC CDS requirements
 */

import { v4 as uuidv4 } from 'uuid';

export class WCODataValidator {
  /**
   * Validates and normalizes a declaration object before persistence
   */
  static validateDeclaration(declaration, options = {}) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!declaration.declaration_type) {
      errors.push('declaration_type is required');
    }
    if (!declaration.function_code) {
      errors.push('function_code is required');
    }

    // MRN (if present, must be valid format)
    if (declaration.mrn && !this.isValidMRN(declaration.mrn)) {
      errors.push(`Invalid MRN format: ${declaration.mrn}`);
    }

    // LRN (if present)
    if (declaration.lrn && declaration.lrn.length > 35) {
      errors.push('LRN exceeds maximum length of 35 characters');
    }

    // Functional Reference ID
    if (declaration.functional_reference_id && declaration.functional_reference_id.length > 35) {
      errors.push('Functional Reference ID exceeds 35 characters');
    }

    // EORI validation
    if (declaration.declarant_eori && !this.isValidEORI(declaration.declarant_eori)) {
      warnings.push(`Invalid EORI format: ${declaration.declarant_eori}`);
    }
    if (declaration.trader_eori && !this.isValidEORI(declaration.trader_eori)) {
      warnings.push(`Invalid EORI format: ${declaration.trader_eori}`);
    }
    if (declaration.importer_eori && !this.isValidEORI(declaration.importer_eori)) {
      warnings.push(`Invalid EORI format: ${declaration.importer_eori}`);
    }

    // UCR/DUCR/MUCR relationships
    if (declaration.ucr_id && declaration.ducr_id) {
      // Valid: both can exist (UCR is child of DUCR/MUCR)
    } else if (!declaration.ucr_id && declaration.ducr_id) {
      // DUCR without UCR is valid (DUCR is parent level)
    } else if (declaration.ucr_id && !declaration.ducr_id && !declaration.mucr_id) {
      // UCR must have parent DUCR or MUCR
      warnings.push('UCR specified but DUCR/MUCR not provided - check consignment hierarchy');
    }

    // Tax/Duty totals must be non-negative
    if (declaration.total_customs_duty < 0) {
      errors.push('total_customs_duty cannot be negative');
    }
    if (declaration.total_vat < 0) {
      errors.push('total_vat cannot be negative');
    }
    if (declaration.total_excise < 0) {
      errors.push('total_excise cannot be negative');
    }

    // Total paid cannot exceed total liability
    const totalLiability = (declaration.total_customs_duty || 0) +
                          (declaration.total_vat || 0) +
                          (declaration.total_excise || 0) +
                          (declaration.total_other_tax || 0);
    if (declaration.total_paid > totalLiability) {
      errors.push(`total_paid (${declaration.total_paid}) exceeds liability (${totalLiability})`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates goods items collection
   */
  static validateGoodsItems(items, declaration, options = {}) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(items) || items.length === 0) {
      errors.push('Declaration must have at least one goods item');
      return { valid: false, errors, warnings };
    }

    if (items.length > 999) {
      errors.push('Declaration cannot exceed 999 goods items (WCO limit)');
    }

    let itemNumbers = new Set();
    items.forEach((item, index) => {
      const itemPrefix = `Item ${item.item_number || index + 1}:`;

      // Item number validation
      if (!item.item_number || item.item_number < 1 || item.item_number > 999) {
        errors.push(`${itemPrefix} item_number must be 1-999`);
      }
      if (itemNumbers.has(item.item_number)) {
        errors.push(`${itemPrefix} duplicate item number`);
      }
      itemNumbers.add(item.item_number);

      // Commodity code validation
      if (!item.commodity_code) {
        errors.push(`${itemPrefix} commodity_code is required`);
      } else if (!/^\d{1,10}$/.test(item.commodity_code.replace(/[^0-9]/g, ''))) {
        errors.push(`${itemPrefix} commodity_code format invalid`);
      }

      // Weights/quantities validation
      if (item.gross_mass && item.net_mass && item.gross_mass < item.net_mass) {
        errors.push(`${itemPrefix} gross_mass cannot be less than net_mass`);
      }
      if (item.gross_mass && item.gross_mass < 0) {
        errors.push(`${itemPrefix} gross_mass cannot be negative`);
      }

      // Statistical value validation
      if (item.statistical_value && item.statistical_value < 0) {
        errors.push(`${itemPrefix} statistical_value cannot be negative`);
      }
      if (item.invoice_value && item.invoice_value < 0) {
        errors.push(`${itemPrefix} invoice_value cannot be negative`);
      }

      // Procedure code validation (WCO codes)
      if (item.procedure_code && !this.isValidProcedureCode(item.procedure_code)) {
        warnings.push(`${itemPrefix} procedure_code '${item.procedure_code}' not in standard WCO list`);
      }
    });

    // Check totals match
    const sumGrossMass = items.reduce((sum, item) => sum + (item.gross_mass || 0), 0);
    if (declaration.total_gross_mass && Math.abs(declaration.total_gross_mass - sumGrossMass) > 0.01) {
      warnings.push(`Declared total_gross_mass (${declaration.total_gross_mass}) doesn't match items sum (${sumGrossMass})`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates duty/tax/fee records
   */
  static validateDutiesTaxesFees(duties, goodsItem, options = {}) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(duties)) {
      return { valid: true, errors, warnings }; // Optional
    }

    const validTaxTypes = ['CustomsDuty', 'VAT', 'Excise', 'OtherTax'];
    const validMethods = ['TypeRow', 'TypeCode', 'Valuation'];

    duties.forEach((duty, index) => {
      const prefix = `Duty ${index + 1}:`;

      // Tax type validation
      if (!validTaxTypes.includes(duty.type_code)) {
        errors.push(`${prefix} type_code '${duty.type_code}' not valid (expected: ${validTaxTypes.join(', ')})`);
      }

      // Calculation method
      if (duty.calculation_method && !validMethods.includes(duty.calculation_method)) {
        warnings.push(`${prefix} calculation_method '${duty.calculation_method}' not standard`);
      }

      // Rate validation
      if (duty.rate_numeric && (duty.rate_numeric < 0 || duty.rate_numeric > 100)) {
        errors.push(`${prefix} rate_numeric must be 0-100`);
      }

      // Amount validation
      if (duty.tax_amount && duty.tax_amount < 0) {
        errors.push(`${prefix} tax_amount cannot be negative`);
      }
      if (duty.paid_amount && duty.paid_amount < 0) {
        errors.push(`${prefix} paid_amount cannot be negative`);
      }
      if (duty.paid_amount > duty.tax_amount) {
        errors.push(`${prefix} paid_amount cannot exceed tax_amount`);
      }

      // Deferment validation
      if (duty.deferment_status && !['Available', 'NotAvailable', 'Agreed', 'NotAgreed'].includes(duty.deferment_status)) {
        warnings.push(`${prefix} deferment_status '${duty.deferment_status}' unexpected`);
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates parties (declarant, consignor, etc.)
   */
  static validateParties(parties, options = {}) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(parties)) {
      return { valid: true, errors, warnings };
    }

    const validRoles = ['DE', 'ER', 'CNE', 'CNS', 'REP', 'AG', 'FWD', 'CW'];
    const roleNames = {
      'DE': 'Declarant',
      'ER': 'Exporter',
      'CNE': 'Consignee',
      'CNS': 'Consignor/Shipper',
      'REP': 'Representative',
      'AG': 'Agent',
      'FWD': 'Forwarder',
      'CW': 'Customs Warehouse Keeper'
    };

    let hasDeclarant = false;
    let hasConsignee = false;

    parties.forEach((party, index) => {
      const prefix = `Party ${index + 1} (${roleNames[party.party_role_code] || party.party_role_code}):`;

      // Role validation
      if (!validRoles.includes(party.party_role_code)) {
        errors.push(`${prefix} party_role_code '${party.party_role_code}' not valid (expected: ${validRoles.join(', ')})`);
      }

      if (party.party_role_code === 'DE') hasDeclarant = true;
      if (party.party_role_code === 'CNE') hasConsignee = true;

      // EORI validation (required for most roles)
      if (['DE', 'ER', 'CNE', 'CNS', 'REP', 'AG', 'FWD', 'CW'].includes(party.party_role_code)) {
        if (!party.eori) {
          errors.push(`${prefix} EORI is required for this party role`);
        } else if (!this.isValidEORI(party.eori)) {
          warnings.push(`${prefix} EORI format appears invalid: ${party.eori}`);
        }
      }

      // Address validation
      if (!party.address_line_1) {
        warnings.push(`${prefix} missing address_line_1`);
      }
      if (!party.country_code) {
        warnings.push(`${prefix} missing country_code`);
      } else if (!/^[A-Z]{2}$/.test(party.country_code)) {
        errors.push(`${prefix} country_code must be 2-letter ISO code`);
      }
    });

    if (!hasDeclarant && options.requireDeclarant !== false) {
      warnings.push('No declarant (DE) party found');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates CDS events (notifications)
   */
  static validateCDSEvent(event, options = {}) {
    const errors = [];
    const warnings = [];

    const validEventTypes = [
      'DMSACC', 'DMSROG', 'DMSCLE', 'DMSINV',
      'DMSTAX', 'DMSEXP', 'DMSCNC', 'DMSREB', 'DMSREJ'
    ];

    if (!validEventTypes.includes(event.event_type)) {
      errors.push(`Invalid event_type: ${event.event_type}`);
    }

    if (!event.event_datetime) {
      errors.push('event_datetime is required');
    }

    if (!event.declaration_id && !event.mrn) {
      errors.push('Either declaration_id or mrn must be provided');
    }

    if (event.event_type === 'DMSTAX' && !event.parsed_payload) {
      warnings.push('DMSTAX event should include parsed tax information');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ============================================
  // Validation Helpers
  // ============================================

  static isValidMRN(mrn) {
    // MRN format: YYMMDD<COUNTRY><SERIAL>
    // Total 13 characters: 6 date + 2 country + 4 serial + 1 check digit
    // Example: 22GB00123456
    return /^\d{6}[A-Z]{2}\d{6}$/.test(mrn);
  }

  static isValidEORI(eori) {
    // EORI format: Country code + number (9-15 chars total)
    // Example: GB123456789000
    return /^[A-Z]{2}[A-Z0-9]{7,13}$/.test(eori);
  }

  static isValidProcedureCode(code) {
    // Standard WCO procedure codes (4 digits)
    const validCodes = [
      '1000', // Release for free circulation
      '1040', // Reserved
      '1041', // Reserved for inward processing
      '2000', // Processing procedures
      '2100', // Temporary import
      '3100', // Re-export
      '4000', // Import
      '4051', // Entry for warehousing
      '6121', // Temporary import with duty suspension
      '6131', // Temporary import, suspension + VAT
      '7100', // End use
      '8100', // Customs warehousing
      '9100', // Transit
      '9120', // Transshipment
      '9130', // Movement within GB
      '9140', // Movement within NIRS
    ];
    return validCodes.includes(code);
  }

  /**
   * Summary validation before persistence
   */
  static validateBeforePersistence(declaration, goodsItems, duties, parties) {
    const results = {
      declaration: this.validateDeclaration(declaration),
      items: this.validateGoodsItems(goodsItems, declaration),
      duties: this.validateDutiesTaxesFees(duties, null),
      parties: this.validateParties(parties),
      overallValid: true,
      allErrors: [],
      allWarnings: []
    };

    // Aggregate
    ['declaration', 'items', 'duties', 'parties'].forEach(key => {
      if (!results[key].valid) {
        results.overallValid = false;
      }
      results.allErrors.push(...results[key].errors);
      results.allWarnings.push(...results[key].warnings);
    });

    return results;
  }
}

/**
 * WCO Data Persistence Service
 * Handles saving validated data to tenant database
 */
export class WCODataPersistenceService {
  constructor(tenantDb, companyId) {
    this.db = tenantDb;
    this.companyId = companyId;
  }

  /**
   * Save complete declaration with all related data
   */
  saveFullDeclaration(declarationData, options = {}) {
    const {
      declaration,
      goods_items = [],
      duties_taxes = [],
      parties = [],
      documents = [],
      event = null
    } = declarationData;

    // Validate first
    const validation = WCODataValidator.validateBeforePersistence(
      declaration,
      goods_items,
      duties_taxes,
      parties
    );

    if (!validation.overallValid && options.throwOnError !== false) {
      const error = new Error('Data validation failed before persistence');
      error.validationErrors = validation;
      throw error;
    }

    try {
      return this.db.transaction(() => {
        const declarationId = declaration.id || uuidv4();

        // 1. Save declaration header
        this.saveDeclarationHeader(declarationId, declaration);

        // 2. Save parties
        goods_items.forEach(item => {
          this.saveGoodsItem(declarationId, item);
        });

        // 3. Save duties/taxes
        duties_taxes.forEach(duty => {
          this.saveDutyTaxFee(duty);
        });

        // 4. Save parties
        parties.forEach(party => {
          this.saveParty(declarationId, party);
        });

        // 5. Save documents
        documents.forEach(doc => {
          this.saveDocument(declarationId, doc);
        });

        // 6. Record version
        this.recordVersion(declarationId, declaration, options.source);

        // 7. Record event if provided
        if (event) {
          this.recordEvent(declarationId, event);
        }

        return { success: true, declarationId, validation };
      })();
    } catch (error) {
      console.error('Error persisting declaration:', error);
      throw error;
    }
  }

  saveDeclarationHeader(declarationId, data) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO declarations (
        id, mrn, lrn, functional_reference_id,
        declaration_type, function_code, status,
        ucr_id, ducr_id, mucr_id,
        declarant_name, declarant_eori, trader_eori, importer_eori,
        total_items_count, total_customs_duty, total_vat, total_excise,
        total_paid, company_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      declarationId,
      data.mrn,
      data.lrn,
      data.functional_reference_id,
      data.declaration_type,
      data.function_code,
      data.status || 'pending',
      data.ucr_id,
      data.ducr_id,
      data.mucr_id,
      data.declarant_name,
      data.declarant_eori,
      data.trader_eori,
      data.importer_eori,
      (data.goods_items || []).length,
      data.total_customs_duty || 0,
      data.total_vat || 0,
      data.total_excise || 0,
      data.total_paid || 0,
      this.companyId,
      new Date().toISOString()
    );
  }

  saveGoodsItem(declarationId, item) {
    const stmt = this.db.prepare(`
      INSERT INTO goods_items (
        id, declaration_id, item_number, commodity_code,
        goods_description, gross_mass, net_mass,
        invoice_value, statistical_value, procedure_code,
        company_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id || uuidv4(),
      declarationId,
      item.item_number,
      item.commodity_code,
      item.goods_description,
      item.gross_mass,
      item.net_mass,
      item.invoice_value,
      item.statistical_value,
      item.procedure_code,
      this.companyId,
      new Date().toISOString()
    );
  }

  // Additional save methods...
  saveDutyTaxFee(duty) { /* ... */ }
  saveParty(declarationId, party) { /* ... */ }
  saveDocument(declarationId, doc) { /* ... */ }
  recordVersion(declarationId, declaration, source) { /* ... */ }
  recordEvent(declarationId, event) { /* ... */ }
}

export default WCODataValidator;
