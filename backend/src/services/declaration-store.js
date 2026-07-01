import { v4 as uuidv4 } from 'uuid';
import { WCODataValidator } from './wco-validator.js';

/**
 * Declaration Store Service - SQLite Version
 * Handles persistence of declarations to WCO/CDS-compliant SQLite database
 * 
 * This service bridges CSV/API data to the SQLite schema, providing:
 * - Validation before persistence
 * - Hierarchical data structure (declarations → items → duties)
 * - Version tracking and audit trail
 * - Multi-tenant isolation
 */
export class DeclarationStore {
  constructor(tenantDb, companyId, userId = null) {
    this.db = tenantDb;
    this.companyId = companyId;
    this.userId = userId;
  }

  /**
   * Find existing declaration by MRN
   */
  findExistingDeclaration(mrn) {
    if (!mrn) return null;
    
    return this.db
      .prepare('SELECT * FROM declarations WHERE mrn = ? AND company_id = ?')
      .get(mrn, this.companyId);
  }

  /**
   * Get next version number for declaration
   */
  getNextVersionNumber(declarationId) {
    const result = this.db
      .prepare(`
        SELECT MAX(version_number) as max_version 
        FROM declaration_versions 
        WHERE declaration_id = ? AND company_id = ?
      `)
      .get(declarationId, this.companyId);
    
    return (result?.max_version || 0) + 1;
  }

  /**
   * Record version snapshot for audit trail
   */
  recordVersion(declarationId, source, previousSnapshot, nextSnapshot) {
    const versionId = uuidv4();
    const versionNumber = this.getNextVersionNumber(declarationId);
    
    this.db
      .prepare(`
        INSERT INTO declaration_versions (
          id, declaration_id, mrn, version_number, source,
          snapshot_before, snapshot_after, company_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        versionId,
        declarationId,
        nextSnapshot?.mrn,
        versionNumber,
        source,
        JSON.stringify(previousSnapshot || null),
        JSON.stringify(nextSnapshot),
        this.companyId,
        new Date().toISOString()
      );

    return versionId;
  }

  /**
   * Record a CDS event (notification)
   */
  recordDeclarationEvent(event, options = {}) {
    const eventId = uuidv4();
    
    this.db
      .prepare(`
        INSERT INTO cds_events (
          id, declaration_id, mrn, event_type, event_code,
          event_datetime, status_code, status_reason_code,
          raw_payload, company_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        eventId,
        options.declarationId || event.declaration_id,
        options.mrn || event.mrn,
        options.eventType || event.event_type,
        options.eventCode || event.event_code,
        options.eventDateTime || event.event_datetime || new Date().toISOString(),
        options.statusCode || event.status_code,
        options.statusReason || event.status_reason,
        JSON.stringify(event),
        this.companyId,
        new Date().toISOString()
      );

    return eventId;
  }

  /**
   * Save a declaration snapshot received from HMRC and preserve HMRC metadata.
   */
  saveFromHMRC(userId, declaration) {
    return this.saveCanonicalDeclaration(declaration, {
      source: declaration.declaration_source || 'hmrc_information_api',
      userId,
      throwOnError: false
    });
  }


  /**
   * Save complete declaration with all related data
   */
  saveCanonicalDeclaration(declaration, options = {}) {
    const now = new Date().toISOString();
    const source = options.source || declaration.declaration_source || 'csv';
    const userId = options.userId || declaration.user_id || this.userId || 'system';
    
    // Validate declaration
    const validation = WCODataValidator.validateDeclaration(declaration);
    if (!validation.valid && options.throwOnError !== false) {
      const error = new Error('Declaration validation failed');
      error.validationErrors = validation.errors;
      error.warnings = validation.warnings;
      throw error;
    }

    const previous = this.findExistingDeclaration(declaration.mrn);
    const declarationId = previous?.id || declaration.id || uuidv4();
    
    // Get goods items from options or nested in declaration
    const goodsItems = options.goodsItems || declaration.goods_items || [];

    return this.db.transaction(() => {
      // 1. Insert/Update declaration header
      this.db
        .prepare(`
          INSERT INTO declarations (
            id, mrn, lrn, functional_reference_id,
            declaration_type, function_code, status, acceptance_date,
            ucr_id, ducr_id, mucr_id,
            declarant_name, declarant_eori, trader_eori, importer_eori,
            total_items_count, total_customs_duty, total_vat,
            total_excise, total_other_tax, total_tax_liability, total_paid,
            company_id, user_id, source, declaration_source,
            soe_code, roe_code, last_updated_from_hmrc, batch_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            mrn = excluded.mrn,
            lrn = excluded.lrn,
            functional_reference_id = excluded.functional_reference_id,
            declaration_type = excluded.declaration_type,
            function_code = excluded.function_code,
            status = excluded.status,
            acceptance_date = excluded.acceptance_date,
            ucr_id = excluded.ucr_id,
            ducr_id = excluded.ducr_id,
            mucr_id = excluded.mucr_id,
            declarant_name = excluded.declarant_name,
            declarant_eori = excluded.declarant_eori,
            trader_eori = excluded.trader_eori,
            importer_eori = excluded.importer_eori,
            total_items_count = excluded.total_items_count,
            total_customs_duty = excluded.total_customs_duty,
            total_vat = excluded.total_vat,
            total_excise = excluded.total_excise,
            total_other_tax = excluded.total_other_tax,
            total_tax_liability = excluded.total_tax_liability,
            total_paid = excluded.total_paid,
            company_id = excluded.company_id,
            user_id = excluded.user_id,
            source = excluded.source,
            declaration_source = excluded.declaration_source,
            soe_code = excluded.soe_code,
            roe_code = excluded.roe_code,
            last_updated_from_hmrc = excluded.last_updated_from_hmrc,
            batch_id = COALESCE(excluded.batch_id, declarations.batch_id),
            updated_at = excluded.updated_at
        `)
        .run(
          declarationId,
          declaration.mrn,
          declaration.lrn,
          declaration.functional_reference_id,
          declaration.declaration_type || 'E',
          declaration.function_code || '09',
          declaration.status || 'pending',
          declaration.acceptance_date,
          declaration.ucr_id,
          declaration.ducr_id,
          declaration.mucr_id,
          declaration.declarant_name,
          declaration.declarant_eori,
          declaration.trader_eori,
          declaration.importer_eori,
          goodsItems.length,
          declaration.total_customs_duty || 0,
          declaration.total_vat || 0,
          declaration.total_excise || 0,
          declaration.total_other_tax || 0,
          (declaration.total_customs_duty || 0) + (declaration.total_vat || 0) + 
          (declaration.total_excise || 0) + (declaration.total_other_tax || 0),
          declaration.total_paid || 0,
          this.companyId,
          userId,
          source,
          declaration.declaration_source || source,
          declaration.soe_code,
          declaration.roe_code,
          declaration.last_updated_from_hmrc,
          options.batchId || declaration.batch_id,
          previous?.created_at || now,
          now
        );

      // 2. Save goods items and duties
      if (goodsItems && Array.isArray(goodsItems)) {
        goodsItems.forEach(item => {
          this.saveGoodsItem(declarationId, item);
        });
      }

      // 3. Record version
      this.recordVersion(
        declarationId,
        source,
        previous,
        declaration
      );

      return declarationId;
    })();
  }

  /**
   * Save a goods item with related duties/taxes
   */
  saveGoodsItem(declarationId, item) {
    const goodsItemId = item.id || uuidv4();
    
    // Validate item
    const itemValidation = WCODataValidator.validateGoodsItems([item], {});
    if (!itemValidation.valid) {
      const error = new Error('Goods item validation failed');
      error.validationErrors = itemValidation.errors;
      throw error;
    }

    this.db
      .prepare(`
        INSERT OR REPLACE INTO goods_items (
          id, declaration_id, item_number, commodity_code,
          goods_description, gross_mass, net_mass,
          invoice_value, statistical_value, procedure_code,
          company_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        goodsItemId,
        declarationId,
        item.item_number,
        item.commodity_code,
        item.goods_description,
        item.gross_mass || 0,
        item.net_mass || 0,
        item.invoice_value || 0,
        item.statistical_value || 0,
        item.procedure_code,
        this.companyId,
        new Date().toISOString(),
        new Date().toISOString()
      );

    // Save duties/taxes if provided
    if (item.duties && Array.isArray(item.duties)) {
      item.duties.forEach(duty => {
        this.saveDutyTaxFee(goodsItemId, duty);
      });
    }

    return goodsItemId;
  }

  /**
   * Save a duty/tax/fee record
   */
  saveDutyTaxFee(goodsItemId, duty) {
    const dutyId = duty.id || uuidv4();

    this.db
      .prepare(`
        INSERT OR REPLACE INTO duty_tax_fees (
          id, goods_item_id, type_code, tax_base,
          rate_numeric, tax_amount, calculation_method,
          paid_amount, deferment_status, company_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        dutyId,
        goodsItemId,
        duty.type_code,
        duty.tax_base || 0,
        duty.rate_numeric || 0,
        duty.tax_amount || 0,
        duty.calculation_method || 'TypeCode',
        duty.paid_amount || 0,
        duty.deferment_status || 'NotAvailable',
        this.companyId,
        new Date().toISOString()
      );

    return dutyId;
  }

  /**
   * Get single declaration with all related data
   */
  getDeclaration(declarationId) {
    const declaration = this.db
      .prepare('SELECT * FROM declarations WHERE id = ? AND company_id = ?')
      .get(declarationId, this.companyId);

    if (!declaration) return null;

    // Get goods items
    const goodsItems = this.db
      .prepare('SELECT * FROM goods_items WHERE declaration_id = ? AND company_id = ?')
      .all(declarationId, this.companyId);

    // Get duties for each item
    goodsItems.forEach(item => {
      item.duties = this.db
        .prepare('SELECT * FROM duty_tax_fees WHERE goods_item_id = ? AND company_id = ?')
        .all(item.id, this.companyId);
    });

    // Get events
    const events = this.db
      .prepare('SELECT * FROM cds_events WHERE declaration_id = ? AND company_id = ? ORDER BY event_datetime DESC')
      .all(declarationId, this.companyId);

    return {
      ...declaration,
      goods_items: goodsItems,
      events
    };
  }

  /**
   * Get all declarations (with optional filters)
   */
  getDeclarations(filter = {}) {
    let query = `
      SELECT
        d.*,
        COALESCE(cr.items_count, d.total_items_count, 0) as items_count,
        COALESCE(cr.total_duty_paid, d.total_customs_duty, 0) as total_duty_paid,
        COALESCE(cr.total_vat_paid, d.total_vat, 0) as total_vat_paid,
        COALESCE(cr.total_vat_value, d.total_vat, 0) as total_vat_value,
        COALESCE(cr.total_customs_value, 0) as total_customs_value,
        COALESCE(
          NULLIF(COALESCE(cr.total_duty_paid, 0) + COALESCE(cr.total_vat_paid, 0), 0),
          NULLIF(COALESCE(cr.total_duty, 0) + COALESCE(cr.total_vat_value, 0), 0),
          d.total_tax_liability,
          0
        ) as total_taxes_paid
      FROM declarations d
      LEFT JOIN (
        SELECT
          mrn,
          company_id,
          COUNT(*) as items_count,
          SUM(COALESCE(duty_paid, 0)) as total_duty_paid,
          SUM(COALESCE(vat_paid, 0)) as total_vat_paid,
          SUM(COALESCE(vat_value, 0)) as total_vat_value,
          SUM(COALESCE(customs_value, 0)) as total_customs_value,
          MAX(COALESCE(total_duty, 0)) as total_duty
        FROM cds_complete_records
        WHERE company_id = ?
        GROUP BY company_id, mrn
      ) cr ON cr.mrn = d.mrn AND cr.company_id = d.company_id
      WHERE d.company_id = ?
    `;
    const params = [this.companyId, this.companyId];

    if (filter.mrn) {
      query += ' AND mrn = ?';
      params.push(filter.mrn);
    }

    if (filter.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter.startDate) {
      query += ' AND created_at >= ?';
      params.push(filter.startDate);
    }

    if (filter.endDate) {
      query += ' AND created_at <= ?';
      params.push(filter.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get declaration versions (version history)
   */
  getDeclarationVersions(declarationId) {
    return this.db
      .prepare(`
        SELECT * FROM declaration_versions 
        WHERE declaration_id = ? AND company_id = ?
        ORDER BY version_number DESC
      `)
      .all(declarationId, this.companyId);
  }

  /**
   * Get declaration events (audit trail)
   */
  getDeclarationEvents(declarationId) {
    return this.db
      .prepare(`
        SELECT * FROM cds_events 
        WHERE declaration_id = ? AND company_id = ?
        ORDER BY event_datetime DESC
      `)
      .all(declarationId, this.companyId);
  }

  /**
   * Delete a declaration and cascade delete related data
   */
  deleteDeclaration(declarationId) {
    return this.db.transaction(() => {
      // SQLite CASCADE DELETE will handle related records
      const result = this.db
        .prepare('DELETE FROM declarations WHERE id = ? AND company_id = ?')
        .run(declarationId, this.companyId);

      return result.changes > 0;
    })();
  }

  /**
   * Assign client to declaration (legacy compatibility)
   */
  assignClient(declarationId, clientId, clientName) {
    const result = this.db
      .prepare(`
        UPDATE declarations 
        SET client_id = ?, client_name = ?, updated_at = ?
        WHERE id = ? AND company_id = ?
      `)
      .run(clientId, clientName, new Date().toISOString(), declarationId, this.companyId);

    return result.changes > 0;
  }

  /**
   * Save batch and related errors from CSV import
   */
  saveBatch(batchId, filename, declarations, items, taxLines, errors, warnings, cdsRecords = []) {
    console.log(`💾 Saving batch: ${batchId}`);
    console.log(`  📄 File: ${filename}`);
    console.log(`  📋 Declarations: ${declarations.length} | Items: ${items.length} | Taxes: ${taxLines.length}`);
    
    return this.db.transaction(() => {
      // Save batch record
      this.db
        .prepare(`
          INSERT INTO import_batches (
            id, filename, total_records, success_count,
            error_count, warning_count, declarations, items, tax_lines,
            status, company_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          batchId,
          filename,
          declarations.length,
          (declarations.length - errors.length),
          errors.length,
          warnings.length,
          declarations.length,
          items.length,
          taxLines.length,
          'completed',
          this.companyId,
          new Date().toISOString()
        );

      // Save errors
      errors.forEach((error, index) => {
        this.recordImportError(
          batchId,
          error.row_number || index + 2,
          error.scope || 'VALIDATION',
          error.message,
          error
        );
      });

      cdsRecords.forEach(record => {
        this.saveCompleteCdsRecord(batchId, record);
      });

      // Save declarations
      // If declarations already have nested goods_items (from CSV processor),
      // saveCanonicalDeclaration will handle them directly
      // Otherwise, build goodsItemsWithDuties from separate items/taxLines
      declarations.forEach(decl => {
        console.log(`  → Saving declaration: ${decl.mrn || decl.entry_identifier} (${decl.goods_items?.length || 0} items)`);
        let goodsItemsForSave;
        
        if (decl.goods_items && Array.isArray(decl.goods_items) && decl.goods_items.length > 0) {
          // Already hierarchical from CSV processor
          goodsItemsForSave = decl.goods_items;
        } else {
          // Need to build from separate items and taxLines
          const declItems = items.filter(i => 
            i.declaration_mrn === decl.mrn || i.entry_identifier === decl.entry_identifier
          );
          
          const declDuties = taxLines.filter(t =>
            t.declaration_mrn === decl.mrn || t.entry_identifier === decl.entry_identifier
          );

          goodsItemsForSave = declItems.map(item => ({
            ...item,
            item_number: item.item_number || 1,
            duties: declDuties
              .filter(t => t.item_number === item.item_number)
              .map(t => ({
                type_code: this.normalizeDutyTaxType(t.tax_type_code),
                tax_amount: t.tax_amount || 0,
                tax_base: t.tax_base || t.customs_value || 0,
                rate_numeric: t.tax_rate || 0,
                calculation_method: t.calculation_method || 'TypeCode'
              }))
          }));
        }

        try {
          this.saveCanonicalDeclaration(decl, {
            source: 'csv',
            goodsItems: goodsItemsForSave,
            batchId,
            throwOnError: false
          });
        } catch (err) {
          console.error(`Error saving declaration ${decl.mrn}:`, err.message);
          this.recordImportError(
            batchId,
            0,
            'SAVE_ERROR',
            err.message,
            { mrn: decl.mrn, error: err.message }
          );
        }
      });

      return batchId;
    })();
  }

  saveCompleteCdsRecord(batchId, record) {
    const header = record.header || {};
    const item = record.items?.[0] || {};
    const itemRaw = item.raw || {};
    const tax = item.tax || {};
    const dataSources = record.declaration_data_sources || {};
    const totals = record.totals || {};

    const text = (...values) => {
      for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
      }
      return null;
    };
    const number = (...values) => {
      const value = text(...values);
      if (value === null) return 0;
      const parsed = Number(String(value).replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    this.db
      .prepare(`
        INSERT OR REPLACE INTO cds_complete_records (
          id, batch_id, record_key, record_index, mrn, entry_identifier, item_number,
          header_declaration_data_source, item_declaration_data_source, tax_declaration_data_source,
          declaration_category, declaration_type, importer_eori, declarant_eori, entry_date,
          acceptance_date, clearance_date, trader_reference, declarant_representative, ducr,
          item_count, total_packages, transport_country, transport_mode, customs_value,
          total_duty, total_vat_paid, total_vat_value, invoice_currency, invoice_total,
          invoice_total_gbp, air_transport_cost_adjustment, vat_adjustment_currency,
          vat_value_adjustment, insurance_cost_adjustment, previous_document_cle_references,
          previous_document_cle_classes, previous_document_dcr_references, previous_document_dcr_classes,
          previous_document_703_references, previous_document_703_classes, transport_cost_adjustment,
          submitters_reference_number, consignor, country_of_dispatch, location_of_goods,
          commodity_code, cpc, additional_special_procedure_codes, country_of_origin,
          item_price, duty_paid, vat_value, vat_paid, vat_postponed, net_mass, gross_mass,
          preference, goods_description, valuation_method, agent_code, all_item_document_references,
          all_item_document_codes, additional_information, document_references, tax_type_1,
          tax_amount_1, tax_type_2, tax_amount_2, audit_status, audit_flags_json,
          calculated_vat_base, declared_vat_value, suffered_duty_rate, expected_duty_rate,
          expected_duty, duty_variance, human_review_status, allocation_status,
          original_record_json, adjusted_record_json, audit_updated_at, record_json, company_id, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `)
      .run(
        record.id || uuidv4(),
        batchId,
        record.record_key,
        record.record_index,
        record.mrn,
        record.entry_identifier,
        record.item_number,
        dataSources.header || header['Declaration Data Source'],
        dataSources.item || itemRaw['Declaration Data Source'] || item['Declaration Data Source'],
        dataSources.tax || tax['Declaration Data Source'],
        text(header['Declaration Category'], record.declaration_category),
        text(itemRaw['Declaration Type'], item['Declaration Type'], record.declaration_type),
        text(header['Importer EORI'], itemRaw['Importer EORI'], tax['Importer EORI'], record.importer_eori),
        text(header['Declarant EORI'], itemRaw['Declarant EORI'], tax['Declarant EORI'], record.declarant_eori),
        text(header['Entry Date'], itemRaw['Entry Date'], tax['Entry Date']),
        text(header['Acceptance Date'], itemRaw['Acceptance Date'], tax['Acceptance Date'], record.acceptance_date),
        text(header['Clearance Date'], itemRaw['Clearance Date'], tax['Clearance Date'], record.clearance_date),
        text(header['Trader Reference'], itemRaw['Trader Reference'], tax['Trader Reference'], record.trader_reference),
        text(header['Declarant Representative']),
        text(header.DUCR, item.DUCR, tax.DUCR, record.ducr),
        number(header['Item Count']),
        number(header['Total Packages']),
        text(header['Transport Country']),
        text(header['Transport Mode']),
        number(header['Customs Value'], itemRaw['Customs Value'], tax['Customs Value'], record.customs_value),
        number(header['Total Duty'], totals.header_total_duty),
        number(header['Total VAT Paid'], totals.header_total_vat_paid),
        number(header[' Total VAT Value'], header['Total VAT Value'], totals.header_total_vat_value),
        text(header['Invoice Currency'], itemRaw['Invoice Currency'], item.invoice_currency, record.invoice_currency),
        number(header['Invoice Total']),
        number(header['Invoice Total GBP']),
        number(header['Air Transport Cost Adjustment']),
        text(header['VAT Adjustment Currency']),
        number(header['VAT Value Adjustment']),
        number(header['Insurance Cost Adjustment']),
        text(header['Previous Document CLE Reference(s)']),
        text(header['Previous Document CLE Class(es)']),
        text(header['Previous Document DCR Reference(s)']),
        text(header['Previous Document DCR Class(es)']),
        text(header['Previous Document 703 Reference(s)']),
        text(header['Previous Document 703 Class(es)']),
        number(header['Transport Cost Adjustment']),
        text(header['Submitters Reference number']),
        text(itemRaw.Consignor, item.consignor),
        text(itemRaw['Country of Dispatch']),
        text(itemRaw['Location of Goods'], item.location_of_goods),
        text(item.commodity_code_display, itemRaw['Commodity Code'], record.commodity_code),
        text(itemRaw.CPC, item.CPC, item.cpc),
        text(itemRaw['Additional Special Procedure Codes']),
        text(itemRaw['Country of Origin'], item.country_of_origin, record.country_of_origin),
        number(itemRaw['Item Price'], item.item_price, record.item_price),
        number(itemRaw['Duty Paid'], item.duty_paid, tax['Duty Paid'], record.duty_paid),
        number(itemRaw['VAT Value'], item.vat_value, tax['VAT Value'], record.vat_value),
        number(itemRaw['VAT Paid'], item.vat_paid, tax['VAT Paid'], record.vat_paid),
        number(itemRaw['VAT Postponed'], tax['VAT Postponed']),
        number(itemRaw['Net Mass'], item.net_mass),
        number(itemRaw['Gross Mass'], item.gross_mass),
        text(itemRaw.Preference),
        text(itemRaw['Goods Description'], item.goods_description, record.goods_description),
        text(itemRaw['Valuation Method']),
        text(itemRaw['Agent Code']),
        text(itemRaw['All Item Document References']),
        text(itemRaw['All Item Document Codes']),
        text(itemRaw['Additional Information Code & statement']),
        text(tax['Document References']),
        text(tax['Tax Type 1'], record.tax_lines?.[0]?.tax_type_code),
        number(tax['Tax Amount 1'], record.tax_lines?.[0]?.tax_amount),
        text(tax['Tax Type 2'], record.tax_lines?.[1]?.tax_type_code),
        number(tax['Tax Amount 2'], record.tax_lines?.[1]?.tax_amount),
        'unchecked',
        null,
        0,
        number(itemRaw['VAT Value'], item.vat_value, tax['VAT Value'], record.vat_value),
        0,
        0,
        0,
        0,
        'pending_review',
        null,
        JSON.stringify(record),
        null,
        null,
        JSON.stringify(record),
        this.companyId,
        new Date().toISOString()
      );
  }

  runAutoAnalysis(declarationIds = []) {
    const ids = Array.isArray(declarationIds) ? declarationIds.filter(Boolean) : [];
    const now = new Date().toISOString();

    const where = ids.length
      ? `d.id IN (${ids.map(() => '?').join(',')})`
      : "LOWER(COALESCE(d.status, 'unchecked')) IN ('unchecked', 'pending', 'imported')";

    const records = this.db
      .prepare(`
        SELECT cr.*, d.id as declaration_id
        FROM cds_complete_records cr
        JOIN declarations d ON d.mrn = cr.mrn AND d.company_id = cr.company_id
        WHERE cr.company_id = ? AND ${where}
        ORDER BY cr.mrn, cr.item_number
      `)
      .all(this.companyId, ...ids);

    const updateRecord = this.db.prepare(`
      UPDATE cds_complete_records
      SET audit_status = ?,
          audit_flags_json = ?,
          calculated_vat_base = ?,
          declared_vat_value = ?,
          suffered_duty_rate = ?,
          expected_duty_rate = ?,
          expected_duty = ?,
          duty_variance = ?,
          human_review_status = ?,
          original_record_json = COALESCE(original_record_json, record_json),
          audit_updated_at = ?
      WHERE id = ? AND company_id = ?
    `);

    const updateDeclaration = this.db.prepare(`
      UPDATE declarations
      SET status = ?,
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `);

    const results = this.db.transaction(() => {
      const audited = [];
      const declarationStatus = new Map();

      records.forEach(record => {
        const audit = this.analyzeCompleteCdsRecord(record);
        const reviewStatus = audit.flags.length > 0 ? 'pending_review' : 'verified';

        updateRecord.run(
          audit.auditStatus,
          JSON.stringify(audit.flags),
          audit.calculatedVatBase,
          audit.declaredVatValue,
          audit.sufferedDutyRate,
          audit.expectedDutyRate,
          audit.expectedDuty,
          audit.dutyVariance,
          reviewStatus,
          now,
          record.id,
          this.companyId
        );

        const current = declarationStatus.get(record.declaration_id) || { flagged: false };
        current.flagged = current.flagged || audit.flags.length > 0;
        declarationStatus.set(record.declaration_id, current);

        audited.push({
          id: record.id,
          declaration_id: record.declaration_id,
          mrn: record.mrn,
          item_number: record.item_number,
          ...audit
        });
      });

      declarationStatus.forEach((summary, declarationId) => {
        updateDeclaration.run(summary.flagged ? 'issues' : 'checked', now, declarationId, this.companyId);
      });

      return audited;
    })();

    return {
      analyzed_count: results.length,
      flagged_count: results.filter(result => result.flags.length > 0).length,
      results
    };
  }

  analyzeCompleteCdsRecord(record) {
    const raw = this.safeParseJson(record.record_json);
    const taxLines = Array.isArray(raw.tax_lines) ? raw.tax_lines : [];
    const customsValue = this.toNumber(record.customs_value || raw.customs_value);
    const dutyPaid = this.toNumber(record.duty_paid || this.findTaxAmount(taxLines, 'A00'));
    const declaredVatValue = this.toNumber(record.vat_value || raw.vat_value);
    const vatValueAdjustment = this.toNumber(record.vat_value_adjustment || raw.totals?.vat_value_adjustment);
    const calculatedVatBase = this.roundMoney(customsValue + dutyPaid + vatValueAdjustment);
    const sufferedDutyRate = customsValue > 0 ? this.roundRate((dutyPaid / customsValue) * 100) : 0;
    const expectedDutyRate = this.expectedDutyRate(record, taxLines, sufferedDutyRate);
    const expectedDuty = this.roundMoney(customsValue * (expectedDutyRate / 100));
    const dutyVariance = this.roundMoney(dutyPaid - expectedDuty);
    const flags = [];

    if (declaredVatValue > 0 && Math.abs(calculatedVatBase - declaredVatValue) > 0.01) {
      flags.push({
        type: 'value_discrepancy',
        severity: 'warning',
        message: 'Value Mismatch: Check Inland Freight/Adjustments.',
        imported: declaredVatValue,
        calculated: calculatedVatBase
      });
    }

    if (Math.abs(dutyVariance) > 0.01) {
      flags.push({
        type: dutyVariance > 0 ? 'potential_refund' : 'underpayment_risk',
        severity: dutyVariance > 0 ? 'warning' : 'fail',
        message: dutyVariance > 0 ? 'Duty paid exceeds expected duty.' : 'Underpayment Risk: duty paid is below expected duty.',
        sufferedDuty: dutyPaid,
        expectedDuty,
        variance: dutyVariance
      });
    }

    return {
      auditStatus: flags.some(flag => flag.severity === 'fail') ? 'fail' : flags.length > 0 ? 'flagged' : 'pass',
      flags,
      calculatedVatBase,
      declaredVatValue,
      sufferedDutyRate,
      expectedDutyRate,
      expectedDuty,
      dutyVariance
    };
  }

  expectedDutyRate(record, taxLines, sufferedDutyRate) {
    const preference = String(record.preference || '').trim();
    const cpc = String(record.cpc || '').trim();
    const additionalInfo = String(record.additional_information || '').toUpperCase();

    if (preference.startsWith('3') || additionalInfo.includes('OVR01')) return 0;
    if (/^(40|42|51|53)/.test(cpc) && sufferedDutyRate === 0) return 0;

    const dutyLine = taxLines.find(line => String(line.tax_type_code || '').toUpperCase() === 'A00');
    const declaredRate = this.toNumber(dutyLine?.tax_rate || dutyLine?.rate_numeric);
    if (declaredRate > 0) return this.roundRate(declaredRate);

    return this.roundRate(sufferedDutyRate);
  }

  getAnalyzedRecords(filter = {}) {
    let query = `
      SELECT cr.*, d.id as declaration_id, d.status as declaration_status, d.client_name
      FROM cds_complete_records cr
      JOIN declarations d ON d.mrn = cr.mrn AND d.company_id = cr.company_id
      WHERE cr.company_id = ?
        AND LOWER(COALESCE(d.status, '')) IN ('checked', 'issues', 'adjusted', 'claimed', 'archived')
    `;
    const params = [this.companyId];

    if (filter.riskProfile === 'value_discrepancies') {
      query += " AND cr.audit_flags_json LIKE '%value_discrepancy%'";
    } else if (filter.riskProfile === 'duty_mismatches') {
      query += " AND (cr.audit_flags_json LIKE '%potential_refund%' OR cr.audit_flags_json LIKE '%underpayment_risk%')";
    } else if (filter.riskProfile === 'pva') {
      query += " AND (cr.tax_type_1 = 'B00' OR cr.tax_type_2 = 'B00' OR cr.vat_postponed > 0)";
    }

    query += ' ORDER BY cr.audit_updated_at DESC, cr.created_at DESC LIMIT ?';
    params.push(filter.limit || 250);

    return this.db.prepare(query).all(...params).map(record => ({
      ...record,
      audit_flags: this.safeParseJson(record.audit_flags_json, []),
      original_record: this.safeParseJson(record.original_record_json || record.record_json),
      adjusted_record: this.safeParseJson(record.adjusted_record_json)
    }));
  }

  getAnalyzedRecordById(recordId) {
    const record = this.db
      .prepare(`
        SELECT cr.*, d.id as declaration_id, d.status as declaration_status, d.client_name
        FROM cds_complete_records cr
        JOIN declarations d ON d.mrn = cr.mrn AND d.company_id = cr.company_id
        WHERE cr.id = ? AND cr.company_id = ?
      `)
      .get(recordId, this.companyId);

    if (!record) return null;

    return {
      ...record,
      audit_flags: this.safeParseJson(record.audit_flags_json, []),
      original_record: this.safeParseJson(record.original_record_json || record.record_json),
      adjusted_record: this.safeParseJson(record.adjusted_record_json)
    };
  }

  updateAuditReview(recordId, payload = {}) {
    const existing = this.db
      .prepare('SELECT * FROM cds_complete_records WHERE id = ? AND company_id = ?')
      .get(recordId, this.companyId);

    if (!existing) return null;

    const originalRecord = this.safeParseJson(existing.original_record_json || existing.record_json);
    const adjustedRecord = payload.adjusted_record
      ? { ...(this.safeParseJson(existing.adjusted_record_json) || originalRecord), ...payload.adjusted_record }
      : this.safeParseJson(existing.adjusted_record_json);
    const allocationStatus = payload.allocation_status || existing.allocation_status;
    const humanReviewStatus = payload.human_review_status || existing.human_review_status || 'pending_review';
    const declarationStatus =
      allocationStatus === 'draft_claim_initialized'
        ? 'claimed'
        : adjustedRecord
          ? 'adjusted'
          : existing.audit_status === 'pass'
            ? 'checked'
            : 'issues';

    this.db.transaction(() => {
      this.db
        .prepare(`
          UPDATE cds_complete_records
          SET human_review_status = ?,
              allocation_status = ?,
              adjusted_record_json = ?,
              audit_updated_at = ?
          WHERE id = ? AND company_id = ?
        `)
        .run(
          humanReviewStatus,
          allocationStatus,
          adjustedRecord ? JSON.stringify(adjustedRecord) : existing.adjusted_record_json,
          new Date().toISOString(),
          recordId,
          this.companyId
        );

      this.db
        .prepare(`
          UPDATE declarations
          SET status = ?, updated_at = ?
          WHERE mrn = ? AND company_id = ?
        `)
        .run(declarationStatus, new Date().toISOString(), existing.mrn, this.companyId);
    })();

    return this.getAnalyzedRecordById(recordId);
  }

  safeParseJson(value, fallback = null) {
    if (!value) return fallback;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  toNumber(value) {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  roundRate(value) {
    return Math.round((Number(value) || 0) * 10000) / 10000;
  }

  findTaxAmount(taxLines, taxType) {
    const line = taxLines.find(taxLine => String(taxLine.tax_type_code || '').toUpperCase() === taxType);
    return line?.tax_amount || 0;
  }

  normalizeDutyTaxType(taxTypeCode) {
    const normalized = String(taxTypeCode || '').trim().toUpperCase();
    if (normalized === 'VAT' || normalized === 'B00') return 'VAT';
    if (normalized === 'EXCISE') return 'Excise';
    return 'CustomsDuty';
  }

  /**
   * Get import batches
   */
  getBatches(limit = 50) {
    return this.db
      .prepare(`
        SELECT * FROM import_batches 
        WHERE company_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(this.companyId, limit);
  }

  /**
   * Get errors for a batch
   */
  getBatchErrors(batchId) {
    return this.db
      .prepare(`
        SELECT * FROM import_errors 
        WHERE batch_id = ?
        ORDER BY row_number
      `)
      .all(batchId);
  }

  /**
   * Record import errors
   */
  recordImportError(batchId, rowNumber, errorType, errorMessage, rawData) {
    const errorId = uuidv4();
    
    this.db
      .prepare(`
        INSERT INTO import_errors (
          id, batch_id, row_number, error_type,
          error_message, raw_data, company_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        errorId,
        batchId,
        rowNumber,
        errorType,
        errorMessage,
        JSON.stringify(rawData),
        this.companyId,
        new Date().toISOString()
      );

    return errorId;
  }

  /**
   * Get manifest summary (dashboard statistics)
   */
  getSummary() {
    const summary = this.db
      .prepare(`
        SELECT
          COUNT(DISTINCT id) as total_declarations,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status IN ('unchecked', 'pending', 'imported') THEN 1 ELSE 0 END) as unchecked_count,
          SUM(CASE WHEN status IN ('checked', 'issues') THEN 1 ELSE 0 END) as checked_count,
          SUM(CASE WHEN status = 'adjusted' THEN 1 ELSE 0 END) as adjusted_count,
          SUM(CASE WHEN status = 'issues' THEN 1 ELSE 0 END) as issues,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
          SUM(CASE WHEN status = 'released' THEN 1 ELSE 0 END) as released_count,
          SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) as cleared_count,
          SUM(total_tax_liability) as total_liability,
          SUM(total_paid) as total_paid,
          COUNT(DISTINCT DATE(created_at)) as days_with_imports
        FROM declarations
        WHERE company_id = ?
      `)
      .get(this.companyId);

    return summary || {
      total_declarations: 0,
      pending_count: 0,
      accepted_count: 0,
      released_count: 0,
      cleared_count: 0,
      total_liability: 0,
      total_paid: 0,
      days_with_imports: 0
    };
  }
}

export default DeclarationStore;
