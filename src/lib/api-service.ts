/**
 * API Service Layer
 * Mock implementation until backend is ready
 */

import type { CDSDeclaration, CDSDeclarationFilter } from '@/types';
import type { C285Claim, C285ClaimFilter, C285ClaimListResponse } from '@/types';
import { IdentityErrors, isIdentityError, getIdentityErrorMessage } from './identity-errors';
import type {
  ManifestSummary,
  ImportBatch,
  ManifestDeclaration,
  DeclarationVersion,
  DeclarationEvent,
  AnalysisRecord,
} from '@/types/manifest';
import type {
  OnboardingSummary,
  OnboardingClientEntry,
  ClientDocument as ClientDocumentDto,
  DocumentTemplate as DocumentTemplateDto,
} from '@/types/onboarding';

// In-memory storage (will be replaced with real API calls)
let declarations: CDSDeclaration[] = [];
let claims: C285Claim[] = [];

// Helper functions for data seeding
export function addClaim(claim: C285Claim): void {
  claims.push(claim);
}

// ============================================
// API REQUEST CONFIGURATION
// ============================================

/**
 * User context for API requests
 * This should be set by the auth system when user logs in
 */
interface UserContext {
  user_id: string;
  user_type: 'SELF' | 'AGENT';
  entity_id?: string; // For SELF users
  declarant_name: string;
  declarant_capacity: 'importer' | 'agent' | 'duty_representative' | 'employee_of_importer';
  declarant_organisation_name?: string;
}

let currentUserContext: UserContext | null = null;

/**
 * Set the current user context for API requests
 * This should be called after login with user information
 */
export function setUserContext(context: UserContext): void {
  currentUserContext = context;
}

/**
 * Get the current user context
 */
export function getUserContext(): UserContext | null {
  return currentUserContext;
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  currentUserContext = null;
}

/**
 * Handle API errors with identity validation support
 */
function handleAPIError(error: unknown): never {
  // Check if it's an identity validation error
  if (isIdentityError(error)) {
    throw new Error(getIdentityErrorMessage(error.code));
  }

  // Handle standard errors
  if (error instanceof Error) {
    throw error;
  }

  throw new Error('An unexpected error occurred');
}

const CDS_API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CDS_API_URL) ||
  'http://localhost:3005';

function getStoredAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function cdsRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = options.headers
    ? { ...(options.headers as Record<string, string>) }
    : {};

  if (!isFormData) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }
  headers['Accept'] = 'application/json';
  if (currentUserContext) {
    headers['x-user-id'] = currentUserContext.user_id;
  }
  const token = getStoredAuthToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${CDS_API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

function clientToContact(client: Record<string, any>): Contact {
  const totalClaims = client.total_claims ?? client.claims_count ?? 0;
  const totalClaimed = client.total_claimed ?? 0;

  return {
    id: client.id,
    type: 'business',
    name: client.company_name || client.client_name || client.name || 'Unnamed client',
    contact_person: client.primary_contact_name,
    email: client.primary_contact_email || '',
    phone: client.primary_contact_phone || '',
    address: client.address_line1 || '',
    address_line_2: client.address_line2,
    city: client.city,
    postcode: client.postcode,
    country: client.country || 'GB',
    eori: client.eori,
    vat_number: client.vat_number,
    company_number: client.company_number,
    bank_account_name: client.bank_account_name,
    bank_account_number: client.bank_account_number,
    bank_sort_code: client.bank_sort_code,
    bank_iban: client.bank_iban,
    bank_swift: client.bank_swift,
    allows_agent_refund: client.cds_agreement,
    authority_date: client.cds_agreement_date,
    created_at: client.created_at,
    updated_at: client.updated_at || client.created_at,
    created_by: client.user_id,
    total_claims: totalClaims,
    last_used: client.updated_at || client.created_at,
    ...({
      client_profile_meta: {
        cdsAgreement: {
          status: client.cds_status?.status || (client.cds_agreement ? 'active' : 'required'),
          expiresOn: client.agent_authority_expiry,
        },
        agentAuthorisation: {
          status: client.agent_authority_expiry ? 'valid' : 'missing',
          expiresOn: client.agent_authority_expiry,
        },
        cdsData: {
          declarations: client.declarations_count || 0,
          anomalies: 0,
          overpayments: 0,
        },
        claims: {
          total: totalClaims,
          inProgress: client.in_progress_claims || 0,
          approved: client.approved_claims || 0,
          estimatedRefund: totalClaimed,
        },
        potentialRefunds: [],
        documents: [],
        tasks: [],
        complianceFlags: [],
        alerts: client.validation?.issues || [],
      },
    } as Record<string, any>),
  };
}

function contactToClientPayload(contact: Partial<Contact>): Record<string, any> {
  return {
    company_name: contact.name,
    eori: contact.eori,
    vat_number: contact.vat_number,
    address_line1: contact.address,
    address_line2: contact.address_line_2,
    city: contact.city,
    postcode: contact.postcode,
    country: contact.country || 'GB',
    primary_contact_name: contact.contact_person,
    primary_contact_email: contact.email,
    primary_contact_phone: contact.phone,
    bank_account_name: contact.bank_account_name,
    bank_account_number: contact.bank_account_number,
    bank_sort_code: contact.bank_sort_code,
    bank_iban: contact.bank_iban,
    bank_swift: contact.bank_swift,
    company_number: contact.company_number,
    cds_agreement: contact.allows_agent_refund,
    cds_agreement_date: contact.authority_date,
  };
}

function backendClaimToC285Claim(claim: Record<string, any>): C285Claim {
  const client = claim.client || {};
  const mrn = claim.mrn || claim.mrns?.[0] || claim.declarations?.[0]?.mrn || '';
  const totalClaimAmount = claim.total_claim_amount || 0;

  return {
    id: claim.id,
    reference: claim.reference || claim.claim_reference || claim.id,
    trader_eori: claim.trader_eori || claim.client_eori || client.eori || '',
    trader_name: claim.trader_name || claim.client_name || client.company_name || 'Unknown client',
    company_number: client.company_number,
    trader_address: client.address_line1,
    trader_city: client.city,
    trader_postcode: client.postcode,
    trader_country: client.country,
    contact_name: client.primary_contact_name,
    contact_email: client.primary_contact_email,
    contact_phone: client.primary_contact_phone,
    declarant_id: claim.declarant_id || claim.user_id || '',
    declarant_name: claim.declarant_name || 'Demo User',
    declarant_capacity: claim.declarant_capacity || 'agent',
    claimant_id: claim.claimant_id || claim.client_id || '',
    claimant_type: claim.claimant_type || 'contact',
    identity_source: claim.identity_source || 'SETTINGS',
    identity_locked_at: claim.identity_locked_at || claim.created_at,
    declaration_id: claim.declaration_id,
    mrn,
    reason: claim.reason || 'other',
    reason_description: claim.reason_description || claim.description || 'Demo claim',
    original_duty: claim.original_duty || 0,
    original_vat: claim.original_vat || 0,
    original_excise: claim.original_excise || 0,
    original_total: claim.original_total || totalClaimAmount,
    correct_duty: claim.correct_duty || 0,
    correct_vat: claim.correct_vat || 0,
    correct_excise: claim.correct_excise || 0,
    correct_total: claim.correct_total || 0,
    duty_overpayment: claim.duty_overpayment || totalClaimAmount,
    vat_overpayment: claim.vat_overpayment || 0,
    excise_overpayment: claim.excise_overpayment || 0,
    total_claim_amount: totalClaimAmount,
    status: claim.status || 'draft',
    priority: claim.priority || 'normal',
    compliance_score: claim.compliance_score,
    bank_account_name: client.bank_account_name,
    bank_account_number: client.bank_account_number,
    bank_sort_code: client.bank_sort_code,
    payment_method: claim.payment_method || 'bank_transfer',
    created_by: claim.created_by || claim.user_id || '',
    created_at: claim.created_at,
    updated_at: claim.updated_at || claim.created_at,
    items: claim.items || [],
    documents: claim.documents || [],
  } as C285Claim;
}

function c285ClaimToBackendPayload(claim: Partial<C285Claim>): Record<string, any> {
  return {
    client_id: claim.claimant_id || (claim as any).client_id,
    claim_reference: claim.reference,
    mrns: claim.mrn ? [claim.mrn] : (claim as any).mrns || [],
    reason: claim.reason,
    reason_description: claim.reason_description,
    total_claim_amount: claim.total_claim_amount,
    items: claim.items || [],
    status: claim.status,
  };
}

/**
 * CDS Declaration API
 */
export const cdsAPI = {
  async importDeclarations(files: { header: File; items?: File; tax?: File }) {
    const formData = new FormData();
    formData.append('header', files.header);
    if (files.items) formData.append('items', files.items);
    if (files.tax) formData.append('tax', files.tax);

    const headers: Record<string, string> = {};
    const token = getStoredAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${CDS_API_BASE}/cds/import`, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Upload failed');
    }
    return response.json();
  },

  async getDeclarations(filter?: CDSDeclarationFilter & Record<string, any>) {
    const params = new URLSearchParams();
    if (filter?.mrn) params.set('mrn', filter.mrn);
    if (filter?.client) params.set('client', filter.client);
    if (filter?.status && typeof filter.status === 'string') params.set('status', filter.status);
    if (filter?.batchId) params.set('batchId', filter.batchId);
    if (typeof filter?.hasIssues === 'boolean') params.set('hasIssues', String(filter.hasIssues));
    if (filter?.startDate) params.set('startDate', filter.startDate);
    if (filter?.endDate) params.set('endDate', filter.endDate);
    const qs = params.toString();
    return cdsRequest<{ declarations: ManifestDeclaration[] }>(
      `/cds/declarations${qs ? `?${qs}` : ''}`
    );
  },

  async getDeclaration(id: string): Promise<CDSDeclaration> {
    return cdsRequest<CDSDeclaration>(`/cds/declarations/${id}`);
  },

  async getDeclarationVersions(id: string): Promise<{ versions: DeclarationVersion[] }> {
    return cdsRequest<{ versions: DeclarationVersion[] }>(`/cds/declarations/${id}/versions`);
  },

  async getDeclarationEvents(id: string): Promise<{ events: DeclarationEvent[] }> {
    return cdsRequest<{ events: DeclarationEvent[] }>(`/cds/declarations/${id}/events`);
  },

  async deleteDeclaration(id: string) {
    return cdsRequest<{ success: boolean }>(`/cds/declarations/${id}`, {
      method: 'DELETE',
    });
  },

  async assignClient(id: string, payload: { clientId: string; clientName: string }) {
    return cdsRequest(`/cds/declarations/${id}/assign-client`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async runAutoAnalysis(declarationIds?: string[]) {
    return cdsRequest<{
      success: boolean;
      analyzed_count: number;
      flagged_count: number;
      results: Array<Record<string, any>>;
    }>('/cds/analysis/run', {
      method: 'POST',
      body: JSON.stringify({ declaration_ids: declarationIds || [] }),
    });
  },

  async getAnalysisRecords(filter?: { riskProfile?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (filter?.riskProfile) params.set('riskProfile', filter.riskProfile);
    if (filter?.limit) params.set('limit', String(filter.limit));
    const qs = params.toString();
    return cdsRequest<{ records: AnalysisRecord[] }>(`/cds/analysis/records${qs ? `?${qs}` : ''}`);
  },

  async updateAnalysisRecord(
    id: string,
    payload: {
      human_review_status?: string;
      allocation_status?: string;
      adjusted_record?: Record<string, unknown>;
    }
  ) {
    return cdsRequest<{ success: boolean; record: AnalysisRecord }>(`/cds/analysis/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getStats(): Promise<ManifestSummary> {
    const summary = await cdsRequest<Partial<ManifestSummary> & Record<string, any>>(
      '/cds/manifest/summary'
    );
    const totalDeclarations = summary.totalDeclarations ?? summary.total_declarations ?? 0;
    const recentImports = Array.isArray(summary.recentImports) ? summary.recentImports : [];

    return {
      totalDeclarations,
      uniqueMrns: summary.uniqueMrns ?? summary.unique_mrns ?? totalDeclarations,
      matchedClients: summary.matchedClients ?? summary.matched_clients ?? 0,
      issues: summary.issues ?? 0,
      totalDuties: summary.totalDuties ?? summary.total_duties ?? summary.totalValue ?? 0,
      lastImport: summary.lastImport ?? summary.last_import ?? recentImports[0]?.created_at,
      unchecked: summary.unchecked ?? summary.unchecked_count ?? 0,
      checked: summary.checked ?? summary.checked_count ?? 0,
      adjusted: summary.adjusted ?? summary.adjusted_count ?? 0,
    };
  },

  async getBatches(): Promise<{ batches: ImportBatch[] }> {
    return cdsRequest('/cds/batches');
  },

  async fetchFromHMRC(
    mrn: string
  ): Promise<{ success: boolean; declaration_id: string; mrn: string; message: string }> {
    return cdsRequest(`/cds/hmrc/fetch/${encodeURIComponent(mrn)}`, {
      method: 'POST',
    });
  },

  async syncFromHMRC(payload: { from_date?: string; to_date?: string; eori?: string }) {
    return cdsRequest<{ success: boolean; synced: number; message: string }>('/cds/hmrc/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitHMRCEvent(payload: unknown) {
    return cdsRequest<{ success: boolean; event: DeclarationEvent }>('/cds/hmrc/events', {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
  },
};

export const onboardingAPI = {
  async getClients(): Promise<{ clients: OnboardingClientEntry[] }> {
    const response = await cdsRequest<{ clients: Record<string, any>[] }>('/clients');

    const onboardingClients: OnboardingClientEntry[] = (response.clients || []).map((client) => {
      const hasEori = !!client.eori;
      const hasVat = !!client.vat_number;
      const hasBank = !!(client.bank_account_number && client.bank_sort_code);
      const hasAddress = !!(client.address_line1 && client.city && client.postcode);

      const missingItems: string[] = [];
      if (!hasEori) missingItems.push('EORI Number');
      if (!hasVat) missingItems.push('VAT Number');
      if (!hasBank) missingItems.push('Bank Details');
      if (!hasAddress) missingItems.push('Complete Address');

      const progress =
        typeof client.validation?.completeness === 'number'
          ? client.validation.completeness
          : Math.round(
              ([true, true, hasEori, hasVat, hasBank, hasAddress].filter(Boolean).length / 6) * 100
            );

      let status: OnboardingClientEntry['status'];
      if (progress < 30) status = 'not_started';
      else if (progress < 60) status = 'info_submitted';
      else if (progress < 80) status = 'documents_pending';
      else if (progress < 100) status = 'verification_required';
      else if (!client.cds_agreement) status = 'ready_for_cds';
      else status = 'live';

      return {
        clientId: client.id,
        name: client.company_name,
        contact: client.primary_contact_name || client.primary_contact_email,
        eori: client.eori,
        vat: client.vat_number,
        status,
        progress,
        missingItems,
        missingKeys: missingItems.map((item) => item.toLowerCase().replace(/\s+/g, '_')),
        checklist: [
          { key: 'company_info', label: 'Company information', completed: true },
          { key: 'contact_details', label: 'Contact details', completed: true },
          { key: 'eori', label: 'EORI number', completed: hasEori },
          { key: 'vat', label: 'VAT number', completed: hasVat },
          { key: 'bank', label: 'Bank details', completed: hasBank },
          { key: 'address', label: 'Complete address', completed: hasAddress },
        ],
      };
    });

    return { clients: onboardingClients };
  },
  async getClientSummary(clientId: string): Promise<OnboardingSummary> {
    return cdsRequest(`/clients/${clientId}/onboarding`);
  },
  async updateClientSummary(
    clientId: string,
    payload: Partial<Pick<OnboardingSummary, 'status' | 'progress'> & { missingFields: string[] }>
  ) {
    return cdsRequest(`/clients/${clientId}/onboarding`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async recalculate(clientId: string) {
    return cdsRequest(`/clients/${clientId}/onboarding/recalculate`, { method: 'POST' });
  },
  async listDocuments(clientId: string): Promise<{ documents: ClientDocumentDto[] }> {
    return cdsRequest(`/clients/${clientId}/documents`);
  },
  async uploadDocument(
    clientId: string,
    payload: { file: File; documentType: string; category?: string }
  ) {
    const form = new FormData();
    form.append('file', payload.file);
    form.append('documentType', payload.documentType);
    if (payload.category) form.append('category', payload.category);
    return fetch(`${CDS_API_BASE}/clients/${clientId}/documents/upload`, {
      method: 'POST',
      body: form,
    }).then((r) => r.json());
  },
  async deleteDocument(documentId: string) {
    return cdsRequest(`/documents/${documentId}`, { method: 'DELETE' });
  },
  async listTemplates(): Promise<{ templates: DocumentTemplateDto[] }> {
    return cdsRequest('/document-templates');
  },
  async createTemplate(payload: {
    name: string;
    category?: string;
    content: string;
    placeholders?: string[];
  }) {
    return cdsRequest('/document-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateTemplate(templateId: string, payload: Partial<DocumentTemplateDto>) {
    return cdsRequest(`/document-templates/${templateId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  async deleteTemplate(templateId: string) {
    return cdsRequest(`/document-templates/${templateId}`, { method: 'DELETE' });
  },
};

/**
 * C285 Claims API
 */
export const claimsAPI = {
  /**
   * Get all claims with filtering
   */
  async getClaims(filter?: C285ClaimFilter): Promise<C285ClaimListResponse> {
    const params = new URLSearchParams();
    if (filter?.limit) params.set('limit', String(filter.limit));
    if (filter?.status?.length === 1) params.set('status', filter.status[0]);
    const response = await cdsRequest<{ claims: Record<string, any>[] }>(
      `/claims${params.toString() ? `?${params}` : ''}`
    );
    let filtered = (response.claims || []).map(backendClaimToC285Claim);

    if (filter?.mrn) {
      filtered = filtered.filter((c) => c.mrn?.includes(filter.mrn!));
    }
    if (filter?.trader_eori) {
      filtered = filtered.filter((c) => c.trader_eori === filter.trader_eori);
    }
    if (filter?.reason) {
      filtered = filtered.filter((c) => filter.reason!.includes(c.reason));
    }
    if (filter?.min_amount) {
      filtered = filtered.filter((c) => c.total_claim_amount >= filter.min_amount!);
    }
    if (filter?.max_amount) {
      filtered = filtered.filter((c) => c.total_claim_amount <= filter.max_amount!);
    }

    const limit = filter?.limit || 50;
    const offset = filter?.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);
    const total_value = filtered.reduce((sum, c) => sum + (c.total_claim_amount || 0), 0);
    const pending_value = filtered
      .filter((c) => c.status === 'submitted' || c.status === 'under_review')
      .reduce((sum, c) => sum + (c.total_claim_amount || 0), 0);
    const approved_value = filtered
      .filter((c) => c.status === 'approved' || c.status === 'paid')
      .reduce((sum, c) => sum + (c.total_claim_amount || 0), 0);

    return {
      claims: paginated,
      total_count: filtered.length,
      page: Math.floor(offset / limit) + 1,
      page_size: limit,
      has_more: offset + limit < filtered.length,
      summary: {
        total_value,
        pending_value,
        approved_value,
      },
    };
  },

  /**
   * Get single claim by ID
   */
  async getClaim(id: string): Promise<C285Claim | null> {
    try {
      const claim = await cdsRequest<Record<string, any>>(`/claims/${id}`);
      return backendClaimToC285Claim(claim);
    } catch {
      return null;
    }
  },

  /**
   * Create new claim
   */
  async createClaim(
    claim: Omit<C285Claim, 'id' | 'created_at' | 'updated_at'>
  ): Promise<C285Claim> {
    try {
      const response = await cdsRequest<{ claim: Record<string, any> }>('/claims', {
        method: 'POST',
        body: JSON.stringify(c285ClaimToBackendPayload(claim)),
      });
      return backendClaimToC285Claim(response.claim);
    } catch (error) {
      handleAPIError(error);
    }
  },

  /**
   * Update claim
   */
  async updateClaim(id: string, updates: Partial<C285Claim>): Promise<C285Claim | null> {
    const response = await cdsRequest<{ claim: Record<string, any> }>(`/claims/${id}`, {
      method: 'PUT',
      body: JSON.stringify(c285ClaimToBackendPayload(updates)),
    });
    return backendClaimToC285Claim(response.claim);
  },

  /**
   * Delete claim
   */
  async deleteClaim(id: string): Promise<{ success: boolean }> {
    return cdsRequest<{ success: boolean }>(`/claims/${id}`, { method: 'DELETE' });
  },

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_reason: Record<string, number>;
    total_claimed: number;
    total_approved: number;
  }> {
    const dashboard = await cdsRequest<Record<string, any>>('/claims/dashboard');
    const claimsResponse = await this.getClaims({ limit: 100 });
    const by_reason: Record<string, number> = {};
    claimsResponse.claims.forEach((claim) => {
      by_reason[claim.reason] = (by_reason[claim.reason] || 0) + 1;
    });

    return {
      total: dashboard.total_claims || 0,
      by_status: dashboard.by_status || {},
      by_reason,
      total_claimed: dashboard.total_claimed || 0,
      total_approved: dashboard.total_approved || 0,
    };
  },
};

/**
 * Utility function to simulate API delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clear all data (for testing)
 */
export function clearAllData(): void {
  declarations = [];
  claims = [];
}

/**
 * Get data counts (for debugging)
 */
export function getDataCounts(): { declarations: number; claims: number } {
  return {
    declarations: declarations.length,
    claims: claims.length,
  };
}

/**
 * Refund Analysis API
 */
export const analysisAPI = {
  /**
   * Analyze declarations for overpayments
   */
  async analyzeDeclarations(declaration_ids?: string[]): Promise<{
    success: boolean;
    analyzed: number;
    claims_generated: number;
  }> {
    await delay(1000);

    // This will be implemented with the refund calculator
    // For now, return mock response
    return {
      success: true,
      analyzed: declaration_ids?.length || declarations.length,
      claims_generated: 0,
    };
  },
};

/**
 * Contact API
 */
import type { Contact, ContactFilter, ContactListResponse } from '@/types';

// In-memory storage for contacts with localStorage persistence
const CONTACTS_STORAGE_KEY = 'mdj_contacts';

// Load contacts from localStorage on initialization
const loadContactsFromStorage = (): Contact[] => {
  try {
    const stored = localStorage.getItem(CONTACTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load contacts from storage:', error);
    return [];
  }
};

// Save contacts to localStorage
const saveContactsToStorage = (contactsToSave: Contact[]) => {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contactsToSave));
  } catch (error) {
    console.error('Failed to save contacts to storage:', error);
  }
};

const contacts: Contact[] = loadContactsFromStorage();

// Helper function for data seeding
export function addContact(contact: Contact): void {
  contacts.push(contact);
  saveContactsToStorage(contacts);
}

export const contactsAPI = {
  /**
   * Get all contacts with filtering
   */
  async getContacts(filter?: ContactFilter): Promise<ContactListResponse> {
    try {
      // Validate user context exists
      if (!currentUserContext) {
        throw new Error('User context not set. Please log in again.');
      }

      // SELF users cannot access contacts
      if (currentUserContext.user_type === 'SELF') {
        // Return empty list for SELF users
        return {
          contacts: [],
          total_count: 0,
          page: 1,
          page_size: filter?.limit || 50,
          has_more: false,
        };
      }

      const requestedTypes = filter?.type
        ? Array.isArray(filter.type)
          ? filter.type
          : [filter.type]
        : undefined;

      if (!requestedTypes || requestedTypes.includes('business')) {
        const clientResponse = await cdsRequest<{ clients: Record<string, any>[] }>('/clients');
        let backendContacts = (clientResponse.clients || []).map(clientToContact);

        if (filter?.search) {
          const search = filter.search.toLowerCase();
          backendContacts = backendContacts.filter(
            (c) =>
              c.name.toLowerCase().includes(search) ||
              c.email.toLowerCase().includes(search) ||
              c.eori?.toLowerCase().includes(search)
          );
        }
        if (filter?.has_eori !== undefined) {
          backendContacts = backendContacts.filter((c) => (filter.has_eori ? !!c.eori : !c.eori));
        }
        if (filter?.has_vat !== undefined) {
          backendContacts = backendContacts.filter((c) =>
            filter.has_vat ? !!c.vat_number : !c.vat_number
          );
        }
        if (filter?.has_bank_details !== undefined) {
          backendContacts = backendContacts.filter((c) =>
            filter.has_bank_details
              ? !!(c.bank_account_number && c.bank_sort_code)
              : !(c.bank_account_number && c.bank_sort_code)
          );
        }

        const limit = filter?.limit || 50;
        const offset = filter?.offset || 0;
        const paginated = backendContacts.slice(offset, offset + limit);

        return {
          contacts: paginated,
          total_count: backendContacts.length,
          page: Math.floor(offset / limit) + 1,
          page_size: limit,
          has_more: offset + limit < backendContacts.length,
        };
      }

      await delay(300);

      const userId = currentUserContext.user_id;

      // Filter contacts by current user
      const userContacts = contacts.filter((c) => (c as any).created_by === userId);
      const sourceContacts = userContacts;
      let filtered = [...sourceContacts];

      // Apply filters
      if (filter) {
        if (filter.search) {
          const search = filter.search.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.name.toLowerCase().includes(search) ||
              c.email.toLowerCase().includes(search) ||
              c.eori?.toLowerCase().includes(search)
          );
        }

        if (filter.type) {
          const types = Array.isArray(filter.type) ? filter.type : [filter.type];
          filtered = filtered.filter((c) => types.includes(c.type));
        }

        if (filter.has_eori !== undefined) {
          filtered = filtered.filter((c) => (filter.has_eori ? !!c.eori : !c.eori));
        }

        if (filter.has_vat !== undefined) {
          filtered = filtered.filter((c) => (filter.has_vat ? !!c.vat_number : !c.vat_number));
        }

        if (filter.has_bank_details !== undefined) {
          filtered = filtered.filter((c) =>
            filter.has_bank_details
              ? !!(c.bank_account_number && c.bank_sort_code)
              : !(c.bank_account_number && c.bank_sort_code)
          );
        }

        if (filter.allows_agent_refund !== undefined) {
          filtered = filtered.filter((c) => c.allows_agent_refund === filter.allows_agent_refund);
        }

        // Sorting
        if (filter.sort_by) {
          filtered.sort((a, b) => {
            let aVal: string | number, bVal: string | number;

            switch (filter.sort_by) {
              case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                break;
              case 'created_at':
                aVal = new Date(a.created_at).getTime();
                bVal = new Date(b.created_at).getTime();
                break;
              case 'last_used':
                aVal = a.last_used ? new Date(a.last_used).getTime() : 0;
                bVal = b.last_used ? new Date(b.last_used).getTime() : 0;
                break;
              case 'total_claims':
                aVal = a.total_claims || 0;
                bVal = b.total_claims || 0;
                break;
              default:
                return 0;
            }

            if (filter.sort_order === 'desc') {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }
      }

      // Pagination
      const limit = filter?.limit || 50;
      const offset = filter?.offset || 0;
      const paginated = filtered.slice(offset, offset + limit);

      return {
        contacts: paginated,
        total_count: filtered.length,
        page: Math.floor(offset / limit) + 1,
        page_size: limit,
        has_more: offset + limit < filtered.length,
      };
    } catch (error) {
      handleAPIError(error);
    }
  },

  /**
   * Get contact by ID
   */
  async getContact(id: string): Promise<Contact | null> {
    try {
      const client = await cdsRequest<Record<string, any>>(`/clients/${id}`);
      return clientToContact(client);
    } catch {
      await delay(200);
      return contacts.find((c) => c.id === id) || null;
    }
  },

  /**
   * Create new contact
   */
  async createContact(
    data: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<Contact> {
    try {
      // Validate user context exists
      if (!currentUserContext) {
        throw new Error('User context not set. Please log in again.');
      }

      // SELF users cannot create contacts
      if (currentUserContext.user_type === 'SELF') {
        throw IdentityErrors.SELF_CANNOT_CREATE_CONTACTS;
      }

      if (data.type === 'business') {
        const response = await cdsRequest<{ client: Record<string, any> }>('/clients', {
          method: 'POST',
          body: JSON.stringify(contactToClientPayload(data)),
        });
        return clientToContact(response.client);
      }

      await delay(300);

      const contact: Contact = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: currentUserContext.user_id,
        total_claims: 0,
      };

      contacts.push(contact);
      saveContactsToStorage(contacts);
      return contact;
    } catch (error) {
      handleAPIError(error);
    }
  },

  /**
   * Update contact
   */
  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    try {
      // Validate user context exists
      if (!currentUserContext) {
        throw new Error('User context not set. Please log in again.');
      }

      // SELF users cannot update contacts
      if (currentUserContext.user_type === 'SELF') {
        throw IdentityErrors.SELF_CANNOT_CREATE_CONTACTS;
      }

      if (data.type === 'business' || data.name || data.eori || data.vat_number) {
        try {
          const response = await cdsRequest<{ client: Record<string, any> }>(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(contactToClientPayload(data)),
          });
          return clientToContact(response.client);
        } catch {
          // Fall back to local-only contacts below.
        }
      }

      await delay(300);

      const index = contacts.findIndex((c) => c.id === id);
      if (index === -1) {
        throw new Error('Contact not found');
      }

      contacts[index] = {
        ...contacts[index],
        ...data,
        id, // Preserve ID
        updated_at: new Date().toISOString(),
      };

      saveContactsToStorage(contacts);
      return contacts[index];
    } catch (error) {
      handleAPIError(error);
    }
  },

  /**
   * Delete contact
   */
  async deleteContact(id: string): Promise<void> {
    try {
      // Validate user context exists
      if (!currentUserContext) {
        throw new Error('User context not set. Please log in again.');
      }

      // SELF users cannot delete contacts
      if (currentUserContext.user_type === 'SELF') {
        throw IdentityErrors.SELF_CANNOT_CREATE_CONTACTS;
      }

      try {
        await cdsRequest(`/clients/${id}`, { method: 'DELETE' });
        return;
      } catch {
        // Fall back to local-only contacts below.
      }

      await delay(200);

      const index = contacts.findIndex((c) => c.id === id);
      if (index === -1) {
        throw new Error('Contact not found');
      }

      contacts.splice(index, 1);
      saveContactsToStorage(contacts);
    } catch (error) {
      handleAPIError(error);
    }
  },

  /**
   * Record contact usage (when used in a claim)
   */
  async recordContactUsage(id: string): Promise<void> {
    const contact = contacts.find((c) => c.id === id);
    if (contact) {
      contact.total_claims = (contact.total_claims || 0) + 1;
      contact.last_used = new Date().toISOString();
    }
  },
};
