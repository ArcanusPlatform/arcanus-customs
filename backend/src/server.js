import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cdsRoutes from './routes/cds.routes.js';
import hmrcRoutes from './routes/hmrc.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import claimsRoutes from './routes/claims.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { initAuthDatabase } from './config/auth-database.js';
import { getDefaultDatabasePath, getUploadsRoot } from './config/storage-paths.js';
import { storage } from './config/database.js';
import './config/database.js'; // Initialize database

dotenv.config();

// Initialize auth database
await initAuthDatabase();

const app = express();
const PORT = process.env.PORT || 3005;
const uploadsPath = getUploadsRoot();
const databasePath = getDefaultDatabasePath();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3004',
    'http://localhost:3002',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

function attachLegacyUserId(req, res, next) {
  if (req.user?.id && !req.userId) {
    req.userId = req.user.id;
  }
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth Routes (no authentication required)
app.use('/auth', authRoutes);

// API Routes (require authentication + tenant isolation)
app.use('/cds', tenantMiddleware, attachLegacyUserId, cdsRoutes);
app.use('/hmrc', tenantMiddleware, attachLegacyUserId, hmrcRoutes);
app.use('/clients', tenantMiddleware, attachLegacyUserId, clientsRoutes);
app.use('/claims', tenantMiddleware, attachLegacyUserId, claimsRoutes);
app.use('/analysis', tenantMiddleware, attachLegacyUserId, analysisRoutes);

function getClientOnboardingSummary(client) {
  const hasEori = Boolean(client.eori);
  const hasVat = Boolean(client.vat_number);
  const hasBank = Boolean(client.bank_account_number && client.bank_sort_code);
  const hasAddress = Boolean(client.address_line1 && client.city && client.postcode);
  const checklist = [
    { key: 'company_info', label: 'Company information', completed: Boolean(client.company_name) },
    { key: 'contact_details', label: 'Contact details', completed: Boolean(client.primary_contact_email || client.primary_contact_name) },
    { key: 'eori', label: 'EORI number', completed: hasEori },
    { key: 'vat', label: 'VAT number', completed: hasVat },
    { key: 'bank', label: 'Bank details', completed: hasBank },
    { key: 'address', label: 'Complete address', completed: hasAddress }
  ];
  const missingItems = checklist.filter(item => !item.completed).map(item => item.label);
  const progress = Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100);
  let status = 'not_started';
  if (progress >= 100 && client.cds_agreement) status = 'live';
  else if (progress >= 100) status = 'ready_for_cds';
  else if (progress >= 80) status = 'verification_required';
  else if (progress >= 60) status = 'documents_pending';
  else if (progress >= 30) status = 'info_submitted';

  return {
    clientId: client.id,
    name: client.company_name,
    contact: client.primary_contact_name || client.primary_contact_email,
    eori: client.eori,
    vat: client.vat_number,
    status,
    progress,
    missingItems,
    missingKeys: missingItems.map(item => item.toLowerCase().replace(/\s+/g, '_')),
    checklist
  };
}

// Onboarding routes used by the frontend checklist/document flow.
app.get('/onboarding/clients', tenantMiddleware, attachLegacyUserId, (req, res) => {
  const clients = Array.from(storage.clients.values())
    .filter(client => client.user_id === req.userId)
    .map(getClientOnboardingSummary);
  res.json({ clients });
});

app.get('/clients/:clientId/onboarding', tenantMiddleware, attachLegacyUserId, (req, res) => {
  const client = storage.clients.get(req.params.clientId);
  if (!client || client.user_id !== req.userId) {
    return res.status(404).json({ success: false, message: 'Client not found' });
  }
  res.json(getClientOnboardingSummary(client));
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║          M Customs Manager - CDS Backend Service           ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3004'}`);
  console.log(`📁 Upload directory: ${uploadsPath}`);
  console.log(`💾 Database: ${databasePath}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('');
  console.log('  Authentication:');
  console.log('    POST /auth/register');
  console.log('    POST /auth/login');
  console.log('    GET  /auth/me');
  console.log('    POST /auth/invite');
  console.log('    POST /auth/accept-invite');
  console.log('');
  console.log('  CDS & Declarations:');
  console.log('    POST /cds/import');
  console.log('    GET  /cds/declarations');
  console.log('    GET  /cds/declarations/:id');
  console.log('    POST /cds/hmrc/fetch/:mrn');
  console.log('');
  console.log('  HMRC Integration:');
  console.log('    POST /hmrc/credentials');
  console.log('    GET  /hmrc/credentials');
  console.log('    POST /hmrc/test');
  console.log('');
  console.log('  Client Management:');
  console.log('    POST /clients');
  console.log('    GET  /clients');
  console.log('    GET  /clients/:id');
  console.log('    POST /clients/:id/sync-cds');
  console.log('    GET  /clients/alerts');
  console.log('');
  console.log('  Claims Management:');
  console.log('    POST /claims');
  console.log('    GET  /claims');
  console.log('    GET  /claims/dashboard');
  console.log('    GET  /claims/:id/compliance');
  console.log('    POST /claims/:id/submit');
  console.log('');
  console.log('  Refund Analysis:');
  console.log('    POST /analysis/run');
  console.log('    GET  /analysis/opportunities');
  console.log('    GET  /analysis/summary');
  console.log('');
  console.log('Ready to accept requests! 🎉');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
