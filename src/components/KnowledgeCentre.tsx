import { useState } from 'react';
import {
  BookOpen,
  FileText,
  ListChecks,
  Video,
  Download,
  ExternalLink,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function KnowledgeCentre() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const resources = [
    {
      icon: BookOpen,
      title: 'C285 Guide',
      description: 'Learn the full HMRC refund process and requirements.',
      color: 'var(--accent-purple)',
      route: '/knowledge/guide',
      keywords: ['c285', 'guide', 'hmrc', 'refund', 'process', 'requirements'],
    },
    {
      icon: ListChecks,
      title: 'Document Checklist',
      description: 'A step-by-step list of documents required for your claim.',
      color: '#22c55e',
      route: '/knowledge/checklist',
      keywords: ['checklist', 'documents', 'evidence', 'required', 'list'],
    },
    {
      icon: Video,
      title: 'Tutorials & Video Guides',
      description:
        'Step-by-step tutorials, practical examples and video walkthroughs for common claim scenarios.',
      color: '#3b82f6',
      route: '/knowledge/tutorials',
      keywords: ['tutorials', 'examples', 'how-to', 'guide', 'help', 'video', 'watch', 'visual'],
    },
    {
      icon: FileText,
      title: 'Document Templates',
      description: 'Access all pre-filled client, agent, HMRC and claim templates in one place.',
      color: '#8b5cf6',
      route: '/documents/templates',
      keywords: ['templates', 'documents', 'forms', 'generate', 'pre-filled'],
    },
    {
      icon: ExternalLink,
      title: 'HMRC Resources',
      description: 'Official HMRC guidance and regulatory information.',
      color: '#f59e0b',
      route: '/knowledge/hmrc',
      keywords: ['hmrc', 'official', 'gov', 'guidance', 'regulations'],
    },
  ];

  // Filter resources based on search term
  const filteredResources = resources.filter((resource) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      resource.title.toLowerCase().includes(search) ||
      resource.description.toLowerCase().includes(search) ||
      resource.keywords.some((keyword) => keyword.includes(search))
    );
  });

  return (
    <>
      <div className="border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
        <div className="px-6 py-6" style={{ backgroundColor: 'var(--color-chrome)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Knowledge Centre</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>HMRC regulations, tutorials, and best practices for C285 claims</p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  minWidth: '300px',
                }}
              >
                <Search
                  size={18}
                  style={{ marginRight: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}
                />
                <input
                  type="text"
                  placeholder="Search guides, forms, or topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                fontSize: '0.9rem',
                width: '100%',
                background: 'transparent',
                color: '#fff',
              }}
            />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Resource Cards */}
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}
        >
          {filteredResources.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '3rem',
                color: 'var(--text-muted)',
              }}
            >
              <Search size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>No resources found matching "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  background: 'var(--accent-purple)',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredResources.map((resource) => (
              <div
                key={resource.title}
                className="card"
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => navigate(resource.route)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <resource.icon
                  size={32}
                  style={{ color: resource.color, marginBottom: '0.75rem' }}
                />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {resource.title}
                </h2>
                <p
                  style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}
                >
                  {resource.description}
                </p>
                <span
                  style={{
                    color: resource.color,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  Learn more →
                </span>
              </div>
            ))
          )}
        </div>

        {/* Quick Links Section */}
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
            Quick Links
          </h2>
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
              }}
            >
              <a
                href="https://www.gov.uk/guidance/how-to-apply-for-a-repayment-of-import-duty-and-vat-if-youve-overpaid-c285"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ExternalLink size={20} style={{ color: 'var(--accent-purple)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>HMRC C285 Guidance</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Official GOV.UK page
                  </div>
                </div>
              </a>

              <a
                href="https://www.gov.uk/government/publications/cds-uk-trade-tariff-volume-3-import-declaration-completion-guide"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ExternalLink size={20} style={{ color: 'var(--accent-purple)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>CDS Declaration Guide</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Import declaration instructions
                  </div>
                </div>
              </a>

              <a
                href="https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ExternalLink size={20} style={{ color: 'var(--accent-purple)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    Customs Declaration Service
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Using CDS</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Popular Articles */}
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
            Popular Articles
          </h2>
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {[
              { q: 'How do I calculate overpaid duty?', link: '/knowledge/tutorials' },
              { q: 'What evidence does HMRC need?', link: '/knowledge/checklist' },
              { q: 'How to handle tariff code errors?', link: '/knowledge/guide' },
              { q: 'What is a Movement Reference Number (MRN)?', link: '/knowledge/guide' },
              { q: 'What causes a claim to fail compliance?', link: '/knowledge/guide' },
            ].map((article, index, arr) => (
              <div
                key={index}
                onClick={() => navigate(article.link)}
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: index < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{article.q}</span>
                <span style={{ color: 'var(--accent-purple)', fontSize: '1.25rem' }}>→</span>
              </div>
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
              Need personalized help?
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Our AI assistant can guide you through the C285 claim process, help you gather the
              right documents, and ensure your claim meets all HMRC requirements.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
                Ask M Assist
              </button>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: 'var(--accent-purple)',
                  border: '1px solid var(--accent-purple)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      
      </main>
    </>
  );
}
