import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

/**
 * CSV Processor Service
 * Handles parsing and validation of CDS CSV files
 */
export class CSVProcessor {
  headerFieldNames = {
    entry_identifier: ['Entry Identifier', 'entry_identifier', 'EntryIdentifier', 'MRN', 'mrn'],
    ducr: ['DUCR', 'ducr', 'Declarant Unique Consignment Reference'],
    entry_date: ['Entry Date', 'entry_date', 'EntryDate'],
    acceptance_date: ['Acceptance Date', 'acceptance_date', 'AcceptanceDate'],
    clearance_date: ['Clearance Date', 'clearance_date', 'ClearanceDate'],
    importer_eori: ['Importer EORI', 'importer_eori', 'ImporterEORI', 'Importer', 'importer'],
    declarant_eori: ['Declarant EORI', 'declarant_eori', 'DeclarantEORI'],
    paying_agent_eori: ['Paying Agent EORI', 'paying_agent_eori', 'PayingAgentEORI'],
    paying_agent_name: ['Paying Agent Name', 'paying_agent_name', 'PayingAgentName'],
    declarant_name: ['Declarant Name', 'declarant_name', 'DeclarantName'],
    trader_reference: ['Trader Reference', 'trader_reference', 'TraderReference'],
    customs_value: ['Customs Value', 'customs_value', 'CustomsValue', 'total_customs_value'],
    total_duty: ['Total Duty', 'total_duty', 'TotalDuty', 'total_duty_paid', 'Total Duty Paid', 'TotalDutyPaid'],
    total_vat_paid: ['Total VAT Paid', 'total_vat_paid', 'TotalVATPaid'],
    total_excise: ['Total Excise', 'total_excise', 'TotalExcise', 'total_excise_paid'],
    transport_country: ['Transport Country', 'transport_country', 'TransportCountry'],
    transport_mode: ['Transport Mode', 'transport_mode', 'TransportMode'],
    invoice_currency: ['Invoice Currency', 'invoice_currency', 'InvoiceCurrency'],
    invoice_total: ['Invoice Total', 'invoice_total', 'InvoiceTotal']
  };

  itemFieldNames = {
    entry_identifier: ['Entry Identifier', 'entry_identifier', 'EntryIdentifier', 'MRN', 'mrn'],
    item_number: ['Item Number', 'item_number', 'ItemNumber', 'item_no', 'line_number'],
    commodity_code: ['Commodity Code', 'commodity_code', 'CommodityCode', 'hs_code'],
    origin_country: ['Country of Origin', 'origin_country', 'OriginCountry', 'country_of_origin'],
    preferential_country: ['Preferential Country of Origin', 'preferential_country'],
    net_mass: ['Net Mass', 'net_mass', 'NetMass', 'net_weight'],
    gross_mass: ['Gross Mass', 'gross_mass', 'GrossMass'],
    supplementary_units: ['Supplementary Units', 'supplementary_units', 'SupplementaryUnits'],
    invoice_value: ['Invoice Value', 'invoice_value', 'InvoiceValue'],
    item_price: ['Item Price', 'item_price', 'ItemPrice'],
    customs_value: ['Customs Value', 'customs_value', 'CustomsValue'],
    invoice_currency: ['Invoice Currency', 'invoice_currency', 'InvoiceCurrency'],
    goods_description: ['Goods Description', 'goods_description', 'GoodsDescription', 'Description', 'description'],
    consignor: ['Consignor', 'consignor', 'consignor_name'],
    location_of_goods: ['Location of Goods', 'location_of_goods', 'LocationOfGoods'],
    procedure_code: ['CPC', 'Procedure Code', 'procedure_code', 'ProcedureCode']
  };

  taxFieldNames = {
    entry_identifier: ['Entry Identifier', 'entry_identifier', 'EntryIdentifier', 'MRN', 'mrn'],
    item_number: ['Item Number', 'item_number', 'ItemNumber', 'item_no', 'line_number'],
    commodity_code: ['Commodity Code', 'commodity_code', 'CommodityCode'],
    customs_value: ['Customs Value', 'customs_value', 'CustomsValue', 'Tax Base', 'tax_base', 'TaxBase'],
    vat_value: ['VAT Value', 'vat_value', 'VATValue'],
    vat_paid: ['VAT Paid', 'vat_paid', 'VATPaid'],
    tax_type: ['Tax Type', 'tax_type', 'TaxType'],
    tax_amount: ['Tax Amount', 'tax_amount', 'TaxAmount'],
    tax_rate: ['Tax Rate', 'tax_rate', 'TaxRate'],
    calculation_method: ['Calculation Method', 'calculation_method', 'CalculationMethod']
  };

  /**
   * Process uploaded CSV files
   */
  async processFiles(files, companyId) {
    const errors = [];
    const warnings = [];
    
    console.log('📋 CSV Import Starting - Processing files for company:', companyId);
    
    // Parse header file (required)
    const headerRecords = await this.parseTabularFile(files.header);
    console.log(`  ✓ Header records: ${headerRecords.length}`);

    const declarations = headerRecords.map((record, index) => {
      const declaration = this.parseHeaderRecord(record, companyId, index + 2);
      
      // Validate entry identifier
      if (!declaration.entry_identifier) {
        errors.push({
          scope: 'HEADER',
          identifier: declaration.entry_identifier || declaration.ducr || 'UNKNOWN',
          message: 'Missing Entry Identifier (required)',
          row: index + 2
        });
      }

      // Validate EORI
      if (declaration.importer_eori && !this.isValidEORI(declaration.importer_eori)) {
        warnings.push({
          scope: 'HEADER',
          identifier: declaration.entry_identifier,
          message: 'Invalid Importer EORI format',
          row: index + 2
        });
      }

      // Validate date
      if (declaration.acceptance_date && !this.isValidDate(declaration.acceptance_date)) {
        errors.push({
          scope: 'HEADER',
          identifier: declaration.entry_identifier,
          message: 'Invalid acceptance date format',
          row: index + 2
        });
      }

      return declaration;
    });

    // Parse items file if provided
    let items = [];
    let itemsRecords = [];
    if (files.items) {
      itemsRecords = await this.parseTabularFile(files.items);
      
      items = itemsRecords.map((record, index) => {
        const item = this.parseItemRecord(record, index + 2);
        
        // Validate commodity code
        if (item.commodity_code && !this.isValidCommodityCode(item.commodity_code)) {
          warnings.push({
            scope: 'ITEMS',
            identifier: `${item.entry_identifier}-${item.item_number}`,
            message: 'Invalid commodity code format (expected: 10 digits)',
            row: index + 2
          });
        }
        
        return item;
      });
    }

    // Parse tax file if provided
    let taxLines = [];
    let taxRecords = [];
    if (files.tax) {
      taxRecords = await this.parseTabularFile(files.tax);
      
      // Each tax record may have multiple tax lines
      taxLines = taxRecords.flatMap((record, index) => {
        return this.parseTaxRecords(record, index + 2);
      });
    }

    const cdsRecords = this.buildCompleteCdsRecords(headerRecords, itemsRecords, taxRecords);

    // Build hierarchical structure: map items and duties to declarations
    const declarationsWithHierarchy = declarations.map(decl => {
      const declItems = items.filter(item => 
        item.entry_identifier === decl.entry_identifier ||
        item.declaration_mrn === decl.entry_identifier ||
        item.declaration_mrn === decl.mrn
      );

      const goodsItemsWithDuties = declItems.map(item => ({
        ...item,
        item_number: item.item_number || 1,
        commodity_code: item.commodity_code,
        goods_description: item.goods_description,
        gross_mass: item.gross_mass,
        net_mass: item.net_mass,
        invoice_value: item.invoice_value,
        statistical_value: item.statistical_value,
        procedure_code: item.procedure_code || '4000',
        duties: taxLines
          .filter(t => 
            (t.entry_identifier === item.entry_identifier || t.declaration_mrn === item.declaration_mrn) &&
            t.item_number === item.item_number
          )
          .map(t => ({
            type_code: this.normalizeTaxType(t.tax_type_code),
            tax_amount: t.tax_amount || 0,
            tax_base: t.tax_base || 0,
            rate_numeric: t.tax_rate || 0,
            calculation_method: t.calculation_method || 'TypeCode',
            paid_amount: 0,
            deferment_status: 'NotAvailable'
          }))
      }));

      return {
        ...decl,
        declaration_type: decl.declaration_type || 'E',
        function_code: '09', // Declaration
        total_items_count: goodsItemsWithDuties.length,
        total_customs_duty: taxLines
          .filter(t => t.entry_identifier === decl.entry_identifier && this.normalizeTaxType(t.tax_type_code) !== 'VAT')
          .reduce((sum, t) => sum + (this.parseFloat(t.tax_amount) || 0), 0) || 0,
        total_vat: taxLines
          .filter(t => t.entry_identifier === decl.entry_identifier && this.normalizeTaxType(t.tax_type_code) === 'VAT')
          .reduce((sum, t) => sum + (this.parseFloat(t.vat_value || t.tax_amount) || 0), 0) || 0,
        total_excise: 0,
        total_other_tax: 0,
        goods_items: goodsItemsWithDuties
      };
    });

    console.log('📦 CSV Processing Complete:');
    console.log(`  • Declarations: ${declarationsWithHierarchy.length}`);
    console.log(`  • Items: ${items.length}`);
    console.log(`  • Tax lines: ${taxLines.length}`);
    console.log(`  • CDS records: ${cdsRecords.length}`);
    console.log(`  • Errors: ${errors.length}`);
    console.log(`  • Warnings: ${warnings.length}`);
    
    // Log each declaration with its items
    declarationsWithHierarchy.forEach((decl, idx) => {
      console.log(`  [${idx + 1}] MRN: ${decl.mrn} | Items: ${decl.goods_items?.length || 0} | Duties: ${decl.goods_items?.reduce((sum, item) => sum + (item.duties?.length || 0), 0) || 0}`);
    });

    return {
      declarations: declarationsWithHierarchy,
      items,
      taxLines,
      cdsRecords,
      errors,
      warnings
    };
  }

  async parseTabularFile(file) {
    const filePath = typeof file === 'string' ? file : file.path;
    const fileName = typeof file === 'string' ? file : (file.originalname || file.path);
    const extension = fileName.toLowerCase().split('.').pop();

    if (['ods', 'xls', 'xlsx'].includes(extension)) {
      const workbook = XLSX.readFile(filePath, {
        cellDates: false,
        raw: false
      });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) return [];

      return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
        defval: '',
        raw: false
      });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
  }

  /**
   * Parse header record - map to WCO schema
   */
  parseHeaderRecord(record, companyId, rowNumber) {
    const entry_identifier = this.getField(record, this.headerFieldNames.entry_identifier);
    const entry_date = this.parseDate(this.getField(record, this.headerFieldNames.entry_date));
    const importer_eori = this.getField(record, this.headerFieldNames.importer_eori);
    const declarant_eori = this.getField(record, this.headerFieldNames.declarant_eori);
    const declarant_name = this.getField(record, this.headerFieldNames.declarant_name);
    const trader_eori = this.getField(record, this.headerFieldNames.paying_agent_eori) || declarant_eori;

    return {
      id: uuidv4(),
      company_id: companyId,
      // WCO identifiers
      mrn: entry_identifier,
      lrn: this.getField(record, this.headerFieldNames.trader_reference),
      functional_reference_id: entry_identifier,
      
      // Declaration type & function
      declaration_type: this.getField(record, ['Declaration Category']) || 'E',
      function_code: '09', // Declaration
      status: 'unchecked',
      
      // Consignment references
      ucr_id: null, // Not typically in CSV header
      ducr_id: this.getField(record, this.headerFieldNames.ducr),
      mucr_id: null,
      
      // Parties
      declarant_name,
      declarant_eori,
      trader_eori,
      importer_eori,
      
      // Additional identifiers
      entry_identifier,
      ducr: this.getField(record, this.headerFieldNames.ducr),
      entry_date,
      acceptance_date: this.parseDate(this.getField(record, this.headerFieldNames.acceptance_date)),
      clearance_date: this.parseDate(this.getField(record, this.headerFieldNames.clearance_date)),
      
      // Transport
      transport_country: this.getField(record, this.headerFieldNames.transport_country),
      transport_mode: this.getField(record, this.headerFieldNames.transport_mode),
      
      // Financial
      total_customs_duty: this.parseFloat(this.getField(record, this.headerFieldNames.total_duty)) || 0,
      total_vat: this.parseFloat(this.getField(record, this.headerFieldNames.total_vat_paid)) || 0,
      total_excise: this.parseFloat(this.getField(record, this.headerFieldNames.total_excise)) || 0,
      total_other_tax: 0,
      total_paid: 0,
      
      // Additional fields
      paying_agent_eori: this.getField(record, this.headerFieldNames.paying_agent_eori),
      paying_agent_name: this.getField(record, this.headerFieldNames.paying_agent_name),
      customs_value: this.parseFloat(this.getField(record, this.headerFieldNames.customs_value)) || 0,
      invoice_currency: this.getField(record, this.headerFieldNames.invoice_currency) || 'GBP',
      invoice_total: this.parseFloat(this.getField(record, this.headerFieldNames.invoice_total)) || 0,
      
      // Metadata
      declaration_source: 'csv',
      raw_data: this.buildRawData(record, 'header', rowNumber, this.headerFieldNames),
      source_columns: Object.keys(record),
      unmapped_fields: this.getUnmappedFields(record, this.headerFieldNames)
    };
  }

  /**
   * Parse item record - map to WCO goods_items schema
   */
  parseItemRecord(record, rowNumber) {
    const customs_value = this.parseFloat(this.getField(record, this.itemFieldNames.customs_value));
    const invoice_value =
      this.parseFloat(this.getField(record, this.itemFieldNames.invoice_value)) ||
      this.parseFloat(this.getField(record, this.itemFieldNames.item_price));
    const consignor = this.getField(record, this.itemFieldNames.consignor);
    const commodity_code = this.normalizeCommodityCode(
      this.getField(record, this.itemFieldNames.commodity_code)
    );

    return {
      id: uuidv4(),
      // Linking
      entry_identifier: this.getField(record, this.itemFieldNames.entry_identifier),
      declaration_mrn: this.getField(record, this.itemFieldNames.entry_identifier),
      
      // WCO goods item fields
      item_number: this.parseInt(this.getField(record, this.itemFieldNames.item_number)) || 1,
      commodity_code: commodity_code,
      goods_description: this.getField(record, this.itemFieldNames.goods_description),
      
      // Measurements
      gross_mass: this.parseFloat(this.getField(record, this.itemFieldNames.gross_mass)) || 0,
      net_mass: this.parseFloat(this.getField(record, this.itemFieldNames.net_mass)) || 0,
      quantity: this.parseFloat(this.getField(record, this.itemFieldNames.supplementary_units)) || 0,
      supplementary_units: this.parseFloat(this.getField(record, this.itemFieldNames.supplementary_units)) || 0,
      
      // Valuations
      invoice_value: invoice_value || 0,
      statistical_value: customs_value || 0,
      customs_value: customs_value || 0,
      invoice_currency: this.getField(record, this.itemFieldNames.invoice_currency) || 'GBP',
      
      // Origin & procedures
      origin_country: this.getField(record, this.itemFieldNames.origin_country),
      preferential_country: this.getField(record, this.itemFieldNames.preferential_country),
      procedure_code: this.getField(record, this.itemFieldNames.procedure_code) || '4000',
      
      // Parties
      consignor_name: consignor,
      consignor: consignor,
      
      // Additional
      location_of_goods: this.getField(record, this.itemFieldNames.location_of_goods),
      
      // Metadata
      raw_data: this.buildRawData(record, 'item', rowNumber, this.itemFieldNames),
      source_columns: Object.keys(record),
      unmapped_fields: this.getUnmappedFields(record, this.itemFieldNames)
    };
  }

  /**
   * Parse tax record(s) - HMRC format has multiple tax columns
   */
  parseTaxRecords(record, rowNumber) {
    const taxRecords = [];
    const entry_identifier = this.getField(record, this.taxFieldNames.entry_identifier);
    const item_number = this.parseInt(this.getField(record, this.taxFieldNames.item_number));
    const commodity_code = this.getField(record, this.taxFieldNames.commodity_code);
    const flatTaxType = this.getField(record, this.taxFieldNames.tax_type);
    const flatTaxAmount = this.parseFloat(this.getField(record, this.taxFieldNames.tax_amount));

    if (flatTaxType) {
      taxRecords.push({
        id: uuidv4(),
        entry_identifier,
        declaration_mrn: entry_identifier,
        item_number,
        commodity_code,
        tax_type_code: flatTaxType,
        tax_amount: flatTaxAmount,
        tax_base: this.getTaxBase(record, flatTaxType),
        tax_rate: this.parseFloat(this.getField(record, this.taxFieldNames.tax_rate)),
        calculation_method: this.getField(record, this.taxFieldNames.calculation_method) || 'TypeCode',
        tax_sequence: 1,
        raw_data: {
          record_type: 'tax',
          row_number: rowNumber,
          fields: { ...record }
        }
      });

      return taxRecords;
    }

    // Parse Tax Type 1-12 and corresponding amounts
    for (let i = 1; i <= 12; i++) {
      const taxTypeField = `Tax Type ${i}`;
      const taxAmountField = `Tax Amount ${i}`;
      const paymentMethodField = `Method of Payment ${i}`;
      const overrideField = `Override ${i}`;
      const stateAidField = `State Aid ${i}`;
      const securityAmountField = `Security Amount ${i}`;

      const tax_type = this.getField(record, [taxTypeField]);
      const tax_amount = this.parseFloat(this.getField(record, [taxAmountField]));

      if (tax_type) {
        taxRecords.push({
          id: uuidv4(),
          entry_identifier,
          declaration_mrn: entry_identifier, // For matching to declarations
          item_number,
          commodity_code,
          tax_type_code: tax_type,
          tax_amount,
          tax_base: this.getTaxBase(record, tax_type),
          payment_method: this.getField(record, [paymentMethodField]),
          override: this.getField(record, [overrideField]),
          state_aid: this.getField(record, [stateAidField]),
          security_amount: this.parseFloat(this.getField(record, [securityAmountField])),
          tax_sequence: i,
          raw_data: {
            record_type: 'tax',
            row_number: rowNumber,
            tax_type_field: taxTypeField,
            tax_amount_field: taxAmountField,
            fields: { ...record }
          }
        });
      }
    }

    return taxRecords;
  }

  buildCompleteCdsRecords(headerRecords, itemRecords, taxRecords) {
    if (!itemRecords.length) {
      return headerRecords.map((headerRecord, index) => {
        const entryIdentifier = this.getField(headerRecord, this.headerFieldNames.entry_identifier);
        return this.buildCompleteCdsRecord(headerRecord, null, null, index, entryIdentifier, 1);
      });
    }

    const headersByEntry = new Map();
    headerRecords.forEach((record, index) => {
      const entryIdentifier = this.getField(record, this.headerFieldNames.entry_identifier);
      if (entryIdentifier) headersByEntry.set(this.normalizeRecordKey(entryIdentifier), { record, index });
    });

    const taxesByEntryItem = new Map();
    taxRecords.forEach((record, index) => {
      const entryIdentifier = this.getField(record, this.taxFieldNames.entry_identifier);
      const itemNumber = this.parseInt(this.getField(record, this.taxFieldNames.item_number)) || 1;
      if (entryIdentifier) {
        taxesByEntryItem.set(this.normalizeEntryItemKey(entryIdentifier, itemNumber), { record, index });
      }
    });

    return itemRecords.map((itemRecord, index) => {
      const entryIdentifier = this.getField(itemRecord, this.itemFieldNames.entry_identifier);
      const itemNumber = this.parseInt(this.getField(itemRecord, this.itemFieldNames.item_number)) || 1;
      const matchedHeader = headersByEntry.get(this.normalizeRecordKey(entryIdentifier));
      const matchedTax = taxesByEntryItem.get(this.normalizeEntryItemKey(entryIdentifier, itemNumber));

      return this.buildCompleteCdsRecord(
        matchedHeader?.record || headerRecords[index] || null,
        itemRecord,
        matchedTax?.record || taxRecords[index] || null,
        index,
        entryIdentifier,
        itemNumber,
        {
          headerMatchedBy: matchedHeader ? 'entry_identifier' : 'row_index',
          taxMatchedBy: matchedTax ? 'entry_identifier_item_number' : 'row_index'
        }
      );
    });
  }

  buildCompleteCdsRecord(headerRecord, itemRecord, taxRecord, index, entryIdentifier, itemNumber, match = {}) {
    const headerEntry = this.getField(headerRecord || {}, this.headerFieldNames.entry_identifier);
    const itemEntry = this.getField(itemRecord || {}, this.itemFieldNames.entry_identifier);
    const taxEntry = this.getField(taxRecord || {}, this.taxFieldNames.entry_identifier);
    const resolvedEntry = entryIdentifier || itemEntry || taxEntry || headerEntry;
    const resolvedItemNumber = itemNumber || this.parseInt(this.getField(taxRecord || {}, this.taxFieldNames.item_number)) || 1;
    const taxLines = taxRecord ? this.parseTaxRecords(taxRecord, index + 2) : [];
    const commodityCode = this.normalizeCommodityCode(
      this.getField(itemRecord || taxRecord || {}, this.itemFieldNames.commodity_code)
    );

    return {
      record_type: 'cds_import_declaration_item',
      source: 'hmrc_cds_csv_merge',
      record_index: index + 1,
      record_key: `${resolvedEntry || `ROW_${index + 1}`}-${resolvedItemNumber}`,
      match,
      declaration_data_sources: {
        header: this.getField(headerRecord || {}, ['Declaration Data Source']),
        item: this.getField(itemRecord || {}, ['Declaration Data Source']),
        tax: this.getField(taxRecord || {}, ['Declaration Data Source'])
      },
      mrn: resolvedEntry,
      entry_identifier: resolvedEntry,
      item_number: resolvedItemNumber,
      ducr: this.getField(headerRecord || {}, this.headerFieldNames.ducr) ||
        this.getField(itemRecord || {}, ['DUCR', 'ducr']) ||
        this.getField(taxRecord || {}, ['DUCR', 'ducr']),
      trader_reference: this.getField(headerRecord || {}, this.headerFieldNames.trader_reference) ||
        this.getField(itemRecord || {}, ['Trader Reference', 'trader_reference']) ||
        this.getField(taxRecord || {}, ['Trader Reference', 'trader_reference']),
      declaration_category: this.getField(headerRecord || {}, ['Declaration Category']),
      declaration_type: this.getField(itemRecord || {}, ['Declaration Type']) ||
        this.getField(headerRecord || {}, ['Declaration Category']),
      acceptance_date: this.getField(headerRecord || {}, this.headerFieldNames.acceptance_date) ||
        this.getField(itemRecord || {}, this.itemFieldNames.acceptance_date || ['Acceptance Date']) ||
        this.getField(taxRecord || {}, ['Acceptance Date']),
      clearance_date: this.getField(headerRecord || {}, this.headerFieldNames.clearance_date) ||
        this.getField(itemRecord || {}, ['Clearance Date']) ||
        this.getField(taxRecord || {}, ['Clearance Date']),
      importer_eori: this.getField(headerRecord || {}, this.headerFieldNames.importer_eori) ||
        this.getField(itemRecord || {}, this.itemFieldNames.importer_eori || ['Importer EORI']) ||
        this.getField(taxRecord || {}, ['Importer EORI']),
      declarant_eori: this.getField(headerRecord || {}, this.headerFieldNames.declarant_eori) ||
        this.getField(itemRecord || {}, ['Declarant EORI']) ||
        this.getField(taxRecord || {}, ['Declarant EORI']),
      commodity_code: commodityCode,
      goods_description: this.getField(itemRecord || {}, this.itemFieldNames.goods_description),
      country_of_origin: this.getField(itemRecord || {}, this.itemFieldNames.origin_country) ||
        this.getField(taxRecord || {}, ['Country of Origin']),
      customs_value: this.parseFloat(this.getField(itemRecord || {}, this.itemFieldNames.customs_value) ||
        this.getField(taxRecord || {}, this.taxFieldNames.customs_value)),
      invoice_currency: this.getField(itemRecord || {}, this.itemFieldNames.invoice_currency) ||
        this.getField(headerRecord || {}, this.headerFieldNames.invoice_currency),
      item_price: this.parseFloat(this.getField(itemRecord || {}, ['Item Price'])),
      vat_value: this.parseFloat(this.getField(taxRecord || {}, this.taxFieldNames.vat_value) ||
        this.getField(itemRecord || {}, this.taxFieldNames.vat_value)),
      duty_paid: this.parseFloat(this.getField(taxRecord || {}, ['Duty Paid']) ||
        this.getField(itemRecord || {}, ['Duty Paid'])),
      vat_paid: this.parseFloat(this.getField(taxRecord || {}, this.taxFieldNames.vat_paid) ||
        this.getField(itemRecord || {}, this.taxFieldNames.vat_paid)),
      tax_lines: taxLines.map(taxLine => ({
        sequence: taxLine.tax_sequence,
        tax_type_code: taxLine.tax_type_code,
        type_code: this.normalizeTaxType(taxLine.tax_type_code),
        method_of_payment: taxLine.payment_method || '',
        tax_amount: taxLine.tax_amount || 0,
        tax_base: taxLine.tax_base || 0,
        override: taxLine.override || '',
        state_aid: taxLine.state_aid || '',
        security_amount: taxLine.security_amount || 0
      })),
      header: headerRecord || {},
      items: itemRecord ? [
        {
          raw: { ...itemRecord },
          item_number: resolvedItemNumber,
          commodity_code: commodityCode,
          commodity_code_display: this.getField(itemRecord, this.itemFieldNames.commodity_code),
          goods_description: this.getField(itemRecord, this.itemFieldNames.goods_description),
          cpc: this.getField(itemRecord, ['CPC', 'cpc']),
          country_of_origin: this.getField(itemRecord, this.itemFieldNames.origin_country),
          preferential_country_of_origin: this.getField(itemRecord, this.itemFieldNames.preferential_country),
          invoice_currency: this.getField(itemRecord, this.itemFieldNames.invoice_currency),
          item_price: this.parseFloat(this.getField(itemRecord, ['Item Price'])),
          customs_value: this.parseFloat(this.getField(itemRecord, this.itemFieldNames.customs_value)),
          vat_value: this.parseFloat(this.getField(itemRecord, this.taxFieldNames.vat_value)),
          duty_paid: this.parseFloat(this.getField(itemRecord, ['Duty Paid'])),
          vat_paid: this.parseFloat(this.getField(itemRecord, this.taxFieldNames.vat_paid)),
          net_mass: this.parseFloat(this.getField(itemRecord, this.itemFieldNames.net_mass)),
          gross_mass: this.parseFloat(this.getField(itemRecord, this.itemFieldNames.gross_mass)),
          location_of_goods: this.getField(itemRecord, this.itemFieldNames.location_of_goods),
          consignor: this.getField(itemRecord, this.itemFieldNames.consignor),
          tax: taxRecord || {},
          duties: taxLines
        }
      ] : [],
      totals: {
        header_customs_value: this.parseFloat(this.getField(headerRecord || {}, this.headerFieldNames.customs_value)),
        header_total_duty: this.parseFloat(this.getField(headerRecord || {}, this.headerFieldNames.total_duty)),
        header_total_vat_paid: this.parseFloat(this.getField(headerRecord || {}, this.headerFieldNames.total_vat_paid)),
        header_total_vat_value: this.parseFloat(this.getField(headerRecord || {}, [' Total VAT Value', 'Total VAT Value'])),
        item_customs_value: this.parseFloat(this.getField(itemRecord || {}, this.itemFieldNames.customs_value)),
        item_vat_value: this.parseFloat(this.getField(itemRecord || {}, this.taxFieldNames.vat_value)),
        item_duty_paid: this.parseFloat(this.getField(itemRecord || {}, ['Duty Paid'])),
        item_vat_paid: this.parseFloat(this.getField(itemRecord || {}, this.taxFieldNames.vat_paid)),
        tax_customs_value: this.parseFloat(this.getField(taxRecord || {}, this.taxFieldNames.customs_value)),
        tax_vat_value: this.parseFloat(this.getField(taxRecord || {}, this.taxFieldNames.vat_value)),
        tax_duty_paid: this.parseFloat(this.getField(taxRecord || {}, ['Duty Paid'])),
        tax_vat_paid: this.parseFloat(this.getField(taxRecord || {}, this.taxFieldNames.vat_paid))
      }
    };
  }

  normalizeRecordKey(value) {
    return String(value || '').trim().toUpperCase();
  }

  normalizeEntryItemKey(entryIdentifier, itemNumber) {
    return `${this.normalizeRecordKey(entryIdentifier)}::${this.parseInt(itemNumber) || 1}`;
  }

  normalizeTaxType(taxType) {
    const normalized = String(taxType || '').trim().toUpperCase();
    if (normalized === 'VAT' || normalized === 'B00') return 'VAT';
    return 'CustomsDuty';
  }

  getTaxBase(record, taxType) {
    const normalizedTaxType = this.normalizeTaxType(taxType);
    const vatValue = this.parseFloat(this.getField(record, this.taxFieldNames.vat_value));
    const customsValue = this.parseFloat(this.getField(record, this.taxFieldNames.customs_value));

    if (normalizedTaxType === 'VAT' && vatValue > 0) {
      return vatValue;
    }

    return customsValue || vatValue || 0;
  }

  /**
   * Get field value with multiple possible names
   */
  getField(record, possibleNames) {
    const normalizedRecord = this.getNormalizedRecord(record);
    for (const name of possibleNames) {
      const directValue = record[name];
      if (directValue !== undefined && directValue !== null && directValue !== '') {
        return directValue;
      }

      const normalizedValue = normalizedRecord.get(this.normalizeFieldName(name));
      if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
        return normalizedValue;
      }
    }
    return null;
  }

  /**
   * Preserve the complete source row while recording which fields were normalized.
   */
  buildRawData(record, recordType, rowNumber, fieldNames) {
    const recognizedFields = {};
    for (const [field, aliases] of Object.entries(fieldNames)) {
      const matchedColumn = this.findMatchedColumn(record, aliases);
      if (matchedColumn) {
        recognizedFields[field] = {
          source_column: matchedColumn,
          value: record[matchedColumn]
        };
      }
    }

    return {
      record_type: recordType,
      row_number: rowNumber,
      fields: { ...record },
      recognized_fields: recognizedFields,
      unmapped_fields: this.getUnmappedFields(record, fieldNames)
    };
  }

  getUnmappedFields(record, fieldNames) {
    const recognizedColumns = new Set();
    for (const aliases of Object.values(fieldNames)) {
      const matchedColumn = this.findMatchedColumn(record, aliases);
      if (matchedColumn) recognizedColumns.add(matchedColumn);
    }

    return Object.keys(record).filter((column) => !recognizedColumns.has(column));
  }

  findMatchedColumn(record, possibleNames) {
    const normalizedColumns = new Map();
    for (const column of Object.keys(record)) {
      normalizedColumns.set(this.normalizeFieldName(column), column);
    }

    for (const name of possibleNames) {
      if (Object.prototype.hasOwnProperty.call(record, name)) {
        return name;
      }

      const normalizedColumn = normalizedColumns.get(this.normalizeFieldName(name));
      if (normalizedColumn) {
        return normalizedColumn;
      }
    }

    return null;
  }

  getNormalizedRecord(record) {
    const normalizedRecord = new Map();
    for (const [key, value] of Object.entries(record)) {
      normalizedRecord.set(this.normalizeFieldName(key), value);
    }
    return normalizedRecord;
  }

  normalizeFieldName(name) {
    return String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Parse date safely - handles multiple formats
   */
  parseDate(value) {
    if (!value) return null;
    const dateStr = String(value).trim();
    
    // Try parsing as DD/MM/YYYY HH:MM:SS (HMRC format)
    const hmrcMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{1,2}):?(\d{2})?:?(\d{2})?/);
    if (hmrcMatch) {
      const [, day, month, year, hour, minute, second] = hmrcMatch;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour) || 0,
        parseInt(minute) || 0,
        parseInt(second) || 0
      ).toISOString().split('T')[0];
    }

    // Try ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split(' ')[0]; // Take just the date part
    }

    return null;
  }

  /**
   * Parse float safely
   */
  parseFloat(value) {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse int safely
   */
  parseInt(value) {
    if (value === null || value === undefined || value === '') return 1;
    const parsed = parseInt(String(value));
    return isNaN(parsed) ? 1 : parsed;
  }

  /**
   * Validate entry identifier format
   */
  isValidEntryIdentifier(id) {
    if (!id) return false;
    // Entry Identifier format: YYCC + 17 alphanumeric (e.g., 26GB516O2KZOJC5AR9)
    const entryRegex = /^\d{2}[A-Z]{2}[A-Z0-9]{15}$/i;
    return entryRegex.test(id);
  }

  /**
   * Validate MRN format (legacy, kept for compatibility)
   */
  isValidMRN(mrn) {
    if (!mrn) return false;
    // MRN format: YYGBxxxxxxxxxxxxxxxxx (2 digit year + GB + 15 alphanumeric)
    const mrnRegex = /^\d{2}GB[A-Z0-9]{15}$/i;
    return mrnRegex.test(mrn);
  }

  /**
   * Validate EORI format
   */
  isValidEORI(eori) {
    if (!eori) return false;
    // UK EORI: GB + 12 digits or GB + 15 alphanumeric
    const eoriRegex = /^GB\d{12}$|^GB[A-Z0-9]{15}$/i;
    return eoriRegex.test(eori);
  }

  /**
   * Validate commodity code
   */
  isValidCommodityCode(code) {
    if (!code) return false;
    // 10-digit HS code
    return /^\d{10}$/.test(this.normalizeCommodityCode(code));
  }

  normalizeCommodityCode(code) {
    if (!code) return code;
    return String(code).replace(/\D/g, '');
  }

  /**
   * Validate date format
   */
  isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
}
