import { Info } from 'lucide-react';
import { isDemoMode } from '@/lib/demo-database';
import { useEffect, useState } from 'react';

export default function DemoModeIndicator() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setIsDemo(isDemoMode());
  }, []);

  if (!isDemo) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(200, 166, 82, 0.9)',
        color: '#0a0e27',
        padding: '8px 16px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Info size={16} />
      <span>DEMO MODE - Sample Data</span>
    </div>
  );
}
