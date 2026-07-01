import { UserCheck, Building2, Banknote } from 'lucide-react';
import type { AccountCompliance, ClaimsSummary } from '@/types';
import OverallScoreCard from './OverallScoreCard';
import AccountStatusCard from './AccountStatusCard';
import ClaimsSummaryCard from './ClaimsSummaryCard';
import styles from '@/styles/compliance.module.css';

interface AccountComplianceSectionProps {
  accountCompliance: AccountCompliance;
  overallScore: number;
  claimsSummary: ClaimsSummary;
  onAccountCardClick: (section: string) => void;
  onClaimsSummaryClick: (filter: string) => void;
}

export default function AccountComplianceSection({
  accountCompliance,
  overallScore,
  claimsSummary,
  onAccountCardClick,
  onClaimsSummaryClick,
}: AccountComplianceSectionProps) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className={styles.accountComplianceGrid}>
        {/* Overall Score Card */}
        <OverallScoreCard score={overallScore} lastUpdated={accountCompliance.lastUpdated} />

        {/* Account Status Cards */}
        <AccountStatusCard
          icon={<UserCheck size={32} />}
          title="Declarant Identity"
          description={accountCompliance.declarantDetails.name}
          status={accountCompliance.declarantStatus}
          issueCount={accountCompliance.declarantDetails.issues.length}
          onClick={() => onAccountCardClick('declarant')}
        />

        <AccountStatusCard
          icon={<Building2 size={32} />}
          title="Trader Profile"
          description={accountCompliance.traderDetails.businessName}
          status={accountCompliance.traderProfileStatus}
          issueCount={accountCompliance.traderDetails.issues.length}
          onClick={() => onAccountCardClick('trader')}
        />

        <AccountStatusCard
          icon={<Banknote size={32} />}
          title="Bank Verification"
          description={`${accountCompliance.bankDetails.accountName}`}
          status={accountCompliance.bankStatus}
          issueCount={accountCompliance.bankDetails.issues.length}
          onClick={() => onAccountCardClick('bank')}
        />
      </div>

      {/* Claims Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <ClaimsSummaryCard
          count={claimsSummary.ready}
          label="Ready to Submit"
          type="ready"
          onClick={() => onClaimsSummaryClick('ready')}
        />

        <ClaimsSummaryCard
          count={claimsSummary.needsAttention}
          label="Needs Attention"
          type="needsAttention"
          onClick={() => onClaimsSummaryClick('needsAttention')}
        />

        <ClaimsSummaryCard
          count={claimsSummary.critical}
          label="Critical Issues"
          type="critical"
          onClick={() => onClaimsSummaryClick('critical')}
        />
      </div>
    </div>
  );
}
