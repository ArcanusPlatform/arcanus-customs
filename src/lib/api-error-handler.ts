/**
 * API Error Handler
 *
 * Provides utilities for handling and displaying API errors,
 * especially identity validation errors
 */

import { IdentityErrors, isIdentityError, getIdentityErrorMessage } from './identity-errors';

export interface APIError {
  message: string;
  code?: string;
  isIdentityError: boolean;
  originalError: unknown;
}

/**
 * Parse an API error into a structured format
 */
export function parseAPIError(error: unknown): APIError {
  // Check if it's an identity error
  if (isIdentityError(error)) {
    return {
      message: getIdentityErrorMessage(error.code),
      code: error.code,
      isIdentityError: true,
      originalError: error,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      isIdentityError: false,
      originalError: error,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      isIdentityError: false,
      originalError: error,
    };
  }

  // Unknown error type
  return {
    message: 'An unexpected error occurred. Please try again.',
    isIdentityError: false,
    originalError: error,
  };
}

/**
 * Display error message with appropriate styling
 * Returns an object with message and severity level
 */
export function getErrorDisplay(error: unknown): {
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
} {
  const parsed = parseAPIError(error);

  // Identity errors are typically user errors (not system errors)
  if (parsed.isIdentityError) {
    return {
      message: parsed.message,
      severity: 'warning',
      code: parsed.code,
    };
  }

  // Other errors are system errors
  return {
    message: parsed.message,
    severity: 'error',
    code: parsed.code,
  };
}

/**
 * Check if error is a specific identity error
 */
export function isSpecificIdentityError(
  error: unknown,
  errorType: keyof typeof IdentityErrors
): boolean {
  if (!isIdentityError(error)) {
    return false;
  }

  return error.code === IdentityErrors[errorType].code;
}

/**
 * Get user-friendly action message based on error type
 */
export function getErrorAction(error: unknown): string | null {
  if (!isIdentityError(error)) {
    return null;
  }

  const errorCode = error.code;

  switch (errorCode) {
    case IdentityErrors.SELF_CANNOT_CREATE_CONTACTS.code:
      return 'If you need to submit claims for clients, please contact support to upgrade to an Agent account.';

    case IdentityErrors.SELF_CLAIMANT_MISMATCH.code:
      return 'Please ensure you are submitting the claim for your own entity. Check your Settings to verify your entity information.';

    case IdentityErrors.AGENT_NO_CONTACT_SELECTED.code:
      return 'Please select a contact from your contacts list before submitting the claim.';

    case IdentityErrors.DECLARANT_MODIFICATION_DENIED.code:
      return 'If you need to update your declarant information, please contact an administrator.';

    case IdentityErrors.INVALID_DECLARANT_CAPACITY.code:
      return 'Please select a valid declarant capacity from the dropdown menu.';

    default:
      return null;
  }
}

/**
 * Format error for display in UI components
 */
export function formatErrorForDisplay(error: unknown): {
  title: string;
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
} {
  const display = getErrorDisplay(error);
  const action = getErrorAction(error);

  return {
    title: display.severity === 'warning' ? 'Action Required' : 'Error',
    message: display.message,
    action: action || undefined,
    severity: display.severity,
  };
}
