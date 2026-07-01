/**
 * Identity Validation Error Definitions
 *
 * This module defines standardized error codes and messages for identity validation failures.
 * These errors enforce HMRC compliance rules and prevent unauthorized claim submissions.
 *
 * Error codes follow the pattern IDENTITY_XXX where XXX is a sequential number.
 * HTTP status codes indicate whether the error is:
 * - 400 (Bad Request): Invalid data or validation failure
 * - 403 (Forbidden): Authorization failure or access denied
 *
 * Requirements: 2.5, 3.4, 8.4, 9.2, 9.3, 11.4
 */

/**
 * Structure of an identity validation error
 */
export interface IdentityError {
  code: string; // Unique error code (e.g., 'IDENTITY_001')
  message: string; // User-friendly error message
  httpStatus: number; // HTTP status code for API responses
}

/**
 * Standardized identity validation errors
 *
 * These errors are used throughout the application to enforce identity rules:
 * - Frontend: Display user-friendly error messages
 * - Backend: Return consistent error responses
 * - API: Standardize error handling across endpoints
 */
export const IdentityErrors = {
  /**
   * SELF_CANNOT_CREATE_CONTACTS
   *
   * Thrown when a SELF user attempts to create or manage contacts.
   * SELF users submit claims only for themselves and don't need contacts.
   *
   * Used in:
   * - Contacts page access control
   * - Contact creation API endpoint
   * - Contact management UI
   *
   * Requirements: 2.1, 2.2, 2.3
   */
  SELF_CANNOT_CREATE_CONTACTS: {
    code: 'IDENTITY_001',
    message: 'Self users cannot create contacts. You can only submit claims for your own entity.',
    httpStatus: 403,
  },

  /**
   * SELF_CLAIMANT_MISMATCH
   *
   * Thrown when a SELF user attempts to submit a claim with a claimant_id
   * that doesn't match their own entity_id.
   *
   * This prevents SELF users from submitting claims for other entities,
   * which would violate HMRC compliance rules.
   *
   * Used in:
   * - Claim form validation
   * - Claim submission API endpoint
   * - Backend claim validation
   *
   * Requirements: 2.4, 2.5
   */
  SELF_CLAIMANT_MISMATCH: {
    code: 'IDENTITY_002',
    message:
      'Self users can only submit claims for their own entity. The claimant must match your entity ID.',
    httpStatus: 400,
  },

  /**
   * AGENT_NO_CONTACT_SELECTED
   *
   * Thrown when an AGENT user attempts to submit a claim without selecting
   * a contact (client) as the claimant.
   *
   * AGENT users must always specify which client they're submitting for,
   * as required by HMRC regulations.
   *
   * Used in:
   * - Claim form validation
   * - Claim submission API endpoint
   * - Backend claim validation
   *
   * Requirements: 3.4, 8.4
   */
  AGENT_NO_CONTACT_SELECTED: {
    code: 'IDENTITY_003',
    message:
      'Agent users must select a contact as claimant. Please select a client from your contacts.',
    httpStatus: 400,
  },

  /**
   * DECLARANT_MODIFICATION_DENIED
   *
   * Thrown when a user attempts to modify declarant information
   * (declarant_name, declarant_capacity, declarant_organisation_name).
   *
   * Declarant information is locked after signup and can only be modified
   * by administrators. This ensures HMRC can identify who completed each claim.
   *
   * Used in:
   * - Settings page save validation
   * - Claim submission payload validation
   * - Backend declarant injection middleware
   *
   * Requirements: 4.5, 11.3, 12.4
   */
  DECLARANT_MODIFICATION_DENIED: {
    code: 'IDENTITY_004',
    message:
      'Declarant information cannot be modified. This information is locked and pulled from your account settings.',
    httpStatus: 403,
  },

  /**
   * INVALID_DECLARANT_CAPACITY
   *
   * Thrown when a declarant capacity value doesn't match HMRC-approved values.
   *
   * Valid values: importer, agent, duty_representative, employee_of_importer
   *
   * Used in:
   * - Signup form validation
   * - Admin user modification
   * - Backend declarant validation
   *
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  INVALID_DECLARANT_CAPACITY: {
    code: 'IDENTITY_005',
    message:
      'Invalid declarant capacity value. Must be one of: importer, agent, duty_representative, employee_of_importer',
    httpStatus: 400,
  },
} as const;

/**
 * Check if an error is an identity validation error
 *
 * Type guard function that checks if an unknown error object is an identity error.
 * Identity errors have a code that starts with 'IDENTITY_'.
 *
 * This is useful for:
 * - Error handling in try-catch blocks
 * - Conditional error display logic
 * - Filtering identity errors from other errors
 *
 * @param error - Unknown error object to check
 * @returns true if error is an identity error, false otherwise
 *
 * Example:
 * ```typescript
 * try {
 *   await submitClaim(data);
 * } catch (error) {
 *   if (isIdentityError(error)) {
 *     // Handle identity-specific error
 *     showIdentityErrorAlert(error.message);
 *   } else {
 *     // Handle other errors
 *     showGenericError();
 *   }
 * }
 * ```
 */
export function isIdentityError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('IDENTITY_')
  );
}

/**
 * Get user-friendly error message for identity errors
 *
 * Looks up the error message for a given error code.
 * Returns a generic message if the error code is not found.
 *
 * This function is used to:
 * - Display error messages in the UI
 * - Provide consistent error messaging
 * - Handle unknown error codes gracefully
 *
 * @param errorCode - Error code to look up (e.g., 'IDENTITY_001')
 * @returns User-friendly error message
 *
 * Example:
 * ```typescript
 * const message = getIdentityErrorMessage('IDENTITY_001');
 * // Returns: "Self users cannot create contacts. You can only submit claims for your own entity."
 * ```
 */
export function getIdentityErrorMessage(errorCode: string): string {
  const error = Object.values(IdentityErrors).find((e) => e.code === errorCode);
  return (
    error?.message || 'An identity validation error occurred. Please check your account settings.'
  );
}
