import { useState } from 'react';
import { Plus, FileEdit, Eye, FileText, Folder, Search } from 'lucide-react';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import { generateDocument, getSampleData } from '@/lib/templateGenerator';

interface TemplateLibraryItem {
  filename: string;
  name: string;
  description: string;
  category: string;
  placeholders: string[];
}

// Available templates from the library
const TEMPLATE_LIBRARY: TemplateLibraryItem[] = [
  // Onboarding
  {
    filename: 'client_onboarding_pack.html',
    name: 'Client Onboarding Pack',
    description: 'Complete onboarding information and requirements',
    category: 'Onboarding',
    placeholders: ['trader.name', 'trader.eori', 'trader.address', 'agent.company'],
  },
  {
    filename: 'trader_information_form.html',
    name: 'Trader Information Form',
    description: 'Collect essential client business details',
    category: 'Onboarding',
    placeholders: ['trader.name', 'trader.eori', 'trader.vat_number'],
  },
  {
    filename: 'bank_details_verification.html',
    name: 'Bank Details Verification',
    description: 'Verify client banking information for refunds',
    category: 'Onboarding',
    placeholders: ['trader.name', 'trader.bank_name', 'trader.bank_account'],
  },
  {
    filename: 'missing_information_notice.html',
    name: 'Missing Information Notice',
    description: 'Request for outstanding client information',
    category: 'Onboarding',
    placeholders: ['trader.name', 'trader.contact_name', 'today'],
  },
  {
    filename: 'eori_business_structure_guide.html',
    name: 'EORI & Business Structure Guide',
    description: 'Guide for EORI registration and business setup',
    category: 'Onboarding',
    placeholders: ['trader.name', 'trader.legal_entity_type'],
  },

  // Engagement
  {
    filename: 'agent_client_engagement_letter.html',
    name: 'Agent-Client Engagement Letter',
    description: 'Formal engagement terms and conditions',
    category: 'Engagement',
    placeholders: ['trader.name', 'trader.address', 'agent.company', 'today'],
  },

  // CDS Authorization
  {
    filename: 'agent_authority_letter.html',
    name: 'Agent Authority Letter',
    description: 'Authorization for agent to act on behalf of client',
    category: 'CDS Authorization',
    placeholders: ['trader.name', 'trader.eori', 'agent.company', 'agent.eori'],
  },
  {
    filename: 'declarant_authorisation_letter.html',
    name: 'Declarant Authorisation Letter',
    description: 'CDS declarant authorization',
    category: 'CDS Authorization',
    placeholders: ['trader.name', 'trader.eori', 'declarant.name'],
  },
  {
    filename: 'hmrc_document_checklist.html',
    name: 'HMRC Document Checklist',
    description: 'Required documents for HMRC submission',
    category: 'CDS Authorization',
    placeholders: ['trader.name', 'claim.reference'],
  },
  {
    filename: 'cds_mapping_sheet.html',
    name: 'CDS Mapping Sheet',
    description: 'CDS data field mapping reference',
    category: 'CDS Authorization',
    placeholders: ['trader.name', 'trader.eori'],
  },

  // Claims & Submissions
  {
    filename: 'C285 CLAIM PACK.html',
    name: 'C285 Claim Pack',
    description: 'Complete C285 claim submission package',
    category: 'Claims',
    placeholders: ['claim.reference', 'trader.name', 'claim.mrn', 'claim.total_claim_amount'],
  },
  {
    filename: 'Cover Letter to HMRC.html',
    name: 'Cover Letter to HMRC',
    description: 'Professional cover letter for HMRC submissions',
    category: 'Claims',
    placeholders: ['claim.reference', 'trader.name', 'claim.mrn'],
  },
  {
    filename: 'evidence_checklist.html',
    name: 'Evidence Checklist',
    description: 'Required evidence for C285 claims',
    category: 'Claims',
    placeholders: ['claim.reference', 'trader.name', 'claim.reason'],
  },
  {
    filename: 'compliance_statement.html',
    name: 'Compliance Statement',
    description: 'Declaration of compliance for submissions',
    category: 'Claims',
    placeholders: ['trader.name', 'declarant.name', 'today'],
  },
  {
    filename: 'sample_completed_c285.html',
    name: 'Sample Completed C285',
    description: 'Example of completed C285 form',
    category: 'Claims',
    placeholders: ['claim.reference', 'trader.name', 'claim.mrn'],
  },
  {
    filename: 'pre_submission_audit.html',
    name: 'Pre-Submission Audit',
    description: 'Final checks before claim submission',
    category: 'Claims',
    placeholders: ['claim.reference', 'trader.name'],
  },

  // Analysis & Calculations
  {
    filename: 'duty_calculator_summary.html',
    name: 'Duty Calculator Summary',
    description: 'Duty calculation breakdown and summary',
    category: 'Analysis',
    placeholders: ['claim.reference', 'claim.duty_amount', 'claim.vat_amount'],
  },
  {
    filename: 'duty_vat_overpayment_summary.html',
    name: 'Duty & VAT Overpayment Summary',
    description: 'Summary of identified overpayments',
    category: 'Analysis',
    placeholders: ['trader.name', 'claim.total_claim_amount'],
  },
  {
    filename: 'mrn_breakdown.html',
    name: 'MRN Breakdown',
    description: 'Detailed MRN analysis and breakdown',
    category: 'Analysis',
    placeholders: ['claim.mrn', 'claim.acceptance_date'],
  },
  {
    filename: 'invoice_packing_match.html',
    name: 'Invoice & Packing List Match',
    description: 'Invoice and packing list reconciliation',
    category: 'Analysis',
    placeholders: ['claim.reference', 'trader.name'],
  },

  // Tariff & Classification
  {
    filename: 'tariff_classification_explanation.html',
    name: 'Tariff Classification Explanation',
    description: 'Detailed tariff code explanation',
    category: 'Tariff',
    placeholders: ['claim.reference', 'claim.reason'],
  },
  {
    filename: 'tariff_class_justification.html',
    name: 'Tariff Classification Justification',
    description: 'Justification for tariff code correction',
    category: 'Tariff',
    placeholders: ['claim.reference', 'trader.name'],
  },

  // Origin & Valuation
  {
    filename: 'origin_explanation.html',
    name: 'Origin Explanation',
    description: 'Goods origin documentation and explanation',
    category: 'Origin',
    placeholders: ['claim.reference', 'trader.name'],
  },
  {
    filename: 'origin_docs_cover_sheet.html',
    name: 'Origin Documents Cover Sheet',
    description: 'Cover sheet for origin documentation',
    category: 'Origin',
    placeholders: ['claim.reference', 'trader.name'],
  },
  {
    filename: 'valuation_explanation.html',
    name: 'Valuation Explanation',
    description: 'Customs valuation explanation and justification',
    category: 'Valuation',
    placeholders: ['claim.reference', 'trader.name'],
  },
  {
    filename: 'valuation_adjustment_worksheet.html',
    name: 'Valuation Adjustment Worksheet',
    description: 'Worksheet for valuation adjustments',
    category: 'Valuation',
    placeholders: ['claim.reference', 'claim.total_claim_amount'],
  },

  // Returned Goods
  {
    filename: 'returned_goods_checklist.html',
    name: 'Returned Goods Checklist',
    description: 'Checklist for returned goods relief claims',
    category: 'Returned Goods',
    placeholders: ['claim.reference', 'trader.name'],
  },
  {
    filename: 'returned_goods_declaration.html',
    name: 'Returned Goods Declaration',
    description: 'Declaration for returned goods relief',
    category: 'Returned Goods',
    placeholders: ['claim.reference', 'trader.name', 'claim.mrn'],
  },

  // HMRC & Tracking
  {
    filename: 'hmrc_correspondence_tracking.html',
    name: 'HMRC Correspondence Tracking',
    description: 'Track HMRC correspondence and responses',
    category: 'HMRC',
    placeholders: ['claim.reference', 'trader.name'],
  },
  {
    filename: 'refund_payment_confirmation.html',
    name: 'Refund Payment Confirmation',
    description: 'Confirmation of refund payment received',
    category: 'HMRC',
    placeholders: ['claim.reference', 'trader.name', 'claim.total_claim_amount'],
  },
  {
    filename: 'ce1179_1126_notes.html',
    name: 'CE1179 & CE1126 Notes',
    description: 'Guidance notes for CE forms',
    category: 'HMRC',
    placeholders: ['trader.name'],
  },
];

// Group templates into logical sections
const TEMPLATE_SECTIONS = [
  {
    title: 'Client Templates',
    description: 'Onboarding, engagement, and client management documents',
    categories: ['Onboarding', 'Engagement'],
    icon: '👥',
  },
  {
    title: 'HMRC Templates',
    description: 'Submission forms, correspondence, and compliance documents',
    categories: ['HMRC', 'CDS Authorization'],
    icon: '📋',
  },
  {
    title: 'Claims Templates',
    description: 'C285 forms, evidence packs, and claim processing documents',
    categories: ['Claims', 'Analysis'],
    icon: '💰',
  },
  {
    title: 'Technical Templates',
    description: 'Tariff classification, valuation, origin, and returned goods',
    categories: ['Tariff', 'Origin', 'Valuation', 'Returned Goods'],
    icon: '🔧',
  },
];

export default function DocumentTemplates() {
  const [templates] = useState<TemplateLibraryItem[]>(TEMPLATE_LIBRARY);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'Client Templates',
    'HMRC Templates',
    'Claims Templates',
  ]);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'updated'>('name');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    template: TemplateLibraryItem | null;
    html: string;
  }>({
    isOpen: false,
    template: null,
    html: '',
  });

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle) ? prev.filter((s) => s !== sectionTitle) : [...prev, sectionTitle]
    );
  };

  const filteredTemplates = templates.filter((template) =>
    searchQuery.trim()
      ? template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const handlePreview = async (template: TemplateLibraryItem) => {
    setIsPreviewing(true);
    try {
      const sampleData = getSampleData();
      const html = await generateDocument(template.filename, sampleData);

      setPreviewState({
        isOpen: true,
        template,
        html,
      });
    } catch (err) {
      console.error('Failed to preview template:', err);
      alert('Failed to load template preview. Please check the template file exists.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const closePreview = () => {
    setPreviewState({
      isOpen: false,
      template: null,
      html: '',
    });
  };

  const handlePrint = () => {
    const iframe = document.querySelector('iframe[title="Template Preview"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  const handleDownload = () => {
    if (previewState.html && previewState.template) {
      const blob = new Blob([previewState.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${previewState.template.name.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <>
      <div className="border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
        <div className="px-6 py-6" style={{ backgroundColor: 'var(--color-chrome)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Document Templates</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Manage and preview pre-filled document templates</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary btn-templates"
                  onClick={() => alert('Custom template creation coming soon')}
                >
                  <Plus size={20} />
                  Upload Custom Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700"
            style={{ marginBottom: '1.5rem' }}
          >
            {error}
          </div>
        )}

        {/* Search and Sort Controls */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates by name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-0 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-purple-900 focus:outline-none"
            >
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="updated">Last Updated</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FileText className="mb-3 h-8 w-8 text-slate-950" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Templates
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{templates.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Folder className="mb-3 h-8 w-8 text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sections</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{TEMPLATE_SECTIONS.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FileEdit className="mb-3 h-8 w-8 text-[#33224f]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client Templates
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {templates.filter((t) => ['Onboarding', 'Engagement'].includes(t.category)).length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FileText className="mb-3 h-8 w-8 text-[#33224f]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Claims Templates
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {templates.filter((t) => ['Claims', 'Analysis'].includes(t.category)).length}
            </p>
          </div>
        </div>

        {/* Sectioned Template List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-slate-500">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-600">No templates match your search.</p>
            </div>
          ) : (
            TEMPLATE_SECTIONS.map((section) => {
              const sectionTemplates = filteredTemplates.filter((t) =>
                section.categories.includes(t.category)
              );
              if (sectionTemplates.length === 0) return null;

              const isExpanded = expandedSections.includes(section.title);

              return (
                <div
                  key={section.title}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-center justify-between p-6 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{section.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                        <p className="text-sm text-slate-500">{section.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                        {sectionTemplates.length} templates
                      </span>
                      <svg
                        className={`h-5 w-5 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Section Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Template Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Category
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Fields
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sectionTemplates.map((template) => (
                            <tr key={template.filename} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-[#33224f]" />
                                  <span className="font-semibold text-slate-900">
                                    {template.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-600">{template.description}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                  {template.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                                  {template.placeholders.length}
                                  <span className="text-xs font-normal text-slate-500">fields</span>
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handlePreview(template)}
                                    disabled={isPreviewing}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Preview
                                  </button>
                                  <button
                                    onClick={() => handlePreview(template)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#33224f] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#271a3e]"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Generate
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div
        style={{
          marginTop: '2rem',
          background:
            'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
          border: '1px solid rgba(51, 34, 79, 0.22)',
          borderRadius: '12px',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Using Templates
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
          <li>Templates automatically fill with client data when generated from client pages</li>
          <li>Preview shows sample data to verify template formatting</li>
          <li>All templates include Arcanus Customs branding and professional formatting</li>
          <li>
            Templates are stored in <code>mdj_full_template_library/</code>
          </li>
        </ul>
      </div>

      {/* Preview Modal */}
      {previewState.isOpen && previewState.template && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem',
          }}
          onClick={closePreview}
        >
          <div
            style={{
              width: 'min(92vw, 1200px)',
              height: 'min(92vh, 900px)',
              background: 'var(--card-bg)',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 40px 80px rgba(15,23,42,0.35)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(15,23,42,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>{previewState.template.name}</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Scroll to review. Use actions to print, download, or share.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handlePrint}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Print
                </button>
                <button
                  onClick={handleDownload}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Download
                </button>
                <button
                  onClick={closePreview}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent-purple)',
                    color: 'var(--text-light)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                background: '#f8fafc',
                padding: '1.5rem',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 12px 40px rgba(15,23,42,0.1)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  minHeight: '100%',
                  width: '100%',
                  maxWidth: '900px',
                }}
              >
                <iframe
                  title="Template Preview"
                  srcDoc={previewState.html}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 'calc(90vh - 240px)',
                    border: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }
