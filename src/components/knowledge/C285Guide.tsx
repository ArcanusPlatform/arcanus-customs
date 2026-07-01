import { BookOpen, CheckCircle, ExternalLink } from 'lucide-react';
import FeedbackButtons from '@/components/ui/FeedbackButtons';
import { KnowledgeHero } from '@/components/knowledge/KnowledgeHero';

export default function C285Guide() {
  const sections = [
    {
      title: 'What is a C285 Claim?',
      content:
        'The C285 form is used to claim repayment or remission of import duties, excise duties, or VAT that have been overpaid or incorrectly charged.',
    },
    {
      title: 'When to Submit a C285',
      content:
        'Submit within 3 years of the date of payment. Common reasons include tariff code errors, origin relief not applied, goods returned, or incorrect valuation.',
    },
    {
      title: 'Required Information',
      content:
        'You will need: MRN (Movement Reference Number), EORI number, import declaration details, evidence of overpayment, and bank details for refund.',
    },
    {
      title: 'Processing Time',
      content:
        'HMRC typically processes C285 claims within 30-45 days. Complex cases may take longer and require additional evidence.',
    },
  ];

  return (
    <div className="dashboard">
      <KnowledgeHero
        title="C285 Guide"
        description="Complete walkthroughs, timelines, and evidence requirements for HMRC C285 duty repayment claims."
        tips={[
          'Submit within 3 years of the original duty payment',
          'Keep MRNs and invoices ready before you begin',
          'Use our Document Checklist to prepare evidence',
        ]}
        rightContent={
          <div>
            <BookOpen size={24} style={{ color: 'var(--accent-purple)' }} />
            <p style={{ margin: '0.75rem 0 0', color: 'var(--text-muted)' }}>
              Bookmark this guide to quickly revisit HMRC references, deadlines, and common
              scenarios.
            </p>
          </div>
        }
      />

      {/* Guide Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {sections.map((section, index) => (
          <div
            key={index}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle size={20} style={{ color: 'var(--accent-purple)' }} />
              {section.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{section.content}</p>
          </div>
        ))}
      </div>

      {/* Related Resources */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Related Resources
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            onClick={() => window.location.assign('/knowledge/checklist')}
            style={{
              padding: '1rem',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <ExternalLink size={16} style={{ color: 'var(--accent-purple)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Document Checklist</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              See all required documents for your claim
            </p>
          </div>
          <div
            onClick={() => window.location.assign('/knowledge/tutorials')}
            style={{
              padding: '1rem',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <ExternalLink size={16} style={{ color: 'var(--accent-purple)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Video Tutorials</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Watch step-by-step C285 completion guides
            </p>
          </div>
          <div
            onClick={() => window.location.assign('/knowledge/templates')}
            style={{
              padding: '1rem',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <ExternalLink size={16} style={{ color: 'var(--accent-purple)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Download Templates</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Get blank C285 forms and worksheets
            </p>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div style={{ marginTop: '2rem' }}>
        <FeedbackButtons pageId="c285-guide" />
      </div>

      {/* Help Section */}
      <div style={{ marginTop: '2rem' }}>
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '12px',
            padding: '2rem',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Need help with your C285 claim?
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            M Assist can guide you through each step of the C285 process and help ensure your claim
            meets all HMRC requirements.
          </p>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--accent-purple)',
              color: 'var(--text-light)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ask M Assist about C285
          </button>
        </div>
      </div>
    </div>
  );
}
