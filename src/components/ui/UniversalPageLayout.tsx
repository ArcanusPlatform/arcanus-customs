import React from 'react';

interface UniversalPageLayoutProps {
  children: React.ReactNode;
}

export const UniversalPageLayout: React.FC<UniversalPageLayoutProps> = ({ children }) => {
  return <div className="min-h-screen bg-background">{children}</div>;
};

interface KPIGridProps {
  children: React.ReactNode;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ children }) => {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
};

interface ContentSectionProps {
  children: React.ReactNode;
}

export const ContentSection: React.FC<ContentSectionProps> = ({ children }) => {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-8">
      <div className="space-y-6">{children}</div>
    </div>
  );
};

export default UniversalPageLayout;
