import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { storage } from './database.js';
import { createTenantDatabase, getTenantDatabase } from './tenant-database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEMO_SEED_PATH = path.resolve(__dirname, '..', '..', 'demo', 'demo-seed.json');
const SALT_ROUNDS = 10;

function loadDemoSeed() {
  return JSON.parse(fs.readFileSync(DEMO_SEED_PATH, 'utf8'));
}

function rowExists(db, table, id) {
  return !!db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
}

function upsertTenantRow(db, table, row) {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');

  db.prepare(`
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updates}
  `).run(...columns.map((column) => row[column]));
}

function ensureTenantSchema(db) {
  const statements = [
    'ALTER TABLE declarations ADD COLUMN entry_number TEXT',
    'ALTER TABLE declarations ADD COLUMN trader_eori TEXT',
    'ALTER TABLE declarations ADD COLUMN consignee_name TEXT',
    'ALTER TABLE declarations ADD COLUMN consignor_name TEXT',
    'ALTER TABLE declarations ADD COLUMN incoterm TEXT',
    'ALTER TABLE declarations ADD COLUMN procedure_code TEXT',
    'ALTER TABLE declarations ADD COLUMN previous_procedure_code TEXT',
    'ALTER TABLE declarations ADD COLUMN soe_code TEXT',
    'ALTER TABLE declarations ADD COLUMN roe_code TEXT',
    'ALTER TABLE declarations ADD COLUMN total_duty_paid REAL DEFAULT 0',
    'ALTER TABLE declarations ADD COLUMN total_vat_paid REAL DEFAULT 0',
    'ALTER TABLE declarations ADD COLUMN total_excise_paid REAL DEFAULT 0',
    'ALTER TABLE declarations ADD COLUMN total_taxes_paid REAL DEFAULT 0',
    'ALTER TABLE declarations ADD COLUMN declaration_source TEXT DEFAULT "csv"',
    'ALTER TABLE declarations ADD COLUMN last_updated_from_hmrc TEXT',
    'ALTER TABLE item_taxes ADD COLUMN tax_base REAL',
    'ALTER TABLE item_taxes ADD COLUMN calculation_method TEXT'
  ];

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error) {
      if (!String(error.message).includes('duplicate column name')) {
        throw error;
      }
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS declaration_versions (
      id TEXT PRIMARY KEY,
      declaration_id TEXT NOT NULL,
      mrn TEXT,
      version_number INTEGER,
      source TEXT,
      snapshot_before TEXT,
      snapshot_after TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS declaration_events (
      id TEXT PRIMARY KEY,
      declaration_id TEXT,
      mrn TEXT,
      event_type TEXT,
      source TEXT,
      payload TEXT,
      received_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedTenantData(seed) {
  let db;
  try {
    db = getTenantDatabase(seed.company.id);
  } catch {
    db = createTenantDatabase(seed.company.id);
  }

  ensureTenantSchema(db);

  const now = new Date().toISOString();
  upsertTenantRow(db, 'users', {
    id: seed.user.id,
    email: seed.user.email,
    name: `${seed.user.first_name} ${seed.user.last_name}`,
    role: seed.user.role,
    created_at: now
  });

  for (const client of seed.clients) {
    upsertTenantRow(db, 'clients', {
      ...client,
      created_at: now,
      updated_at: now
    });
  }

  for (const declaration of seed.declarations) {
    upsertTenantRow(db, 'declarations', {
      id: declaration.id,
      mrn: declaration.mrn,
      declarant_eori: declaration.trader_eori,
      importer_eori: declaration.importer_eori,
      declaration_type: declaration.declaration_type,
      acceptance_date: declaration.acceptance_date,
      total_packages: null,
      total_gross_mass: null,
      total_duty: declaration.total_duty_paid,
      total_vat: declaration.total_vat_paid,
      currency: 'GBP',
      status: declaration.status,
      client_id: declaration.client_id,
      client_name: declaration.client_name,
      batch_id: 'demo-seed',
      source: declaration.declaration_source,
      entry_number: declaration.entry_number,
      trader_eori: declaration.trader_eori,
      consignee_name: declaration.consignee_name,
      consignor_name: declaration.consignor_name,
      incoterm: declaration.incoterm,
      procedure_code: declaration.procedure_code,
      previous_procedure_code: declaration.previous_procedure_code,
      soe_code: declaration.soe_code,
      roe_code: declaration.roe_code,
      total_duty_paid: declaration.total_duty_paid,
      total_vat_paid: declaration.total_vat_paid,
      total_excise_paid: declaration.total_excise_paid,
      total_taxes_paid: declaration.total_duty_paid + declaration.total_vat_paid + declaration.total_excise_paid,
      declaration_source: declaration.declaration_source,
      last_updated_from_hmrc: declaration.last_updated_from_hmrc || null,
      created_at: now,
      updated_at: now
    });
  }

  for (const item of seed.items) {
    upsertTenantRow(db, 'declaration_items', {
      id: item.id,
      declaration_id: item.declaration_id,
      item_number: item.item_number,
      commodity_code: item.commodity_code,
      description: item.description,
      quantity: item.quantity,
      net_mass: item.net_mass,
      gross_mass: item.gross_mass,
      statistical_value: item.invoice_value,
      origin_country: item.origin_country,
      procedure_code: item.procedure_code
    });
  }

  for (const tax of seed.taxes) {
    upsertTenantRow(db, 'item_taxes', {
      id: tax.id,
      item_id: tax.item_id,
      tax_type: tax.tax_type,
      tax_base: tax.tax_base,
      tax_rate: tax.tax_rate,
      tax_amount: tax.tax_amount,
      calculation_method: tax.calculation_method
    });
  }

  for (const version of seed.versions) {
    const declaration = seed.declarations.find((item) => item.id === version.declaration_id);
    upsertTenantRow(db, 'declaration_versions', {
      ...version,
      snapshot_before: version.snapshot_before ? JSON.stringify(version.snapshot_before) : null,
      snapshot_after: JSON.stringify(declaration || {}),
      created_at: now
    });
  }

  for (const event of seed.events) {
    upsertTenantRow(db, 'declaration_events', {
      ...event,
      payload: JSON.stringify(event.payload),
      created_at: now
    });
  }

  for (const claim of seed.claims) {
    upsertTenantRow(db, 'claims', {
      id: claim.id,
      client_id: claim.client_id,
      declaration_id: claim.declaration_id,
      claim_type: claim.reason,
      claim_amount: claim.total_claim_amount,
      status: claim.status,
      submitted_date: null,
      approved_date: null,
      notes: claim.reason_description,
      created_at: now,
      updated_at: now
    });
  }
}

function seedRuntimeStorage(seed) {
  const now = new Date().toISOString();

  for (const declaration of seed.declarations) {
    storage.declarations.set(declaration.id, {
      ...declaration,
      user_id: seed.user.id,
      batch_id: 'demo-seed',
      total_taxes_paid: declaration.total_duty_paid + declaration.total_vat_paid + declaration.total_excise_paid,
      raw_data: {
        record_type: 'demo_seed',
        fields: declaration
      },
      created_at: now,
      updated_at: now
    });
  }

  for (const client of seed.clients) {
    storage.clients.set(client.id, {
      ...client,
      user_id: seed.user.id,
      company_name: client.name,
      primary_contact_name: client.primary_contact_name || client.name,
      primary_contact_email: client.email,
      primary_contact_phone: client.phone,
      address_line1: client.address,
      country: client.country || 'GB',
      cds_agreement: client.cds_agreement ?? true,
      created_at: now,
      updated_at: now
    });
  }

  for (const item of seed.items) {
    storage.items.set(item.id, {
      ...item,
      created_at: now
    });
  }

  for (const tax of seed.taxes) {
    storage.taxes.set(tax.id, {
      ...tax,
      created_at: now
    });
  }

  for (const version of seed.versions) {
    const declaration = seed.declarations.find((item) => item.id === version.declaration_id);
    storage.declarationVersions.set(version.id, {
      ...version,
      user_id: seed.user.id,
      snapshot_after: declaration || {},
      created_at: now
    });
  }

  for (const event of seed.events) {
    storage.declarationEvents.set(event.id, {
      ...event,
      user_id: seed.user.id,
      created_at: now
    });
  }

  for (const claim of seed.claims) {
    storage.claims.set(claim.id, {
      ...claim,
      user_id: seed.user.id,
      created_at: now,
      updated_at: now
    });
  }

  storage.batches.set('demo-seed', {
    batchId: 'demo-seed',
    userId: seed.user.id,
    source: 'demo_database',
    fileName: 'demo-seed.json',
    declaration_count: seed.declarations.length,
    item_count: seed.items.length,
    tax_count: seed.taxes.length,
    status: 'completed',
    imported_at: now
  });
}

export async function seedDemoDatabase(authDb) {
  if (process.env.DEMO_SEED_ENABLED === 'false') return;

  const seed = loadDemoSeed();
  const existingCompany = rowExists(authDb, 'companies', seed.company.id);
  const passwordHash = await bcrypt.hash(seed.user.password, SALT_ROUNDS);

  if (!existingCompany) {
    authDb.prepare(`
      INSERT INTO companies (id, name, slug, database_name)
      VALUES (?, ?, ?, ?)
    `).run(seed.company.id, seed.company.name, seed.company.slug, seed.company.database_name);
  }

  const existingUser = rowExists(authDb, 'users', seed.user.id);
  if (!existingUser) {
    authDb.prepare(`
      INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      seed.user.id,
      seed.company.id,
      seed.user.email,
      passwordHash,
      seed.user.first_name,
      seed.user.last_name,
      seed.user.role
    );
  }

  seedTenantData(seed);
  seedRuntimeStorage(seed);
  console.log(`✅ Demo database seeded for ${seed.user.email}`);
}
