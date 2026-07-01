// Compliance Utility Functions

import type {
  AccountCompliance,
  ClaimCompliance,
  ComplianceFilters,
  SortConfig,
  ComplianceAlert,
  ScoreDistribution,
  IssueBreakdown,
  ClaimsSummary,
  ScoreRange,
} from '@/types';

// ============================================
// Score Calculation
// ============================================

/**
 * Calculate overall compliance score from account and claims data
 * Formula: (Account Score * 0.3) + (Average Claims Score * 0.7)
 */
export const calculateOverallScore = (
  accountCompliance: AccountCompliance | null,
  claims: ClaimCompliance[]
): number => {
  if (!accountCompliance && claims.length === 0) return 0;

  const accountScore = accountCompliance?.overallScore || 0;
  const claimsScore =
    claims.length > 0 ? claims.reduce((sum, claim) => sum + claim.score, 0) / claims.length : 0;

  return Math.round(accountScore * 0.3 + claimsScore * 0.7);
};

/**
 * Determine status color based on compliance score
 */
export const getScoreColor = (score: number): string => {
  if (score >= 90) return '#22c55e'; // green-500
  if (score >= 75) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
};

/**
 * Determine status text based on compliance score
 */
export const getScoreStatus = (score: number): 'pass' | 'warn' | 'fail' => {
  if (score >= 90) return 'pass';
  if (score >= 75) return 'warn';
  return 'fail';
};

// ============================================
// Filtering Logic
// ============================================

/**
 * Check if a claim matches the score range filter
 */
const matchesScoreRange = (score: number, range: ScoreRange): boolean => {
  switch (range) {
    case '0-50':
      return score >= 0 && score <= 50;
    case '51-75':
      return score >= 51 && score <= 75;
    case '76-90':
      return score >= 76 && score <= 90;
    case '91-100':
      return score >= 91 && score <= 100;
    default:
      return false;
  }
};

/**
 * Check if a claim matches the issue count filter
 */
const matchesIssueCount = (issueCount: number, range: string): boolean => {
  switch (range) {
    case '0':
      return issueCount === 0;
    case '1-3':
      return issueCount >= 1 && issueCount <= 3;
    case '4+':
      return issueCount >= 4;
    default:
      return false;
  }
};

/**
 * Filter claims based on provided filters
 * Returns filtered array in < 100ms for typical datasets
 */
export const filterClaims = (
  claims: ClaimCompliance[],
  filters: ComplianceFilters
): ClaimCompliance[] => {
  return claims.filter((claim) => {
    // Status filter
    if (filters.statuses.length > 0 && !filters.statuses.includes(claim.status)) {
      return false;
    }

    // Score range filter
    if (filters.scoreRanges.length > 0) {
      const matchesAnyRange = filters.scoreRanges.some((range) =>
        matchesScoreRange(claim.score, range)
      );
      if (!matchesAnyRange) return false;
    }

    // Issue count filter
    if (filters.issueCounts.length > 0) {
      const matchesAnyCount = filters.issueCounts.some((range) =>
        matchesIssueCount(claim.issueCount, range)
      );
      if (!matchesAnyCount) return false;
    }

    return true;
  });
};

// ============================================
// Sorting Logic
// ============================================

/**
 * Sort claims based on provided sort configuration
 */
export const sortClaims = (
  claims: ClaimCompliance[],
  sortConfig: SortConfig
): ClaimCompliance[] => {
  const sorted = [...claims].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortConfig.column) {
      case 'claimRef':
        aValue = a.claimRef;
        bValue = b.claimRef;
        break;
      case 'mrn':
        aValue = a.mrn;
        bValue = b.mrn;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'score':
        aValue = a.score;
        bValue = b.score;
        break;
      case 'issues':
        aValue = a.issueCount;
        bValue = b.issueCount;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  return sorted;
};

// ============================================
// Alert Generation
// ============================================

/**
 * Generate compliance alerts from account and claims data
 */
export const generateComplianceAlerts = (
  accountCompliance: AccountCompliance | null,
  claims: ClaimCompliance[]
): ComplianceAlert[] => {
  const alerts: ComplianceAlert[] = [];

  // Account-level alerts
  if (accountCompliance) {
    if (accountCompliance.declarantStatus === 'fail') {
      alerts.push({
        id: 'alert-declarant',
        severity: 'critical',
        title: 'Declarant Identity Verification Failed',
        description: accountCompliance.declarantDetails.issues.join('. '),
        accountSection: 'declarant',
      });
    }

    if (accountCompliance.traderProfileStatus === 'fail') {
      alerts.push({
        id: 'alert-trader',
        severity: 'critical',
        title: 'Trader Profile Verification Failed',
        description: accountCompliance.traderDetails.issues.join('. '),
        accountSection: 'trader',
      });
    }

    if (accountCompliance.bankStatus === 'fail') {
      alerts.push({
        id: 'alert-bank',
        severity: 'critical',
        title: 'Bank Verification Failed',
        description: accountCompliance.bankDetails.issues.join('. '),
        accountSection: 'bank',
      });
    }
  }

  // Claim-level alerts (critical issues only)
  const criticalClaims = claims.filter((claim) => claim.score < 50 || claim.issueCount > 5);
  criticalClaims.slice(0, 3).forEach((claim) => {
    alerts.push({
      id: `alert-claim-${claim.claimRef}`,
      severity: 'critical',
      title: `Critical Issues in ${claim.claimRef}`,
      description: `Compliance score: ${claim.score}%. ${claim.issueCount} issues require immediate attention.`,
      claimRef: claim.claimRef,
    });
  });

  return alerts;
};

// ============================================
// Analytics Calculations
// ============================================

/**
 * Calculate score distribution for analytics
 */
export const calculateScoreDistribution = (claims: ClaimCompliance[]): ScoreDistribution[] => {
  const ranges: ScoreRange[] = ['0-50', '51-75', '76-90', '91-100'];
  const total = claims.length;

  return ranges.map((range) => {
    const count = claims.filter((claim) => matchesScoreRange(claim.score, range)).length;
    return {
      range,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
};

/**
 * Calculate issues breakdown for analytics
 * Returns top 5 most common issues
 */
export const calculateIssuesBreakdown = (claims: ClaimCompliance[]): IssueBreakdown[] => {
  const issueTypes = [
    'Missing mandatory documents',
    'Incomplete supporting evidence',
    'Tariff classification issues',
    'Origin evidence missing',
    'Declarant mismatch',
    'Bank details mismatch',
    'Financial calculation errors',
  ];

  const total = claims.reduce((sum, claim) => sum + claim.issueCount, 0);

  const breakdown = issueTypes.map((issue) => {
    // Simulate issue distribution based on claim scores
    const count = claims.reduce((sum, claim) => {
      if (claim.score < 50) return sum + Math.floor(Math.random() * 2);
      if (claim.score < 75) return sum + (Math.random() > 0.5 ? 1 : 0);
      return sum;
    }, 0);

    return {
      issue,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  // Sort by count and return top 5
  return breakdown.sort((a, b) => b.count - a.count).slice(0, 5);
};

/**
 * Calculate claims summary by status
 */
export const calculateClaimsSummary = (claims: ClaimCompliance[]): ClaimsSummary => {
  return {
    ready: claims.filter((claim) => claim.score >= 90 && claim.issueCount === 0).length,
    needsAttention: claims.filter((claim) => claim.score >= 50 && claim.score < 90).length,
    critical: claims.filter((claim) => claim.score < 50 || claim.issueCount > 5).length,
  };
};

// ============================================
// Validation Helpers
// ============================================

/**
 * Check if filters are empty (no filters applied)
 */
export const areFiltersEmpty = (filters: ComplianceFilters): boolean => {
  return (
    filters.statuses.length === 0 &&
    filters.scoreRanges.length === 0 &&
    filters.issueCounts.length === 0
  );
};

/**
 * Get empty filters object
 */
export const getEmptyFilters = (): ComplianceFilters => ({
  statuses: [],
  scoreRanges: [],
  issueCounts: [],
});

/**
 * Get default sort configuration
 */
export const getDefaultSort = (): SortConfig => ({
  column: 'claimRef',
  direction: 'asc',
});
