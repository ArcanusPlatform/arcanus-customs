import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderOpen,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { contactsAPI, claimsAPI } from '@/lib/api-service';
import type { Contact } from '@/types';
import type { C285Claim } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import ContactModal from '@/components/ContactModal';
import type { ClientProfile } from '@/lib/client-insights';
import { buildClientProfile } from '@/lib/client-insights';
import OnboardingChecklist from '@/components/client/OnboardingChecklist';
import ClientDocuments from '@/components/client/ClientDocuments';
import DocumentTemplateGenerator from '@/components/client/DocumentTemplateGenerator';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

type ClaimPipelineKey = 'pending' | 'submitted' | 'successful' | 'filed';

const claimBuckets: Record<ClaimPipelineKey, { label: string; statuses: C285Claim['status'][] }> = {
  pending: { label: 'Claims Pending', statuses: ['draft', 'under_review'] },
  submitted: { label: 'Claims Submitted', statuses: ['submitted'] },
  successful: { label: 'Claims Successful', statuses: ['approved', 'paid'] },
  filed: {
    label: 'Claims Filed',
    statuses: ['draft', 'submitted', 'under_review', 'approved', 'paid', 'rejected'],
  },
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [contact, setContact] = useState<Contact | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [claims, setClaims] = useState<C285Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isTemplateGeneratorOpen, setIsTemplateGeneratorOpen] = useState(false);

  const userType: 'AGENT' | 'SELF' = settings.userType === 'agent' ? 'AGENT' : 'SELF';

  const loadClient = useCallback(async (clientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await contactsAPI.getContact(clientId);
      if (!resp) {
        setError('Client not found');
        setContact(null);
        setProfile(null);
        setClaims([]);
        return;
      }
      setContact(resp);
      setProfile(buildClientProfile(resp));

      if (resp.eori) {
        const claimResponse = await claimsAPI.getClaims({
          trader_eori: resp.eori,
          sort_by: 'submitted_date',
          sort_order: 'desc',
          limit: 100,
        });
        setClaims(claimResponse.claims);
      } else {
        setClaims([]);
      }
    } catch (err) {
      console.error('Failed to load client detail', err);
      setError(err instanceof Error ? err.message : 'Unable to load client');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id || userType !== 'AGENT') return;
    loadClient(id);
  }, [id, userType, loadClient]);

  const claimPipeline = useMemo(() => {
    const result: Record<ClaimPipelineKey, { count: number; value: number }> = {
      pending: { count: 0, value: 0 },
      submitted: { count: 0, value: 0 },
      successful: { count: 0, value: 0 },
      filed: {
        count: claims.length,
        value: claims.reduce((sum, claim) => sum + claim.total_claim_amount, 0),
      },
    };

    claims.forEach((claim) => {
      const amount = claim.total_claim_amount;
      (Object.entries(claimBuckets) as [ClaimPipelineKey, { statuses: string[] }][]).forEach(
        ([key, bucket]) => {
          if (bucket.statuses.includes(claim.status)) {
            result[key].count += 1;
            result[key].value += amount;
          }
        }
      );
    });

    return result;
  }, [claims]);

  const templateShortcuts = [
    {
      name: 'Client Welcome Pack',
      description: 'Introduction and service overview',
      action: () => setIsTemplateGeneratorOpen(true),
    },
    {
      name: 'Engagement Letter',
      description: 'Terms and conditions',
      action: () => setIsTemplateGeneratorOpen(true),
    },
    {
      name: 'CDS Agreement',
      description: 'Schedule C + B authorization',
      action: () => setIsTemplateGeneratorOpen(true),
    },
  ];

  const openEditModal = () => setIsContactModalOpen(true);
  const closeEditModal = () => setIsContactModalOpen(false);
  const handleContactSaved = (_updated?: Contact) => {
    closeEditModal();
    if (id) {
      loadClient(id);
    }
  };

  if (userType === 'SELF') {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Importer Workspace Restricted</h1>
          <p className="mt-4 text-slate-600">
            Client detail pages are available for Agent accounts. Upgrade your plan or contact
            support to unlock the multi-client workflow.
          </p>
          <button
            className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
            onClick={() => navigate('/settings')}
          >
            Review Plan Options
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-6">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </button>

        {loading ? (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading importer workspace...
          </div>
        ) : error ? (
          <div className="mt-12 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-600 shadow-sm">
            {error}
          </div>
        ) : contact && profile ? (
          <>
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                    Importer
                  </p>
                  <h1 className="mt-2 text-3xl font-bold text-slate-900">{contact.name}</h1>
                  <p className="mt-1 text-sm text-slate-500">{contact.address}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                      EORI {contact.eori ?? 'Missing'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                      VAT {contact.vat_number ?? 'Missing'}
                    </span>
                    {profile.cdsAgreement.status !== 'active' ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">
                        CDS {profile.cdsAgreement.status}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                        CDS Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                    onClick={() => setIsTemplateGeneratorOpen(true)}
                  >
                    Generate Documents
                  </button>
                  <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                    Sync CDS
                  </button>
                  <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                    Export
                  </button>
                  <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                    Add Task
                  </button>
                  <button
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    onClick={openEditModal}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(Object.entries(claimBuckets) as [ClaimPipelineKey, { label: string }][]).map(
                ([key, bucket]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {bucket.label}
                    </p>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold text-slate-900">
                          {claimPipeline[key].count}
                        </p>
                        <p className="text-xs text-slate-500">
                          {currencyFormatter.format(claimPipeline[key].value)}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-amber-500" />
                    </div>
                  </div>
                )
              )}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr,1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <header className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Company Information
                    </p>
                    <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                    <RefreshCw className="h-3.5 w-3.5" /> Sync CH
                  </button>
                </header>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <dl className="text-sm text-slate-600">
                    <dt className="font-semibold text-slate-800">Client Ref</dt>
                    <dd>{contact.id}</dd>
                  </dl>
                  <dl className="text-sm text-slate-600">
                    <dt className="font-semibold text-slate-800">Company Number</dt>
                    <dd>{contact.company_number ?? '—'}</dd>
                  </dl>
                  <dl className="text-sm text-slate-600">
                    <dt className="font-semibold text-slate-800">Primary Contact</dt>
                    <dd>{contact.contact_person ?? '—'}</dd>
                  </dl>
                  <dl className="text-sm text-slate-600">
                    <dt className="font-semibold text-slate-800">Email</dt>
                    <dd>{contact.email}</dd>
                  </dl>
                  <dl className="text-sm text-slate-600">
                    <dt className="font-semibold text-slate-800">Phone</dt>
                    <dd>{contact.phone}</dd>
                  </dl>
                  <dl className="text-sm text-slate-600">
                    <dt className="font-semibold text-slate-800">Bank</dt>
                    <dd>{profile.bankStatus === 'complete' ? 'On file' : 'Missing details'}</dd>
                  </dl>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <header className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Documents History
                    </p>
                    <h2 className="text-xl font-semibold text-slate-900">Schedule & Agreements</h2>
                  </div>
                  <FolderOpen className="h-5 w-5 text-amber-500" />
                </header>
                <ul className="mt-4 space-y-3 text-sm">
                  {profile.documents.length === 0 ? (
                    <li className="text-slate-500">No documents stored yet.</li>
                  ) : (
                    profile.documents.map((doc) => (
                      <li
                        key={doc.name}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{doc.name}</p>
                            <p className="text-xs text-slate-500">{doc.description}</p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              doc.status === 'complete'
                                ? 'bg-emerald-100 text-emerald-700'
                                : doc.status === 'draft'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                        {doc.updated && (
                          <p className="mt-2 text-xs text-slate-400">
                            Updated {new Date(doc.updated).toLocaleDateString('en-GB')}
                          </p>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <OnboardingChecklist clientId={contact.id} />
              <ClientDocuments clientId={contact.id} />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr,1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <header className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Claims
                    </p>
                    <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
                  </div>
                  <FileText className="h-5 w-5 text-blue-500" />
                </header>
                <div className="mt-4 space-y-3">
                  {claims.length === 0 ? (
                    <p className="text-sm text-slate-500">No claims recorded for this importer.</p>
                  ) : (
                    claims.slice(0, 5).map((claim) => (
                      <article
                        key={claim.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-semibold text-slate-900">{claim.reference}</p>
                            <p className="text-xs text-slate-500">{claim.reason_description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">
                              {currencyFormatter.format(claim.total_claim_amount)}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                claim.status === 'approved' || claim.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : claim.status === 'submitted'
                                    ? 'bg-blue-100 text-blue-700'
                                    : claim.status === 'draft'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {claim.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <header className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Templates
                    </p>
                    <h2 className="text-xl font-semibold text-slate-900">Document Kits</h2>
                  </div>
                  <Upload className="h-5 w-5 text-purple-500" />
                </header>
                <div className="mt-4 space-y-3 text-sm">
                  {templateShortcuts.map((template) => (
                    <button
                      key={template.name}
                      onClick={template.action}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:bg-white"
                    >
                      <p className="font-semibold text-slate-900">{template.name}</p>
                      <p className="text-xs text-slate-500">{template.description}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                        Open Template <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {profile.alerts.length > 0 && (
              <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="font-semibold">Compliance Alerts</p>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  {profile.alerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}
      </div>

      {contact && isContactModalOpen && (
        <ContactModal
          contact={contact}
          onClose={closeEditModal}
          onSave={handleContactSaved}
          requireEori={false}
          requireBankDetails={false}
        />
      )}

      {contact && isTemplateGeneratorOpen && (
        <DocumentTemplateGenerator
          client={contact}
          onClose={() => setIsTemplateGeneratorOpen(false)}
        />
      )}
    </div>
  );
}
