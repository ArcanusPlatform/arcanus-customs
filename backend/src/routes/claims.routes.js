import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../config/database.js';
import { checkClaimCompliance } from '../services/compliance-checker.js';
import { markOpportunityAsClaimed } from '../services/refund-analyzer.js';

const router = Router();

/**
 * POST /claims - Create new claim
 */
router.post('/', async (req, res, next) => {
  try {
    const claim = {
      id: uuidv4(),
      user_id: req.userId,
      client_id: req.body.client_id,
      claim_reference: req.body.claim_reference || `CLM-${Date.now()}`,
      mrns: req.body.mrns || [],
      reason: req.body.reason,
      reason_description: req.body.reason_description,
      total_claim_amount: req.body.total_claim_amount || 0,
      items: req.body.items || [],
      status: 'draft',
      compliance_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check compliance
    const compliance = checkClaimCompliance(claim);
    claim.compliance_score = compliance.score;
    claim.compliance_issues = compliance.issues;

    storage.claims.set(claim.id, claim);

    // If created from opportunity, mark it as claimed
    if (req.body.opportunity_id) {
      markOpportunityAsClaimed(req.body.opportunity_id, claim.id);
    }

    res.json({
      success: true,
      claim,
      compliance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /claims - List claims
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, client_id, limit } = req.query;

    let claims = Array.from(storage.claims.values())
      .filter(c => c.user_id === req.userId);

    // Apply filters
    if (status) {
      claims = claims.filter(c => c.status === status);
    }

    if (client_id) {
      claims = claims.filter(c => c.client_id === client_id);
    }

    // Sort by created date (newest first)
    claims.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Limit results
    if (limit) {
      claims = claims.slice(0, parseInt(limit));
    }

    // Add client info
    claims = claims.map(c => {
      const client = storage.clients.get(c.client_id);
      return {
        ...c,
        client_name: client?.company_name,
        client_eori: client?.eori
      };
    });

    res.json({ claims });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /claims/dashboard - Get claims dashboard
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const claims = Array.from(storage.claims.values())
      .filter(c => c.user_id === req.userId);

    const dashboard = {
      total_claims: claims.length,
      by_status: {
        draft: claims.filter(c => c.status === 'draft').length,
        in_progress: claims.filter(c => c.status === 'in_progress').length,
        under_review: claims.filter(c => c.status === 'under_review').length,
        submitted: claims.filter(c => c.status === 'submitted').length,
        approved: claims.filter(c => c.status === 'approved').length,
        paid: claims.filter(c => c.status === 'paid').length,
        rejected: claims.filter(c => c.status === 'rejected').length
      },
      total_claimed: claims.reduce((sum, c) => sum + (c.total_claim_amount || 0), 0),
      total_approved: claims
        .filter(c => c.status === 'approved' || c.status === 'paid')
        .reduce((sum, c) => sum + (c.approved_amount || c.total_claim_amount || 0), 0),
      total_paid: claims
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.paid_amount || 0), 0),
      average_compliance_score: claims.length > 0
        ? claims.reduce((sum, c) => sum + (c.compliance_score || 0), 0) / claims.length
        : 0,
      recent_claims: claims
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(c => {
          const client = storage.clients.get(c.client_id);
          return {
            ...c,
            client_name: client?.company_name
          };
        })
    };

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /claims/:id - Get single claim
 */
router.get('/:id', async (req, res, next) => {
  try {
    const claim = storage.claims.get(req.params.id);

    if (!claim || claim.user_id !== req.userId) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Get client info
    const client = storage.clients.get(claim.client_id);

    // Get declarations
    const declarations = (claim.mrns || []).map(mrn => {
      return Array.from(storage.declarations.values())
        .find(d => d.mrn === mrn);
    }).filter(d => d);

    // Get documents
    const documents = Array.from(storage.documents?.values() || [])
      .filter(d => d.claim_id === claim.id);

    // Get compliance
    const compliance = checkClaimCompliance(claim);

    res.json({
      ...claim,
      client,
      declarations,
      documents,
      compliance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /claims/:id - Update claim
 */
router.put('/:id', async (req, res, next) => {
  try {
    const claim = storage.claims.get(req.params.id);

    if (!claim || claim.user_id !== req.userId) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Update fields
    Object.assign(claim, req.body, {
      id: req.params.id,
      user_id: req.userId,
      updated_at: new Date().toISOString()
    });

    // Recalculate compliance
    const compliance = checkClaimCompliance(claim);
    claim.compliance_score = compliance.score;
    claim.compliance_issues = compliance.issues;

    res.json({
      success: true,
      claim,
      compliance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /claims/:id - Delete claim
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const claim = storage.claims.get(req.params.id);

    if (!claim || claim.user_id !== req.userId) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Only allow deletion of draft claims
    if (claim.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete draft claims'
      });
    }

    storage.claims.delete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /claims/:id/compliance - Check claim compliance
 */
router.get('/:id/compliance', async (req, res, next) => {
  try {
    const claim = storage.claims.get(req.params.id);

    if (!claim || claim.user_id !== req.userId) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const compliance = checkClaimCompliance(claim);

    // Update claim with latest compliance
    claim.compliance_score = compliance.score;
    claim.compliance_issues = compliance.issues;
    claim.updated_at = new Date().toISOString();

    res.json(compliance);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /claims/:id/submit - Submit claim
 */
router.post('/:id/submit', async (req, res, next) => {
  try {
    const claim = storage.claims.get(req.params.id);

    if (!claim || claim.user_id !== req.userId) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Check compliance
    const compliance = checkClaimCompliance(claim);

    if (!compliance.ready_to_submit) {
      return res.status(400).json({
        success: false,
        message: 'Claim not ready to submit',
        compliance
      });
    }

    // Update status
    claim.status = 'submitted';
    claim.submitted_at = new Date().toISOString();
    claim.submitted_by = req.userId;
    claim.updated_at = new Date().toISOString();

    // Generate C285 form data
    const c285 = generateC285Form(claim);

    res.json({
      success: true,
      claim,
      c285_form: c285,
      message: 'Claim submitted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /claims/:id/status - Update claim status
 */
router.put('/:id/status', async (req, res, next) => {
  try {
    const claim = storage.claims.get(req.params.id);

    if (!claim || claim.user_id !== req.userId) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const oldStatus = claim.status;
    const newStatus = req.body.status;

    // Validate status transition
    const validTransitions = {
      draft: ['in_progress', 'withdrawn'],
      in_progress: ['submitted', 'draft', 'withdrawn'],
      submitted: ['under_review', 'withdrawn'],
      under_review: ['approved', 'rejected', 'submitted'],
      approved: ['paid'],
      paid: [],
      rejected: [],
      withdrawn: []
    };

    if (!validTransitions[oldStatus]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${oldStatus} to ${newStatus}`
      });
    }

    // Update status
    claim.status = newStatus;
    claim.status_updated_at = new Date().toISOString();
    claim.updated_at = new Date().toISOString();

    // Add to status history
    if (!claim.status_history) claim.status_history = [];
    claim.status_history.push({
      from: oldStatus,
      to: newStatus,
      timestamp: new Date().toISOString(),
      notes: req.body.notes,
      updated_by: req.userId
    });

    // Handle status-specific updates
    if (newStatus === 'approved') {
      claim.approved_amount = req.body.approved_amount || claim.total_claim_amount;
      claim.approved_at = new Date().toISOString();
    }

    if (newStatus === 'paid') {
      claim.paid_amount = req.body.paid_amount || claim.approved_amount || claim.total_claim_amount;
      claim.paid_at = new Date().toISOString();
      claim.payment_reference = req.body.payment_reference;
      claim.payment_date = req.body.payment_date || new Date().toISOString();
    }

    if (newStatus === 'rejected') {
      claim.rejection_reason = req.body.rejection_reason;
      claim.rejected_at = new Date().toISOString();
    }

    res.json({
      success: true,
      claim
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /claims/:id/documents - Upload document
 */
router.post('/:id/documents', async (req, res, next) => {
  try {
    const claim = storage.claims.get(req.params.id);

    if (!claim || claim.user_id !== req.userId) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const document = {
      id: uuidv4(),
      claim_id: req.params.id,
      user_id: req.userId,
      document_type: req.body.document_type,
      file_name: req.body.file_name,
      file_path: req.body.file_path,
      file_size: req.body.file_size,
      uploaded_at: new Date().toISOString()
    };

    if (!storage.documents) storage.documents = new Map();
    storage.documents.set(document.id, document);

    res.json({
      success: true,
      document
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate C285 form data
 */
function generateC285Form(claim) {
  const client = storage.clients.get(claim.client_id);

  if (!client) {
    throw new Error('Client not found');
  }

  return {
    form_type: 'C285',
    claim_reference: claim.claim_reference,
    claimant: {
      name: client.company_name,
      eori: client.eori,
      vat_number: client.vat_number,
      address: {
        line1: client.address_line1,
        line2: client.address_line2,
        city: client.city,
        postcode: client.postcode,
        country: client.country
      },
      contact: {
        name: client.primary_contact_name,
        email: client.primary_contact_email,
        phone: client.primary_contact_phone
      },
      bank_details: {
        account_name: client.bank_account_name,
        account_number: client.bank_account_number,
        sort_code: client.bank_sort_code,
        iban: client.bank_iban,
        swift: client.bank_swift
      }
    },
    declarations: claim.mrns,
    reason: claim.reason,
    reason_description: claim.reason_description,
    total_amount: claim.total_claim_amount,
    items: claim.items,
    generated_at: new Date().toISOString(),
    generated_by: claim.user_id
  };
}

export default router;
