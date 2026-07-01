// Compliance Export Functionality

import type { AccountCompliance, ClaimCompliance } from '@/types';

/**
 * Export compliance data to CSV format
 */
export const exportToCSV = async (claims: ClaimCompliance[]): Promise<void> => {
  // CSV headers
  const headers = ['Claim Ref', 'MRN', 'Status', 'Score (%)', 'Issue Count', 'Last Checked'];

  // CSV rows
  const rows = claims.map((claim) => [
    claim.claimRef,
    claim.mrn,
    claim.status,
    Math.round(claim.score).toString(),
    claim.issueCount.toString(),
    claim.lastChecked.toLocaleString(),
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `compliance-report-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 500));
};

/**
 * Export compliance data to PDF format
 * Note: This is a simplified implementation. In production, you would use a library like jsPDF or pdfmake
 */
export const exportToPDF = async (
  accountCompliance: AccountCompliance | null,
  claims: ClaimCompliance[],
  overallScore: number
): Promise<void> => {
  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Compliance Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #0f172a;
        }
        h1 {
          color: #c18f1c;
          border-bottom: 2px solid #c18f1c;
          padding-bottom: 10px;
        }
        h2 {
          color: #0f172a;
          margin-top: 30px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .score {
          font-size: 48px;
          font-weight: bold;
          color: ${overallScore >= 90 ? '#22c55e' : overallScore >= 75 ? '#f59e0b' : '#ef4444'};
        }
        .section {
          margin: 20px 0;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        th {
          background: #0f172a;
          color: white;
          font-weight: 600;
        }
        .status-pass { color: #22c55e; font-weight: 600; }
        .status-warn { color: #f59e0b; font-weight: 600; }
        .status-fail { color: #ef4444; font-weight: 600; }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Compliance Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <div class="score">${Math.round(overallScore)}%</div>
        <p>Overall Compliance Score</p>
      </div>

      <h2>Account Compliance Summary</h2>
      <div class="section">
        ${
          accountCompliance
            ? `
          <p><strong>Declarant Identity:</strong> <span class="status-${accountCompliance.declarantStatus}">${accountCompliance.declarantStatus.toUpperCase()}</span></p>
          <p><strong>Trader Profile:</strong> <span class="status-${accountCompliance.traderProfileStatus}">${accountCompliance.traderProfileStatus.toUpperCase()}</span></p>
          <p><strong>Bank Verification:</strong> <span class="status-${accountCompliance.bankStatus}">${accountCompliance.bankStatus.toUpperCase()}</span></p>
          <p><strong>Last Updated:</strong> ${accountCompliance.lastUpdated.toLocaleString()}</p>
        `
            : '<p>No account compliance data available</p>'
        }
      </div>

      <h2>Claims Compliance Overview</h2>
      <table>
        <thead>
          <tr>
            <th>Claim Ref</th>
            <th>MRN</th>
            <th>Status</th>
            <th>Score</th>
            <th>Issues</th>
            <th>Last Checked</th>
          </tr>
        </thead>
        <tbody>
          ${claims
            .map(
              (claim) => `
            <tr>
              <td>${claim.claimRef}</td>
              <td>${claim.mrn}</td>
              <td>${claim.status}</td>
              <td style="color: ${claim.score >= 90 ? '#22c55e' : claim.score >= 75 ? '#f59e0b' : '#ef4444'}; font-weight: 600;">
                ${Math.round(claim.score)}%
              </td>
              <td style="color: ${claim.issueCount > 0 ? '#ef4444' : '#22c55e'}; font-weight: 600;">
                ${claim.issueCount}
              </td>
              <td>${claim.lastChecked.toLocaleString()}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>M Duty Claims - Compliance Tracking System</p>
        <p>This report is confidential and intended for internal use only</p>
      </div>
    </body>
    </html>
  `;

  // Create a new window and print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  } else {
    throw new Error('Failed to open print window. Please check your popup blocker settings.');
  }

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1000));
};
