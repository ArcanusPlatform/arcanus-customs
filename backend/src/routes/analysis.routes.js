import { Router } from 'express';
import { analyzeDeclarations, saveOpportunities, getOpportunities } from '../services/refund-analyzer.js';

const router = Router();

/**
 * POST /analysis/run - Run refund analysis
 */
router.post('/run', async (req, res, next) => {
  try {
    const { declaration_ids } = req.body;

    // Analyze declarations
    const opportunities = analyzeDeclarations(req.userId, declaration_ids);

    // Save opportunities
    const saved = saveOpportunities(req.userId, opportunities);

    // Calculate totals
    const total_potential_refund = opportunities.reduce(
      (sum, o) => sum + o.total_potential_refund,
      0
    );

    const by_type = opportunities.reduce((acc, o) => {
      for (const issue of o.issues) {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      opportunities_found: opportunities.length,
      total_potential_refund,
      by_type,
      opportunities: saved
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analysis/opportunities - Get detected opportunities
 */
router.get('/opportunities', async (req, res, next) => {
  try {
    const { status, client_id, type } = req.query;

    const opportunities = getOpportunities(req.userId, {
      status,
      client_id,
      type
    });

    // Calculate summary
    const summary = {
      total: opportunities.length,
      by_status: opportunities.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {}),
      by_type: opportunities.reduce((acc, o) => {
        for (const issue of o.issues) {
          acc[issue.type] = (acc[issue.type] || 0) + 1;
        }
        return acc;
      }, {}),
      total_potential_refund: opportunities.reduce(
        (sum, o) => sum + o.total_potential_refund,
        0
      )
    };

    res.json({
      opportunities,
      summary
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analysis/opportunities/:id - Get single opportunity
 */
router.get('/opportunities/:id', async (req, res, next) => {
  try {
    const { storage } = await import('../config/database.js');
    const opportunity = storage.opportunities.get(req.params.id);

    if (!opportunity || opportunity.user_id !== req.userId) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    // Get related declaration
    const declaration = storage.declarations.get(opportunity.declaration_id);

    // Get related client
    const client = storage.clients.get(opportunity.client_id);

    res.json({
      ...opportunity,
      declaration,
      client
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analysis/summary - Get analysis summary
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { storage } = await import('../config/database.js');
    
    const opportunities = Array.from(storage.opportunities.values())
      .filter(o => o.user_id === req.userId);

    const declarations = Array.from(storage.declarations.values())
      .filter(d => d.user_id === req.userId);

    const summary = {
      total_declarations: declarations.length,
      analyzed_declarations: new Set(opportunities.map(o => o.declaration_id)).size,
      opportunities_found: opportunities.length,
      opportunities_claimed: opportunities.filter(o => o.status === 'claimed').length,
      opportunities_pending: opportunities.filter(o => o.status === 'detected').length,
      total_potential_refund: opportunities.reduce(
        (sum, o) => sum + o.total_potential_refund,
        0
      ),
      by_type: {
        preference_not_claimed: opportunities.filter(o =>
          o.issues.some(i => i.type === 'preference_not_claimed')
        ).length,
        incorrect_tariff: opportunities.filter(o =>
          o.issues.some(i => i.type === 'incorrect_tariff')
        ).length,
        overpayment: opportunities.filter(o =>
          o.issues.some(i => i.type === 'overpayment')
        ).length,
        duplicate_payment: opportunities.filter(o =>
          o.issues.some(i => i.type === 'duplicate_payment')
        ).length
      }
    };

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
