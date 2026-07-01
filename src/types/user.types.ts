/**
 * User Account and Identity Types
 *
 * Defines user types, entity types, and declarant capacity for HMRC compliance.
 * These types enforce the distinction between Self Users and Agent Users.
 */

export type UserType = 'SELF' | 'AGENT';

export type EntityType =
  | 'PERSON'
  | 'SOLE_TRADER'
  | 'PARTNERSHIP'
  | 'LTD_COMPANY'
  | 'LLP'
  | 'CHARITY'
  | 'TRUST'
  | 'OTHER_ORGANISATION';

export type DeclarantCapacity =
  | 'importer'
  | 'agent'
  | 'duty_representative'
  | 'employee_of_importer';

export interface UserAccount {
  // Core identity
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;

  // User type (immutable after signup)
  user_type: UserType;

  // Declarant information (locked after signup)
  declarant_name: string;
  declarant_capacity: DeclarantCapacity;
  declarant_organisation_name?: string; // Required for AGENT only

  // Entity information (for SELF users)
  entity_type?: EntityType;
  entity_name?: string;
  entity_id?: string; // Reference to user's own entity

  // Contact details
  phone?: string;
  address?: string;
  address_line_2?: string;
  city?: string;
  postcode?: string;
  country?: string;

  // Tax registration
  eori?: string;
  vat_number?: string;
  company_number?: string;

  // Bank details (SELF users)
  bank_account_name?: string;
  bank_account_number?: string;
  bank_sort_code?: string;
  bank_iban?: string;
  bank_swift?: string;

  // Agent-specific
  agent_eori?: string;
  agent_registered_address?: string;
  agent_trading_address?: string;

  // HMRC Gateway
  hmrc_gateway_user_id?: string;
  hmrc_gateway_password_encrypted?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  last_login?: string;

  // Admin flags
  is_admin?: boolean;
  declarant_locked: boolean; // Always true except for admins
}

/**
 * Signup form data structure
 */
export interface SignupFormData {
  // Step 1: Basic account
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirm: string;

  // Step 2: User type
  user_type: UserType;

  // Step 3: Declarant info
  declarant_name: string;
  declarant_capacity: DeclarantCapacity;
  declarant_organisation_name?: string; // Conditional on AGENT

  // Step 4: Entity info (SELF only)
  entity_type?: EntityType;
}

/**
 * Signup validation result
 */
export interface SignupValidation {
  valid: boolean;
  errors: Record<string, string>;
  step: number; // Current step with errors
}

/**
 * Declarant information structure
 */
export interface DeclarantInfo {
  name: string;
  capacity: DeclarantCapacity;
  organisation_name?: string;
}

/**
 * Entity type labels for UI display
 */
export const EntityTypeLabels: Record<EntityType, string> = {
  PERSON: 'Individual Person',
  SOLE_TRADER: 'Sole Trader',
  PARTNERSHIP: 'Partnership',
  LTD_COMPANY: 'Limited Company (Ltd)',
  LLP: 'Limited Liability Partnership (LLP)',
  CHARITY: 'Charity',
  TRUST: 'Trust',
  OTHER_ORGANISATION: 'Other Organisation',
};

/**
 * Declarant capacity labels for UI display
 */
export const DeclarantCapacityLabels: Record<DeclarantCapacity, string> = {
  importer: 'Importer',
  agent: 'Agent',
  duty_representative: 'Duty Representative',
  employee_of_importer: 'Employee of Importer',
};

/**
 * Declarant capacity descriptions for UI tooltips
 */
export const DeclarantCapacityDescriptions: Record<DeclarantCapacity, string> = {
  importer: 'You are the importer submitting claims for your own imports',
  agent: 'You are an agent submitting claims on behalf of clients',
  duty_representative: 'You are a duty representative acting for importers',
  employee_of_importer: 'You are an employee submitting claims for your employer',
};
