import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole, UserProfile } from '../src/types/index';
import { getFirebaseAdminApp } from './firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'photo-platform-jwt-secret-internship-2026';
const PIN_SALT_ROUNDS = 10;
const PASSWORD_SALT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  authUserId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface CustomerGalleryTokenPayload {
  galleryId: string;
  slug: string;
  type: 'CUSTOMER_GALLERY_SESSION';
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  customerGallery?: CustomerGalleryTokenPayload;
}

// Password hashing
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

// PIN hashing
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin.trim(), PIN_SALT_ROUNDS);
}

export async function verifyPin(pin: string, hashedPin: string): Promise<boolean> {
  return bcrypt.compare(pin.trim(), hashedPin);
}

// User JWT Generation
export function generateUserToken(user: UserProfile): string {
  const payload: TokenPayload = {
    userId: user.id,
    authUserId: user.auth_user_id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// User JWT Verification helper
export function verifyUserToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Customer Gallery Access JWT Generation
export function generateGalleryAccessToken(galleryId: string, slug: string): string {
  const payload: CustomerGalleryTokenPayload = {
    galleryId,
    slug,
    type: 'CUSTOMER_GALLERY_SESSION',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' }); // 2 hours temporary access
}

// Express Middleware: Authenticate User (Supports both Custom Staff JWT and Firebase ID Tokens)
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing or invalid Bearer token.' });
  }

  const token = authHeader.split(' ')[1];

  // 1. First attempt: Verify as custom staff JWT (fast, stateless, offline & test compatible)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded && decoded.userId) {
      req.user = decoded;
      return next();
    }
  } catch {
    // Token is not a custom staff JWT, proceed to check if it's a Firebase ID token
  }

  // 2. Second attempt: Verify as Firebase ID token via Firebase Admin SDK
  try {
    const adminApp = getFirebaseAdminApp();
    if (adminApp) {
      const adminAuth = getAuth(adminApp);
      const decodedFirebase = await adminAuth.verifyIdToken(token);
      if (decodedFirebase && decodedFirebase.uid) {
        let profile = await db.findProfileByAuthId(decodedFirebase.uid);
        if (!profile && decodedFirebase.email) {
          profile = await db.findProfileByEmail(decodedFirebase.email);
        }

        if (profile) {
          req.user = {
            userId: profile.id,
            authUserId: profile.auth_user_id,
            email: profile.email,
            name: profile.name,
            role: (decodedFirebase.role as UserRole) || profile.role,
          };
          return next();
        }
      }
    }
  } catch {
    // Fallthrough to 401 error
  }

  return res.status(401).json({ error: 'Session expired or token invalid. Please log in again.' });
}

// Express Middleware: Optional User (allows unauthenticated if token not provided)
export async function optionalUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      if (decoded && decoded.userId) {
        req.user = decoded;
        return next();
      }
    } catch {
      // Ignore and check Firebase ID token
    }

    try {
      const adminApp = getFirebaseAdminApp();
      if (adminApp) {
        const adminAuth = getAuth(adminApp);
        const decodedFirebase = await adminAuth.verifyIdToken(token);
        if (decodedFirebase && decodedFirebase.uid) {
          let profile = await db.findProfileByAuthId(decodedFirebase.uid);
          if (!profile && decodedFirebase.email) {
            profile = await db.findProfileByEmail(decodedFirebase.email);
          }
          if (profile) {
            req.user = {
              userId: profile.id,
              authUserId: profile.auth_user_id,
              email: profile.email,
              name: profile.name,
              role: (decodedFirebase.role as UserRole) || profile.role,
            };
          }
        }
      }
    } catch {
      // Optional user, ignore errors
    }
  }
  next();
}

// Express Middleware: Require Admin
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
  }
  next();
}

// Express Middleware: Require Authenticated User (Admin or Team Member)
export function requireAuthenticatedUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Express Middleware: Verify Customer Gallery Session
export function verifyCustomerGallerySession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Can be in Authorization: Bearer <token> or X-Gallery-Token or query parameter
  const token =
    (req.headers['x-gallery-token'] as string) ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null) ||
    (req.query.galleryToken as string);

  if (!token) {
    return res.status(401).json({ error: 'Gallery PIN verification required to access this gallery.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CustomerGalleryTokenPayload;
    if (decoded.type !== 'CUSTOMER_GALLERY_SESSION') {
      return res.status(403).json({ error: 'Invalid gallery access token' });
    }
    // Check slug matches route param if available
    const routeSlug = req.params.slug;
    if (routeSlug && decoded.slug !== routeSlug) {
      return res.status(403).json({ error: 'Access token does not match requested gallery' });
    }
    req.customerGallery = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Gallery session has expired. Please re-enter the PIN.' });
  }
}
