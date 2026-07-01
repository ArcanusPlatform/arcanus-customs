import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../config/database.js';
import { HMRCClient } from '../services/hmrc-client.js';
import { DeclarationStore } from '../services/declaration-store.js';
import { validateClient, checkCDSStatus, getClientsNeedingAttention } from '../services/client-validator.js';

const router = Router();
const store = new DeclarationStore();

/**
 * POST /clients - Create new client
 */
router.post('/', async (req, res, next) => {
  try {
    const client = {
      id: uuidv4(),
      user_id: req.userId,
      company_name: req.body.company_name,
      eori: req.body.eori,
      vat_number: req.body.vat_number,
      address_line1: req.body.address_line1,
      address_line2: req.body.address_line2,
      city: req.body.city,
      postcode: req.body.postcode,
      country: req.body.country || 'GB',
      primary_contact_name: req.body.primary_contact_name,
      primary_contact_email: req.body.primary_contact_email,
      primary_contact_phone: req.body.primary_contact_phone,
      bank_account_name: req.body.bank_account_name,
      bank_account_number: req.body.bank_account_number,
      bank_sort_code: req.body.bank_sort_code,
      bank_iban: req.body.bank_iban,
      bank_swift: req.body.bank_swift,
      cds_agreement: req.body.cds_agreement || false,
      cds_agreement_date: req.body.cds_agreement_date,
      agent_authority_expiry: req.body.agent_authority_expiry,
      company_number: req.body.company_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to tenant database
    const stmt = req.tenantDb.prepare(`
      INSERT INTO clients (id, name, eori, vat_number, email, phone, address, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      client.id, 
      client.name, 
      client.eori, 
      client.vat_number, 
      client.email, 
      client.phone, 
      client.address, 
      client.status, 
      client.created_at, 
      client.updated_at
    );

    // Also keep in memory for compatibility
    storage.clients.set(client.id, { ...client, user_id: req.user?.id });

    // Validate client data
    const validation = validateClient(client);

    res.json({
      success: true,
      client: { id: client.id, company_name: client.name, ...client },
      validation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /clients - List all clients
 */
router.get('/', async (req, res, next) => {
  try {
    const { filter } = req.query;
    
    // Load from tenant database
    const rows = req.tenantDb.prepare('SELECT * FROM clients').all();
    let clients = rows || [];

    // Apply filters
    if (filter === 'missing_data') {
      clients = clients.filter(c => {
        const validation = validateClient(c);
        return validation.completeness < 100;
      });
    } else if (filter === 'cds_agreements') {
      clients = clients.filter(c => {
        const status = checkCDSStatus(c);
        return status.status === 'expiring' || status.status === 'expired';
      });
    } else if (filter === 'alerts') {
      clients = clients.filter(c => {
        const status = checkCDSStatus(c);
        return status.alert !== null;
      });
    }

    // Add validation and status to each client
    clients = clients.map(c => ({
      ...c,
      validation: validateClient(c),
      cds_status: checkCDSStatus(c)
    }));

    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /clients/alerts - Get clients needing attention
 */
router.get('/alerts', async (req, res, next) => {
  try {
    const alerts = getClientsNeedingAttention(req.userId);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /clients/:id - Get single client
 */
router.get('/:id', async (req, res, next) => {
  try {
    const row = req.tenantDb.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const client = row;
    const declarations = store.getDeclarations(req.userId, {
      client: req.params.id
    });

    // Get client's contacts
    const contacts = Array.from(storage.contacts.values())
      .filter(c => c.client_id === req.params.id);

    res.json({
      ...client,
      validation: validateClient(client),
      cds_status: checkCDSStatus(client),
      declarations_count: declarations.length,
      contacts_count: contacts.length,
      declarations: declarations.slice(0, 10), // Recent 10
      contacts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /clients/:id - Update client
 */
router.put('/:id', async (req, res, next) => {
  try {
    const row = req.tenantDb.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Update in database
    const updateStmt = req.tenantDb.prepare(`
      UPDATE clients 
      SET name = ?, eori = ?, vat_number = ?, email = ?, phone = ?, address = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(
      req.body.company_name || row.name,
      req.body.eori || row.eori,
      req.body.vat_number || row.vat_number,
      req.body.primary_contact_email || row.email,
      req.body.primary_contact_phone || row.phone,
      req.body.address || row.address,
      req.body.status || row.status,
      new Date().toISOString(),
      req.params.id
    );

    // Get updated record
    const updated = req.tenantDb.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

    // Also update in-memory for compatibility
    storage.clients.set(req.params.id, { ...updated, user_id: req.user?.id });

    const validation = validateClient(updated);

    res.json({
      success: true,
      client: { id: updated.id, company_name: updated.name, ...updated },
      validation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /clients/:id - Delete client
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const row = req.tenantDb.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if client has claims
    const claims = Array.from(storage.claims?.values() || [])
      .filter(c => c.client_id === req.params.id);

    if (claims.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete client with ${claims.length} existing claims`
      });
    }

    // Delete from database
    req.tenantDb.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    
    // Also delete from memory
    storage.clients.delete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /clients/:id/sync-cds - Sync CDS data from HMRC
 */
router.post('/:id/sync-cds', async (req, res, next) => {
  try {
    const row = req.tenantDb.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const client = row;

    if (!client.eori) {
      return res.status(400).json({
        success: false,
        message: 'Client EORI required for CDS sync'
      });
    }

    const hmrcClient = new HMRCClient(req.userId);

    // Fetch last 5 years
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const result = await hmrcClient.listDeclarations({
      eori: client.eori,
      from_date: fiveYearsAgo.toISOString().split('T')[0],
      to_date: new Date().toISOString().split('T')[0]
    });

    // Save declarations and link to client
    let savedCount = 0;
    for (const declaration of result.declarations || []) {
      const id = store.saveFromHMRC(req.userId, declaration);

      // Link to client
      const decl = storage.declarations.get(id);
      if (decl) {
        decl.client_id = client.id;
        decl.client_name = client.company_name;
        savedCount++;
      }
    }

    res.json({
      success: true,
      synced: savedCount,
      client: client.company_name,
      eori: client.eori
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /clients/:id/snapshot - Get client snapshot
 */
router.get('/:id/snapshot', async (req, res, next) => {
  try {
    const row = req.tenantDb.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const client = row;

    const declarations = store.getDeclarations(req.userId, {
      client: req.params.id
    });

    const claims = Array.from(storage.claims?.values() || [])
      .filter(c => c.client_id === req.params.id);

    const validation = validateClient(client);
    const cdsStatus = checkCDSStatus(client);

    const snapshot = {
      client_name: client.company_name,
      eori: client.eori,
      vat_number: client.vat_number,
      completeness: validation.completeness,
      missing_fields: validation.issues,
      bank_details_complete: !!(client.bank_account_number && client.bank_sort_code),
      cds_status: cdsStatus.status,
      cds_alert: cdsStatus.alert,
      agent_authority_days_remaining: cdsStatus.daysUntilExpiry,
      total_declarations: declarations.length,
      total_claims: claims.length,
      total_claimed: claims.reduce((sum, c) => sum + (c.total_claim_amount || 0), 0),
      total_paid: claims
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.paid_amount || 0), 0)
    };

    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /clients/:id/contacts - Add contact to client
 */
router.post('/:id/contacts', async (req, res, next) => {
  try {
    const row = req.tenantDb.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const client = row;

    const contact = {
      id: uuidv4(),
      client_id: req.params.id,
      user_id: req.userId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      role: req.body.role,
      address: req.body.address,
      notes: req.body.notes,
      created_at: new Date().toISOString()
    };

    storage.contacts.set(contact.id, contact);

    res.json({
      success: true,
      contact
    });
  } catch (error) {
    next(error);
  }
});

export default router;
