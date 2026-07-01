import { storage } from '../config/database.js';
import { validateClient, checkCDSStatus } from './client-validator.js';

/**
 * Check claim compliance and readiness for submission
 */
export function checkClaimCompliance(claim) {
  const issues = [];
  let score = 100;

  // Get client
  const client = storage.clients.get(claim.client_id);

  // 1. Check client exists and is valid
  if (!client) {
    issues.push({
      severity: 'critical',
      category: 'client',
      message: 'Client not found',
      fix: 'Assign a valid client to this claim'
    });
    score -= 50;
  } else {
    // Validate client data
    const clientValidation = validateClient(client);
    
    if (!clientValidation.valid) {
      for (const issue of clientValidation.issues) {
        issues.push({
          severity: 'high',
          category: 'client',
          message: `Client: ${issue}`,
          fix: 'Complete client profile in Clients section'
        });
        score -= 5;
      }
    }

    // Check CDS agreement status
    const cdsStatus = checkCDSStatus(client);
    if (cdsStatus.status === 'expired') {
      issues.push({
        severity: 'critical',
        category: 'cds_agreement',
        message: 'Agent authority expired',
        fix: 'Renew agent authority with client'
      });
      score -= 30;
    } else if (cdsStatus.status === 'expiring') {
      issues.push({
        severity: 'medium',
        category: 'cds_agreement',
        message: cdsStatus.alert,
        fix: 'Schedule agent authority renewal'
      });
      score -= 10;
    } else if (cdsStatus.status === 'required') {
      issues.push({
        severity: 'critical',
        category: 'cds_agreement',
        message: 'CDS agreement required',
        fix: 'Obtain CDS agreement from client'
      });
      score -= 30;
    }
  }

  // 2. Check claim data completeness
  if (!claim.mrns || claim.mrns.length === 0) {
    issues.push({
      severity: 'critical',
      category: 'claim_data',
      message: 'No MRNs specified',
      fix: 'Add at least one MRN to the claim'
    });
    score -= 20;
  }

  if (!claim.reason) {
    issues.push({
      severity: 'high',
      category: 'claim_data',
      message: 'Reason not specified',
      fix: 'Select a reason for the claim'
    });
    score -= 10;
  }

  if (!claim.reason_description || claim.reason_description.length < 20) {
    issues.push({
      severity: 'medium',
      category: 'claim_data',
      message: 'Reason description too short or missing',
      fix: 'Provide detailed explanation (minimum 20 characters)'
    });
    score -= 5;
  }

  if (!claim.total_claim_amount || claim.total_claim_amount <= 0) {
    issues.push({
      severity: 'critical',
      category: 'claim_data',
      message: 'Invalid claim amount',
      fix: 'Enter valid claim amount'
    });
    score -= 20;
  }

  if (!claim.items || claim.items.length === 0) {
    issues.push({
      severity: 'high',
      category: 'claim_data',
      message: 'No claim items specified',
      fix: 'Add item details to the claim'
    });
    score -= 15;
  }

  // 3. Check supporting documents
  const documents = Array.from(storage.documents?.values() || [])
    .filter(d => d.claim_id === claim.id);

  if (documents.length === 0) {
    issues.push({
      severity: 'medium',
      category: 'documents',
      message: 'No supporting documents attached',
      fix: 'Upload commercial invoice, packing list, or other evidence'
    });
    score -= 10;
  }

  // Check for required document types
  const requiredDocs = ['commercial_invoice', 'packing_list'];
  const uploadedTypes = documents.map(d => d.document_type);
  
  for (const docType of requiredDocs) {
    if (!uploadedTypes.includes(docType)) {
      issues.push({
        severity: 'medium',
        category: 'documents',
        message: `Missing ${docType.replace('_', ' ')}`,
        fix: `Upload ${docType.replace('_', ' ')}`
      });
      score -= 5;
    }
  }

  // 4. Check declarations exist and are valid
  for (const mrn of claim.mrns || []) {
    const declaration = Array.from(storage.declarations.values())
      .find(d => d.mrn === mrn);

    if (!declaration) {
      issues.push({
        severity: 'high',
        category: 'declarations',
        message: `Declaration ${mrn} not found in system`,
        fix: 'Import declaration data or remove MRN from claim'
      });
      score -= 5;
    } else {
      // Check time limits (3 years from payment date)
      const paymentDate = new Date(declaration.acceptance_date);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      if (paymentDate < threeYearsAgo) {
        issues.push({
          severity: 'critical',
          category: 'time_limit',
          message: `Declaration ${mrn} outside 3-year time limit`,
          fix: 'Remove this MRN - claim period expired'
        });
        score -= 30;
      }

      // Check if declaration has items
      const items = Array.from(storage.items.values())
        .filter(i => i.declaration_id === declaration.id);

      if (items.length === 0) {
        issues.push({
          severity: 'medium',
          category: 'declarations',
          message: `Declaration ${mrn} has no item details`,
          fix: 'Import item-level data for this declaration'
        });
        score -= 5;
      }
    }
  }

  // 5. Check for duplicate claims
  const existingClaims = Array.from(storage.claims?.values() || [])
    .filter(c => 
      c.id !== claim.id && 
      c.client_id === claim.client_id &&
      c.status !== 'rejected' &&
      c.status !== 'withdrawn'
    );

  for (const existingClaim of existingClaims) {
    const duplicateMRNs = (claim.mrns || []).filter(mrn => 
      (existingClaim.mrns || []).includes(mrn)
    );

    if (duplicateMRNs.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'duplicate',
        message: `MRNs already claimed in ${existingClaim.claim_reference}`,
        fix: `Remove duplicate MRNs: ${duplicateMRNs.join(', ')}`
      });
      score -= 20;
    }
  }

  // Calculate final score
  score = Math.max(0, Math.min(100, score));

  // Determine readiness
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const ready_to_submit = score >= 90 && criticalIssues.length === 0;

  return {
    score,
    issues,
    ready_to_submit,
    summary: {
      total_issues: issues.length,
      critical: criticalIssues.length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    },
    recommendation: getRecommendation(score, criticalIssues.length)
  };
}

/**
 * Get recommendation based on compliance score
 */
function getRecommendation(score, criticalCount) {
  if (criticalCount > 0) {
    return 'Fix critical issues before submission';
  }
  
  if (score >= 95) {
    return 'Ready to submit';
  } else if (score >= 90) {
    return 'Ready to submit - minor improvements recommended';
  } else if (score >= 75) {
    return 'Address remaining issues before submission';
  } else if (score >= 50) {
    return 'Significant work needed before submission';
  } else {
    return 'Not ready - complete required information';
  }
}

/**
 * Batch check compliance for multiple claims
 */
export function batchCheckCompliance(claimIds) {
  const results = [];

  for (const claimId of claimIds) {
    const claim = storage.claims.get(claimId);
    if (claim) {
      const compliance = checkClaimCompliance(claim);
      results.push({
        claim_id: claimId,
        claim_reference: claim.claim_reference,
        ...compliance
      });
    }
  }

  return results;
}
