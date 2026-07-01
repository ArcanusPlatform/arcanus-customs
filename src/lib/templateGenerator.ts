/**
 * Universal Template Generator Engine
 *
 * Loads HTML templates, applies Arcanus branding, and replaces placeholders
 * with real claim data to generate print-ready documents.
 */

export interface TemplateData {
  document_title?: string;
  'claim.reference'?: string;
  'claim.mrn'?: string;
  'claim.acceptance_date'?: string;
  'claim.total_claim_amount'?: string;
  'claim.reason'?: string;
  'trader.name'?: string;
  'trader.eori'?: string;
  'trader.legal_entity_type'?: string;
  'trader.address'?: string;
  'trader.postcode'?: string;
  'trader.country'?: string;
  'agent.company'?: string;
  'agent.contact'?: string;
  'agent.eori'?: string;
  'agent.address'?: string;
  today?: string;
  year?: string | number;
  [key: string]: string | number | undefined;
}

/**
 * Clean and format value to avoid duplicates
 */
function cleanValue(value: string | number | undefined): string {
  if (value === undefined || value === null) {
    return '—';
  }

  let cleaned = String(value);

  // Remove leading currency symbols if present (we'll let templates handle formatting)
  // This prevents ££ when template has £{{amount}}
  cleaned = cleaned.replace(/^[£$€]/, '');

  return cleaned;
}

/**
 * Replace all placeholders in template with actual data
 */
function replacePlaceholders(html: string, data: TemplateData): string {
  let result = html;

  // Replace each placeholder
  Object.entries(data).forEach(([key, value]) => {
    const cleanedValue = cleanValue(value);
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, cleanedValue);
  });

  // Remove any remaining unreplaced placeholders
  result = result.replace(/{{[^}]+}}/g, '—');

  // Fix common duplication issues
  result = result.replace(/££/g, '£'); // Remove duplicate pound signs
  result = result.replace(/\$\$/g, '$'); // Remove duplicate dollar signs
  result = result.replace(/€€/g, '€'); // Remove duplicate euro signs

  return result;
}

function applyArcanusBranding(html: string): string {
  let result = html
    .replace(/M_Logo_(Black|Blue|Gold|Orange|Red|White|Yellow)\.png/g, 'ArcanusLogo.png')
    .replace(/M Customs Manager Logo/g, 'Arcanus Customs Logo')
    .replace(/M Customs/g, 'Arcanus Customs')
    .replace(/M Duty/g, 'Arcanus Customs')
    .replace(/MDJ Consultants Ltd/g, 'Arcanus Customs')
    .replace(/mdjconsultants\.co\.uk/g, 'arcanuscustoms.co.uk')
    .replace(/--theme-colour\s*:\s*#[^;]+;/gi, '--theme-colour: #111111;')
    .replace(/--theme-light\s*:\s*#[^;]+;/gi, '--theme-light: #f3f2f6;')
    .replace(/--theme-light-2\s*:\s*#[^;]+;/gi, '--theme-light-2: #e6e1ec;')
    .replace(/--accent-blue\s*:\s*#[^;]+;/gi, '--accent-blue: #33224f;')
    .replace(/--border-light\s*:\s*#[^;]+;/gi, '--border-light: #d8d3df;')
    .replace(/--box-bg\s*:\s*#[^;]+;/gi, '--box-bg: #f6f5f8;');

  const brandOverride = `
<style id="arcanus-template-brand">
:root {
  --arcanus-black: #111111;
  --arcanus-grey: #5f5d66;
  --arcanus-grey-soft: #f3f2f5;
  --arcanus-purple: #33224f;
  --arcanus-purple-soft: #ebe7f1;
  --theme-colour: var(--arcanus-black);
  --theme-light: var(--arcanus-grey-soft);
  --theme-light-2: var(--arcanus-purple-soft);
  --accent-blue: var(--arcanus-purple);
  --border-light: #d8d3df;
  --box-bg: #f6f5f8;
}
body {
  background: #f4f4f5 !important;
  color: #242329;
}
.header-full {
  background: #ffffff;
  border-bottom: 1px solid #d8d3df;
}
.header-full img.logo {
  width: 84px;
  height: auto;
}
.header-full h1 {
  color: var(--arcanus-black) !important;
}
.header-line,
.footer {
  border-color: var(--arcanus-purple) !important;
}
.container {
  border-top: 4px solid var(--arcanus-purple);
  box-shadow: 0 2px 12px rgba(17,17,17,0.08) !important;
}
.section-title {
  color: var(--arcanus-black) !important;
  border-left-color: var(--arcanus-purple) !important;
}
.summary-box,
.info-box,
.info-warning,
.warning-box,
.note-box {
  background: var(--arcanus-grey-soft) !important;
  border-left-color: var(--arcanus-purple) !important;
  color: #302d36 !important;
}
table th {
  background: var(--arcanus-purple-soft) !important;
  color: var(--arcanus-black) !important;
}
a,
h3,
h4 {
  color: var(--arcanus-purple) !important;
}
</style>`;

  if (result.includes('id="arcanus-template-brand"')) {
    return result;
  }

  if (result.includes('</head>')) {
    return result.replace('</head>', `${brandOverride}\n</head>`);
  }

  return `${brandOverride}\n${result}`;
}

/**
 * Load template from file
 */
async function loadTemplate(templateFile: string): Promise<string> {
  try {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const templatePath = `${baseUrl}mdj_full_template_library/${templateFile}`;
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templateFile}`);
    }
    const html = await response.text();

    return applyArcanusBranding(html);
  } catch (error) {
    console.error('Error loading template:', error);
    throw error;
  }
}

/**
 * Generate a complete document from template
 *
 * @param templateFile - Name of the template file (e.g., 'evidence_checklist.html')
 * @param data - Data to inject into the template
 * @returns Complete HTML document ready for display/print
 */
function prefixAssetPaths(html: string): string {
  if (typeof window === 'undefined') return html;
  const baseUrl = import.meta.env.BASE_URL || '/';
  const origin = window.location.origin;

  return html.replace(
    /(src|href)=["'](?!https?:|data:|mailto:|#)([^"']+)["']/gi,
    (_match, attr, rawPath) => {
      let path = rawPath.trim();

      // Skip if already has base URL
      if (path.startsWith(baseUrl)) {
        return `${attr}="${origin}${path}"`;
      }

      // Add base URL prefix
      if (!path.startsWith('/')) {
        path = `/${path}`;
      }

      // Ensure base URL is included
      const fullPath = baseUrl === '/' ? path : `${baseUrl}${path}`;
      return `${attr}="${origin}${fullPath}"`;
    }
  );
}

export async function generateDocument(templateFile: string, data: TemplateData): Promise<string> {
  let html = await loadTemplate(templateFile);

  const year = data.year || new Date().getFullYear();
  const today = data.today || new Date().toLocaleDateString('en-GB');

  const fullData: TemplateData = {
    ...data,
    today,
    year: String(year),
  };

  html = replacePlaceholders(html, fullData);
  html = prefixAssetPaths(html);

  return html;
}

/**
 * Open generated document in new window for viewing/printing
 */
export function openGeneratedDocument(html: string): void {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}

/**
 * Download generated document as HTML file
 */
export function downloadDocument(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get sample data for testing templates
 */
export function getSampleData(): TemplateData {
  return {
    document_title: 'C285 Repayment Claim Pack',
    'claim.reference': 'CLAIM-239847',
    'claim.mrn': '21GB12345678901234',
    'claim.acceptance_date': '03/11/2024',
    'claim.total_claim_amount': '4,283.11',
    'claim.duty_amount': '3,150.00',
    'claim.vat_amount': '1,133.11',
    'claim.reason': 'Tariff Code Error',
    'claim.status': 'Draft',
    'trader.name': 'Clarke Imports Ltd',
    'trader.eori': 'GB123456789000',
    'trader.legal_entity_type': 'UK Limited Company',
    'trader.address': '123 Business Park, London',
    'trader.city': 'London',
    'trader.postcode': 'SW1A 1AA',
    'trader.country': 'United Kingdom',
    'trader.contact_name': 'John Clarke',
    'trader.contact_email': 'john.clarke@clarkeimports.co.uk',
    'trader.contact_phone': '+44 20 1234 5678',
    'agent.company': 'MDJ Consultants Ltd',
    'agent.contact': 'Neil Jones',
    'agent.eori': 'GB987654321000',
    'agent.address': '456 Agent Street, Manchester',
    'agent.email': 'support@arcanuscustoms.co.uk',
    'agent.phone': '+44 161 234 5678',
    'declarant.name': 'Neil Jones',
    'declarant.capacity': 'Agent',
    'declarant.organisation': 'Arcanus Customs',
    today: new Date().toLocaleDateString('en-GB'),
    year: new Date().getFullYear(),
  };
}
