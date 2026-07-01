import { useState, useEffect } from 'react';
import type {
  AccountCompliance,
  ClaimCompliance,
  ComplianceAlert,
  ComplianceNotification,
  ScoreDistribution,
  IssueBreakdown,
  ClaimsSummary,
} from '@/types';
import {
  getComplianceOverview,
  getAllClaimCompliance,
  getComplianceNotifications,
  markAllNotificationsAsRead,
} from '@/lib/compliance-api';
import {
  calculateOverallScore,
  generateComplianceAlerts,
  calculateScoreDistribution,
  calculateIssuesBreakdown,
  calculateClaimsSummary,
} from '@/lib/compliance-utils';
import { exportToPDF, exportToCSV } from '@/lib/compliance-export';
import { RefreshCw, FileDown, FileSpreadsheet } from 'lucide-react';
import ComplianceAlerts from './compliance/ComplianceAlerts';
import AccountComplianceSection from './compliance/AccountComplianceSection';
import ComplianceAnalytics from './compliance/ComplianceAnalytics';
import ClaimsComplianceTable from './compliance/ClaimsComplianceTable';
import ComplianceNotificationCenter from './compliance/ComplianceNotificationCenter';

export default function ComplianceRevamped() {
  // State management
  const [accountCompliance, setAccountCompliance] = useState<AccountCompliance | null>(null);
  const [claims, setClaims] = useState<ClaimCompliance[]>([]);
  const [notifications, setNotifications] = useState<ComplianceNotification[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Derived state
  const overallScore = calculateOverallScore(accountCompliance, claims);
  const scoreDistribution: ScoreDistribution[] = calculateScoreDistribution(claims);
  const issuesBreakdown: IssueBreakdown[] = calculateIssuesBreakdown(claims);
  const claimsSummary: ClaimsSummary = calculateClaimsSummary(claims);

  // Load initial data
  useEffect(() => {
    loadComplianceData();
  }, []);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    if (claims.length > 0) {
      const interval = setInterval(() => {
        getComplianceNotifications(claims).then(setNotifications);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [claims]);

  // Generate alerts when data changes
  useEffect(() => {
    if (accountCompliance && claims.length > 0) {
      const newAlerts = generateComplianceAlerts(accountCompliance, claims);
      setAlerts(newAlerts.filter((alert) => !dismissedAlerts.has(alert.id)));
    }
  }, [accountCompliance, claims, dismissedAlerts]);

  const loadComplianceData = async () => {
    setIsLoading(true);
    try {
      const [accountData, claimsData] = await Promise.all([
        getComplianceOverview(),
        getAllClaimCompliance(),
      ]);
      setAccountCompliance(accountData);
      setClaims(claimsData);

      // Load notifications
      const notificationsData = await getComplianceNotifications(claimsData);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadComplianceData();
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(accountCompliance, claims, overallScore);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await exportToCSV(claims);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAlertClick = (alert: ComplianceAlert) => {
    if (alert.claimRef) {
      // Navigate to claim detail (would integrate with router)
      console.log('Navigate to claim:', alert.claimRef);
    } else if (alert.accountSection) {
      // Navigate to settings page (would integrate with router)
      console.log('Navigate to account section:', alert.accountSection);
    }
  };

  const handleAlertDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  const handleAccountCardClick = (section: string) => {
    // Navigate to settings page (would integrate with router)
    console.log('Navigate to account section:', section);
  };

  const handleClaimsSummaryClick = (filter: string) => {
    // Apply filter to claims table (would need to pass filter state down)
    console.log('Apply filter:', filter);
  };

  const handleNotificationClick = (notification: ComplianceNotification) => {
    if (notification.claimRef) {
      console.log('Navigate to claim:', notification.claimRef);
    } else if (notification.accountSection) {
      console.log('Navigate to account section:', notification.accountSection);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleActionClick = (action: string, claimRef: string) => {
    switch (action) {
      case 'fix':
        console.log('Navigate to fix issues for claim:', claimRef);
        break;
      case 'view':
        console.log('Navigate to claim detail:', claimRef);
        break;
      case 'assist':
        console.log('Open M Assist for claim:', claimRef);
        // Would integrate with M Assist FAB
        break;
    }
  };

  const handleIssueClick = (issue: string) => {
    console.log('Filter by issue:', issue);
    // Would apply filter to claims table
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Loading compliance data...</p>
        <p style={{ fontSize: '0.875rem' }}>
          Please wait while we fetch your compliance information
        </p>
      </div>
    );
  }

  if (!accountCompliance) {
    return (
      <div className="dashboard">
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Failed to load compliance data
          </p>
          <p style={{ fontSize: '0.875rem' }}>Please refresh the page or contact support</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
        <div className="px-6 py-6" style={{ backgroundColor: 'var(--color-chrome)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Compliance Tracking</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Monitor account-level compliance and submission readiness</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleRefresh} className="btn-secondary" disabled={isExporting}>
                  <RefreshCw size={20} />
                  Refresh
                </button>
                <button onClick={handleExportCSV} className="btn-secondary" disabled={isExporting}>
                  <FileSpreadsheet size={20} />
                  Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="btn-primary btn-compliance"
                  disabled={isExporting}
                >
                  <FileDown size={20} />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Alerts */}
        <ComplianceAlerts
          alerts={alerts}
          onAlertClick={handleAlertClick}
          onDismiss={handleAlertDismiss}
        />

        {/* Account Compliance Section */}
        <AccountComplianceSection
          accountCompliance={accountCompliance}
          overallScore={overallScore}
          claimsSummary={claimsSummary}
          onAccountCardClick={handleAccountCardClick}
          onClaimsSummaryClick={handleClaimsSummaryClick}
        />

        {/* Analytics */}
        {claims.length > 0 && (
          <ComplianceAnalytics
            scoreDistribution={scoreDistribution}
            issuesBreakdown={issuesBreakdown}
            onIssueClick={handleIssueClick}
          />
        )}

        {/* Claims Table */}
        <ClaimsComplianceTable claims={claims} onActionClick={handleActionClick} />

        {/* Notification Center */}
        <ComplianceNotificationCenter
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={handleMarkAllNotificationsRead}
        />
      </main>
    </>
  );
}
