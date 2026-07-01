import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ensureDirectory, getDataRoot } from './storage-paths.js';
import WCO_SCHEMA from './wco-schema.js';

// Cache of tenant database connections
const tenantDbCache = new Map();

// Get tenant database directory
function getTenantDbDir() {
  return ensureDirectory(path.join(getDataRoot(), 'tenants'));
}

// Create reference tables that link to auth database
function createSharedReferenceSchema(companyId) {
  return `
    -- Companies reference (from auth database)
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      database_name TEXT UNIQUE NOT NULL,
      subscription_plan TEXT DEFAULT 'free',
      max_users INTEGER DEFAULT 5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    );

    -- Tenants table for multi-tenancy reference
    CREATE TABLE IF NOT EXISTS tenants (
      company_id TEXT PRIMARY KEY,
      database_name TEXT NOT NULL,
      initialized_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO companies (id, name, slug, database_name)
    VALUES ('${companyId}', 'Company ${companyId}', '${companyId}', 'tenant_${companyId}');

    INSERT OR IGNORE INTO tenants (company_id, database_name) VALUES ('${companyId}', 'tenant_${companyId}');
  `;
}

// Legacy backward compatibility schema
function createLegacySchema() {
  return `
    -- Users table (tenant-specific user settings)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- HMRC Credentials (per tenant)
    CREATE TABLE IF NOT EXISTS user_hmrc_credentials (
      user_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_secret TEXT NOT NULL,
      environment TEXT DEFAULT 'sandbox',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- HMRC Tokens
    CREATE TABLE IF NOT EXISTS hmrc_tokens (
      user_id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      token_type TEXT DEFAULT 'bearer',
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Clients (legacy)
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      eori TEXT,
      vat_number TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Claims (legacy)
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      declaration_id TEXT,
      claim_type TEXT,
      claim_amount REAL,
      status TEXT DEFAULT 'draft',
      submitted_date TEXT,
      approved_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (declaration_id) REFERENCES declarations(id)
    );

    -- Company Settings
    CREATE TABLE IF NOT EXISTS company_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_claims_client ON claims(client_id);
    CREATE INDEX IF NOT EXISTS idx_claims_declaration ON claims(declaration_id);
  `;
}

// Create new tenant database with WCO/CDS-compliant schema
export function createTenantDatabase(companyId) {
  const dbDir = getTenantDbDir();
  const dbPath = path.join(dbDir, `tenant_${companyId}.db`);

  console.log(`📦 Creating WCO/CDS-compliant tenant database: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // 1. Create reference tables
  const refSchema = createSharedReferenceSchema(companyId);
  db.exec(refSchema);
  
  // 2. Create WCO/CDS schema with company_id references
  const wcoSchema = WCO_SCHEMA.replace(/company_id TEXT NOT NULL/g, `company_id TEXT NOT NULL DEFAULT '${companyId}'`);
  db.exec(wcoSchema);
  
  // 3. Create legacy/compatibility tables
  const legacySchema = createLegacySchema();
  db.exec(legacySchema);

  // 4. Create views for common queries
  const views = `
    -- Declaration summary view (for dashboards)
    CREATE VIEW IF NOT EXISTS v_declaration_summary AS
    SELECT
      d.id,
      d.mrn,
      d.lrn,
      d.ucr_id,
      d.ducr_id,
      d.declaration_type,
      d.status,
      d.total_items_count,
      d.total_tax_liability,
      d.total_paid,
      COUNT(DISTINCT gi.id) as actual_item_count,
      SUM(dtf.tax_amount) as calculated_tax_amount,
      d.created_at,
      d.updated_at
    FROM declarations d
    LEFT JOIN goods_items gi ON d.id = gi.declaration_id
    LEFT JOIN duty_tax_fees dtf ON gi.id = dtf.goods_item_id
    GROUP BY d.id;

    -- Event timeline view
    CREATE VIEW IF NOT EXISTS v_event_timeline AS
    SELECT
      ce.id,
      ce.declaration_id,
      ce.mrn,
      ce.event_type,
      ce.event_code,
      ce.event_datetime,
      ce.status_code,
      d.declaration_type,
      d.status
    FROM cds_events ce
    LEFT JOIN declarations d ON ce.declaration_id = d.id
    ORDER BY ce.event_datetime DESC;

    -- Outstanding duties view (for claims)
    CREATE VIEW IF NOT EXISTS v_outstanding_duties AS
    SELECT
      d.id as declaration_id,
      d.mrn,
      d.declaration_type,
      gi.item_number,
      gi.commodity_code,
      SUM(CASE WHEN dtf.type_code IN ('CustomsDuty', 'VAT') THEN dtf.tax_amount - COALESCE(dtf.paid_amount, 0) ELSE 0 END) as outstanding_amount,
      SUM(CASE WHEN dtf.type_code = 'CustomsDuty' THEN dtf.tax_amount - COALESCE(dtf.paid_amount, 0) ELSE 0 END) as outstanding_duty,
      SUM(CASE WHEN dtf.type_code = 'VAT' THEN dtf.tax_amount - COALESCE(dtf.paid_amount, 0) ELSE 0 END) as outstanding_vat
    FROM declarations d
    JOIN goods_items gi ON d.id = gi.declaration_id
    JOIN duty_tax_fees dtf ON gi.id = dtf.goods_item_id
    WHERE d.status NOT IN ('cancelled', 'withdrawn')
    GROUP BY d.id, gi.item_number;
  `;
  
  db.exec(views);
  
  console.log(`✅ WCO/CDS-compliant tenant database created: tenant_${companyId}.db`);
  console.log(`📊 Initialized with core tables: declarations, goods_items, duty_tax_fees, cds_events, and more`);

  return db;
}

// Run schema migrations to ensure database is up to date
function runSchemaMigrations(db, companyId) {
  try {
    const addColumnIfMissing = (tableName, columns, columnName, definition) => {
      if (!columns.includes(columnName)) {
        console.log(`🔧 Migrating ${tableName}: adding ${columnName} column`);
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
        columns.push(columnName);
      }
    };

    // Check and fix import_batches table
    const batchesInfo = db.prepare("PRAGMA table_info(import_batches)").all();
    const batchesColumns = batchesInfo.map(col => col.name);
    
    if (batchesColumns.length > 0 && !batchesColumns.includes('total_records') && batchesColumns.includes('record_count')) {
      console.log('🔧 Migrating import_batches: renaming record_count → total_records');
      db.exec(`ALTER TABLE import_batches RENAME COLUMN record_count TO total_records;`);
      batchesColumns.push('total_records');
    }
    
    if (batchesColumns.length > 0 && !batchesColumns.includes('company_id')) {
      console.log('🔧 Migrating import_batches: adding company_id column');
      db.exec(`ALTER TABLE import_batches ADD COLUMN company_id TEXT NOT NULL DEFAULT '${companyId}';`);
      batchesColumns.push('company_id');
    }

    // Check and fix import_errors table
    const errorsInfo = db.prepare("PRAGMA table_info(import_errors)").all();
    const errorsColumns = errorsInfo.map(col => col.name);
    
    if (errorsColumns.length > 0 && !errorsColumns.includes('company_id')) {
      console.log('🔧 Migrating import_errors: adding company_id column');
      db.exec(`ALTER TABLE import_errors ADD COLUMN company_id TEXT NOT NULL DEFAULT '${companyId}';`);
      errorsColumns.push('company_id');
    }

    // Check and fix declarations table
    const declarationsInfo = db.prepare("PRAGMA table_info(declarations)").all();
    const declarationsColumns = declarationsInfo.map(col => col.name);

    addColumnIfMissing('declarations', declarationsColumns, 'total_tax_liability', 'REAL DEFAULT 0');
    addColumnIfMissing('declarations', declarationsColumns, 'total_paid', 'REAL DEFAULT 0');
    addColumnIfMissing('declarations', declarationsColumns, 'company_id', `TEXT NOT NULL DEFAULT '${companyId}'`);
    addColumnIfMissing('declarations', declarationsColumns, 'user_id', "TEXT NOT NULL DEFAULT 'system'");
    addColumnIfMissing('declarations', declarationsColumns, 'lrn', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'functional_reference_id', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'function_code', "TEXT NOT NULL DEFAULT '09'");
    addColumnIfMissing('declarations', declarationsColumns, 'ucr_id', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'ducr_id', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'mucr_id', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'declarant_name', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'trader_eori', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'total_items_count', 'INTEGER DEFAULT 0');
    addColumnIfMissing('declarations', declarationsColumns, 'total_customs_duty', 'REAL DEFAULT 0');
    addColumnIfMissing('declarations', declarationsColumns, 'total_excise', 'REAL DEFAULT 0');
    addColumnIfMissing('declarations', declarationsColumns, 'total_other_tax', 'REAL DEFAULT 0');
    addColumnIfMissing('declarations', declarationsColumns, 'source', "TEXT DEFAULT 'csv'");
    addColumnIfMissing('declarations', declarationsColumns, 'declaration_source', "TEXT DEFAULT 'csv'");
    addColumnIfMissing('declarations', declarationsColumns, 'last_updated_from_hmrc', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'soe_code', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'roe_code', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'batch_id', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'client_id', 'TEXT');
    addColumnIfMissing('declarations', declarationsColumns, 'client_name', 'TEXT');

    db.exec(createSharedReferenceSchema(companyId));

    const wcoSchema = WCO_SCHEMA.replace(/company_id TEXT NOT NULL/g, `company_id TEXT NOT NULL DEFAULT '${companyId}'`);
    db.exec(wcoSchema);

    // Check and fix goods_items table
    const goodsItemsInfo = db.prepare("PRAGMA table_info(goods_items)").all();
    const goodsItemsColumns = goodsItemsInfo.map(col => col.name);
    
    if (!goodsItemsColumns.includes('company_id')) {
      console.log('🔧 Migrating goods_items: adding company_id column');
      db.exec(`ALTER TABLE goods_items ADD COLUMN company_id TEXT NOT NULL DEFAULT '${companyId}';`);
    }

    // Check and fix declaration_versions table
    const versionsInfo = db.prepare("PRAGMA table_info(declaration_versions)").all();
    const versionsColumns = versionsInfo.map(col => col.name);

    addColumnIfMissing('declaration_versions', versionsColumns, 'company_id', `TEXT NOT NULL DEFAULT '${companyId}'`);
    addColumnIfMissing('declaration_versions', versionsColumns, 'snapshot_before', 'TEXT');
    addColumnIfMissing('declaration_versions', versionsColumns, 'snapshot_after', 'TEXT');

    // Check and fix import_batches table after WCO schema creation
    const migratedBatchesInfo = db.prepare("PRAGMA table_info(import_batches)").all();
    const migratedBatchesColumns = migratedBatchesInfo.map(col => col.name);

    addColumnIfMissing('import_batches', migratedBatchesColumns, 'warning_count', 'INTEGER DEFAULT 0');
    addColumnIfMissing('import_batches', migratedBatchesColumns, 'declarations', 'INTEGER DEFAULT 0');
    addColumnIfMissing('import_batches', migratedBatchesColumns, 'items', 'INTEGER DEFAULT 0');
    addColumnIfMissing('import_batches', migratedBatchesColumns, 'tax_lines', 'INTEGER DEFAULT 0');

    // Check and fix import_errors table after WCO schema creation
    const migratedErrorsInfo = db.prepare("PRAGMA table_info(import_errors)").all();
    const migratedErrorsColumns = migratedErrorsInfo.map(col => col.name);

    addColumnIfMissing('import_errors', migratedErrorsColumns, 'error_type', 'TEXT');

    // Check and fix stitched CDS complete records table
    const cdsRecordsInfo = db.prepare("PRAGMA table_info(cds_complete_records)").all();
    const cdsRecordColumns = cdsRecordsInfo.map(col => col.name);

    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'audit_status', "TEXT DEFAULT 'unchecked'");
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'audit_flags_json', 'TEXT');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'calculated_vat_base', 'REAL DEFAULT 0');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'declared_vat_value', 'REAL DEFAULT 0');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'suffered_duty_rate', 'REAL DEFAULT 0');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'expected_duty_rate', 'REAL DEFAULT 0');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'expected_duty', 'REAL DEFAULT 0');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'duty_variance', 'REAL DEFAULT 0');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'human_review_status', "TEXT DEFAULT 'pending_review'");
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'allocation_status', 'TEXT');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'original_record_json', 'TEXT');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'adjusted_record_json', 'TEXT');
    addColumnIfMissing('cds_complete_records', cdsRecordColumns, 'audit_updated_at', 'TEXT');

    // Check and fix duty_tax_fees table
    const dutyInfo = db.prepare("PRAGMA table_info(duty_tax_fees)").all();
    const dutyColumns = dutyInfo.map(col => col.name);
    
    if (!dutyColumns.includes('company_id')) {
      console.log('🔧 Migrating duty_tax_fees: adding company_id column');
      db.exec(`ALTER TABLE duty_tax_fees ADD COLUMN company_id TEXT NOT NULL DEFAULT '${companyId}';`);
    }

    console.log('✅ Schema migrations completed successfully');
  } catch (err) {
    console.error('⚠️  Schema migration error (may already be migrated):', err.message);
  }
}

// Create tenant schema (from existing database.js)
export function getTenantDatabase(companyId) {
  if (!companyId) {
    throw new Error('Company ID is required to access tenant database');
  }

  // Check cache first
  if (tenantDbCache.has(companyId)) {
    return tenantDbCache.get(companyId);
  }

  const dbDir = getTenantDbDir();
  const dbPath = path.join(dbDir, `tenant_${companyId}.db`);

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Tenant database not found for company: ${companyId}`);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema migrations to ensure compatibility
  runSchemaMigrations(db, companyId);

  // Cache connection
  tenantDbCache.set(companyId, db);

  return db;
}

// Close all tenant database connections
export function closeAllTenantDatabases() {
  for (const [companyId, db] of tenantDbCache.entries()) {
    try {
      db.close();
      console.log(`Closed tenant database: ${companyId}`);
    } catch (err) {
      console.error(`Error closing tenant database ${companyId}:`, err);
    }
  }
  tenantDbCache.clear();
}

// List all tenant databases
export function listTenantDatabases() {
  const dbDir = getTenantDbDir();
  const files = fs.readdirSync(dbDir);
  return files
    .filter(f => f.startsWith('tenant_') && f.endsWith('.db'))
    .map(f => f.replace('tenant_', '').replace('.db', ''));
}
