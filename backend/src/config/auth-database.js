import pg from 'pg';
import path from 'path';
import { ensureDirectory, getDataRoot } from './storage-paths.js';
import { seedDemoDatabase } from './demo-seed.js';
const { Pool } = pg;

// Central authentication database (PostgreSQL)
// For development, falls back to SQLite if PostgreSQL not available

let authPool = null;
let useSQLite = false;

// Try PostgreSQL first, fallback to SQLite for development
export async function initAuthDatabase() {
  const usePostgres = process.env.AUTH_DB_HOST && process.env.NODE_ENV === 'production';

  if (usePostgres) {
    console.log('🔐 Initializing PostgreSQL auth database...');
    authPool = new Pool({
      host: process.env.AUTH_DB_HOST || 'localhost',
      port: parseInt(process.env.AUTH_DB_PORT || '5432'),
      database: process.env.AUTH_DB_NAME || 'm_customs_auth',
      user: process.env.AUTH_DB_USER || 'mcustoms',
      password: process.env.AUTH_DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    authPool.on('error', (err) => {
      console.error('❌ PostgreSQL pool error:', err);
    });

    createPostgresSchema();
  } else {
    console.log('🔐 Using SQLite for auth database (development mode)');
    useSQLite = true;
    
    // Dynamic import for ES modules
    const { default: Database } = await import('better-sqlite3');
    const dbDir = ensureDirectory(getDataRoot());

    const dbPath = path.join(dbDir, 'auth.db');
    authPool = new Database(dbPath);
    authPool.pragma('journal_mode = WAL');

    createSQLiteSchema();
    await seedDemoDatabase(authPool);
  }

  return authPool;
}

function createPostgresSchema() {
  const schema = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      database_name VARCHAR(100) UNIQUE NOT NULL,
      subscription_plan VARCHAR(50) DEFAULT 'free',
      max_users INTEGER DEFAULT 5,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      is_active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(20),
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      accepted_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
  `;

  authPool.query(schema)
    .then(() => console.log('✅ PostgreSQL auth schema created'))
    .catch(err => console.error('❌ Error creating PostgreSQL schema:', err));
}

function createSQLiteSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      database_name TEXT UNIQUE NOT NULL,
      subscription_plan TEXT DEFAULT 'free',
      max_users INTEGER DEFAULT 5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      accepted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
  `;

  authPool.exec(schema);
  console.log('✅ SQLite auth schema created');
  
  // Run migrations
  runSQLiteMigrations();
}

function runSQLiteMigrations() {
  const migrations = [
    // Add phone column to users if it doesn't exist
    `ALTER TABLE users ADD COLUMN phone TEXT;`
  ];

  for (const migration of migrations) {
    try {
      authPool.exec(migration);
      console.log('✅ Migration applied:', migration.substring(0, 50) + '...');
    } catch (error) {
      if (!String(error.message).includes('duplicate column')) {
        console.warn('⚠️  Migration warning:', error.message);
      }
    }
  }
}

export function getAuthDb() {
  if (!authPool) {
    throw new Error('Auth database not initialized. Call initAuthDatabase() first.');
  }
  return { db: authPool, useSQLite };
}

// Helper to run queries with consistent interface
export async function queryAuth(sql, params = []) {
  const { db, useSQLite } = getAuthDb();

  if (useSQLite) {
    // SQLite (better-sqlite3) - synchronous
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    } else {
      const result = stmt.run(...params);
      return { rowCount: result.changes, rows: [] };
    }
  } else {
    // PostgreSQL - async
    return await db.query(sql, params);
  }
}
