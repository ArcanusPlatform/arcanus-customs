import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';
import { parseClaimsCSV, type ClaimsCSVParseResult } from '@/lib/claims-csv-parser';
import { claimsAPI } from '@/lib/api-service';

interface ClaimsCSVUploadProps {
  onSuccess?: (result: ClaimsCSVParseResult) => void;
  onCancel?: () => void;
}

export default function ClaimsCSVUpload({ onSuccess, onCancel }: ClaimsCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ClaimsCSVParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel'];
    const validExtensions = ['.csv'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

    return (hasValidType || hasValidExtension) && isValidSize;
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Read file content
      const content = await file.text();

      // Parse CSV
      const parseResult = await parseClaimsCSV(content);
      setResult(parseResult);

      // If successful, import to API
      if (parseResult.success && parseResult.data) {
        for (const claim of parseResult.data) {
          await claimsAPI.createClaim(claim);
        }
        onSuccess?.(parseResult);
      }
    } catch (error) {
      setResult({
        success: false,
        errors: [
          {
            row: 0,
            message: error instanceof Error ? error.message : 'Failed to process file',
            severity: 'critical',
          },
        ],
        stats: { totalRows: 0, validClaims: 0, invalidClaims: 0, totalItems: 0 },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template =
      'claim_reference,mrn,entry_number,acceptance_date,trader_eori,trader_name,trader_address,trader_city,trader_postcode,trader_country,company_number,contact_name,contact_email,contact_phone,agent_eori,agent_name,reason,reason_description,payment_method,bank_account_name,bank_account_number,bank_sort_code,bank_iban,bank_swift,item_number,commodity_code,item_description,invoice_value,invoice_currency,original_duty,correct_duty,original_vat,correct_vat,original_excise,correct_excise\n';

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claims_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (result) {
    return (
      <div style={{ padding: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Import Results</h2>
          <button
            onClick={onCancel || handleReset}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Summary */}
        <div
          style={{
            background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${result.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            {result.success ? (
              <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
            ) : (
              <AlertCircle size={32} style={{ color: '#ef4444' }} />
            )}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                {result.success ? 'Import Successful' : 'Import Failed'}
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                {result.success
                  ? `Successfully imported ${result.stats.validClaims} claims with ${result.stats.totalItems} items`
                  : `Failed to import claims. Please fix errors and try again.`}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Rows</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{result.stats.totalRows}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Valid Claims</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#22c55e' }}>
                {result.stats.validClaims}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Invalid Claims</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>
                {result.stats.invalidClaims}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Items</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-purple)' }}>
                {result.stats.totalItems}
              </div>
            </div>
          </div>
        </div>

        {/* Errors */}
        {result.errors && result.errors.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '1rem',
                color: '#ef4444',
              }}
            >
              Errors ({result.errors.length})
            </h3>
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {result.errors.map((error, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    borderBottom:
                      index < result.errors!.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <AlertCircle
                      size={16}
                      style={{ color: '#ef4444', marginTop: '0.25rem', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        Row {error.row}
                        {error.field && ` - ${error.field}`}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {error.message}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: error.severity === 'critical' ? '#ef4444' : '#f59e0b',
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {error.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {result.warnings && result.warnings.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '1rem',
                color: '#f59e0b',
              }}
            >
              Warnings ({result.warnings.length})
            </h3>
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {result.warnings.slice(0, 10).map((warning, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom:
                      index < Math.min(result.warnings!.length, 10) - 1
                        ? '1px solid var(--border)'
                        : 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  Row {warning.row}
                  {warning.field && ` - ${warning.field}`}: {warning.message}
                </div>
              ))}
              {result.warnings.length > 10 && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}
                >
                  ... and {result.warnings.length - 10} more warnings
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Upload Another File
          </button>
          {result.success && (
            <button
              onClick={onCancel}
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
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Import Claims from CSV
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Upload a CSV file containing multiple claims with items
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Template Download */}
      <div
        style={{
          background: 'rgba(124, 58, 237, 0.1)',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Need a template?</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Download our CSV template with example claims (including multi-item claims)
          </div>
        </div>
        <button
          onClick={downloadTemplate}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--accent-purple)',
            color: 'var(--text-light)',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Download size={16} />
          Download Template
        </button>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          background: isDragging ? 'rgba(124, 58, 237, 0.1)' : '#fff',
          border: `2px dashed ${isDragging ? 'var(--accent-purple)' : 'var(--border)'}`,
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: '2rem',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {file ? (
          <>
            <FileSpreadsheet
              size={48}
              style={{ color: 'var(--accent-purple)', margin: '0 auto 1rem' }}
            />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {file.name}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {(file.size / 1024).toFixed(2)} KB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
              }}
            >
              Choose Different File
            </button>
          </>
        ) : (
          <>
            <Upload
              size={48}
              style={{
                color: isDragging ? 'var(--accent-purple)' : 'var(--text-muted)',
                margin: '0 auto 1rem',
              }}
            />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {isDragging ? 'Drop file here' : 'Drag and drop your CSV file here'}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>or click to browse</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Supported format: CSV (Max 10MB)
            </p>
          </>
        )}
      </div>

      {/* Process Button */}
      {file && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            style={{
              padding: '0.75rem 1.5rem',
              background: isProcessing ? 'var(--text-muted)' : 'var(--accent-purple)',
              color: 'var(--text-light)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {isProcessing ? 'Processing...' : 'Import Claims'}
          </button>
        </div>
      )}
    </div>
  );
}
