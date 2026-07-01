import { ListChecks, CheckSquare, Square, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import FeedbackButtons from '@/components/ui/FeedbackButtons';
import { KnowledgeHero } from '@/components/knowledge/KnowledgeHero';

export default function Checklist() {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const checklistItems = [
    {
      category: 'Essential Documents',
      items: [
        'Movement Reference Number (MRN)',
        'EORI number',
        'Original import declaration (C88 or SAD)',
        'Commercial invoice',
        'Proof of payment (bank statement or receipt)',
      ],
    },
    {
      category: 'Supporting Evidence',
      items: [
        'Evidence of overpayment (tariff classification, valuation docs)',
        'Origin certificates (if claiming preference)',
        'Transport documents (bill of lading, CMR)',
        'Correspondence with HMRC (if applicable)',
      ],
    },
    {
      category: 'Claim Details',
      items: [
        'Detailed explanation of error',
        'Calculation of overpaid amount',
        'Bank account details for refund',
        'Contact information',
      ],
    },
  ];

  const toggleItem = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  let itemIndex = 0;

  return (
    <div className="dashboard">
      <KnowledgeHero
        title="Document Checklist"
        description="Tick off every document required for a complete C285 claim—primary evidence and supporting paperwork."
        tips={[
          'Keep MRNs, invoices, and bank proofs handy before uploading',
          'Use this checklist per claim to avoid HMRC rejections',
          'Ask M Assist to fetch missing MRNs or invoices automatically',
        ]}
        rightContent={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <ListChecks size={28} style={{ color: '#22c55e' }} />
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Mark items complete as you collect evidence. Refresh to reset.
            </p>
          </div>
        }
      />

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {checklistItems.map((section, sectionIndex) => {
          return (
            <div
              key={sectionIndex}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                {section.category}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {section.items.map((item) => {
                  const currentIndex = itemIndex++;
                  const isChecked = checkedItems.has(currentIndex);
                  return (
                    <div
                      key={currentIndex}
                      onClick={() => toggleItem(currentIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        background: isChecked ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isChecked
                          ? 'rgba(34, 197, 94, 0.1)'
                          : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isChecked
                          ? 'rgba(34, 197, 94, 0.05)'
                          : 'transparent';
                      }}
                    >
                      {isChecked ? (
                        <CheckSquare size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
                      ) : (
                        <Square size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontSize: '0.95rem',
                          textDecoration: isChecked ? 'line-through' : 'none',
                          color: isChecked ? 'var(--text-muted)' : 'inherit',
                        }}
                      >
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
            onClick={() => window.location.assign('/knowledge/guide')}
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
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                C88 Import Declaration Explained
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Learn about C88 forms and where to find them
            </p>
          </div>
          <div
            onClick={() => window.location.assign('/knowledge/guide')}
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
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Where to Find Your MRN</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Locate your Movement Reference Number
            </p>
          </div>
          <div
            onClick={() => window.location.assign('/knowledge/hmrc')}
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
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tariff Code Lookup Tool</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Search UK Trade Tariff for commodity codes
            </p>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div style={{ marginTop: '2rem' }}>
        <FeedbackButtons pageId="document-checklist" />
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
            Missing a document?
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            M Assist can help you understand which documents are essential and how to obtain missing
            evidence.
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
            Ask M Assist about Documents
          </button>
        </div>
      </div>
    </div>
  );
}
