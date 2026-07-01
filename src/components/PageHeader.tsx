/**
 * FINAL Production Page Header System
 * Light theme, spacious layout, section-specific tints and accents
 * Web-focused
 */

import React from 'react';

export type SectionColor =
  | 'dashboard'
  | 'clients'
  | 'onboarding'
  | 'claims'
  | 'manifest'
  | 'analysis'
  | 'compliance'
  | 'contacts'
  | 'settings'
  | 'knowledge'
  | 'templates';

interface PageHeaderProps {
  section: SectionColor;
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
  badge?: string | number;
}

const sectionColors: Record<SectionColor, { color: string; tint: string }> = {
  dashboard: { color: '#E6BD2F', tint: 'rgba(230, 189, 47, 0.05)' }, // Pale gold
  clients: { color: '#4A90E2', tint: 'rgba(74, 144, 226, 0.05)' }, // Pale blue
  onboarding: { color: '#299C9D', tint: 'rgba(41, 156, 157, 0.05)' }, // Pale teal
  claims: { color: '#F5A623', tint: 'rgba(245, 166, 35, 0.05)' }, // Pale orange
  manifest: { color: '#8F5AFF', tint: 'rgba(143, 90, 255, 0.05)' }, // Pale purple
  analysis: { color: '#27AE60', tint: 'rgba(39, 174, 96, 0.05)' }, // Pale green
  compliance: { color: '#D0021B', tint: 'rgba(208, 2, 27, 0.05)' }, // Pale red
  contacts: { color: '#556677', tint: 'rgba(85, 102, 119, 0.05)' }, // Pale slate
  settings: { color: '#C0C0C0', tint: 'rgba(192, 192, 192, 0.05)' }, // Pale silver
  knowledge: { color: '#3D5AFE', tint: 'rgba(61, 90, 254, 0.05)' }, // Pale indigo
  templates: { color: '#8C7B75', tint: 'rgba(140, 123, 117, 0.05)' }, // Pale warm grey
};

export default function PageHeader({
  section,
  title,
  subtitle,
  breadcrumb,
  actions,
  badge,
}: PageHeaderProps) {
  const { color: accentColor, tint: tintColor } = sectionColors[section];

  return (
    <div
      className="page-header-final"
      style={
        {
          '--accent-color': accentColor,
          '--tint-color': tintColor,
        } as React.CSSProperties
      }
    >
      <div className="page-header-container">
        <div className="page-header-left">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav className="page-header-breadcrumb">
              {breadcrumb.map((crumb, index) => (
                <React.Fragment key={index}>
                  <span className="breadcrumb-item">{crumb}</span>
                  {index < breadcrumb.length - 1 && <span className="breadcrumb-separator">/</span>}
                </React.Fragment>
              ))}
            </nav>
          )}

          <div className="page-header-title-row">
            <h1 className="page-header-title">
              {title}
              {badge !== undefined && <span className="page-header-badge">{badge}</span>}
            </h1>
          </div>

          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="page-header-actions">{actions}</div>}
      </div>

      <div className="page-header-underline" />
    </div>
  );
}
