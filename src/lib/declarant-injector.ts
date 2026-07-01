/**
 * Declarant Injection Utility
 *
 * Automatically injects declarant information into claim payloads from user settings.
 * Strips any client-provided declarant fields to prevent tampering.
 * Ensures declarant always matches the logged-in user.
 */

import type { UserAccount } from '@/types/user.types';

/**
 * Claim payload interface (partial - only declarant-related fields)
 */
export interface ClaimPayload {
  claimant_id: string;
  declarant_id?: string;
  declarant_name?: string;
  declarant_capacity?: string;
  declarant_organisation_name?: string;
  [key: string]: unknown; // Allow other claim fields
}

/**
 * Inject declarant information from user settings into claim payload
 *
 * This function:
 * 1. Strips any declarant fields from the incoming payload
 * 2. Injects declarant information from user settings
 * 3. Ensures declarant cannot be overridden by client
 *
 * @param payload - The claim payload from the client
 * @param user - The authenticated user account
 * @returns Clean payload with injected declarant info
 */
export function injectDeclarantInfo(payload: ClaimPayload, user: UserAccount): ClaimPayload {
  // Strip any declarant fields from payload to prevent tampering
  const {
    declarant_id,
    declarant_name,
    declarant_capacity,
    declarant_organisation_name,
    ...cleanPayload
  } = payload;

  // Inject declarant information from user settings
  const injectedPayload: ClaimPayload = {
    ...cleanPayload,
    declarant_id: user.id,
    declarant_name: user.declarant_name,
    declarant_capacity: user.declarant_capacity,
  };

  // Add organisation name for AGENT users
  if (user.user_type === 'AGENT' && user.declarant_organisation_name) {
    injectedPayload.declarant_organisation_name = user.declarant_organisation_name;
  }

  // Add identity metadata
  injectedPayload.identity_source = 'SETTINGS';
  injectedPayload.identity_locked_at = new Date().toISOString();

  return injectedPayload;
}

/**
 * Validate that declarant fields are not present in payload
 * Used for pre-submission validation
 */
export function hasDeclarantFields(payload: ClaimPayload): boolean {
  return !!(
    payload.declarant_name ||
    payload.declarant_capacity ||
    payload.declarant_organisation_name
  );
}

/**
 * Get declarant information from user for display purposes
 */
export function getDeclarantInfo(user: UserAccount): {
  name: string;
  capacity: string;
  organisation_name?: string;
} {
  return {
    name: user.declarant_name,
    capacity: user.declarant_capacity,
    organisation_name: user.declarant_organisation_name,
  };
}

/**
 * Validate that user has complete declarant information
 */
export function hasCompleteDeclarantInfo(user: UserAccount): {
  complete: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!user.declarant_name) {
    missing.push('declarant_name');
  }

  if (!user.declarant_capacity) {
    missing.push('declarant_capacity');
  }

  if (user.user_type === 'AGENT' && !user.declarant_organisation_name) {
    missing.push('declarant_organisation_name');
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}
