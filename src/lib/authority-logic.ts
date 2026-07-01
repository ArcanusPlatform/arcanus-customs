/**
 * Authority Logic for C285 Claims
 * Determines authority requirements and refund routing based on user type and contact
 */

import type { Contact } from '@/types';
import type { UserType } from '@/contexts/SettingsContext';

export interface AuthorityRequirement {
  required: boolean;
  type: 'signature_required' | 'standing_authority' | 'not_required';
  reason: string;
}

export interface RefundDestinationOptions {
  canPayToClaimant: boolean;
  canPayToAgent: boolean;
  defaultDestination: 'claimant' | 'agent';
  reason: string;
}

/**
 * Determine authority requirements for a claim
 */
export function determineAuthorityRequirement(
  userType: UserType,
  contact?: Contact
): AuthorityRequirement {
  // Self claimants never need authority
  if (userType === 'self') {
    return {
      required: false,
      type: 'not_required',
      reason: 'Self claimant - no authority required',
    };
  }

  // Agent claiming for others
  if (!contact) {
    return {
      required: true,
      type: 'signature_required',
      reason: 'Contact not selected',
    };
  }

  // Check if contact allows agent refund (standing authority)
  if (contact.allows_agent_refund && contact.authority_signed) {
    return {
      required: false,
      type: 'standing_authority',
      reason: 'Standing authority on file',
    };
  }

  // Individual or business without standing authority
  if (contact.type === 'individual' || contact.type === 'business') {
    return {
      required: true,
      type: 'signature_required',
      reason: `${contact.type === 'individual' ? 'Individual' : 'Business'} claimant requires signature authority`,
    };
  }

  // Agent or HMRC contacts
  return {
    required: false,
    type: 'not_required',
    reason: `${contact.type} contact type does not require authority`,
  };
}

/**
 * Determine allowed refund destinations
 */
export function determineRefundDestinations(
  userType: UserType,
  contact?: Contact,
  agentRefundAllowed: boolean = false
): RefundDestinationOptions {
  // Self claimants can only pay to themselves
  if (userType === 'self') {
    return {
      canPayToClaimant: true,
      canPayToAgent: false,
      defaultDestination: 'claimant',
      reason: 'Self claimant - payment to self only',
    };
  }

  // Agent without authority can only pay to claimant
  if (!contact || !contact.allows_agent_refund) {
    return {
      canPayToClaimant: true,
      canPayToAgent: false,
      defaultDestination: 'claimant',
      reason: 'No authority for agent refund - payment to claimant only',
    };
  }

  // Agent with authority can choose
  if (contact.allows_agent_refund && agentRefundAllowed) {
    return {
      canPayToClaimant: true,
      canPayToAgent: true,
      defaultDestination: 'claimant',
      reason: 'Agent has authority - can choose payment destination',
    };
  }

  // Default to claimant
  return {
    canPayToClaimant: true,
    canPayToAgent: false,
    defaultDestination: 'claimant',
    reason: 'Default to claimant payment',
  };
}

/**
 * Validate claim identity completeness
 */
export function validateClaimIdentity(
  userType: UserType,
  systemUserName: string,
  _systemUserEori?: string,
  contact?: Contact
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (userType === 'self') {
    if (!systemUserName) {
      errors.push('System user name is required');
    }
    // EORI is optional for self claimants
  } else {
    // Agent must have contact selected
    if (!contact) {
      errors.push('Contact must be selected for agent claims');
    } else {
      if (!contact.name) {
        errors.push('Contact name is required');
      }
      if (!contact.address) {
        errors.push('Contact address is required');
      }
      if (!contact.email) {
        errors.push('Contact email is required');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
