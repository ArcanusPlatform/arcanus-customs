import { useState } from 'react';
import {
  BarChart3,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Download,
  Search,
  Upload,
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data
  const kpis = [
    {
      title: 'Potential Refunds',
      value: '£47,230',
      trend: '+12%',
      icon: TrendingUp,
      color: 'emerald',
      detail: 'Across 8 eligible declarations',
    },
    {
      title: 'Claims in Progress',
      value: '12',
      trend: '+3 this month',
      icon: Clock,
      color: 'blue',
      detail: 'Avg. 35 days to resolution',
    },
    {
      title: 'Amount Recovered',
      value: '£156,420',
      trend: 'Last 6 months',
      icon: CheckCircle2,
      color: 'purple',
      detail: 'Successfully claimed',
    },
    {
      title: 'Success Rate',
      value: '94%',
      trend: '+2% YoY',
      icon: BarChart3,
      color: 'amber',
      detail: 'Claims accepted by HMRC',
    },
  ];

  const recentClaims = [
    {
      id: 'MRN-001',
      mrn: '23GB001XYZ',
      amount: '£8,450',
      status: 'under_review',
      reason: 'Tariff Code Error',
      submitted: '2025-11-08',
    },
    {
      id: 'MRN-002',
      mrn: '23GB002ABC',
      amount: '£12,200',
      status: 'accepted',
      reason: 'Origin Relief Not Applied',
      submitted: '2025-10-15',
    },
    {
      id: 'MRN-003',
      mrn: '23GB003DEF',
      amount: '£5,890',
      status: 'pending',
      reason: 'Goods Return - Re-export',
      submitted: '2025-11-12',
    },
    {
      id: 'MRN-004',
      mrn: '23GB004GHI',
      amount: '£9,120',
      status: 'evidence_required',
      reason: 'VAT Postponement Account',
      submitted: '2025-11-05',
    },
  ];

  const alerts = [
    {
      id: 1,
      type: 'warning',
      title: 'Evidence Missing',
      message: 'MRN 23GB001XYZ requires updated origin certificate (EUR1 form)',
      actionLabel: 'Upload Now',
    },
    {
      id: 2,
      type: 'info',
      title: 'HMRC Response Received',
      message: 'Query raised on MRN 23GB002ABC. Response deadline: 10 days',
      actionLabel: 'Review',
    },
    {
      id: 3,
      type: 'success',
      title: 'Refund Approved',
      message: 'Claim MRN-002 (£12,200) approved. Funds expected within 5-7 business days',
      actionLabel: 'Details',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'evidence_required':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✓';
      default:
        return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">M Customs Manager</h1>
              <p className="mt-1 text-sm text-slate-600">
                AI-assisted HMRC C285 duty & VAT repayment automation
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600">
              <Plus className="h-5 w-5" />
              New Claim
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const colorClasses = {
              emerald: 'border-emerald-500 bg-emerald-50',
              blue: 'border-blue-500 bg-blue-50',
              purple: 'border-purple-500 bg-purple-50',
              amber: 'border-amber-500 bg-amber-50',
            };
            return (
              <div
                key={kpi.title}
                className={`rounded-xl border-l-4 border-t border-b border-r border-slate-200 ${colorClasses[kpi.color as keyof typeof colorClasses]} bg-white p-6 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{kpi.title}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{kpi.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{kpi.detail}</p>
                  </div>
                  <Icon className={`h-8 w-8 text-${kpi.color}-500`} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-600">{kpi.trend}</p>
              </div>
            );
          })}
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
                <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {recentClaims.slice(0, 3).map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-3"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{claim.mrn}</p>
                      <p className="text-sm text-slate-600">{claim.reason}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{claim.amount}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(claim.status)}`}
                      >
                        {getStatusLabel(claim.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-6 w-6 text-blue-500" />
                  <h3 className="font-semibold text-slate-900">Generate C285</h3>
                </div>
                <p className="text-sm text-slate-600">Create HMRC repayment forms</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Upload className="h-6 w-6 text-green-500" />
                  <h3 className="font-semibold text-slate-900">Upload Evidence</h3>
                </div>
                <p className="text-sm text-slate-600">Add invoices & documents</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Download className="h-6 w-6 text-purple-500" />
                  <h3 className="font-semibold text-slate-900">Export Report</h3>
                </div>
                <p className="text-sm text-slate-600">Download claim summaries</p>
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
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                        {claim.mrn}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">{claim.reason}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                        {claim.amount}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(claim.status)}`}
                        >
                          {getStatusLabel(claim.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">{claim.submitted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 ${
                  alert.type === 'warning'
                    ? 'border-yellow-200 bg-yellow-50'
                    : alert.type === 'success'
                      ? 'border-green-200 bg-green-50'
                      : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{getAlertIcon(alert.type)}</span>
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
                    {alert.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-600 mt-12">
        <p>© 2025 Arcanus Customs. HMRC C285 Repayment Automation System.</p>
      </footer>
    </div>
  );
}
