import React from 'react';
import clsx from 'clsx';
import styles from './UniversalPageHeader.module.css';

export interface UniversalPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  theme?: 'purple' | 'black';
  hideOnPrint?: boolean;
  meta?: React.ReactNode;
}

const THEME_STYLES = {
  purple: {
    logo: '/ArcanusLogo.png',
  },
  black: {
    logo: '/ArcanusLogo.png',
  },
} as const;

export const UniversalPageHeader: React.FC<UniversalPageHeaderProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  theme = 'purple',
  hideOnPrint = false,
  meta,
}) => {
  const themeStyles = THEME_STYLES[theme];

  return (
    <header
      className={clsx('border-b bg-card', hideOnPrint && 'print:hidden', styles.header)}
      data-theme={theme}
    >
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-4">
              <div
                className={clsx(
                  'hidden h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-muted sm:flex',
                  styles.logoContainer
                )}
                data-theme={theme}
              >
                <img
                  src={themeStyles.logo}
                  alt="Customs Logo"
                  className={clsx('max-h-9 w-auto object-contain', styles.logoImage)}
                />
              </div>

              <div className="min-w-0 flex-1">
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <React.Fragment key={`${breadcrumb.label}-${index}`}>
                        {breadcrumb.href ? (
                          <a href={breadcrumb.href} className={styles.breadcrumbLink}>
                            {breadcrumb.label}
                          </a>
                        ) : (
                          <span>{breadcrumb.label}</span>
                        )}
                        {index < breadcrumbs.length - 1 && (
                          <span className={styles.breadcrumbSeparator} aria-hidden="true">
                            /
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </nav>
                )}

                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className={styles.titleRow}>
                      <h1 className={styles.title}>{title}</h1>
                      <span className={styles.badge} data-theme={theme}>
                        Customs
                      </span>
                    </div>

                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                  </div>

                  {meta && <div className={styles.meta}>{meta}</div>}
                </div>
              </div>
            </div>
          </div>

          {actions && <div className={clsx(styles.actions, 'lg:justify-end')}>{actions}</div>}
        </div>
      </div>
    </header>
  );
};

export default UniversalPageHeader;
