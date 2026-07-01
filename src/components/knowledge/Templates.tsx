import {
  Download,
  Eye,
  FileText,
  FileDown,
  Database,
  BookOpen,
  ListChecks,
  FileQuestion,
} from 'lucide-react';
import { useState } from 'react';
import { generateDocument, downloadDocument, getSampleData } from '@/lib/templateGenerator';
import { KnowledgeHero } from '@/components/knowledge/KnowledgeHero';
import { createPortal } from 'react-dom';

// ------------------------
// Types & Icon Helpers
// ------------------------
type TemplateType = 'HTML' | 'PDF' | 'Data' | 'Guide' | 'Checklist';

const templateIconMap: Record<TemplateType, { icon: any; color: string }> = {
  HTML: { icon: FileText, color: '#3b82f6' },
  PDF: { icon: FileDown, color: '#ef4444' },
  Data: { icon: Database, color: '#10b981' },
  Guide: { icon: BookOpen, color: '#6366f1' },
  Checklist: { icon: ListChecks, color: '#f59e0b' },
};

const defaultIcon = {
  icon: FileQuestion,
  color: '#6b7280',
};

const getTemplateIcon = (type: TemplateType | string | undefined | null) => {
  if (!type) return defaultIcon;
  return templateIconMap[type as TemplateType] ?? defaultIcon;
};

const detectTemplateType = (file: string): TemplateType => {
  const lower = file.toLowerCase();
  if (lower.endsWith('.html')) return 'HTML';
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.includes('checklist')) return 'Checklist';
  if (lower.includes('guide')) return 'Guide';
  if (lower.includes('data') || lower.includes('calc') || lower.includes('summary')) return 'Data';
  return 'HTML';
};

type TemplateItem = {
  title: string;
  description: string;
  file: string;
  fileType?: TemplateType;
  color?: string;
};

type TemplateCardProps = {
  template: TemplateItem;
  generating: string | null;
  onPreview: (template: TemplateItem) => void;
  onDownload: (template: TemplateItem) => void;
};

// ------------------------
// Template Card Component
// ------------------------
const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  generating,
  onPreview,
  onDownload,
}) => {
  const isLoading = generating === template.file;
  const resolvedType = template.fileType ?? detectTemplateType(template.file);
  const { icon: Icon, color: iconColor } = getTemplateIcon(resolvedType);
  const accentColor = template.color ?? iconColor;

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: `${accentColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={24} style={{ color: accentColor }} />
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{template.title}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{template.description}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <span style={{ color: accentColor, fontWeight: 600 }}>{resolvedType}</span>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onPreview(template)}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              background: isLoading ? '#ccc' : accentColor,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            <Eye size={16} />
            {isLoading ? 'Loading...' : 'Preview'}
          </button>

          <button
            onClick={() => onDownload(template)}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: accentColor,
              border: `1px solid ${accentColor}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------------
// MAIN PAGE COMPONENT
// ------------------------
type PreviewState = {
  template: TemplateItem;
  html: string;
};

export default function Templates() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [sharing, setSharing] = useState(false);

  const buildTemplateHtml = async (template: TemplateItem) => {
    setGenerating(template.file);
    try {
      const data = getSampleData();
      data.document_title = template.title;
      const html = await generateDocument(template.file, data);
      return html;
    } finally {
      setGenerating(null);
    }
  };

  const handlePreview = async (template: TemplateItem) => {
    try {
      const html = await buildTemplateHtml(template);
      setPreviewState({ template, html });
    } catch (err) {
      console.error(err);
      alert('Unable to preview the document.');
    }
  };

  const handleDownloadTemplate = async (template: TemplateItem) => {
    try {
      const html = await buildTemplateHtml(template);
      downloadDocument(html, template.title.replace(/\s+/g, '_'));
    } catch (err) {
      console.error(err);
      alert('Unable to download the document.');
    }
  };

  const closePreview = () => setPreviewState(null);

  const handlePrint = () => {
    if (!previewState) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(previewState.html);
    iframe.contentDocument?.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  const handleExportPDF = () => {
    if (!previewState) return;
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      alert('Pop-up blocked. Please allow pop-ups to export as PDF.');
      return;
    }
    pdfWindow.document.open();
    pdfWindow.document.write(previewState.html);
    pdfWindow.document.close();
    pdfWindow.focus();
    setTimeout(() => {
      pdfWindow.print();
    }, 300);
  };

  const handleShare = async () => {
    if (!previewState || typeof navigator === 'undefined' || !navigator.clipboard) return;
    setSharing(true);
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const url = `${window.location.origin}${baseUrl}mdj_full_template_library/${previewState.template.file}`;
      await navigator.clipboard.writeText(url);
      alert('Template link copied to clipboard');
    } catch (err) {
      console.error(err);
      alert('Unable to copy link.');
    } finally {
      setSharing(false);
    }
  };

  const templateCategories: { category: string; templates: TemplateItem[] }[] = [
    {
      category: 'Claim Form Packs',
      templates: [
        {
          title: 'C285 Claim Pack',
          description: 'Complete C285 claim package',
          file: 'C285 CLAIM PACK.html',
          fileType: 'HTML',
          color: '#3b82f6',
        },
        {
          title: 'Sample Completed C285',
          description: 'Fully completed sample form',
          file: 'sample_completed_c285.html',
          fileType: 'HTML',
          color: '#3b82f6',
        },
      ],
    },
    {
      category: 'Client & Agent Documents',
      templates: [
        {
          title: 'Agent Authority Letter',
          description: 'Authorisation for agents',
          file: 'agent_authority_letter.html',
          fileType: 'HTML',
          color: '#ef4444',
        },
        {
          title: 'Client Engagement Letter',
          description: 'Formal engagement with clients',
          file: 'agent_client_engagement_letter.html',
          fileType: 'HTML',
          color: '#ef4444',
        },
        {
          title: 'Bank Details Verification',
          description: 'Verify bank details for refunds',
          file: 'bank_details_verification.html',
          fileType: 'HTML',
          color: '#ef4444',
        },
        {
          title: 'Client Onboarding Pack',
          description: 'New client setup pack',
          file: 'client_onboarding_pack.html',
          fileType: 'HTML',
          color: '#ef4444',
        },
        {
          title: 'Refund Payment Confirmation',
          description: 'Confirm refund received',
          file: 'refund_payment_confirmation.html',
          fileType: 'HTML',
          color: '#ef4444',
        },
      ],
    },
    {
      category: 'HMRC Submission Documents',
      templates: [
        {
          title: 'Compliance Statement',
          description: 'Compliance declaration',
          file: 'compliance_statement.html',
          fileType: 'HTML',
          color: '#000000',
        },
        {
          title: 'Cover Letter to HMRC',
          description: 'Submission cover letter',
          file: 'Cover Letter to HMRC.html',
          fileType: 'HTML',
          color: '#000000',
        },
        {
          title: 'Declarant Authorisation Letter',
          description: 'Declarant authorisation',
          file: 'declarant_authorisation_letter.html',
          fileType: 'HTML',
          color: '#000000',
        },
        {
          title: 'Invoice Packing Match',
          description: 'Invoice vs packing list reconciliation',
          file: 'invoice_packing_match.html',
          fileType: 'HTML',
          color: '#000000',
        },
      ],
    },
    {
      category: 'Checklists & Tracking',
      templates: [
        {
          title: 'Evidence Checklist',
          description: 'Required evidence list',
          file: 'evidence_checklist.html',
          fileType: 'HTML',
          color: '#fbbf24',
        },
        {
          title: 'HMRC Correspondence Tracking',
          description: 'Track all HMRC comms',
          file: 'hmrc_correspondence_tracking.html',
          fileType: 'HTML',
          color: '#fbbf24',
        },
        {
          title: 'Pre-Submission Audit',
          description: 'Final audit before submission',
          file: 'pre_submission_audit.html',
          fileType: 'HTML',
          color: '#fbbf24',
        },
        {
          title: 'Trader Information Form',
          description: 'Collect trader details',
          file: 'trader_information_form.html',
          fileType: 'HTML',
          color: '#fbbf24',
        },
      ],
    },
    {
      category: 'Evidence & Explanation Documents',
      templates: [
        {
          title: 'Duty Calculation Summary',
          description: 'Summary of duty owed',
          file: 'duty_calculator_summary.html',
          fileType: 'HTML',
          color: '#d97706',
        },
        {
          title: 'Duty VAT Overpayment Summary',
          description: 'Overpayment breakdown',
          file: 'duty_vat_overpayment_summary.html',
          fileType: 'HTML',
          color: '#d97706',
        },
        {
          title: 'Valuation Explanation',
          description: 'Valuation justification',
          file: 'valuation_explanation.html',
          fileType: 'HTML',
          color: '#d97706',
        },
        {
          title: 'Evidence Pack Index',
          description: 'Index of supporting evidence',
          file: 'evidence_pack_index.html',
          fileType: 'HTML',
          color: '#d97706',
        },
        {
          title: 'Missing Information Notice',
          description: 'Request missing info',
          file: 'missing_information_notice.html',
          fileType: 'HTML',
          color: '#d97706',
        },
        {
          title: 'Origin Docs Cover Sheet',
          description: 'Origin document cover',
          file: 'origin_docs_cover_sheet.html',
          fileType: 'HTML',
          color: '#d97706',
        },
        {
          title: 'Returned Goods Checklist',
          description: 'Checklist for RGR claims',
          file: 'returned_goods_checklist.html',
          fileType: 'HTML',
          color: '#d97706',
        },
        {
          title: 'Tariff Error Explanation',
          description: 'Explain tariff error',
          file: 'tariff_classification_explanation.html',
          fileType: 'HTML',
          color: '#d97706',
        },
      ],
    },
    {
      category: 'Reference & Technical Guides',
      templates: [
        {
          title: 'MRN Breakdown',
          description: 'Understand MRN structure',
          file: 'mrn_breakdown.html',
          fileType: 'HTML',
          color: '#4b5563',
        },
        {
          title: 'CDS Mapping Sheet',
          description: 'CDS field mapping',
          file: 'cds_mapping_sheet.html',
          fileType: 'HTML',
          color: '#4b5563',
        },
        {
          title: 'EORI Business Structure Guide',
          description: 'Guide to EORI structure',
          file: 'eori_business_structure_guide.html',
          fileType: 'HTML',
          color: '#4b5563',
        },
        {
          title: 'CE1179 / 1126 Notes',
          description: 'Supplemental notes',
          file: 'ce1179_1126_notes.html',
          fileType: 'HTML',
          color: '#4b5563',
        },
      ],
    },
  ];

  return (
    <div className="dashboard">
      <KnowledgeHero
        title="Templates & Forms"
        description="Download pre-filled packs, client documents, and HMRC-ready forms in one place. Use Knowledge Centre filters or M Assist to jump straight to the templates you need."
        tips={[
          'Preview before downloading to confirm layout',
          'Use agent templates for onboarding clients quickly',
          'Ask M Assist to auto-fill claim data into templates',
        ]}
        rightContent={
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Have a favourite template? Pin its card for faster access or download multiple
              documents directly from this page.
            </p>
          </div>
        }
      />

      {/* Categories */}
      {templateCategories.map((category, i) => (
        <div key={i} style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{category.category}</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {category.templates.map((t, j) => (
              <TemplateCard
                key={j}
                template={t}
                generating={generating}
                onPreview={handlePreview}
                onDownload={handleDownloadTemplate}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Info Box */}
      <div
        style={{
          marginTop: '2rem',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ fontWeight: 600 }}>📋 How to Use These Templates</h3>
        <ul style={{ marginLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <li>Download the template that matches your needs</li>
          <li>Fill in your specific claim details</li>
          <li>Review the sample completed forms for guidance</li>
          <li>Use the checklist to ensure you have all required documents</li>
          <li>Submit your completed forms through the Claims page</li>
        </ul>
      </div>

      {/* Help */}
      <div style={{ marginTop: '2rem' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(193,143,28,0.1), rgba(193,143,28,0.05))',
            border: '1px solid rgba(193,143,28,0.2)',
            borderRadius: '12px',
            padding: '2rem',
          }}
        >
          <h3 style={{ fontWeight: 600 }}>Need help filling out a template?</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            M Assist can auto-fill templates using your claim data.
          </p>

          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--accent-purple)',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ask M Assist to Help
          </button>
        </div>
      </div>

      {previewState &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>{previewState.template.title}</h2>
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
                    onClick={() => handleDownloadTemplate(previewState.template)}
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
                    onClick={handleExportPDF}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card-bg)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card-bg)',
                      cursor: sharing ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {sharing ? 'Copying…' : 'Copy Link'}
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
                    title={previewState.template.title}
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
          </div>,
          document.body
        )}
    </div>
  );
}
