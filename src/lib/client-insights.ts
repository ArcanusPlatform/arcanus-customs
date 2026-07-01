import type { Contact, ClientTask } from '@/types';

export type AgreementStatus = 'active' | 'expiring' | 'required' | 'pending';
export type AuthorisationStatus = 'valid' | 'expiring' | 'missing';
export type DocumentStatus = 'complete' | 'draft' | 'missing';

export interface ClientMeta {
  deferredAccountNumber?: string;
  cdsAgreement: {
    status: AgreementStatus;
    expiresOn?: string;
  };
  agentAuthorisation: {
    status: AuthorisationStatus;
    expiresOn?: string;
  };
  cdsData: {
    declarations: number;
    anomalies: number;
    overpayments: number;
    lastImport?: string;
  };
  claims: {
    total: number;
    inProgress: number;
    approved: number;
    estimatedRefund: number;
    lastClaimDate?: string;
  };
  potentialRefunds: {
    id: string;
    summary: string;
    amount: number;
    reason: string;
    status: 'identified' | 'draft' | 'ready';
    commodityCode?: string;
  }[];
  documents: {
    name: string;
    status: DocumentStatus;
    description: string;
    updated?: string;
  }[];
  tasks: ClientTask[];
  complianceFlags: {
    label: string;
    status: 'ok' | 'warning' | 'alert';
    description: string;
  }[];
  alerts: string[];
}

export interface ClientProfile {
  id: string;
  contact: Contact;
  eori?: string;
  vatNumber?: string;
  bankStatus: 'complete' | 'missing';
  deferredAccountNumber?: string;
  cdsAgreement: ClientMeta['cdsAgreement'];
  agentAuthorisation: ClientMeta['agentAuthorisation'];
  cdsData: ClientMeta['cdsData'];
  claims: ClientMeta['claims'];
  potentialRefunds: ClientMeta['potentialRefunds'];
  documents: ClientMeta['documents'];
  tasks: ClientMeta['tasks'];
  complianceFlags: ClientMeta['complianceFlags'];
  alerts: ClientMeta['alerts'];
  missingFields: string[];
}

const defaultMeta: ClientMeta = {
  deferredAccountNumber: undefined,
  cdsAgreement: { status: 'required' },
  agentAuthorisation: { status: 'missing' },
  cdsData: { declarations: 0, anomalies: 0, overpayments: 0 },
  claims: { total: 0, inProgress: 0, approved: 0, estimatedRefund: 0 },
  potentialRefunds: [],
  documents: [],
  tasks: [],
  complianceFlags: [],
  alerts: [],
};

const automationMeta: Record<string, ClientMeta> = {};

export function buildClientProfile(contact: Contact): ClientProfile {
  const meta =
    (contact as any).client_profile_meta ||
    automationMeta[contact.eori || contact.id] ||
    defaultMeta;
  const hasBankDetails = Boolean(contact.bank_account_number && contact.bank_sort_code);

  const missingFields = [
    !contact.eori ? 'EORI' : null,
    !contact.vat_number ? 'VAT Number' : null,
    !hasBankDetails ? 'Bank Details' : null,
  ].filter(Boolean) as string[];

  return {
    id: contact.id,
    contact,
    eori: contact.eori,
    vatNumber: contact.vat_number,
    bankStatus: hasBankDetails ? 'complete' : 'missing',
    deferredAccountNumber: meta.deferredAccountNumber,
    cdsAgreement: meta.cdsAgreement,
    agentAuthorisation: meta.agentAuthorisation,
    cdsData: meta.cdsData,
    claims: meta.claims,
    potentialRefunds: meta.potentialRefunds,
    documents: meta.documents,
    tasks: meta.tasks,
    complianceFlags: meta.complianceFlags,
    alerts: meta.alerts,
    missingFields,
  };
}

export function getClientMetaByIdentifier(identifier?: string): ClientMeta {
  if (!identifier) return defaultMeta;
  return automationMeta[identifier] || defaultMeta;
}
