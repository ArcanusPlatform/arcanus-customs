import { ExternalLink, BookOpen, Scale } from 'lucide-react';
import { KnowledgeHero } from '@/components/knowledge/KnowledgeHero';

export default function HMRCResources() {
  const officialGuidance = [
    {
      title: 'HMRC C285 Guidance',
      description: 'Official guidance on claiming repayment or remission of charges',
      url: 'https://www.gov.uk/guidance/how-to-apply-for-a-repayment-of-import-duty-and-vat-if-youve-overpaid-c285',
      icon: BookOpen,
      color: 'var(--accent-purple)',
    },
    {
      title: 'Customs Declaration Service',
      description: 'How to use the Customs Declaration Service (CDS)',
      url: 'https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service',
      icon: BookOpen,
      color: '#3b82f6',
    },
    {
      title: 'Import Declaration Completion',
      description: 'Instructions for completing import declarations',
      url: 'https://www.gov.uk/government/publications/cds-uk-trade-tariff-volume-3-import-declaration-completion-guide',
      icon: BookOpen,
      color: '#22c55e',
    },
  ];

  const legalReferences = [
    {
      title: 'Customs and Excise Management Act 1979',
      description: 'Section 137 - Repayment of overpaid duties',
      url: 'https://www.legislation.gov.uk/ukpga/1979/2/section/137',
    },
    {
      title: 'Taxation (Cross-border Trade) Act 2018',
      description: 'Import duty regulations and procedures',
      url: 'https://www.legislation.gov.uk/ukpga/2018/22/contents',
    },
    {
      title: 'The Customs (Import Duty) (EU Exit) Regulations 2018',
      description: 'Post-Brexit import duty framework',
      url: 'https://www.legislation.gov.uk/uksi/2018/1248/contents/made',
    },
  ];

  const additionalResources = [
    {
      title: 'UK Trade Tariff',
      description: 'Look up commodity codes and duty rates',
      url: 'https://www.trade-tariff.service.gov.uk/',
    },
    {
      title: 'HMRC Contact Information',
      description: 'Get in touch with HMRC for claim queries',
      url: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/customs-international-trade-and-excise-enquiries',
    },
    {
      title: 'Customs Information Papers',
      description: 'Technical guidance on customs procedures',
      url: 'https://design.tax.service.gov.uk/patterns-hmrc-govuk-team/customs-information-papers/',
    },
  ];

  return (
    <div className="dashboard">
      <KnowledgeHero
        title="HMRC Resources"
        description="Direct links to HMRC guidance, legislation, and tools relevant to C285 claims and customs compliance."
        tips={[
          'Bookmark key HMRC references for audits',
          'Stay updated on legislation changes',
          'Verify tariff and CDS guidance before submitting',
        ]}
      />

      {/* Official Guidance */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Official HMRC Guidance
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {officialGuidance.map((resource, index) => (
            <a
              key={index}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: `${resource.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <resource.icon size={24} style={{ color: resource.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {resource.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {resource.description}
                </p>
              </div>
              <ExternalLink size={20} style={{ color: resource.color, flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>

      {/* Legal References */}
      <div style={{ marginBottom: '2rem' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Scale size={24} style={{ color: '#8b5cf6' }} />
          Legal References
        </h2>
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {legalReferences.map((reference, index) => (
            <a
              key={index}
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                textDecoration: 'none',
                color: 'inherit',
                borderBottom:
                  index < legalReferences.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {reference.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {reference.description}
                </p>
              </div>
              <ExternalLink
                size={18}
                style={{ color: '#8b5cf6', flexShrink: 0, marginLeft: '1rem' }}
              />
            </a>
          ))}
        </div>
      </div>

      {/* Additional Resources */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Additional Resources
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {additionalResources.map((resource, index) => (
            <a
              key={index}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {resource.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {resource.description}
                  </p>
                </div>
                <ExternalLink
                  size={16}
                  style={{ color: 'var(--accent-purple)', flexShrink: 0, marginLeft: '0.5rem' }}
                />
              </div>
            </a>
          ))}
        </div>
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
            Need help understanding HMRC regulations?
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            M Assist can explain complex HMRC regulations in plain English and help you understand
            how they apply to your specific claim.
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
            Ask M Assist about Regulations
          </button>
        </div>
      </div>
    </div>
  );
}
