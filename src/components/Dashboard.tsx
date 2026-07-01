import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Upload,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { getDashboardStats, getClaims } from '@/lib/hybrid-api';
import type { C285Claim } from '@/types';
import KPITile from '@/components/ui/KPITile';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    declarations: 0,
    total_duties: 0,
    claims: 0,
    total_claimed: 0,
    total_approved: 0,
    by_status: {} as Record<string, number>,
  });
  const [recentClaims, setRecentClaims] = useState<C285Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dashStats = await getDashboardStats();
      const claimsData = await getClaims();

      setStats({
        declarations: dashStats.total_declarations || 0,
        total_duties: (dashStats.total_duty_paid || 0) + (dashStats.total_vat_paid || 0),
        claims: dashStats.total_claims || 0,
        total_claimed: dashStats.potential_savings || 0,
        total_approved: dashStats.potential_savings || 0,
        by_status: {
          draft: dashStats.pending_claims || 0,
          submitted: 0,
          approved: dashStats.approved_claims || 0,
        },
      });
      setRecentClaims(claimsData.claims || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const kpis = [
    {
      title: 'Potential Refunds',
      value: isLoading ? '...' : `£${stats.total_duties.toLocaleString()}`,
      trend: stats.claims > 0 ? `${stats.claims} claims identified` : 'No data yet',
      icon: TrendingUp,
      color: 'emerald',
      detail: stats.claims > 0 ? 'Total potential recovery' : 'Start by importing declarations',
    },
    {
      title: 'Claims in Progress',
      value: isLoading
        ? '...'
        : (stats.by_status['draft'] || 0) +
          (stats.by_status['submitted'] || 0) +
          (stats.by_status['under_review'] || 0),
      trend: stats.by_status['submitted']
        ? `${stats.by_status['submitted']} submitted`
        : 'No active claims',
      icon: Clock,
      color: 'blue',
      detail: stats.by_status['draft']
        ? `${stats.by_status['draft']} drafts pending`
        : 'Submit a C285 form to begin',
    },
    {
      title: 'Amount Recovered',
      value: isLoading ? '...' : `£${stats.total_approved.toLocaleString()}`,
      trend:
        stats.by_status['approved'] || stats.by_status['paid']
          ? `${(stats.by_status['approved'] || 0) + (stats.by_status['paid'] || 0)} approved`
          : 'No claims yet',
      icon: CheckCircle2,
      color: 'purple',
      detail:
        stats.total_approved > 0 ? 'Successfully recovered' : 'Track your successful claims here',
    },
    {
      title: 'Success Rate',
      value: isLoading
        ? '...'
        : stats.claims > 0
          ? `${Math.round((((stats.by_status['approved'] || 0) + (stats.by_status['paid'] || 0)) / stats.claims) * 100)}%`
          : '0%',
      trend: stats.claims > 0 ? `${stats.claims} total claims` : 'No data',
      icon: BarChart3,
      color: 'amber',
      detail: stats.claims > 0 ? 'Approval rate' : 'Build your track record',
    },
  ];

  interface DashboardAlert {
    id: string;
    type: 'info' | 'warning' | 'success';
    title: string;
    message: string;
    actionLabel: string;
    action: () => void;
  }

  const alerts: DashboardAlert[] = [];

  // Generate alerts based on data
  if (stats.declarations > 0 && stats.claims === 0) {
    alerts.push({
      id: 'analyze',
      type: 'info',
      title: 'Declarations Ready for Analysis',
      message: `You have ${stats.declarations} declarations that haven't been analyzed yet. Run analysis to detect potential overpayments.`,
      actionLabel: 'Analyze Now',
      action: () => navigate('/analysis'),
    });
  }

  if (stats.by_status['draft'] > 0) {
    alerts.push({
      id: 'drafts',
      type: 'warning',
      title: 'Draft Claims Pending',
      message: `${stats.by_status['draft']} draft claims are waiting to be reviewed and submitted.`,
      actionLabel: 'Review Claims',
      action: () => navigate('/claims'),
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'submitted':
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1);
  };

  const formatReason = (reason: string) => {
    const formats: Record<string, string> = {
      tariff_code_error: 'Incorrect Tariff Code',
      origin_relief: 'Origin Preference Not Applied',
      goods_return: 'Goods Returned',
      goods_destroyed: 'Goods Destroyed',
      vat_postponement: 'VAT Postponement Error',
      incorrect_valuation: 'Incorrect Valuation',
      preference_not_claimed: 'Preference Not Claimed',
      relief_not_applied: 'Relief Not Applied',
      system_error: 'System Error',
      duplicate_payment: 'Duplicate Payment',
      rate_change: 'Rate Change',
      other: 'Other',
    };
    return formats[reason] || reason;
  };

  return (
    <>
      <div className="border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
        <div className="px-6 py-6" style={{ backgroundColor: 'var(--color-chrome)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Dashboard</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Overview of your duty refund operations and compliance status</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate('/clients')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-semibold"
                >
                  Clients
                </button>
                <button
                  onClick={() => navigate('/claims')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-semibold"
                >
                  Claims
                </button>
                <button
                  onClick={() => navigate('/compliance')}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  Compliance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {kpis.map((kpi) => (
            <KPITile
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              subtext={kpi.detail}
              icon={kpi.icon}
              color={kpi.color as any}
              trend={{ value: kpi.trend, direction: 'neutral' }}
            />
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-slate-200">
          {['overview', 'claims', 'alerts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-amber-500 text-amber-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Claims Preview */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Recent Claims</h2>
                <button
                  onClick={() => navigate('/claims')}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
                >
                  View All →
                </button>
              </div>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">Loading claims...</p>
                </div>
              ) : recentClaims.length > 0 ? (
                <div className="space-y-3">
                  {recentClaims.slice(0, 3).map((claim) => (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between border-b border-slate-100 pb-3 cursor-pointer hover:bg-slate-50 px-2 py-2 rounded transition-colors"
                      onClick={() => navigate('/claims')}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          {claim.mrn || claim.reference}
                        </p>
                        <p className="text-sm text-slate-600">{formatReason(claim.reason)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">
                          £{(claim.total_claim_amount || 0).toLocaleString()}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(claim.status)}`}
                        >
                          {getStatusLabel(claim.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 mb-2">No claims yet</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Create your first C285 claim to get started
                  </p>
                  <button
                    onClick={() => navigate('/claims')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Create Claim
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div
                onClick={() => navigate('/onboarding')}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <UserPlus className="h-6 w-6 text-blue-500" />
                  <h3 className="font-semibold text-slate-900">Onboarding Clients</h3>
                </div>
                <p className="text-sm text-slate-600">Update and track to start claims</p>
              </div>

              <div
                onClick={() => navigate('/analysis')}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Search className="h-6 w-6 text-green-500" />
                  <h3 className="font-semibold text-slate-900">Analyze Overpayments</h3>
                </div>
                <p className="text-sm text-slate-600">Detect refund opportunities</p>
              </div>

              <div
                onClick={() => navigate('/manifest')}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Upload className="h-6 w-6 text-purple-500" />
                  <h3 className="font-semibold text-slate-900">Import Declarations</h3>
                </div>
                <p className="text-sm text-slate-600">Upload CSV with customs data</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">All Claims</h2>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search MRN..."
                  className="bg-transparent text-sm focus:outline-none w-40"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">
                      MRN
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate('/claims')}
                    >
                      <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                        {claim.mrn || claim.reference}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {formatReason(claim.reason)}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                        £{(claim.total_claim_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(claim.status)}`}
                        >
                          {getStatusLabel(claim.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {claim.submitted_date
                          ? new Date(claim.submitted_date).toLocaleDateString()
                          : 'Draft'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            {alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow ${
                      alert.type === 'warning'
                        ? 'border-yellow-200 bg-yellow-50'
                        : alert.type === 'success'
                          ? 'border-green-200 bg-green-50'
                          : 'border-blue-200 bg-blue-50'
                    }`}
                    onClick={alert.action}
                  >
                    <div className="flex items-start gap-4">
                      <AlertCircle
                        className={`h-6 w-6 ${
                          alert.type === 'warning'
                            ? 'text-yellow-600'
                            : alert.type === 'success'
                              ? 'text-green-600'
                              : 'text-blue-600'
                        }`}
                      />
                      <div className="flex-1">
                        <h3
                          className={`font-semibold ${
                            alert.type === 'warning'
                              ? 'text-yellow-900'
                              : alert.type === 'success'
                                ? 'text-green-900'
                                : 'text-blue-900'
                          }`}
                        >
                          {alert.title}
                        </h3>
                        <p
                          className={`mt-1 text-sm ${
                            alert.type === 'warning'
                              ? 'text-yellow-800'
                              : alert.type === 'success'
                                ? 'text-green-800'
                                : 'text-blue-800'
                          }`}
                        >
                          {alert.message}
                        </p>
                      </div>
                      <button className="flex-shrink-0 text-sm font-semibold text-amber-600 hover:text-amber-700">
                        {alert.actionLabel} →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-2">No alerts</p>
                <p className="text-sm text-slate-500">You're all caught up!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-600 mt-12">
        <p>© 2025 Arcanus Customs. HMRC C285 Repayment Automation System.</p>
      </footer>
    </>
  );
}
