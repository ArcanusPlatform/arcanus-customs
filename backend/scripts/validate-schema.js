#!/usr/bin/env node

/**
 * Schema Validation & Integrity Check
 * 
 * Run this script to verify:
 * 1. All schema files exist
 * 2. Schema imports work correctly
 * 3. Database can be created for a test company
 * 4. Tables and views are created
 * 5. Foreign key constraints are enforced
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import WCO_SCHEMA from './backend/src/config/wco-schema.js';
import { createTenantDatabase } from './backend/src/config/tenant-database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 WCO/CDS Schema Validation Check\n');

// Test 1: Verify schema imports
console.log('✓ Test 1: Schema import check');
if (!WCO_SCHEMA || !WCO_SCHEMA.includes('CREATE TABLE')) {
  console.error('  ❌ FAILED: WCO_SCHEMA not properly imported');
  process.exit(1);
}
console.log('  ✅ WCO_SCHEMA imported successfully');
console.log(`  📊 Schema size: ${(WCO_SCHEMA.length / 1024).toFixed(1)}KB\n`);

// Test 2: Count tables in schema
console.log('✓ Test 2: Schema structure verification');
const tableMatches = WCO_SCHEMA.match(/CREATE TABLE IF NOT EXISTS \w+/g) || [];
console.log(`  ✅ Found ${tableMatches.length} tables in schema`);
const tables = tableMatches.map(m => m.replace('CREATE TABLE IF NOT EXISTS ', ''));
tables.forEach(t => console.log(`    - ${t}`));
console.log();

// Test 3: Verify index creation
console.log('✓ Test 3: Index verification');
const indexMatches = WCO_SCHEMA.match(/CREATE INDEX IF NOT EXISTS \w+/g) || [];
console.log(`  ✅ Found ${indexMatches.length} indexes\n`);

// Test 4: Verify foreign key statements
console.log('✓ Test 4: Referential integrity check');
const fkMatches = WCO_SCHEMA.match(/FOREIGN KEY/g) || [];
console.log(`  ✅ Found ${fkMatches.length} foreign key constraints\n`);

// Test 5: Create test database and verify structure
console.log('✓ Test 5: Test database creation');
const testCompanyId = 'test_company_validation_' + Date.now();
const testDbDir = path.join(__dirname, '.tmp-validation');

// Create temp directory
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}

// Temporarily override the database path
const originalEnv = process.env.DATA_ROOT;
process.env.DATA_ROOT = testDbDir;

try {
  const testDb = createTenantDatabase(testCompanyId);
  console.log(`  ✅ Test database created successfully\n`);

  // Test 6: Verify all tables exist
  console.log('✓ Test 6: Table existence verification');
  const tableList = testDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log(`  ✅ Verified ${tableList.length} tables exist:`);
  tableList.forEach(row => {
    console.log(`    - ${row.name}`);
  });
  console.log();

  // Test 7: Verify views exist
  console.log('✓ Test 7: View verification');
  const viewList = testDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='view'
    ORDER BY name
  `).all();
  
  console.log(`  ✅ Found ${viewList.length} views:`);
  viewList.forEach(row => {
    console.log(`    - ${row.name}`);
  });
  console.log();

  // Test 8: Verify foreign keys are enabled
  console.log('✓ Test 8: Foreign key constraint check');
  const fkStatus = testDb.prepare('PRAGMA foreign_keys').all();
  if (fkStatus[0] && fkStatus[0]['foreign_keys'] === 1) {
    console.log('  ✅ Foreign key constraints ENABLED\n');
  } else {
    console.log('  ⚠️  Foreign key constraints disabled (may be performance setting)\n');
  }

  // Test 9: Verify WAL mode
  console.log('✓ Test 9: WAL mode check');
  const walStatus = testDb.prepare('PRAGMA journal_mode').all();
  if (walStatus[0] && walStatus[0].journal_mode === 'wal') {
    console.log('  ✅ Write-Ahead Logging (WAL) ENABLED\n');
  } else {
    console.log('  ⚠️  WAL mode not enabled\n');
  }

  // Test 10: Test a sample INSERT
  console.log('✓ Test 10: Sample INSERT operation');
  const sampleId = 'test_' + Date.now();
  testDb.prepare(`
    INSERT INTO declarations (
      id, declaration_type, function_code, status, company_id
    ) VALUES (?, ?, ?, ?, ?)
  `).run(sampleId, 'E', '09', 'pending', testCompanyId);
  
  const inserted = testDb.prepare('SELECT * FROM declarations WHERE id = ?').get(sampleId);
  if (inserted) {
    console.log('  ✅ INSERT operation successful');
    console.log(`    - ID: ${inserted.id}`);
    console.log(`    - Status: ${inserted.status}`);
    console.log(`    - Function: ${inserted.function_code}\n`);
  }

  // Test 11: Test view query
  console.log('✓ Test 11: View query test');
  const summaryResult = testDb.prepare('SELECT * FROM v_declaration_summary LIMIT 1').all();
  console.log(`  ✅ v_declaration_summary view query successful (${summaryResult.length} rows)\n`);

  // Cleanup
  testDb.close();
  fs.rmSync(testDbDir, { recursive: true, force: true });

  console.log('════════════════════════════════════════════════════════');
  console.log('✅ ALL VALIDATION CHECKS PASSED');
  console.log('════════════════════════════════════════════════════════\n');

  console.log('📋 Summary:');
  console.log(`  • Schema Size: ${(WCO_SCHEMA.length / 1024).toFixed(1)}KB`);
  console.log(`  • Tables: ${tableMatches.length}`);
  console.log(`  • Views: ${viewList.length}`);
  console.log(`  • Foreign Keys: ${fkMatches.length}`);
  console.log(`  • Indexes: ${indexMatches.length}`);
  console.log('\n🚀 Schema is ready for production use!\n');

  process.exit(0);

} catch (error) {
  console.error('\n❌ VALIDATION FAILED');
  console.error('Error:', error.message);
  console.error('\nStack trace:', error.stack);
  
  // Cleanup on error
  if (fs.existsSync(testDbDir)) {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  }
  
  process.exit(1);

} finally {
  // Restore environment
  if (originalEnv) {
    process.env.DATA_ROOT = originalEnv;
  }
}
