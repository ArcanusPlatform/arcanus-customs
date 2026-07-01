// Mock API Service for Compliance Data

import type {
  AccountCompliance,
  ClaimCompliance,
  ComplianceDetails,
  ComplianceNotification,
  CheckStatus,
  ComplianceStatus,
  ComplianceClaimStatus,
} from '@/types';

// ============================================
// Helper Functions
// ============================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = () => delay(Math.random() * 300 + 200);

const randomStatus = (): ComplianceStatus => {
  const rand = Math.random();
  if (rand > 0.7) return 'pass';
  if (rand > 0.4) return 'warn';
  return 'fail';
};

const randomCheckStatus = (): CheckStatus => {
  const rand = Math.random();
  if (rand > 0.7) return 'pass';
  if (rand > 0.5) return 'warn';
  if (rand > 0.3) return 'fail';
  return 'missing';
};

const randomClaimStatus = (): ComplianceClaimStatus => {
  const statuses: ComplianceClaimStatus[] = ['Draft', 'In Progress', 'Ready', 'Submitted'];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

const complianceStatusMap: Record<string, ComplianceClaimStatus> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'In Progress',
  approved: 'Ready',
  partially_approved: 'Ready',
  paid: 'Ready',
};

// ============================================
// Mock Data Generators
// ============================================

export const generateAccountCompliance = (): AccountCompliance => {
  const declarantStatus = randomStatus();
  const traderStatus = randomStatus();
  const bankStatus = randomStatus();

  const declarantIssues =
    declarantStatus === 'fail'
      ? ['EORI number not verified', 'Name mismatch with HMRC records']
      : declarantStatus === 'warn'
        ? ['EORI verification pending']
        : [];

  const traderIssues =
    traderStatus === 'fail'
      ? ['Business registration expired', 'VAT number invalid']
      : traderStatus === 'warn'
        ? ['Registration renewal due soon']
        : [];

  const bankIssues =
    bankStatus === 'fail'
      ? ['Account verification failed', 'Sort code invalid']
      : bankStatus === 'warn'
        ? ['Bank details pending verification']
        : [];

  const statusScores = { pass: 100, warn: 75, fail: 40 };
  const overallScore = Math.round(
    (statusScores[declarantStatus] + statusScores[traderStatus] + statusScores[bankStatus]) / 3
  );

  return {
    declarantStatus,
    declarantDetails: {
      name: 'John Smith Trading Ltd',
      eori: 'GB123456789000',
      verified: declarantStatus === 'pass',
      issues: declarantIssues,
    },
    traderProfileStatus: traderStatus,
    traderDetails: {
      businessName: 'Smith Import Export Co',
      registrationNumber: 'GB987654321',
      verified: traderStatus === 'pass',
      issues: traderIssues,
    },
    bankStatus,
    bankDetails: {
      accountName: 'Smith Import Export Co',
      accountNumber: '12345678',
      sortCode: '12-34-56',
      verified: bankStatus === 'pass',
      issues: bankIssues,
    },
    overallScore,
    lastUpdated: new Date(),
  };
};

export const generateClaimCompliance = (index: number): ClaimCompliance => {
  const status = randomClaimStatus();
  const score = Math.floor(Math.random() * 100);
  const issueCount =
    score < 50
      ? Math.floor(Math.random() * 8) + 3
      : score < 75
        ? Math.floor(Math.random() * 4) + 1
        : Math.floor(Math.random() * 2);

  return {
    claimRef: `CLM-2024-${String(index + 1).padStart(4, '0')}`,
    mrn: `24GB${String(Math.floor(Math.random() * 1000000000000)).padStart(12, '0')}`,
    status,
    score,
    issueCount,
    lastChecked: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  };
};

export const generateComplianceDetails = (): ComplianceDetails => {
  const mandatoryDocs = [
    'Commercial Invoice',
    'Bill of Lading',
    'Packing List',
    'Certificate of Origin',
    'Import License',
  ].map((name) => {
    const status = randomCheckStatus();
    return {
      name,
      status,
      uploadedDate:
        status !== 'missing'
          ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          : undefined,
      issues:
        status === 'fail'
          ? [`${name} is incomplete or invalid`]
          : status === 'warn'
            ? [`${name} requires review`]
            : [],
      suggestions:
        status !== 'pass'
          ? [`Upload a valid ${name}`, 'Ensure all required fields are completed']
          : [],
    };
  });

  const supportingDocs = [
    'Insurance Certificate',
    'Quality Certificate',
    'Phytosanitary Certificate',
  ].map((name) => {
    const status = randomCheckStatus();
    return {
      name,
      status,
      uploadedDate:
        status !== 'missing'
          ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          : undefined,
      issues:
        status === 'fail'
          ? [`${name} is incomplete`]
          : status === 'warn'
            ? [`${name} may be required`]
            : [],
      suggestions: status !== 'pass' ? [`Consider uploading ${name}`] : [],
    };
  });

  const tariffStatus = randomCheckStatus();
  const originStatus = randomCheckStatus();
  const declarantMatchStatus = randomCheckStatus();
  const bankMatchStatus = randomCheckStatus();
  const financialStatus = randomCheckStatus();

  return {
    mandatoryDocuments: mandatoryDocs,
    supportingDocuments: supportingDocs,
    tariffEvidence: {
      status: tariffStatus,
      description: 'Tariff classification justification and supporting documentation',
      issues:
        tariffStatus === 'fail'
          ? ['Tariff code not justified', 'Missing classification evidence']
          : tariffStatus === 'warn'
            ? ['Tariff classification requires additional evidence']
            : [],
      suggestions:
        tariffStatus !== 'pass'
          ? ['Provide detailed product description', 'Include technical specifications']
          : [],
    },
    originEvidence: {
      status: originStatus,
      description: 'Preferential or non-preferential origin proof',
      issues:
        originStatus === 'fail'
          ? ['Origin certificate missing', 'Origin declaration invalid']
          : originStatus === 'warn'
            ? ['Origin evidence requires verification']
            : [],
      suggestions:
        originStatus !== 'pass'
          ? ['Upload valid certificate of origin', 'Verify origin declaration']
          : [],
    },
    declarantMatch: {
      status: declarantMatchStatus,
      expected: 'John Smith Trading Ltd (GB123456789000)',
      actual:
        declarantMatchStatus === 'pass'
          ? 'John Smith Trading Ltd (GB123456789000)'
          : 'J Smith Trading (GB123456789000)',
      issues:
        declarantMatchStatus !== 'pass' ? ['Declarant name does not match account identity'] : [],
      suggestions:
        declarantMatchStatus !== 'pass'
          ? ['Update declarant details to match account', 'Verify EORI number']
          : [],
    },
    bankMatch: {
      status: bankMatchStatus,
      expected: 'Smith Import Export Co (12345678)',
      actual:
        bankMatchStatus === 'pass'
          ? 'Smith Import Export Co (12345678)'
          : 'Smith Trading Ltd (87654321)',
      issues: bankMatchStatus !== 'pass' ? ['Bank account does not belong to claim owner'] : [],
      suggestions:
        bankMatchStatus !== 'pass' ? ['Verify bank account ownership', 'Update bank details'] : [],
    },
    financialAccuracy: {
      status: financialStatus,
      calculatedAmount: 15420.5,
      declaredAmount: financialStatus === 'pass' ? 15420.5 : 15500.0,
      variance: financialStatus === 'pass' ? 0 : 79.5,
      issues:
        financialStatus === 'fail'
          ? [
              'Overpayment calculation incorrect',
              'Declared amount does not match calculated amount',
            ]
          : financialStatus === 'warn'
            ? ['Minor variance detected in calculation']
            : [],
      suggestions:
        financialStatus !== 'pass'
          ? ['Review duty calculation', 'Verify exchange rates and tariff rates']
          : [],
    },
  };
};

export const generateNotifications = (claims: ClaimCompliance[]): ComplianceNotification[] => {
  const notifications: ComplianceNotification[] = [];

  // Generate notifications for low-scoring claims
  claims.forEach((claim) => {
    if (claim.score < 75 && Math.random() > 0.5) {
      notifications.push({
        id: `notif-${claim.claimRef}-score`,
        type: claim.score < 50 ? 'critical' : 'warning',
        title: `Compliance score below threshold for ${claim.claimRef}`,
        description: `Current score: ${claim.score}%. ${claim.issueCount} issues require attention.`,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        isRead: Math.random() > 0.6,
        claimRef: claim.claimRef,
      });
    }

    if (claim.issueCount > 3 && Math.random() > 0.7) {
      notifications.push({
        id: `notif-${claim.claimRef}-issues`,
        type: 'critical',
        title: `Multiple issues detected in ${claim.claimRef}`,
        description: `${claim.issueCount} compliance issues require immediate attention.`,
        timestamp: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000),
        isRead: Math.random() > 0.7,
        claimRef: claim.claimRef,
      });
    }
  });

  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// ============================================
// API Functions
// ============================================

export const getComplianceOverview = async (): Promise<AccountCompliance> => {
  await randomDelay();

  // Return a default "all pass" compliance state
  // TODO: Replace with actual API call to fetch real account compliance data
  return {
    declarantStatus: 'pass',
    declarantDetails: {
      name: 'Your Account',
      eori: '',
      verified: true,
      issues: [],
    },
    traderProfileStatus: 'pass',
    traderDetails: {
      businessName: 'Your Business',
      registrationNumber: '',
      verified: true,
      issues: [],
    },
    bankStatus: 'pass',
    bankDetails: {
      accountName: 'Your Bank Account',
      accountNumber: '',
      sortCode: '',
      verified: true,
      issues: [],
    },
    overallScore: 100,
    lastUpdated: new Date(),
  };
};

export const getAllClaimCompliance = async (): Promise<ClaimCompliance[]> => {
  await randomDelay();

  // Fetch user's claims and generate compliance data for each
  const { claimsAPI } = await import('./api-service');

  try {
    const claimsResponse = await claimsAPI.getClaims({ limit: 100 });
    const claims = claimsResponse.claims;

    // Generate compliance data for each claim
    const complianceData: ClaimCompliance[] = claims.map((claim, index) => {
      const compliance = generateClaimCompliance(index);
      const status =
        complianceStatusMap[claim.status] ??
        (claim.status === 'hmrc_query' ? 'In Progress' : 'Ready');

      return {
        claimRef: claim.reference || claim.id,
        mrn: claim.mrn || 'N/A',
        status,
        score: compliance.score,
        issueCount: compliance.issueCount,
        lastChecked: new Date(),
      };
    });

    return complianceData;
  } catch (error) {
    console.error('Failed to load claims for compliance:', error);
    return [];
  }
};

export const getClaimDetails = async (_claimRef: string): Promise<ComplianceDetails> => {
  await randomDelay();

  return generateComplianceDetails();
};

export const getComplianceNotifications = async (
  claims: ClaimCompliance[]
): Promise<ComplianceNotification[]> => {
  await randomDelay();
  return generateNotifications(claims);
};

export const markNotificationAsRead = async (_notificationId: string): Promise<boolean> => {
  await delay(100);
  return true;
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  await delay(150);
  return true;
};
