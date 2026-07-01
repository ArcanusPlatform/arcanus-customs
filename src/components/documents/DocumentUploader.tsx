import { useState, useRef } from 'react';
import { onboardingAPI } from '@/lib/api-service';

interface DocumentUploaderProps {
  clientId: string;
  onComplete?: () => void;
}

const categories = ['Identity', 'HMRC', 'Finance', 'General', 'Evidence'];

export default function DocumentUploader({ clientId, onComplete }: DocumentUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('General');
  const [documentType, setDocumentType] = useState('general');
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        await onboardingAPI.uploadDocument(clientId, { file, documentType, category });
      }
      setFiles([]);
      onComplete?.();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
      style={{
        border: '2px dashed var(--border)',
        borderRadius: '12px',
        padding: '1.25rem',
        background: 'rgba(15,23,42,0.02)',
      }}
    >
      <input
        type="file"
        multiple
        ref={inputRef}
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p style={{ marginTop: 0, fontWeight: 600 }}>Upload documents</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Drag & drop files or browse</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button className="secondaryButton" onClick={() => inputRef.current?.click()}>
          Browse
        </button>
        <select
          className="authInput"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          className="authInput"
          placeholder="Document type (slug)"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        />
      </div>
      {files.length > 0 && (
        <ul style={{ listStyle: 'disc', marginLeft: '1.25rem', color: 'var(--text-muted)' }}>
          {files.map((file) => (
            <li key={file.name}>{file.name}</li>
          ))}
        </ul>
      )}
      <button
        className="primaryButton"
        disabled={!files.length || isUploading}
        onClick={handleUpload}
        style={{ marginTop: '0.75rem' }}
      >
        {isUploading ? 'Uploading…' : 'Upload Documents'}
      </button>
    </div>
  );
}
