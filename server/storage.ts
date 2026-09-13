import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { getFirebaseAdminApp } from './firebaseAdmin';

// Local storage directory for development / container / serverless fallback
const LOCAL_STORAGE_DIR = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
} catch {
  // If read-only filesystem or restricted permissions, safely ignore
}

// Allowed MIME types and size limit (10 MB)
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const JWT_SECRET = process.env.JWT_SECRET || 'photo-platform-jwt-secret-internship-2026';

export function isFirebaseStorageConfigured(): boolean {
  const app = getFirebaseAdminApp();
  return Boolean(app);
}

function getBucket() {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  try {
    return getStorage(app).bucket();
  } catch {
    return null;
  }
}

export function sanitizeFilename(originalName: string): string {
  // Strip path traversal and weird characters
  const clean = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean.slice(0, 100);
}

export function isValidStoragePath(storagePath: string): boolean {
  if (!storagePath || typeof storagePath !== 'string') return false;
  // Strict format: events/<eventId>/photos/<uniqueFilename>
  const regex = /^events\/[a-zA-Z0-9_-]+\/photos\/[a-zA-Z0-9._-]+$/;
  return regex.test(storagePath);
}

export function generatePhotoStreamSignature(storagePath: string, exp: number): string {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${storagePath}:${exp}`)
    .digest('hex');
}

export function verifyPhotoStreamSignature(storagePath: string, exp: number, sig: string): boolean {
  if (!sig || !exp || typeof exp !== 'number') return false;
  const expMs = exp < 10000000000 ? exp * 1000 : exp;
  if (Date.now() > expMs) return false;
  const expected = generatePhotoStreamSignature(storagePath, exp);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

export function generateStoragePath(eventId: string, originalFilename: string): string {
  const safeName = sanitizeFilename(originalFilename);
  const uuid = crypto.randomUUID();
  return `events/${eventId}/photos/${uuid}-${safeName}`;
}

export async function uploadFileToStorage(
  storagePath: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ storagePath: string; publicUrl?: string }> {
  if (!isValidStoragePath(storagePath)) {
    throw new Error('Invalid storage path format.');
  }

  const bucket = getBucket();
  let uploadedToFirebase = false;

  if (bucket) {
    try {
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        contentType: mimeType,
        resumable: false,
        metadata: {
          contentType: mimeType,
          customMetadata: {
            uploadedAt: new Date().toISOString(),
          },
        },
      });
      uploadedToFirebase = true;
    } catch (err) {
      // If service credentials lack direct write permission, fall through to local fallback
      console.warn('[Firebase Storage] Bucket upload note:', (err as Error).message);
    }
  }

  // Always maintain local cache/file mirror for reliable local streaming and fallback
  const resolvedBase = path.resolve(LOCAL_STORAGE_DIR);
  const fullLocalPath = path.resolve(LOCAL_STORAGE_DIR, storagePath);
  if (!fullLocalPath.startsWith(resolvedBase + path.sep)) {
    throw new Error('Security error: Path traversal detected.');
  }

  const parentDir = path.dirname(fullLocalPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  fs.writeFileSync(fullLocalPath, buffer);

  return { storagePath };
}

export async function deleteFileFromStorage(storagePath: string): Promise<void> {
  if (!isValidStoragePath(storagePath)) return;

  const bucket = getBucket();
  if (bucket) {
    try {
      await bucket.file(storagePath).delete({ ignoreNotFound: true });
    } catch (err) {
      console.warn('[Firebase Storage] Delete note:', (err as Error).message);
    }
  }

  try {
    const resolvedBase = path.resolve(LOCAL_STORAGE_DIR);
    const fullLocalPath = path.resolve(LOCAL_STORAGE_DIR, storagePath);
    if (fullLocalPath.startsWith(resolvedBase + path.sep) && fs.existsSync(fullLocalPath)) {
      fs.unlinkSync(fullLocalPath);
    }
  } catch (err) {
    console.warn('Error deleting local file:', (err as Error).message);
  }
}

export async function getSignedPhotoUrl(storagePath: string, expiresInSeconds: number = 7200): Promise<string> {
  const bucket = getBucket();

  if (bucket) {
    try {
      const file = bucket.file(storagePath);
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInSeconds * 1000,
      });
      if (signedUrl) return signedUrl;
    } catch {
      // Fallback to secure HMAC streaming route
    }
  }

  // Secure HMAC signed photo stream route
  const exp = Date.now() + expiresInSeconds * 1000;
  const sig = generatePhotoStreamSignature(storagePath, exp);
  return `/api/photos/stream?path=${encodeURIComponent(storagePath)}&exp=${exp}&sig=${sig}`;
}

export function getLocalFilePath(storagePath: string): string | null {
  if (!isValidStoragePath(storagePath)) {
    return null;
  }
  const resolvedBase = path.resolve(LOCAL_STORAGE_DIR);
  const fullLocalPath = path.resolve(LOCAL_STORAGE_DIR, storagePath);
  if (!fullLocalPath.startsWith(resolvedBase + path.sep)) {
    return null;
  }
  if (fs.existsSync(fullLocalPath)) {
    return fullLocalPath;
  }
  return null;
}
