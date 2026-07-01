// Demo Database Access Layer
// Uses Tauri SQL plugin to access bundled demo.db

import Database from '@tauri-apps/plugin-sql';

let demoDb: Database | null = null;

// Initialize demo database connection
export async function initDemoDatabase() {
  if (!demoDb) {
    try {
      // Connect to bundled demo database
      demoDb = await Database.load('sqlite:demo.db');
      console.log('✅ Demo database loaded');
    } catch (error) {
      console.error('❌ Failed to load demo database:', error);
      throw error;
    }
  }
  return demoDb;
}

// Check if user is in demo mode
export function isDemoMode(): boolean {
  return false;
}

// Demo API: Get declarations
export async function getDemoDeclarations() {
  const db = await initDemoDatabase();
  return await db.select('SELECT * FROM declarations ORDER BY created_at DESC');
}

// Demo API: Get clients
export async function getDemoClients() {
  const db = await initDemoDatabase();
  return await db.select('SELECT * FROM clients WHERE status = ? ORDER BY name', ['active']);
}

// Demo API: Get claims
export async function getDemoClaims() {
  const db = await initDemoDatabase();
  return await db.select('SELECT * FROM claims ORDER BY created_at DESC');
}

// Demo API: Get contacts
export async function getDemoContacts(clientId?: string) {
  const db = await initDemoDatabase();
  if (clientId) {
    return await db.select('SELECT * FROM contacts WHERE client_id = ?', [clientId]);
  }
  return await db.select('SELECT * FROM contacts ORDER BY name');
}

// Demo API: Get single declaration
export async function getDemoDeclaration(id: string) {
  const db = await initDemoDatabase();
  const results = await db.select('SELECT * FROM declarations WHERE id = ?', [id]);
  return results[0] || null;
}

// Demo API: Get single client
export async function getDemoClient(id: string) {
  const db = await initDemoDatabase();
  const results = await db.select('SELECT * FROM clients WHERE id = ?', [id]);
  return results[0] || null;
}

// Demo API: Get user settings
export async function getDemoSettings() {
  const db = await initDemoDatabase();
  const results = await db.select('SELECT * FROM user_settings');
  const settings: Record<string, string> = {};
  results.forEach((row: any) => {
    settings[row.key] = row.value;
  });
  return settings;
}

// Demo API: Get dashboard stats
export async function getDemoDashboardStats() {
  const db = await initDemoDatabase();

  const [declarations, clients, claims] = await Promise.all([
    db.select('SELECT COUNT(*) as count FROM declarations'),
    db.select('SELECT COUNT(*) as count FROM clients WHERE status = ?', ['active']),
    db.select('SELECT COUNT(*) as count, status FROM claims GROUP BY status'),
  ]);

  return {
    total_declarations: declarations[0]?.count || 0,
    total_clients: clients[0]?.count || 0,
    claims_by_status: claims.reduce((acc: any, row: any) => {
      acc[row.status] = row.count;
      return acc;
    }, {}),
  };
}
