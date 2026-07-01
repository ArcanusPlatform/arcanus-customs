import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

function isWithinBackendRoot(candidatePath) {
  const resolvedRoot = path.resolve(backendRoot);
  const resolvedCandidate = path.resolve(candidatePath);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalize(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getBackendRoot() {
  return backendRoot;
}

export function resolveBackendPath(value, fallbackRelativePath) {
  const fallback = path.resolve(backendRoot, fallbackRelativePath);
  const configured = normalize(value);
  if (!configured) {
    return fallback;
  }
  const resolved = path.isAbsolute(configured)
    ? path.normalize(configured)
    : path.resolve(backendRoot, configured);
  return isWithinBackendRoot(resolved) ? resolved : fallback;
}

export function getDataRoot() {
  return resolveBackendPath(process.env.DATA_DIR, 'data');
}

export function getUploadsRoot() {
  return resolveBackendPath(process.env.UPLOAD_DIR, 'uploads');
}

export function getDefaultDatabasePath() {
  return resolveBackendPath(process.env.DATABASE_PATH, path.join('data', 'spv_duty.db'));
}

export function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
  return directoryPath;
}
