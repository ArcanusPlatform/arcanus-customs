import { storage } from '../config/database.js';

/**
 * Validate client data completeness and correctness
 */
export function validateClient(client) {
  const issues = [];
  const requiredFields = [];

  // Required fields
  if (!client.company_name) {
    issues.push('Company name required');
    requiredFields.push('company_name');
  }

  if (!client.eori) {
    issues.push('EORI number required');
    requiredFields.push('eori');
  } else if (!isValidEORI(client.eori)) {
    issues.push('Invalid EORI format (expected: GB + 12 digits)');
  }

  if (!client.vat_number) {
    issues.push('VAT number required');
    requiredFields.push('vat_number');
  } else if (!isValidVAT(client.vat_number)) {
    issues.push('Invalid VAT number format (expected: GB + 9 digits)');
  }

  if (!client.address_line1) {
    issues.push('Address required');
    requiredFields.push('address_line1');
  }

  if (!client.city) {
    issues.push('City required');
    requiredFields.push('city');
  }

  if (!client.postcode) {
    issues.push('Postcode required');
    requiredFields.push('postcode');
  }

  if (!client.bank_account_number) {
    issues.push('Bank account number required');
    requiredFields.push('bank_account_number');
  }

  if (!client.bank_sort_code) {
    issues.push('Bank sort code required');
    requiredFields.push('bank_sort_code');
  }

  if (!client.primary_contact_name) {
    issues.push('Primary contact name required');
    requiredFields.push('primary_contact_name');
  }

  if (!client.primary_contact_email) {
    issues.push('Primary contact email required');
    requiredFields.push('primary_contact_email');
  }

  // Calculate completeness
  const completeness = calculateCompleteness(client);

  return {
    valid: issues.length === 0,
    issues,
    requiredFields,
    completeness,
    ready_for_claims: completeness === 100 && issues.length === 0
  };
}

/**
 * Calculate client data completeness percentage
 */
function calculateCompleteness(client) {
  const fields = [
    'company_name',
    'eori',
    'vat_number',
    'address_line1',
    'city',
    'postcode',
    'country',
    'primary_contact_name',
    'primary_contact_email',
    'primary_contact_phone',
    'bank_account_number',
    'bank_sort_code',
    'cds_agreement',
    'agent_authority_expiry',
    'company_number'
  ];

  const completed = fields.filter(f => {
    const value = client[f];
    return value !== null && value !== undefined && value !== '';
  }).length;

  return Math.round((completed / fields.length) * 100);
}

/**
 * Check CDS agreement status
 */
export function checkCDSStatus(client) {
  const now = new Date();
  let status = 'active';
  let alert = null;
  let daysUntilExpiry = null;

  // Check if CDS agreement exists
  if (!client.cds_agreement) {
    status = 'required';
    alert = 'CDS agreement required';
    return { status, alert, daysUntilExpiry };
  }

  // Check agent authority expiry
  if (client.agent_authority_expiry) {
    const expiryDate = new Date(client.agent_authority_expiry);
    daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      status = 'expired';
      alert = 'Agent authority expired';
    } else if (daysUntilExpiry < 30) {
      status = 'expiring';
      alert = `Agent authority expires in ${daysUntilExpiry} days`;
    } else if (daysUntilExpiry < 90) {
      status = 'active';
      alert = `Agent authority expires in ${daysUntilExpiry} days`;
    }
  } else {
    status = 'pending';
    alert = 'Agent authority expiry date not set';
  }

  return { status, alert, daysUntilExpiry };
}

/**
 * Get clients needing attention
 */
export function getClientsNeedingAttention(userId) {
  const clients = Array.from(storage.clients.values())
    .filter(c => c.user_id === userId);

  const missing_data = clients.filter(c => {
    const validation = validateClient(c);
    return validation.completeness < 100;
  }).map(c => ({
    ...c,
    validation: validateClient(c)
  }));

  const expiring_agreements = clients.filter(c => {
    const status = checkCDSStatus(c);
    return status.status === 'expiring' || status.status === 'expired';
  }).map(c => ({
    ...c,
    cds_status: checkCDSStatus(c)
  }));

  const alerts = clients.filter(c => {
    const status = checkCDSStatus(c);
    return status.alert !== null;
  }).map(c => ({
    ...c,
    cds_status: checkCDSStatus(c)
  }));

  return {
    missing_data,
    expiring_agreements,
    alerts,
    summary: {
      total_clients: clients.length,
      missing_data_count: missing_data.length,
      expiring_agreements_count: expiring_agreements.length,
      alerts_count: alerts.length
    }
  };
}

/**
 * Validate EORI format
 */
function isValidEORI(eori) {
  if (!eori) return false;
  // UK EORI: GB + 12 digits or GB + 15 alphanumeric
  return /^GB\d{12}$/.test(eori) || /^GB[A-Z0-9]{15}$/i.test(eori);
}

/**
 * Validate VAT number format
 */
function isValidVAT(vat) {
  if (!vat) return false;
  // UK VAT: GB + 9 digits
  return /^GB\d{9}$/.test(vat);
}
