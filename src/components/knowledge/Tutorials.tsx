import { FileText, Video } from 'lucide-react';
import { KnowledgeHero } from '@/components/knowledge/KnowledgeHero';

export default function Tutorials() {
  const writtenTutorials = [
    {
      title: 'How to Complete Section A: Claimant Details',
      description: 'Step-by-step guide for filling out claimant information correctly.',
      duration: '5 min read',
    },
    {
      title: 'Understanding Tariff Code Errors',
      description: 'Common tariff classification mistakes and how to identify them.',
      duration: '8 min read',
    },
    {
      title: 'Calculating Overpaid Duty Amounts',
      description: 'Learn how to calculate the exact amount you can reclaim.',
      duration: '6 min read',
    },
  ];

  const videoTutorials = [
    {
      title: 'C285 Form Walkthrough',
      description: 'Complete video guide showing every section of the C285 form.',
      duration: '12 min',
    },
    {
      title: 'Gathering Evidence for Your Claim',
      description: 'What documents you need and where to find them.',
      duration: '8 min',
    },
    {
      title: 'Common Claim Rejection Reasons',
      description: 'Avoid these mistakes that cause HMRC to reject claims.',
      duration: '10 min',
    },
  ];

  return (
    <div className="dashboard">
      <KnowledgeHero
        title="Tutorials & Examples"
        description="Practical guides, walkthroughs, and videos to help you complete C285 claims with confidence."
        tips={[
          'Start with tutorials relevant to your claim stage',
          'Use written guides for quick reference',
          'Watch the video walkthrough before filling the form',
        ]}
      />

      {/* Written Tutorials */}
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
          <FileText size={24} style={{ color: '#3b82f6' }} />
          Written Guides
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {writtenTutorials.map((tutorial, index) => (
            <div
              key={index}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                cursor: 'pointer',
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
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {tutorial.title}
                  </h3>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.95rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {tutorial.description}
                  </p>
                  <span style={{ fontSize: '0.875rem', color: '#3b82f6', fontWeight: 600 }}>
                    {tutorial.duration}
                  </span>
                </div>
                <span style={{ color: '#3b82f6', fontSize: '1.5rem', marginLeft: '1rem' }}>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Tutorials */}
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
          <Video size={24} style={{ color: '#ef4444' }} />
          Video Tutorials
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {videoTutorials.map((video, index) => (
            <div
              key={index}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
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
              {/* Video Thumbnail Placeholder */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Video size={48} style={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    right: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: '#fff',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {video.duration}
                </div>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {video.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {video.description}
                </p>
              </div>
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
            Need help with a specific step?
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            M Assist can provide personalized guidance for your specific claim scenario and answer
            questions in real-time.
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
            Ask M Assist for Help
          </button>
        </div>
      </div>
    </div>
  );
}
