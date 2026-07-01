import { useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, X, FileSpreadsheet } from 'lucide-react';
import { cdsAPI } from '@/lib/api-service';

type UploadResult = {
  batchId: string;
  declarations: number;
  items: number;
  taxLines: number;
  cdsRecords?: number;
  documents: number;
  errors: Array<{ scope: string; identifier: string; message: string; row?: number }>;
};

interface CSVUploadProps {
  onSuccess?: (result: UploadResult) => void;
  onCancel?: () => void;
}

export default function CSVUpload({ onSuccess, onCancel }: CSVUploadProps) {
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [itemsFile, setItemsFile] = useState<File | null>(null);
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const itemsInputRef = useRef<HTMLInputElement>(null);
  const taxInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setHeaderFile(null);
    setItemsFile(null);
    setTaxFile(null);
    setResult(null);
    setError(null);
    if (headerInputRef.current) headerInputRef.current.value = '';
    if (itemsInputRef.current) itemsInputRef.current.value = '';
    if (taxInputRef.current) taxInputRef.current.value = '';
  };

  const handleDrop = (role: 'header' | 'items' | 'tax', file: File | undefined) => {
    if (!file || !isValidFile(file)) return;
    if (role === 'header') setHeaderFile(file);
    if (role === 'items') setItemsFile(file);
    if (role === 'tax') setTaxFile(file);
  };

  const isValidFile = (file: File): boolean => {
    const validExtensions = ['.csv', '.ods', '.xlsx', '.xls'];
    return validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
  };

  const readyToUpload = !!headerFile;

  const handleProcess = async () => {
    if (!headerFile) {
      setError('Header file is required');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const response = await cdsAPI.importDeclarations({
        header: headerFile,
        items: itemsFile || undefined,
        tax: taxFile || undefined,
      });
      const batch = response.batch as UploadResult;
      setResult(batch);
      onSuccess?.(batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFileCard = (
    label: string,
    description: string,
    file: File | null,
    inputRef: React.RefObject<HTMLInputElement>,
    role: 'header' | 'items' | 'tax',
    required = false
  ) => (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleDrop(role, e.dataTransfer.files?.[0]);
      }}
      style={{
        border: `2px dashed ${isDragging ? 'var(--accent-purple)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '1.5rem',
        textAlign: 'center',
        background: 'rgba(15,23,42,0.02)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.ods,.xls,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => handleDrop(role, e.target.files?.[0])}
      />
      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{description}</p>
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--card-bg)',
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: '0.75rem',
        }}
      >
        Select File
      </button>
      {file && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong>{file.name}</strong>
        </div>
      )}
    </div>
  );

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
            onClick={onCancel || resetState}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X />
          </button>
        </div>
        <div
          style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Batch {result.batchId}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {result.declarations} declarations, {result.items} items, {result.taxLines} tax
                lines, {result.cdsRecords ?? result.items} CDS records
              </p>
            </div>
          </div>
        </div>
        {result.errors?.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle style={{ color: '#ef4444' }} />
              {result.errors.length} issues detected
            </h4>
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              {result.errors.map((err, index) => (
                <div
                  key={`${err.scope}-${err.identifier}-${index}`}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom:
                      index < result.errors.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    [{err.scope}] {err.identifier}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Row {err.row ?? '—'} — {err.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={resetState}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent-purple)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Upload Another Batch
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Import HMRC CDS Files</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Upload header, item, and tax CSV/ODS files exactly as exported from CDS. Files are
          validated and linked automatically.
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {renderFileCard(
          'Header File',
          'Contains MRN level metadata (required)',
          headerFile,
          headerInputRef,
          'header',
          true
        )}
        {renderFileCard(
          'Item File',
          'Item lines for each MRN (optional)',
          itemsFile,
          itemsInputRef,
          'items'
        )}
        {renderFileCard(
          'Tax File',
          'Tax lines for each item (optional)',
          taxFile,
          taxInputRef,
          'tax'
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleProcess}
        disabled={!readyToUpload || isProcessing}
        style={{
          width: '100%',
          padding: '0.9rem',
          borderRadius: '10px',
          border: 'none',
          fontWeight: 600,
          cursor: readyToUpload && !isProcessing ? 'pointer' : 'not-allowed',
          background: readyToUpload ? 'var(--accent-purple)' : '#d1d5db',
          color: readyToUpload ? '#111' : '#6b7280',
        }}
      >
        {isProcessing ? 'Uploading…' : 'Upload & Process'}
      </button>

      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px dashed var(--border)',
          display: 'flex',
          gap: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <FileSpreadsheet />
        <div>
          <strong>Need the HMRC extract?</strong>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            Download header, item, and tax reports from your CDS dashboard, then drop them here.
          </p>
        </div>
      </div>
    </div>
  );
}
