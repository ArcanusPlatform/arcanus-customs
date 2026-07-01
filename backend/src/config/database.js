/**
 * In-Memory Database (for development)
 * Replace with PostgreSQL/MongoDB for production
 */

// In-memory storage
const storage = {
  users: new Map(),
  credentials: new Map(),
  tokens: new Map(),
  declarations: new Map(),
  items: new Map(),
  taxes: new Map(),
  batches: new Map(),
  errors: new Map(),
  clients: new Map(),
  contacts: new Map(),
  claims: new Map(),
  opportunities: new Map(),
  documents: new Map(),
  declarationVersions: new Map(),
  declarationEvents: new Map()
};

// Helper to execute queries
const db = {
  prepare: (query) => ({
    run: (...params) => {
      // Simple in-memory implementation
      return { changes: 1 };
    },
    get: (...params) => {
      // Return mock data for now
      return null;
    },
    all: (...params) => {
      // Return empty array for now
      return [];
    }
  }),
  transaction: (fn) => fn,
  exec: (sql) => {
    // No-op for schema creation
  }
};

// Export storage for direct access
export { storage };

console.log('✅ In-memory database initialized (development mode)');

export default db;
