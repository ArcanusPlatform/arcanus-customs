import type { SystemSettings } from '@/contexts/SettingsContext';
import type { Contact } from '@/types';

export type CustomsTemplateCategory = 'onboarding' | 'engagement' | 'cds' | 'claim';

export interface CustomsTemplateDefinition {
  id: string;
  filename: string;
  name: string;
  description: string;
  category: CustomsTemplateCategory;
  placeholders: string[];
}

export interface CustomsTemplateSection {
  title: string;
  description: string;
  categories: CustomsTemplateCategory[];
  icon: string;
}

export type CustomsTemplateData = Record<string, string | number | undefined>;

const NO_DATA = 'No Data';

export const CUSTOMS_CLIENT_TEMPLATE_LIBRARY: CustomsTemplateDefinition[] = [
  {
    id: 'client_onboarding_pack',
    name: 'Client Onboarding Pack',
    description:
      'Complete onboarding pack covering trader details, responsibilities, and next steps.',
    filename: 'client_onboarding_pack.html',
    category: 'onboarding',
    placeholders: ['trader.name', 'trader.eori', 'trader.address', 'agent.company'],
  },
  {
    id: 'trader_information_form',
    name: 'Trader Information Form',
    description: 'Client-ready trader data form for EORI, VAT, contact, and address details.',
    filename: 'trader_information_form.html',
    category: 'onboarding',
    placeholders: ['trader.name', 'trader.eori', 'trader.vat_number'],
  },
  {
    id: 'bank_details_verification',
    name: 'Bank Details Verification',
    description: 'Refund bank verification form pre-filled with available client details.',
    filename: 'bank_details_verification.html',
    category: 'onboarding',
    placeholders: ['trader.name', 'trader.bank_name', 'trader.bank_account'],
  },
  {
    id: 'missing_information_notice',
    name: 'Missing Information Notice',
    description: 'Structured request for outstanding claim or onboarding information.',
    filename: 'missing_information_notice.html',
    category: 'onboarding',
    placeholders: ['trader.name', 'trader.contact_name', 'today'],
  },
  {
    id: 'agent_client_engagement_letter',
    name: 'Agent-Client Engagement Letter',
    description: 'Formal engagement terms for customs repayment and representation work.',
    filename: 'agent_client_engagement_letter.html',
    category: 'engagement',
    placeholders: ['trader.name', 'trader.address', 'agent.company', 'today'],
  },
  {
    id: 'agent_authority_letter',
    name: 'Agent Authority Letter',
    description: 'Client authority for Arcanus Customs to liaise with HMRC on their behalf.',
    filename: 'agent_authority_letter.html',
    category: 'cds',
    placeholders: ['trader.name', 'trader.eori', 'agent.company', 'agent.eori'],
  },
  {
    id: 'declarant_authorisation_letter',
    name: 'Declarant Authorisation Letter',
    description: 'CDS declarant authorisation letter with trader and declarant details.',
    filename: 'declarant_authorisation_letter.html',
    category: 'cds',
    placeholders: ['trader.name', 'trader.eori', 'declarant.name'],
  },
  {
    id: 'hmrc_document_checklist',
    name: 'HMRC Document Checklist',
    description: 'Checklist of required HMRC documents for a C285 submission.',
    filename: 'hmrc_document_checklist.html',
    category: 'claim',
    placeholders: ['trader.name', 'claim.reference'],
  },
  {
    id: 'evidence_checklist',
    name: 'Evidence Checklist',
    description: 'Evidence pack checklist for repayment claims and supporting schedules.',
    filename: 'evidence_checklist.html',
    category: 'claim',
    placeholders: ['claim.reference', 'trader.name', 'claim.reason'],
  },
];

export const CUSTOMS_CLIENT_TEMPLATE_SECTIONS: CustomsTemplateSection[] = [
  {
    title: 'Client Setup',
    description: 'Onboarding, trader details, and refund payment setup documents.',
    categories: ['onboarding'],
    icon: '👥',
  },
  {
    title: 'Engagement & Authority',
    description: 'Engagement letters and authority documents for HMRC representation.',
    categories: ['engagement', 'cds'],
    icon: '📋',
  },
  {
    title: 'Claim Documents',
    description: 'Claim-ready checklists and evidence documents for client files.',
    categories: ['claim'],
    icon: '📄',
  },
];

function valueOrNoData(value?: string | number | null): string | number {
  if (value === undefined || value === null || value === '') return NO_DATA;
  return value;
}

function joinAddress(parts: Array<string | undefined>): string {
  return (
    parts
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ') || NO_DATA
  );
}

function formatLegalEntity(value?: string): string {
  if (!value) return NO_DATA;
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildCustomsTemplateData({
  client,
  settings,
}: {
  client: Contact;
  settings?: Partial<SystemSettings>;
}): CustomsTemplateData {
  const today = new Date().toLocaleDateString('en-GB');
  const year = new Date().getFullYear();
  const agentCompany =
    settings?.companyName ||
    settings?.declarantOrganisationName ||
    settings?.fullName ||
    'Arcanus Customs';
  const agentContact = settings?.agentContact || settings?.fullName || 'Arcanus Customs';

  return {
    document_title: `${client.name} Customs Document`,
    'client.reference': client.id,

    'trader.name': valueOrNoData(client.name),
    'trader.eori': valueOrNoData(client.eori),
    'trader.vat_number': valueOrNoData(client.vat_number),
    'trader.company_number': valueOrNoData(client.company_number),
    'trader.legal_entity_type': formatLegalEntity(client.legal_entity_type),
    'trader.contact_name': valueOrNoData(client.contact_person || client.name),
    'trader.contact_email': valueOrNoData(client.email),
    'trader.contact_phone': valueOrNoData(client.phone),
    'trader.address': joinAddress([
      client.address,
      client.address_line_2,
      client.city,
      client.postcode,
      client.country,
    ]),
    'trader.address_line_1': valueOrNoData(client.address),
    'trader.address_line_2': valueOrNoData(client.address_line_2),
    'trader.city': valueOrNoData(client.city),
    'trader.postcode': valueOrNoData(client.postcode),
    'trader.country': valueOrNoData(client.country || 'United Kingdom'),
    'trader.registered_address_line_1': valueOrNoData(
      client.registered_address_line_1 || client.address
    ),
    'trader.registered_address_line_2': valueOrNoData(
      client.registered_address_line_2 || client.address_line_2
    ),
    'trader.registered_city': valueOrNoData(client.registered_city || client.city),
    'trader.registered_postcode': valueOrNoData(client.registered_postcode || client.postcode),
    'trader.registered_country': valueOrNoData(
      client.registered_country || client.country || 'United Kingdom'
    ),
    'trader.bank_name': valueOrNoData(client.bank_account_name),
    'trader.bank_account': valueOrNoData(client.bank_account_number),
    'trader.bank_account_number': valueOrNoData(client.bank_account_number),
    'trader.bank_sort_code': valueOrNoData(client.bank_sort_code),
    'trader.bank_iban': valueOrNoData(client.bank_iban),
    'bank.bank_name': valueOrNoData(client.bank_account_name),
    'bank.account_name': valueOrNoData(client.bank_account_name),
    'bank.account_number': valueOrNoData(client.bank_account_number),
    'bank.sort_code': valueOrNoData(client.bank_sort_code),
    'bank.iban': valueOrNoData(client.bank_iban),
    'bank.swift_bic': valueOrNoData(client.bank_swift),

    'agent.company': agentCompany,
    'agent.contact': agentContact,
    'agent.email': valueOrNoData(settings?.email || 'support@arcanuscustoms.co.uk'),
    'agent.phone': valueOrNoData(settings?.phone),
    'agent.address': joinAddress([
      settings?.address,
      settings?.address_line_2,
      settings?.city,
      settings?.postcode,
      settings?.country,
    ]),
    'agent.city': valueOrNoData(settings?.city),
    'agent.postcode': valueOrNoData(settings?.postcode),
    'agent.country': valueOrNoData(settings?.country || 'United Kingdom'),
    'agent.eori': valueOrNoData(settings?.eori || settings?.agentId),

    'declarant.name': valueOrNoData(settings?.declarantName || agentContact),
    'declarant.capacity': valueOrNoData(settings?.declarantCapacity || 'Agent'),
    'declarant.organisation': agentCompany,

    'claim.reference': `C285-${client.id}`,
    'claim.reason': 'Duty and VAT repayment review',
    'claim.status': 'Draft',
    'claim.total_claim_amount': NO_DATA,
    'claim.duty_amount': NO_DATA,
    'claim.vat_amount': NO_DATA,
    'claim.mrn': NO_DATA,
    'claim.acceptance_date': NO_DATA,

    today,
    year,
  };
}
