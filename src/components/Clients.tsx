import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  FileText,
  Search,
  UploadCloud,
  UserPlus,
} from 'lucide-react';
import { contactsAPI } from '@/lib/api-service';
import type { ClientProfile } from '@/lib/client-insights';
import { buildClientProfile } from '@/lib/client-insights';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import { useSettings } from '@/contexts/SettingsContext';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  valid: 'bg-emerald-100 text-emerald-700',
  ok: 'bg-emerald-100 text-emerald-700',
  ready: 'bg-emerald-100 text-emerald-700',
  expiring: 'bg-amber-100 text-amber-700',
  warning: 'bg-amber-100 text-amber-700',
  pending: 'bg-blue-100 text-blue-700',
  required: 'bg-rose-100 text-rose-700',
  missing: 'bg-rose-100 text-rose-700',
  alert: 'bg-rose-100 text-rose-700',
  overdue: 'text-rose-600 border border-rose-200',
};

function formatDate(date?: string): string {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Clients() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [search, setSearch] = useState('');
  const [focusFilter, setFocusFilter] = useState<'all' | 'missing' | 'agreement' | 'alerts'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'name' | 'city' | 'eori' | 'claims' | 'refund'>(
    'name'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const userType: 'AGENT' | 'SELF' = settings.userType === 'agent' ? 'AGENT' : 'SELF';

  const loadClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await contactsAPI.getContacts({
        type: 'business',
        sort_by: 'name',
        sort_order: 'asc',
        limit: 100,
      });
      const enriched = response.contacts.map(buildClientProfile);
      setClients(enriched);
    } catch (err) {
      console.error('Failed to load clients', err);
      setError(err instanceof Error ? err.message : 'Unable to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userType !== 'AGENT') return;
    loadClients();
  }, [userType]);

  const filteredClients = useMemo(() => {
    let data = [...clients];

    // Apply search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      data = data.filter(
        (client) =>
          client.contact.name.toLowerCase().includes(query) ||
          client.eori?.toLowerCase().includes(query) ||
          client.contact.city?.toLowerCase().includes(query)
      );
    }

    // Apply focus filter
    if (focusFilter === 'missing') {
      data = data.filter((client) => client.missingFields.length > 0);
    } else if (focusFilter === 'agreement') {
      data = data.filter((client) => client.cdsAgreement.status !== 'active');
    } else if (focusFilter === 'alerts') {
      data = data.filter((client) => client.alerts.length > 0);
    }

    // Apply sorting
    data.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortColumn) {
        case 'name':
          aVal = a.contact.name.toLowerCase();
          bVal = b.contact.name.toLowerCase();
          break;
        case 'city':
          aVal = (a.contact.city || '').toLowerCase();
          bVal = (b.contact.city || '').toLowerCase();
          break;
        case 'eori':
          aVal = (a.eori || '').toLowerCase();
          bVal = (b.eori || '').toLowerCase();
          break;
        case 'claims':
          aVal = a.claims.total;
          bVal = b.claims.total;
          break;
        case 'refund':
          aVal = a.claims.estimatedRefund;
          bVal = b.claims.estimatedRefund;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [clients, search, focusFilter, sortColumn, sortDirection]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const summary = useMemo(() => {
    const total = clients.length;
    const needingAgreements = clients.filter(
      (client) => client.cdsAgreement.status !== 'active'
    ).length;
    const missingIdentity = clients.filter((client) => client.missingFields.length > 0).length;
    const openTasks = clients.reduce(
      (sum, client) => sum + client.tasks.filter((task) => task.status !== 'completed').length,
      0
    );
    const estimatedRefund = clients.reduce((sum, client) => sum + client.claims.estimatedRefund, 0);
    return { total, needingAgreements, missingIdentity, openTasks, estimatedRefund };
  }, [clients]);

  if (userType === 'SELF') {
    return (
      <div className="p-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Importer Clients Module</h1>
          <p className="mt-4 text-slate-600">
            Client management is available for Agent accounts that handle refunds for multiple
            importers. Your current plan is configured for self-filing, so client records are not
            required.
          </p>
          <button
            onClick={() => (window.location.href = '/settings')}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Review Settings
          </button>
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
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Clients</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Manage clients and their CDS agreements</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-semibold">
                  Request CDS Report
                </button>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  onClick={() => navigate('/onboarding')}
                >
                  <UserPlus size={20} />
                  Start Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Active Clients
            </p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-semibold text-slate-900">{summary.total}</span>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500">5-year history retained per client</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Need CDS Agreement
            </p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-semibold text-slate-900">
                {summary.needingAgreements}
              </span>
              <FileText className="h-8 w-8 text-amber-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500">Schedule D renewals auto-tracked</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Missing Identity Data
            </p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-semibold text-slate-900">
                {summary.missingIdentity}
              </span>
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500">EORI/VAT/bank coverage</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Estimated Refunds
            </p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-2xl font-semibold text-slate-900">
                {currencyFormatter.format(summary.estimatedRefund)}
              </span>
              <UploadCloud className="h-8 w-8 text-purple-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500">{summary.openTasks} automation tasks open</p>
          </div>
        </div>

        <div className="mt-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search clients by name, EORI, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-full border-0 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Missing Data', value: 'missing' },
                  { label: 'CDS Agreements', value: 'agreement' },
                  { label: 'Alerts', value: 'alerts' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setFocusFilter(filter.value as typeof focusFilter)}
                    className={`rounded-full px-4 py-1 ${
                      focusFilter === filter.value
                        ? 'bg-black text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table View */}
            <div className="mt-5 overflow-x-auto">
              {isLoading ? (
                <p className="py-10 text-center text-sm text-slate-500">Loading clients...</p>
              ) : error ? (
                <p className="py-10 text-center text-sm text-rose-500">{error}</p>
              ) : filteredClients.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No clients match the current filters.
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                        >
                          Client Name
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('city')}
                          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                        >
                          City
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('eori')}
                          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                        >
                          EORI
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        VAT
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        CDS Status
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('claims')}
                          className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                        >
                          Claims
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('refund')}
                          className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                        >
                          Total Refund
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Alerts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className="cursor-pointer transition hover:bg-slate-50"
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {client.contact.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {client.contact.city || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-700">
                            {client.eori || <span className="text-rose-600">Missing</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-700">
                            {client.vatNumber || <span className="text-rose-600">Missing</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusBadgeClasses[client.cdsAgreement.status] ??
                              'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {client.cdsAgreement.status === 'active'
                              ? 'Active'
                              : client.cdsAgreement.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                          {client.claims.total}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                          {currencyFormatter.format(client.claims.estimatedRefund)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {client.alerts.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                              <AlertTriangle className="h-3 w-3" />
                              {client.alerts.length}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
