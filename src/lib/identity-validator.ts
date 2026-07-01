/**
 * Identity Validation Utility
 *
 * This module provides validation functions for HMRC-compliant claim identity rules.
 * It ensures that:
 * - SELF users can only submit claims for their own entity
 * - AGENT users must select a contact (client) for each claim
 * - Declarant information is always pulled from user settings
 * - All claims meet HMRC regulatory requirements
 *
 * Key Concepts:
 * - Declarant: The person completing the C285 form (always the logged-in user)
 * - Claimant: The entity for whom the claim is being submitted (the importer)
 * - SELF User: Submits claims only for their own entity
 * - AGENT User: Submits claims on behalf of clients (contacts)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 11.1-11.5
 */

import type { Contact } from '@/types';

/**
 * User type enum
 * - 'self': User submitting claims for their own entity only
 * - 'agent': User submitting claims on behalf of clients
 */
export type UserType = 'self' | 'agent';

/**
 * Rules for validating claim identity
 * Used to determine if a user can submit a claim with the selected claimant
 */
export interface IdentityValidationRules {
  user_type: UserType;
  user_entity_id?: string; // Required for SELF users
  selected_contact_id?: string; // Required for AGENT users
}

/**
 * Result of identity validation
 * Contains validation status, errors, warnings, and resolved IDs
 */
export interface IdentityValidationResult {
  valid: boolean; // True if validation passed with no errors
  errors: string[]; // Blocking errors that prevent claim submission
  warnings: string[]; // Non-blocking warnings about missing optional data
  claimant_id: string; // Resolved claimant ID (entity_id or contact_id)
  declarant_id: string; // Declarant ID (always current user ID)
}

/**
 * Validate claim identity based on user type and selected contact
 *
 * This is the core validation function that enforces HMRC compliance rules:
 *
 * For SELF users:
 * - Must have entity_id configured in settings
 * - Cannot select a contact (claimant must be themselves)
 * - claimant_id is set to user's entity_id
 *
 * For AGENT users:
 * - Must select a contact from their contact list
 * - Contact must have required information (name, EORI, address)
 * - claimant_id is set to selected contact's ID
 *
 * @param userType - Type of user ('self' or 'agent')
 * @param userEntityId - Entity ID for SELF users (from settings)
 * @param selectedContact - Selected contact for AGENT users (from contact list)
 * @returns Validation result with errors, warnings, and resolved IDs
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function validateClaimIdentity(
  userType: UserType,
  userEntityId: string | undefined,
  selectedContact: Contact | undefined
): IdentityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let claimant_id = '';
  const declarant_id = 'current_user_id'; // Will be replaced with actual user ID in backend

  // Validate SELF user identity rules
  if (userType === 'self') {
    // SELF users must have their entity configured in settings
    // This entity becomes the claimant for all their claims
    if (!userEntityId) {
      errors.push('Self users must have an entity ID configured in settings');
    } else {
      claimant_id = userEntityId;
    }

    // SELF users cannot submit claims for other entities
    // If a contact is selected, this is a validation error
    if (selectedContact) {
      errors.push('Self users cannot submit claims for other entities');
    }
  }
  // Validate AGENT user identity rules
  else if (userType === 'agent') {
    // AGENT users must select a contact (client) for each claim
    // The contact becomes the claimant
    if (!selectedContact) {
      errors.push('Agent users must select a contact to submit a claim');
    } else {
      claimant_id = selectedContact.id;

      // Validate contact has required information for HMRC submission
      // Name is mandatory for claim submission
      if (!selectedContact.name) {
        errors.push('Selected contact must have a name');
      }

      // EORI and address are important but not blocking
      // These generate warnings to prompt user to complete contact info
      if (!selectedContact.eori) {
        warnings.push('Selected contact does not have an EORI number');
      }
      if (!selectedContact.address) {
        warnings.push('Selected contact does not have an address');
      }
    }
  }

  // Return validation result
  // valid = true only if there are no errors (warnings are allowed)
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    claimant_id,
    declarant_id,
  };
}

/**
 * Check if user can create contacts
 *
 * Only AGENT users can create and manage contacts (clients).
 * SELF users submit claims only for themselves and don't need contacts.
 *
 * This function is used to:
 * - Control access to the Contacts page
 * - Show/hide contact management UI elements
 * - Enforce backend authorization rules
 *
 * @param userType - Type of user ('self' or 'agent')
 * @returns true if user can create contacts, false otherwise
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 */
export function canUserCreateContacts(userType: UserType): boolean {
  return userType === 'agent';
}

/**
 * Check if user can submit claims for others
 *
 * Only AGENT users can submit claims on behalf of other entities (clients).
 * SELF users can only submit claims for their own entity.
 *
 * This function is used to:
 * - Show/hide contact selector in claim form
 * - Validate claim submissions
 * - Enforce HMRC compliance rules
 *
 * @param userType - Type of user ('self' or 'agent')
 * @returns true if user can submit for others, false otherwise
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 */
export function canUserSubmitForOthers(userType: UserType): boolean {
  return userType === 'agent';
}

/**
 * Validate declarant capacity value
 *
 * HMRC requires declarant capacity to be one of four approved values.
 * This function validates that the provided capacity matches HMRC requirements.
 *
 * Valid capacities:
 * - 'importer': The person/entity importing the goods
 * - 'agent': A customs broker or freight forwarder acting on behalf of importer
 * - 'duty_representative': A representative authorized to handle duty matters
 * - 'employee_of_importer': An employee of the importing entity
 *
 * This validation is applied:
 * - During user signup (declarant capacity selection)
 * - When admin modifies declarant information
 * - Before claim submission to HMRC
 *
 * @param capacity - Declarant capacity value to validate
 * @returns Object with valid flag and optional error message
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function validateDeclarantCapacity(capacity: string): { valid: boolean; error?: string } {
  // HMRC-approved declarant capacity values
  // These are the only values accepted by HMRC C285 forms
  const validCapacities = ['importer', 'agent', 'duty_representative', 'employee_of_importer'];

  // Check if provided capacity is in the approved list
  if (!validCapacities.includes(capacity)) {
    return {
      valid: false,
      error: `Invalid declarant capacity. Must be one of: ${validCapacities.join(', ')}`,
    };
  }

  return { valid: true };
}
