// Compliance Type Definitions for M Duty Claims Application

// ============================================
// Status Types
// ============================================

export type ComplianceStatus = 'pass' | 'warn' | 'fail';
export type CheckStatus = 'pass' | 'warn' | 'fail' | 'missing';
export type ComplianceClaimStatus = 'Draft' | 'In Progress' | 'Ready' | 'Submitted';

// ============================================
// Account Compliance Types
// ============================================

export interface DeclarantDetails {
  name: string;
  eori: string;
  verified: boolean;
  issues: string[];
}

export interface TraderDetails {
  businessName: string;
  registrationNumber: string;
  verified: boolean;
  issues: string[];
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  sortCode: string;
  verified: boolean;
  issues: string[];
}

export interface AccountCompliance {
  declarantStatus: ComplianceStatus;
  declarantDetails: DeclarantDetails;
  traderProfileStatus: ComplianceStatus;
  traderDetails: TraderDetails;
  bankStatus: ComplianceStatus;
  bankDetails: BankDetails;
  overallScore: number;
  lastUpdated: Date;
}

// ============================================
// Claim Compliance Check Types
// ============================================

export interface DocumentCheck {
  name: string;
  status: CheckStatus;
  uploadedDate?: Date;
  issues: string[];
  suggestions: string[];
}

export interface EvidenceCheck {
  status: CheckStatus;
  description: string;
  issues: string[];
  suggestions: string[];
}

export interface MatchCheck {
  status: CheckStatus;
  expected: string;
  actual: string;
  issues: string[];
  suggestions: string[];
}

export interface AccuracyCheck {
  status: CheckStatus;
  calculatedAmount: number;
  declaredAmount: number;
  variance: number;
  issues: string[];
  suggestions: string[];
}

export interface ComplianceDetails {
  mandatoryDocuments: DocumentCheck[];
  supportingDocuments: DocumentCheck[];
  tariffEvidence: EvidenceCheck;
  originEvidence: EvidenceCheck;
  declarantMatch: MatchCheck;
  bankMatch: MatchCheck;
  financialAccuracy: AccuracyCheck;
}

// ============================================
// Claim Compliance Types
// ============================================

export interface ClaimCompliance {
  claimRef: string;
  mrn: string;
  status: ComplianceClaimStatus;
  score: number;
  issueCount: number;
  lastChecked: Date;
  details?: ComplianceDetails;
}

// ============================================
// Filter and Sort Types
// ============================================

export type ScoreRange = '0-50' | '51-75' | '76-90' | '91-100';
export type IssueCountRange = '0' | '1-3' | '4+';

export interface ComplianceFilters {
  statuses: ComplianceClaimStatus[];
  scoreRanges: ScoreRange[];
  issueCounts: IssueCountRange[];
}

export type SortColumn = 'claimRef' | 'mrn' | 'status' | 'score' | 'issues';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 'warning' | 'critical' | 'info';
export type AlertSeverity = 'critical' | 'warning';
export type AccountSection = 'declarant' | 'trader' | 'bank';

export interface ComplianceNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
  claimRef?: string;
  accountSection?: AccountSection;
}

export interface ComplianceAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  claimRef?: string;
  accountSection?: AccountSection;
}

// ============================================
// Analytics Types
// ============================================

export interface ScoreDistribution {
  range: ScoreRange;
  count: number;
  percentage: number;
}

export interface IssueBreakdown {
  issue: string;
  count: number;
  percentage: number;
}

// ============================================
// Summary Types
// ============================================

export interface ClaimsSummary {
  ready: number;
  needsAttention: number;
  critical: number;
}

// ============================================
// State Management Types
// ============================================

export interface ComplianceState {
  accountCompliance: AccountCompliance | null;
  overallScore: number;
  claims: ClaimCompliance[];
  filteredClaims: ClaimCompliance[];
  expandedClaimId: string | null;
  filters: ComplianceFilters;
  sortConfig: SortConfig;
  isLoading: boolean;
  notifications: ComplianceNotification[];
  scoreDistribution: ScoreDistribution[];
  issuesBreakdown: IssueBreakdown[];
}
