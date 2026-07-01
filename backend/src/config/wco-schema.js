/**
 * WCO/CDS-Compliant Database Schema
 * 
 * This schema implements the full WCO declaration hierarchy as documented in:
 * - WCO_DEC_2_DMS.xsd (Declaration schema)
 * - WCO_RES_2_DMS.xsd (Response/Notification schema)
 * 
 * Key structures:
 * - Declaration header (function, type, declarant, submitter)
 * - Parties (declarant, consignor, consignee, representative)
 * - Goods Shipment (consignment, transport means, border transport)
 * - Goods Items (commodities, procedures, documents, duties)
 * - References (MRN, DUCR, UCR, MUCR, LRN)
 * - Events (notifications, status changes)
 */

export const WCO_SCHEMA = `
  -- ============================================
  -- DECLARATION HEADER & METADATA
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS declarations (
    id TEXT PRIMARY KEY,
    
    -- Core identifiers
    mrn TEXT UNIQUE,
    lrn TEXT,
    functional_reference_id TEXT,
    declaration_type TEXT NOT NULL,
    function_code TEXT NOT NULL,
    
    -- Declaration metadata
    status TEXT DEFAULT 'pending',
    version_number INTEGER DEFAULT 1,
    acceptance_date TEXT,
    received_date TEXT,
    
    -- Declarant & Submitter
    declarant_id TEXT,
    declarant_name TEXT,
    declarant_eori TEXT,
    submitter_eori TEXT,
    representative_eori TEXT,
    
    -- Additional identifiers (DUCR/UCR/MUCR hierarchy)
    ucr_id TEXT,
    ducr_id TEXT,
    mucr_id TEXT,
    consignment_reference TEXT,
    
    -- Declaration details
    procedure_code TEXT,
    previous_procedure_code TEXT,
    incoterm TEXT,
    contract_currency TEXT DEFAULT 'GBP',
    exchange_rate REAL,
    payment_terms TEXT,
    
    -- Location & Route
    goods_location_id TEXT,
    goods_location_type TEXT,
    border_office_id TEXT,
    port_of_entry TEXT,
    
    -- Declarant party details (denormalised for speed)
    trader_eori TEXT,
    importer_eori TEXT,
    exporter_eori TEXT,
    consignee_name TEXT,
    consignor_name TEXT,
    
    -- Totals
    total_items_count INTEGER DEFAULT 0,
    total_packages_count INTEGER DEFAULT 0,
    total_gross_mass REAL DEFAULT 0,
    total_net_mass REAL DEFAULT 0,
    
    -- Tax/Duty totals
    total_customs_duty REAL DEFAULT 0,
    total_vat REAL DEFAULT 0,
    total_excise REAL DEFAULT 0,
    total_other_tax REAL DEFAULT 0,
    total_tax_liability REAL DEFAULT 0,
    total_paid REAL DEFAULT 0,
    
    -- Process state
    roe_code TEXT,
    ics_code TEXT,
    irc_code TEXT,
    release_type TEXT,
    
    source TEXT DEFAULT 'csv',
    declaration_source TEXT DEFAULT 'csv',
    soe_code TEXT,
    last_updated_from_hmrc TEXT,
    batch_id TEXT,
    company_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE SET NULL
  );
  
  CREATE INDEX IF NOT EXISTS idx_declarations_mrn ON declarations(mrn);
  CREATE INDEX IF NOT EXISTS idx_declarations_lrn ON declarations(lrn);
  CREATE INDEX IF NOT EXISTS idx_declarations_ucr ON declarations(ucr_id);
  CREATE INDEX IF NOT EXISTS idx_declarations_ducr ON declarations(ducr_id);
  CREATE INDEX IF NOT EXISTS idx_declarations_company ON declarations(company_id);
  CREATE INDEX IF NOT EXISTS idx_declarations_user ON declarations(user_id);
  CREATE INDEX IF NOT EXISTS idx_declarations_status ON declarations(status);
  CREATE INDEX IF NOT EXISTS idx_declarations_created ON declarations(created_at);

  -- ============================================
  -- CONSIGNMENT & SHIPMENT HIERARCHY
  -- ============================================

  CREATE TABLE IF NOT EXISTS consignments (
    id TEXT PRIMARY KEY,
    declaration_id TEXT NOT NULL,
    
    -- Consignment identifiers
    consignment_ref_id TEXT,
    consignment_sequence TEXT,
    consignment_level_code TEXT,
    
    -- Transport information
    transport_means_id TEXT,
    transport_means_type TEXT,
    transport_nationality TEXT,
    
    -- Movement information
    movement_reference_number TEXT,
    arrival_date TEXT,
    container_mode INTEGER,
    
    -- Location
    loading_location_id TEXT,
    unloading_location_id TEXT,
    delivery_location_id TEXT,
    
    -- Border transport
    border_transport_means_id TEXT,
    border_transport_type TEXT,
    border_crossing_date TEXT,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_consignments_declaration ON consignments(declaration_id);

  -- ============================================
  -- GOODS SHIPMENT & ITEMS
  -- ============================================

  CREATE TABLE IF NOT EXISTS goods_items (
    id TEXT PRIMARY KEY,
    declaration_id TEXT NOT NULL,
    consignment_id TEXT,
    
    item_number INTEGER NOT NULL,
    sequence_number TEXT,
    
    -- Commodity coding
    commodity_code TEXT,
    commodity_code_version TEXT,
    commodity_description TEXT,
    commodity_supplementary_unit TEXT,
    
    -- Classification (multiple)
    classification_id TEXT,
    
    -- Goods description
    goods_description TEXT,
    marks_and_numbers TEXT,
    
    -- Quantities & Weights
    gross_mass REAL DEFAULT 0,
    net_mass REAL DEFAULT 0,
    statutory_quantity REAL DEFAULT 0,
    statistical_value REAL DEFAULT 0,
    invoice_value REAL DEFAULT 0,
    
    -- Origin & Destination
    country_of_origin TEXT,
    country_of_dispatch TEXT,
    country_of_final_destination TEXT,
    
    -- Procedures
    procedure_code TEXT,
    previous_procedure_code TEXT,
    government_procedure_code TEXT,
    
    -- Warehouse & Location
    warehouse_id TEXT,
    warehouse_type TEXT,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE,
    FOREIGN KEY (consignment_id) REFERENCES consignments(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_goods_items_declaration ON goods_items(declaration_id);
  CREATE INDEX IF NOT EXISTS idx_goods_items_commodity ON goods_items(commodity_code);
  CREATE INDEX IF NOT EXISTS idx_goods_items_item_number ON goods_items(declaration_id, item_number);

  -- ============================================
  -- DUTIES, TAXES & FEES
  -- ============================================

  CREATE TABLE IF NOT EXISTS duty_tax_fees (
    id TEXT PRIMARY KEY,
    goods_item_id TEXT NOT NULL,
    
    type_code TEXT NOT NULL,
    tax_type TEXT,
    calculation_method TEXT,
    
    tax_base REAL DEFAULT 0,
    tax_base_type TEXT,
    rate_numeric REAL DEFAULT 0,
    rate_numeric_type TEXT,
    rate_code TEXT,
    
    tax_amount REAL DEFAULT 0,
    relief_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'not_assessed',
    
    -- Payment deferment
    deferment_status TEXT,
    deferment_type_code TEXT,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (goods_item_id) REFERENCES goods_items(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_duty_tax_fees_item ON duty_tax_fees(goods_item_id);
  CREATE INDEX IF NOT EXISTS idx_duty_tax_fees_type ON duty_tax_fees(type_code);

  -- ============================================
  -- GOVERNMENT PROCEDURES & CONTROLS
  -- ============================================

  CREATE TABLE IF NOT EXISTS government_procedures (
    id TEXT PRIMARY KEY,
    goods_item_id TEXT NOT NULL,
    
    procedure_code TEXT NOT NULL,
    procedure_type TEXT,
    additional_procedure_code TEXT,
    
    sequence_number TEXT,
    status_code TEXT,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (goods_item_id) REFERENCES goods_items(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_government_procedures_item ON government_procedures(goods_item_id);

  -- ============================================
  -- DOCUMENTS & REFERENCES
  -- ============================================

  CREATE TABLE IF NOT EXISTS additional_documents (
    id TEXT PRIMARY KEY,
    goods_item_id TEXT,
    declaration_id TEXT,
    
    document_code TEXT NOT NULL,
    document_identifier TEXT,
    document_status TEXT,
    document_status_reason_code TEXT,
    
    document_name TEXT,
    document_reference TEXT,
    document_version TEXT,
    
    issuing_authority TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    
    status TEXT DEFAULT 'submitted',
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (goods_item_id) REFERENCES goods_items(id) ON DELETE CASCADE,
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_additional_documents_item ON additional_documents(goods_item_id);
  CREATE INDEX IF NOT EXISTS idx_additional_documents_declaration ON additional_documents(declaration_id);

  CREATE TABLE IF NOT EXISTS previous_documents (
    id TEXT PRIMARY KEY,
    goods_item_id TEXT,
    declaration_id TEXT,
    
    category_code TEXT NOT NULL,
    reference TEXT NOT NULL,
    
    type_code TEXT,
    line_number TEXT,
    
    goods_item_identifier TEXT,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (goods_item_id) REFERENCES goods_items(id) ON DELETE CASCADE,
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_previous_documents_reference ON previous_documents(reference);

  -- ============================================
  -- PARTIES (Declarant, Consignor, Consignee, etc)
  -- ============================================

  CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    declaration_id TEXT NOT NULL,
    
    party_role_code TEXT NOT NULL,
    party_type TEXT,
    
    name TEXT,
    eori TEXT,
    ucc_id TEXT,
    
    -- Address
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    postal_code TEXT,
    country_code TEXT,
    
    -- Contact
    phone TEXT,
    email TEXT,
    fax TEXT,
    
    -- Identification
    identification_number TEXT,
    identification_type TEXT,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_parties_declaration ON parties(declaration_id);
  CREATE INDEX IF NOT EXISTS idx_parties_role ON parties(party_role_code);
  CREATE INDEX IF NOT EXISTS idx_parties_eori ON parties(eori);

  -- ============================================
  -- DECLARATION VERSIONS & HISTORY
  -- ============================================

  CREATE TABLE IF NOT EXISTS declaration_versions (
    id TEXT PRIMARY KEY,
    declaration_id TEXT NOT NULL,
    
    version_number INTEGER NOT NULL,
    version_date TEXT,
    
    mrn TEXT,
    lrn TEXT,
    functional_reference_id TEXT,
    
    -- Version source
    source TEXT,
    change_description TEXT,
    
    -- Full declaration snapshot (JSON)
    snapshot_data TEXT,
    snapshot_before TEXT,
    snapshot_after TEXT,
    
    company_id TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_declaration_versions_declaration ON declaration_versions(declaration_id);
  CREATE INDEX IF NOT EXISTS idx_declaration_versions_mrn ON declaration_versions(mrn);

  -- ============================================
  -- CDS LIFECYCLE EVENTS & NOTIFICATIONS
  -- ============================================

  CREATE TABLE IF NOT EXISTS cds_events (
    id TEXT PRIMARY KEY,
    declaration_id TEXT,
    mrn TEXT,
    
    event_type TEXT NOT NULL,
    event_code TEXT,
    event_datetime TEXT NOT NULL,
    
    -- Event details
    function_code TEXT,
    status_code TEXT,
    status_reason_code TEXT,
    
    -- Notification reference
    conversation_id TEXT,
    message_id TEXT,
    
    -- Payload & Validation
    raw_payload TEXT,
    parsed_payload TEXT,
    validation_errors TEXT,
    
    -- Field-level pointers (for validation errors)
    error_pointers TEXT,
    
    -- Processing
    processed BOOLEAN DEFAULT 0,
    processed_at TEXT,
    
    source TEXT DEFAULT 'hmrc_notification',
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_cds_events_declaration ON cds_events(declaration_id);
  CREATE INDEX IF NOT EXISTS idx_cds_events_mrn ON cds_events(mrn);
  CREATE INDEX IF NOT EXISTS idx_cds_events_type ON cds_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_cds_events_conversation ON cds_events(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_cds_events_datetime ON cds_events(event_datetime);

  -- ============================================
  -- NOTIFICATION PULL QUEUE
  -- ============================================

  CREATE TABLE IF NOT EXISTS notification_queue (
    id TEXT PRIMARY KEY,
    declaration_id TEXT,
    
    conversation_id TEXT NOT NULL,
    message_id TEXT,
    message_type TEXT,
    
    received_datetime TEXT,
    
    -- Processing state
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_retry_at TEXT,
    
    -- Payload
    payload TEXT,
    
    -- Metadata
    expires_at TEXT,
    ttl_days INTEGER DEFAULT 14,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
  CREATE INDEX IF NOT EXISTS idx_notification_queue_conversation ON notification_queue(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_notification_queue_expires ON notification_queue(expires_at);

  -- ============================================
  -- IMPORT BATCHES & ERROR TRACKING
  -- ============================================

  CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    
    filename TEXT,
    batch_type TEXT,
    
    total_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    declarations INTEGER DEFAULT 0,
    items INTEGER DEFAULT 0,
    tax_lines INTEGER DEFAULT 0,
    
    status TEXT DEFAULT 'processing',
    
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_import_batches_company ON import_batches(company_id);
  CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);

  CREATE TABLE IF NOT EXISTS cds_complete_records (
    id TEXT PRIMARY KEY,
    batch_id TEXT,
    record_key TEXT NOT NULL,
    record_index INTEGER,
    mrn TEXT,
    entry_identifier TEXT,
    item_number INTEGER,

    header_declaration_data_source TEXT,
    item_declaration_data_source TEXT,
    tax_declaration_data_source TEXT,
    declaration_category TEXT,
    declaration_type TEXT,

    importer_eori TEXT,
    declarant_eori TEXT,
    entry_date TEXT,
    acceptance_date TEXT,
    clearance_date TEXT,
    trader_reference TEXT,
    declarant_representative TEXT,
    ducr TEXT,

    item_count INTEGER,
    total_packages INTEGER,
    transport_country TEXT,
    transport_mode TEXT,
    customs_value REAL,
    total_duty REAL,
    total_vat_paid REAL,
    total_vat_value REAL,
    invoice_currency TEXT,
    invoice_total REAL,
    invoice_total_gbp REAL,
    air_transport_cost_adjustment REAL,
    vat_adjustment_currency TEXT,
    vat_value_adjustment REAL,
    insurance_cost_adjustment REAL,
    previous_document_cle_references TEXT,
    previous_document_cle_classes TEXT,
    previous_document_dcr_references TEXT,
    previous_document_dcr_classes TEXT,
    previous_document_703_references TEXT,
    previous_document_703_classes TEXT,
    transport_cost_adjustment REAL,
    submitters_reference_number TEXT,

    consignor TEXT,
    country_of_dispatch TEXT,
    location_of_goods TEXT,
    commodity_code TEXT,
    cpc TEXT,
    additional_special_procedure_codes TEXT,
    country_of_origin TEXT,
    item_price REAL,
    duty_paid REAL,
    vat_value REAL,
    vat_paid REAL,
    vat_postponed REAL,
    net_mass REAL,
    gross_mass REAL,
    preference TEXT,
    goods_description TEXT,
    valuation_method TEXT,
    agent_code TEXT,
    all_item_document_references TEXT,
    all_item_document_codes TEXT,
    additional_information TEXT,

    document_references TEXT,
    tax_type_1 TEXT,
    tax_amount_1 REAL,
    tax_type_2 TEXT,
    tax_amount_2 REAL,

    audit_status TEXT DEFAULT 'unchecked',
    audit_flags_json TEXT,
    calculated_vat_base REAL DEFAULT 0,
    declared_vat_value REAL DEFAULT 0,
    suffered_duty_rate REAL DEFAULT 0,
    expected_duty_rate REAL DEFAULT 0,
    expected_duty REAL DEFAULT 0,
    duty_variance REAL DEFAULT 0,
    human_review_status TEXT DEFAULT 'pending_review',
    allocation_status TEXT,
    original_record_json TEXT,
    adjusted_record_json TEXT,
    audit_updated_at TEXT,

    record_json TEXT NOT NULL,
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_cds_complete_records_batch ON cds_complete_records(batch_id);
  CREATE INDEX IF NOT EXISTS idx_cds_complete_records_mrn ON cds_complete_records(mrn);
  CREATE INDEX IF NOT EXISTS idx_cds_complete_records_entry_item ON cds_complete_records(entry_identifier, item_number);

  CREATE TABLE IF NOT EXISTS import_errors (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    
    row_number INTEGER,
    record_type TEXT,
    error_type TEXT,
    
    error_code TEXT,
    error_message TEXT,
    error_context TEXT,
    
    raw_data TEXT,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_import_errors_batch ON import_errors(batch_id);

  -- ============================================
  -- VALIDATION & AUDIT TRAIL
  -- ============================================

  CREATE TABLE IF NOT EXISTS validation_results (
    id TEXT PRIMARY KEY,
    declaration_id TEXT,
    
    validation_type TEXT,
    validation_schema TEXT,
    
    passed BOOLEAN,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    
    error_details TEXT,
    
    validated_at TEXT,
    
    company_id TEXT NOT NULL,
    
    FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_validation_results_declaration ON validation_results(declaration_id);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    
    action TEXT NOT NULL,
    changes TEXT,
    
    performed_by TEXT,
    ip_address TEXT,
    
    company_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
`;

export default WCO_SCHEMA;
