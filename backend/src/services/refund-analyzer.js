import { storage } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Analyze declarations for refund opportunities
 */
export function analyzeDeclarations(userId, declarationIds = null) {
  let declarations;
  
  if (declarationIds && declarationIds.length > 0) {
    // Analyze specific declarations
    declarations = declarationIds
      .map(id => storage.declarations.get(id))
      .filter(d => d && d.user_id === userId);
  } else {
    // Analyze all user's declarations
    declarations = Array.from(storage.declarations.values())
      .filter(d => d.user_id === userId);
  }

  const opportunities = [];

  for (const declaration of declarations) {
    // Get items for this declaration
    const items = Array.from(storage.items.values())
      .filter(i => i.declaration_id === declaration.id);

    for (const item of items) {
      // Get taxes for this item
      const taxes = Array.from(storage.taxes.values())
        .filter(t => t.item_id === item.id);

      const itemOpportunities = [];

      // 1. Check for preference not claimed
      const preferenceCheck = checkPreferenceEligibility(item, taxes);
      if (preferenceCheck.eligible && preferenceCheck.potential_saving > 0) {
        itemOpportunities.push({
          type: 'preference_not_claimed',
          description: `Origin preference available for ${item.origin_country}`,
          potential_refund: preferenceCheck.potential_saving,
          confidence: 'high',
          details: preferenceCheck.details
        });
      }

      // 2. Check for incorrect tariff code
      const tariffCheck = checkTariffAccuracy(item, taxes);
      if (tariffCheck.issue && tariffCheck.potential_saving > 0) {
        itemOpportunities.push({
          type: 'incorrect_tariff',
          description: tariffCheck.description,
          potential_refund: tariffCheck.potential_saving,
          confidence: tariffCheck.confidence,
          details: tariffCheck.details
        });
      }

      // 3. Check for overpayment
      const overpaymentCheck = checkOverpayment(item, taxes);
      if (overpaymentCheck.issue && overpaymentCheck.potential_saving > 0) {
        itemOpportunities.push({
          type: 'overpayment',
          description: overpaymentCheck.description,
          potential_refund: overpaymentCheck.potential_saving,
          confidence: 'medium',
          details: overpaymentCheck.details
        });
      }

      if (itemOpportunities.length > 0) {
        opportunities.push({
          declaration_id: declaration.id,
          mrn: declaration.mrn,
          client_id: declaration.client_id,
          client_name: declaration.client_name,
          acceptance_date: declaration.acceptance_date,
          item_number: item.item_number,
          commodity_code: item.commodity_code,
          description: item.description,
          invoice_value: item.invoice_value,
          issues: itemOpportunities,
          total_potential_refund: itemOpportunities.reduce((sum, i) => sum + i.potential_refund, 0)
        });
      }
    }
  }

  // Check for duplicate payments across declarations
  const duplicates = detectDuplicatePayments(declarations);
  opportunities.push(...duplicates);

  return opportunities;
}

/**
 * Check if preference could have been claimed
 */
function checkPreferenceEligibility(item, taxes) {
  // Countries with UK trade agreements
  const preferenceCountries = [
    'EU', 'NO', 'CH', 'IS', 'LI', // EEA
    'JP', 'CA', 'SG', 'VN', 'KR', // Trade deals
    'AU', 'NZ', 'MX', 'ZA' // Other agreements
  ];

  if (!item.origin_country) {
    return { eligible: false, potential_saving: 0 };
  }

  const isEligible = preferenceCountries.includes(item.origin_country);
  
  if (!isEligible) {
    return { eligible: false, potential_saving: 0 };
  }

  // Calculate potential saving (duty only, not VAT)
  const dutyTax = taxes.find(t => t.tax_type === 'CUST');
  if (!dutyTax || dutyTax.tax_amount === 0) {
    return { eligible: false, potential_saving: 0 };
  }

  // Assume preference would reduce duty by 100% (varies by agreement)
  const potentialSaving = dutyTax.tax_amount;

  return {
    eligible: true,
    potential_saving: potentialSaving,
    details: {
      origin_country: item.origin_country,
      current_duty: dutyTax.tax_amount,
      preferential_duty: 0,
      saving: potentialSaving
    }
  };
}

/**
 * Check tariff code accuracy
 */
function checkTariffAccuracy(item, taxes) {
  // This is a simplified check - in production, you'd use a tariff database
  // For now, we'll check for common patterns that indicate potential issues

  if (!item.commodity_code || item.commodity_code.length !== 10) {
    return { issue: false, potential_saving: 0 };
  }

  // Check if description matches commodity code (simplified)
  const descriptionLower = (item.description || '').toLowerCase();
  const firstTwoDigits = item.commodity_code.substring(0, 2);

  // Common misclassifications
  const misclassifications = {
    '84': ['laptop', 'computer', 'machine', 'equipment'],
    '85': ['electronic', 'phone', 'cable', 'battery'],
    '62': ['clothing', 'garment', 'apparel', 'textile'],
    '94': ['furniture', 'chair', 'table', 'bed']
  };

  let potentialIssue = false;
  let suggestedChapter = null;

  for (const [chapter, keywords] of Object.entries(misclassifications)) {
    if (chapter !== firstTwoDigits) {
      for (const keyword of keywords) {
        if (descriptionLower.includes(keyword)) {
          potentialIssue = true;
          suggestedChapter = chapter;
          break;
        }
      }
    }
  }

  if (!potentialIssue) {
    return { issue: false, potential_saving: 0 };
  }

  // Estimate potential saving (10-20% of duty paid)
  const dutyTax = taxes.find(t => t.tax_type === 'CUST');
  const potentialSaving = dutyTax ? dutyTax.tax_amount * 0.15 : 0;

  return {
    issue: true,
    potential_saving: potentialSaving,
    confidence: 'medium',
    description: `Commodity code may be incorrect - description suggests chapter ${suggestedChapter}`,
    details: {
      current_code: item.commodity_code,
      suggested_chapter: suggestedChapter,
      description: item.description
    }
  };
}

/**
 * Check for overpayment
 */
function checkOverpayment(item, taxes) {
  // Check if tax amounts seem unusually high
  const dutyTax = taxes.find(t => t.tax_type === 'CUST');
  const vatTax = taxes.find(t => t.tax_type === 'VAT');

  if (!dutyTax && !vatTax) {
    return { issue: false, potential_saving: 0 };
  }

  // Check if duty rate seems too high (>20% is unusual for most goods)
  if (dutyTax && item.invoice_value > 0) {
    const effectiveDutyRate = (dutyTax.tax_amount / item.invoice_value) * 100;
    
    if (effectiveDutyRate > 20) {
      return {
        issue: true,
        potential_saving: dutyTax.tax_amount * 0.3, // Estimate 30% could be recovered
        description: `Unusually high duty rate (${effectiveDutyRate.toFixed(1)}%)`,
        details: {
          invoice_value: item.invoice_value,
          duty_paid: dutyTax.tax_amount,
          effective_rate: effectiveDutyRate,
          typical_rate: '0-15%'
        }
      };
    }
  }

  return { issue: false, potential_saving: 0 };
}

/**
 * Detect duplicate payments
 */
function detectDuplicatePayments(declarations) {
  const duplicates = [];
  const seen = new Map();

  for (const declaration of declarations) {
    const key = `${declaration.trader_eori}-${declaration.acceptance_date}-${declaration.total_taxes_paid}`;
    
    if (seen.has(key)) {
      const original = seen.get(key);
      duplicates.push({
        declaration_id: declaration.id,
        mrn: declaration.mrn,
        client_id: declaration.client_id,
        client_name: declaration.client_name,
        acceptance_date: declaration.acceptance_date,
        issues: [{
          type: 'duplicate_payment',
          description: `Possible duplicate of MRN ${original.mrn}`,
          potential_refund: declaration.total_taxes_paid,
          confidence: 'low',
          details: {
            original_mrn: original.mrn,
            duplicate_mrn: declaration.mrn,
            amount: declaration.total_taxes_paid
          }
        }],
        total_potential_refund: declaration.total_taxes_paid
      });
    } else {
      seen.set(key, declaration);
    }
  }

  return duplicates;
}

/**
 * Save opportunities to storage
 */
export function saveOpportunities(userId, opportunities) {
  const saved = [];

  for (const opp of opportunities) {
    const id = uuidv4();
    const opportunity = {
      id,
      user_id: userId,
      ...opp,
      status: 'detected',
      created_at: new Date().toISOString()
    };

    storage.opportunities.set(id, opportunity);
    saved.push(opportunity);
  }

  return saved;
}

/**
 * Get opportunities for user
 */
export function getOpportunities(userId, filters = {}) {
  let opportunities = Array.from(storage.opportunities.values())
    .filter(o => o.user_id === userId);

  if (filters.status) {
    opportunities = opportunities.filter(o => o.status === filters.status);
  }

  if (filters.client_id) {
    opportunities = opportunities.filter(o => o.client_id === filters.client_id);
  }

  if (filters.type) {
    opportunities = opportunities.filter(o => 
      o.issues.some(i => i.type === filters.type)
    );
  }

  return opportunities;
}

/**
 * Mark opportunity as claimed
 */
export function markOpportunityAsClaimed(opportunityId, claimId) {
  const opportunity = storage.opportunities.get(opportunityId);
  if (opportunity) {
    opportunity.status = 'claimed';
    opportunity.claim_id = claimId;
    opportunity.claimed_at = new Date().toISOString();
  }
}
