/**
 * useAPIError Hook
 *
 * React hook for handling API errors in components
 */

import { useState, useCallback } from 'react';
import { formatErrorForDisplay } from './api-error-handler';

export interface ErrorState {
  title: string;
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Hook for managing API error state in components
 */
export function useAPIError() {
  const [error, setError] = useState<ErrorState | null>(null);

  /**
   * Handle an API error and set the error state
   */
  const handleError = useCallback((err: unknown) => {
    const formatted = formatErrorForDisplay(err);
    setError(formatted);
  }, []);

  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if there is an error
   */
  const hasError = error !== null;

  return {
    error,
    hasError,
    handleError,
    clearError,
  };
}
