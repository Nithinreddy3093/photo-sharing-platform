import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../src/types/index';
import { db, isFirebaseConfigured } from './db';
import {
  authenticateUser,
  requireAdmin,
  requireAuthenticatedUser,
  verifyCustomerGallerySession,
  generateUserToken,
  verifyUserToken,
  generateGalleryAccessToken,
  hashPassword,
  verifyPassword,
  hashPin,
  verifyPin,
  type AuthenticatedRequest,
} from './auth';
import { syncFirebaseUserRole } from './firebaseAdmin';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  generateStoragePath,
  uploadFileToStorage,
  getSignedPhotoUrl,
  getLocalFilePath,
  isValidStoragePath,
  verifyPhotoStreamSignature,
  deleteFileFromStorage,
} from './storage';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'photo-platform-jwt-secret-internship-2026';

// Configure Multer for in-memory file buffering
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 20, // Max 20 photos per batch upload
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP`));
    }
  },
});

const handleUpload = (req: Request, res: Response, next: express.NextFunction) => {
  upload.array('photos', 20)(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File exceeds 10MB limit.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload validation failed.' });
    }
    next();
  });
};

// In-Memory Rate Limiter for Customer Gallery PIN Attempts
// Map: key(`${slug}:${ip}`) -> { attempts: number, lockUntil: number }
const pinAttemptStore = new Map<string, { attempts: number; lockUntil: number }>();

function checkPinRateLimit(slug: string, ip: string): { allowed: boolean; waitSeconds?: number } {
  const key = `${slug}:${ip}`;
  const now = Date.now();
  const entry = pinAttemptStore.get(key);

  if (!entry) {
    return { allowed: true };
  }

  if (entry.lockUntil > now) {
    const waitSeconds = Math.ceil((entry.lockUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  if (entry.lockUntil <= now && entry.lockUntil > 0) {
    // Lock expired, reset
    pinAttemptStore.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedPinAttempt(slug: string, ip: string) {
  const key = `${slug}:${ip}`;
  const now = Date.now();
  const entry = pinAttemptStore.get(key) || { attempts: 0, lockUntil: 0 };
  entry.attempts += 1;
  if (entry.attempts >= 5) {
    // Lock for 15 minutes after 5 consecutive failed attempts
    entry.lockUntil = now + 15 * 60 * 1000;
  }
  pinAttemptStore.set(key, entry);
}

function resetPinAttempts(slug: string, ip: string) {
  pinAttemptStore.delete(`${slug}:${ip}`);
}

// Helper to validate that all selected photos belong to the target event
async function validatePhotosBelongToEvent(photoIds: string[], eventId: string): Promise<boolean> {
  if (!photoIds || photoIds.length === 0) return true;
  const eventPhotos = await db.getPhotosForEvent(eventId);
  const eventPhotoIds = new Set(eventPhotos.map((p) => p.id));
  return photoIds.every((id) => eventPhotoIds.has(id));
}

// ==========================================
// 1. AUTHENTICATION & USERS
// ==========================================

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().optional(),
});

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { name, email, password, role: requestedRole } = parsed.data;

    const existing = await db.findProfileByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Determine trusted authorization context
    // 1. Check if caller is an existing authenticated Admin
    let isCallerAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyUserToken(token);
      if (decoded && decoded.role === 'ADMIN') {
        isCallerAdmin = true;
      }
    }

    // 2. Check for trusted server-side setup secret key
    const trustedSetupKey = process.env.ADMIN_SETUP_KEY || 'trusted-photoplatform-setup-secret';
    const providedSetupKey = req.headers['x-admin-setup-key'];
    const hasTrustedSetupKey = typeof providedSetupKey === 'string' && providedSetupKey === trustedSetupKey;

    const isTrustedServerOperation = isCallerAdmin || hasTrustedSetupKey;

    // RULE 1 & 2: Public registration must NEVER be able to create an Admin account.
    // If an unprivileged client requests role: 'ADMIN', reject with 403 Forbidden.
    if (requestedRole === 'ADMIN' && !isTrustedServerOperation) {
      return res.status(403).json({
        error: 'Privilege escalation rejected: The Admin role cannot be self-assigned via public registration.',
      });
    }

    // Server-side role assignment:
    // Only a trusted server-side operation or existing Admin can grant the ADMIN role.
    // All normal public registrations are strictly assigned TEAM_MEMBER.
    // The role supplied by the frontend is never trusted.
    const assignedRole: UserRole = isTrustedServerOperation && requestedRole === 'ADMIN'
      ? 'ADMIN'
      : 'TEAM_MEMBER';

    const passwordHash = await hashPassword(password);
    const profile = await db.createProfile({
      name,
      email,
      role: assignedRole,
      passwordHash,
    });

    // Synchronize Firebase custom claims and Firestore security collections
    await syncFirebaseUserRole(profile.auth_user_id, profile.email, profile.role);

    const token = generateUserToken(profile);
    return res.status(201).json({
      token,
      user: profile,
      message: 'Registration successful',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, password } = parsed.data;

    // 1. Verify user credentials via bcrypt against database store
    const user = await db.verifyUserCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 2. Firebase role synchronization if applicable (non-blocking for resilience)
    if (user.auth_user_id) {
      syncFirebaseUserRole(user.auth_user_id, user.email, user.role).catch((err) => {
        console.warn('[Login Firebase Sync] Non-fatal notification:', err?.message);
      });
    }

    // 3. Generate signed staff JWT
    const token = generateUserToken(user);
    return res.json({
      token,
      user,
      message: 'Logged in successfully',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const FirebaseLoginSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
});

router.post('/auth/firebase-login', async (req: Request, res: Response) => {
  try {
    const parsed = FirebaseLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { uid, email, name } = parsed.data;
    let user = await db.findProfileByEmail(email);

    if (!user) {
      // Google Sign-In authorization rule:
      // Arbitrary Google logins must NEVER be able to self-assign the ADMIN role.
      // New Google sign-in users are strictly assigned TEAM_MEMBER.
      // Only the bootstrap admin email (admin@photoplatform.com or ADMIN_EMAIL) gets ADMIN.
      const isBootstrapAdmin =
        email.toLowerCase() === 'admin@photoplatform.com' ||
        (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());

      const assignedRole: UserRole = isBootstrapAdmin ? 'ADMIN' : 'TEAM_MEMBER';

      user = await db.createProfile({
        auth_user_id: uid,
        name: name || email.split('@')[0],
        email,
        role: assignedRole,
        passwordHash: '',
      });

      // Synchronize Firebase custom claims and Firestore security collections
      await syncFirebaseUserRole(uid, email, assignedRole);
    }

    const token = generateUserToken(user);
    return res.json({
      token,
      user,
      message: 'Logged in successfully via Firebase Auth',
    });
  } catch (err: any) {
    console.error('Firebase login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/auth/me', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const profile = await db.findProfileById(req.user.userId);
  if (!profile) return res.status(404).json({ error: 'User profile not found' });
  return res.json({ user: profile });
});

// Admin endpoint: List all registered profiles (useful for adding team members)
router.get('/users', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profiles = await db.getAllProfiles();
    return res.json({ users: profiles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN PRIVILEGED ROLE & USER MANAGEMENT
// ==========================================

const AdminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6).optional().default('TempPass123!'),
  role: z.enum(['ADMIN', 'TEAM_MEMBER']).default('TEAM_MEMBER'),
});

// Admin can provision a new Team Member or Admin account
router.post('/admin/users', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = AdminCreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { name, email, password, role } = parsed.data;

    const existing = await db.findProfileByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const profile = await db.createProfile({
      name,
      email,
      role,
      passwordHash,
    });

    // Synchronize Firebase custom claims and Firestore security collections
    await syncFirebaseUserRole(profile.auth_user_id, profile.email, profile.role);

    return res.status(201).json({
      user: profile,
      message: `${role === 'ADMIN' ? 'Admin' : 'Team Member'} account created successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

const AssignRoleSchema = z.object({
  role: z.enum(['ADMIN', 'TEAM_MEMBER']),
});

// Admin can assign/update a user's role (promote/demote)
const handleAssignRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = AssignRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { role } = parsed.data;
    const targetUser = await db.findProfileById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user profile not found' });
    }

    const updatedProfile = await db.updateUserRole(id, role);
    if (!updatedProfile) {
      return res.status(500).json({ error: 'Failed to update user role' });
    }

    // Synchronize Firebase custom claims and Firestore security collections
    await syncFirebaseUserRole(updatedProfile.auth_user_id, updatedProfile.email, role);

    return res.json({
      user: updatedProfile,
      message: `User role successfully updated to ${role}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to assign role' });
  }
};

router.post('/admin/users/:id/role', authenticateUser, requireAdmin, handleAssignRole);
router.put('/admin/users/:id/role', authenticateUser, requireAdmin, handleAssignRole);

// Admin can invite/pre-approve a team member
const AdminInviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'TEAM_MEMBER']).default('TEAM_MEMBER'),
  eventId: z.string().optional(),
});

router.post('/admin/invite', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = AdminInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { name, email, role, eventId } = parsed.data;

    let user = await db.findProfileByEmail(email);
    if (!user) {
      const defaultHash = await hashPassword('InvitedMember123!');
      user = await db.createProfile({
        name,
        email,
        role,
        passwordHash: defaultHash,
      });
      await syncFirebaseUserRole(user.auth_user_id, user.email, role);
    }

    // If an eventId was provided, assign them to the event immediately
    let assignment = null;
    if (eventId) {
      const event = await db.getEventById(eventId);
      if (event) {
        assignment = await db.addEventMember(eventId, user.id);
      }
    }

    return res.status(201).json({
      user,
      assignment,
      message: `Team member ${user.name} invited and approved successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to process invite' });
  }
});

// ==========================================
// 2. EVENTS
// ==========================================

const CreateEventSchema = z.object({
  name: z.string().min(3, 'Event name must be at least 3 characters').max(200),
  description: z.string().optional().default(''),
});

// List events accessible to current user (Admin: created by them; Team Member: assigned events)
router.get('/events', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const events = await db.getEventsForUser(req.user!.userId, req.user!.role);
    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create event (Admin only)
router.post('/events', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = CreateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const newEvent = await db.createEvent({
      name: parsed.data.name,
      description: parsed.data.description,
      created_by: req.user!.userId,
    });

    return res.status(201).json({ event: newEvent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get event by ID (Server-side authorization: Admin owner or assigned Team Member)
router.get('/events/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Authorization check
    if (req.user!.role === 'ADMIN') {
      if (event.created_by !== req.user!.userId) {
        return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
      }
    } else {
      // Team Member check assignment
      const isAssigned = await db.isUserAssignedToEvent(eventId, req.user!.userId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Forbidden. You are not assigned to this event.' });
      }
    }

    return res.json({ event });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update event (Admin only)
router.patch('/events/:id', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.created_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
    }

    const updated = await db.updateEvent(req.params.id, req.body);
    return res.json({ event: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete event (Admin only)
router.delete('/events/:id', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.created_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
    }

    await db.deleteEvent(req.params.id);
    return res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. EVENT MEMBERS
// ==========================================

// Get members of an event
router.get('/events/:id/members', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Authorization check
    if (req.user!.role === 'ADMIN') {
      if (event.created_by !== req.user!.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else {
      const isAssigned = await db.isUserAssignedToEvent(eventId, req.user!.userId);
      if (!isAssigned) return res.status(403).json({ error: 'Forbidden' });
    }

    const members = await db.getEventMembers(eventId);
    return res.json({ members });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add member to event (Admin only)
router.post('/events/:id/members', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.created_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
    }

    const targetUser = await db.findProfileById(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const member = await db.addEventMember(eventId, userId);
    return res.status(201).json({ member });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Remove member from event (Admin only)
router.delete('/events/:id/members/:userId', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: eventId, userId } = req.params;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.created_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
    }

    await db.removeEventMember(eventId, userId);
    return res.json({ success: true, message: 'Member removed from event' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. PHOTO UPLOAD & REVIEW
// ==========================================

// Multiple photo upload (Admin or assigned Team Member)
router.post(
  '/events/:id/photos',
  authenticateUser,
  handleUpload,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const event = await db.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Authorization Check
      if (req.user!.role === 'ADMIN') {
        if (event.created_by !== req.user!.userId) {
          return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
        }
      } else {
        const isAssigned = await db.isUserAssignedToEvent(eventId, req.user!.userId);
        if (!isAssigned) {
          return res.status(403).json({ error: 'Forbidden. You are not assigned to this event.' });
        }
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No photo files were provided.' });
      }

      const uploadedPhotos = [];
      const uploadErrors: string[] = [];

      for (const file of files) {
        try {
          // Validate size & type explicitly
          if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            uploadErrors.push(`${file.originalname}: Unsupported file type (${file.mimetype}).`);
            continue;
          }
          if (file.size > MAX_FILE_SIZE) {
            uploadErrors.push(`${file.originalname}: Exceeds 10MB limit.`);
            continue;
          }

          // Generate sanitized unique storage path
          const storagePath = generateStoragePath(eventId, file.originalname);

          // Upload to storage (Firebase Storage or local fallback)
          await uploadFileToStorage(storagePath, file.buffer, file.mimetype);

          // Save metadata to database
          const photoRecord = await db.createPhoto({
            event_id: eventId,
            uploaded_by: req.user!.userId,
            filename: file.originalname,
            storage_path: storagePath,
            file_size: file.size,
            mime_type: file.mimetype,
          });

          uploadedPhotos.push(photoRecord);
        } catch (fileErr: any) {
          uploadErrors.push(`${file.originalname}: ${fileErr.message || 'Storage error'}`);
        }
      }

      if (uploadedPhotos.length === 0 && uploadErrors.length > 0) {
        return res.status(400).json({ error: `Upload failed: ${uploadErrors.join(' ')}` });
      }

      return res.status(201).json({
        message: `Successfully uploaded ${uploadedPhotos.length} photo(s).` + (uploadErrors.length ? ` (${uploadErrors.length} file(s) failed)` : ''),
        photos: uploadedPhotos,
        errors: uploadErrors.length > 0 ? uploadErrors : undefined,
      });
    } catch (err: any) {
      console.error('Photo upload error:', err);
      return res.status(500).json({ error: err.message || 'Photo upload failed.' });
    }
  }
);

// Get photos for event
// Admin: Can see ALL photos, filter by uploader
// Team Member: Can ONLY see photos uploaded by themselves
router.get('/events/:id/photos', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    let uploaderFilter: string | undefined = undefined;

    if (req.user!.role === 'ADMIN') {
      if (event.created_by !== req.user!.userId) {
        return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
      }
      if (req.query.uploaderId) {
        uploaderFilter = req.query.uploaderId as string;
      }
    } else {
      // Team Member: Enforce that they only get their own photos!
      const isAssigned = await db.isUserAssignedToEvent(eventId, req.user!.userId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Forbidden. You are not assigned to this event.' });
      }
      // Strictly restrict to their own photos
      uploaderFilter = req.user!.userId;
    }

    const rawPhotos = await db.getPhotosForEvent(eventId, uploaderFilter);

    // Get selected photo IDs for the event's gallery (if any)
    const gallery = await db.getGalleryByEventId(eventId);
    const selectedPhotoIds = gallery ? new Set(await db.getSelectedPhotoIdsForGallery(gallery.id)) : new Set<string>();

    // Generate secure signed URLs for each photo
    const photos = await Promise.all(
      rawPhotos.map(async (p) => ({
        ...p,
        is_selected: selectedPhotoIds.has(p.id),
        url: await getSignedPhotoUrl(p.storage_path),
      }))
    );

    return res.json({ photos });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete photo
// Admin can delete any photo in their event. Team Member can only delete their own photo while assigned.
router.delete('/photos/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const photoId = req.params.id;
    const photo = await db.getPhotoById(photoId);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const event = await db.getEventById(photo.event_id);
    if (!event) return res.status(404).json({ error: 'Associated event not found' });

    if (req.user!.role === 'ADMIN') {
      if (event.created_by !== req.user!.userId) {
        return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
      }
    } else {
      // Team Member can only delete their own photo AND must be currently assigned to the event
      if (photo.uploaded_by !== req.user!.userId) {
        return res.status(403).json({ error: 'Forbidden. Team members cannot delete other users photos.' });
      }
      const isAssigned = await db.isUserAssignedToEvent(photo.event_id, req.user!.userId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Forbidden. You are not assigned to this event.' });
      }
    }

    // Delete photo from physical/cloud storage
    await deleteFileFromStorage(photo.storage_path);

    // Delete photo record and gallery associations
    await db.deletePhoto(photoId);
    return res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Authenticated & Signed local photo stream route (used for direct secure streaming)
router.get('/photos/stream', async (req: Request, res: Response) => {
  try {
    const storagePath = req.query.path as string;
    const exp = req.query.exp ? parseInt(req.query.exp as string, 10) : 0;
    const sig = req.query.sig as string;

    if (!storagePath) return res.status(400).send('Missing path parameter');

    // Strict path validation prevents path traversal and unformatted paths
    if (!isValidStoragePath(storagePath)) {
      return res.status(400).send('Invalid storage path format');
    }

    // Verify access:
    // 1. Signed stream token (HMAC with expiration)
    const isSigned = sig && exp && verifyPhotoStreamSignature(storagePath, exp, sig);

    if (!isSigned) {
      // 2. Or check Authorization header or Gallery Token if passed
      const authHeader = req.headers.authorization;
      const galleryToken =
        (req.headers['x-gallery-token'] as string) ||
        (req.query.galleryToken as string);

      let isAuthorized = false;

      if (galleryToken) {
        try {
          const decoded = jwt.verify(galleryToken, JWT_SECRET) as any;
          if (decoded.type === 'CUSTOMER_GALLERY_SESSION') {
            // Check if photo is in published gallery
            const galleryPhotos = await db.getPublishedGalleryPhotos(decoded.galleryId);
            if (galleryPhotos.some((p) => p.storage_path === storagePath)) {
              isAuthorized = true;
            }
          }
        } catch {
          // Token invalid
        }
      }

      if (!isAuthorized && authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          const photoEventId = storagePath.split('/')[1];
          if (decoded.role === 'ADMIN') {
            const event = await db.getEventById(photoEventId);
            if (event && event.created_by === decoded.userId) {
              isAuthorized = true;
            }
          } else {
            const isAssigned = await db.isUserAssignedToEvent(photoEventId, decoded.userId);
            if (isAssigned) {
              isAuthorized = true;
            }
          }
        } catch {
          // User token invalid
        }
      }

      if (!isAuthorized) {
        return res.status(403).send('Forbidden: Invalid or expired photo access signature.');
      }
    }

    const localPath = getLocalFilePath(storagePath);
    if (localPath && fs.existsSync(localPath)) {
      const ext = path.extname(localPath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.sendFile(localPath);
    }

    // If running in development and file doesn't exist on disk, serve a placeholder SVG image
    const filename = storagePath.split('/').pop() || 'photo.jpg';
    const svg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="24">Event Photography Asset</text>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="16">${filename}</text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(svg);
  } catch (err: any) {
    return res.status(500).send('Error streaming photo');
  }
});

// ==========================================
// 5. GALLERIES (ADMIN MANAGEMENT)
// ==========================================

const CreateGallerySchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  slug: z.string().min(3).regex(/^[a-z0-9-_]+$/, 'Slug must only contain lowercase letters, numbers, hyphens and underscores'),
  pin: z.string().min(4, 'PIN must be at least 4 characters').max(12),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  selectedPhotoIds: z.array(z.string()).default([]),
});

// Get gallery for an event (Admin only)
router.get('/events/:id/gallery', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.created_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const gallery = await db.getGalleryByEventId(eventId);
    if (!gallery) {
      return res.json({ gallery: null, selectedPhotoIds: [] });
    }

    const selectedPhotoIds = await db.getSelectedPhotoIdsForGallery(gallery.id);
    // Never expose pin_hash!
    const { pin_hash, ...safeGallery } = gallery;
    return res.json({ gallery: safeGallery, selectedPhotoIds });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create or update gallery (Admin only)
router.post('/galleries', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = CreateGallerySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { eventId, slug, pin, status, selectedPhotoIds } = parsed.data;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.created_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this event.' });
    }

    // Validate that all selected photos belong to this event
    if (selectedPhotoIds && selectedPhotoIds.length > 0) {
      const allBelong = await validatePhotosBelongToEvent(selectedPhotoIds, eventId);
      if (!allBelong) {
        return res.status(400).json({ error: 'All selected photos must belong to this event.' });
      }
    }

    // Check slug uniqueness across all galleries
    const existingSlug = await db.getGalleryBySlug(slug);
    const existingEventGallery = await db.getGalleryByEventId(eventId);

    if (existingSlug && (!existingEventGallery || existingSlug.id !== existingEventGallery.id)) {
      return res.status(409).json({ error: 'This shareable slug is already in use by another gallery.' });
    }

    // Hash PIN with bcrypt
    const pinHash = await hashPin(pin);

    let gallery;
    if (existingEventGallery) {
      gallery = await db.updateGallery(existingEventGallery.id, {
        slug,
        pin_hash: pinHash,
        status,
        selected_photo_ids: selectedPhotoIds,
      });
    } else {
      gallery = await db.createGallery({
        event_id: eventId,
        created_by: req.user!.userId,
        slug,
        pin_hash: pinHash,
        status,
        selected_photo_ids: selectedPhotoIds,
      });
    }

    const { pin_hash, ...safeGallery } = gallery!;
    return res.status(201).json({ gallery: safeGallery, selectedPhotoIds });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update gallery (Admin only)
router.patch('/galleries/:id', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const galleryId = req.params.id;
    const existingGallery = await db.getGalleryById(galleryId);
    if (!existingGallery) return res.status(404).json({ error: 'Gallery not found' });

    // Authorization: Admin must own the event associated with this gallery
    const event = await db.getEventById(existingGallery.event_id);
    if (!event || event.created_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this gallery.' });
    }

    const { slug, pin, status, selectedPhotoIds } = req.body;

    if (selectedPhotoIds !== undefined && selectedPhotoIds.length > 0) {
      const allBelong = await validatePhotosBelongToEvent(selectedPhotoIds, existingGallery.event_id);
      if (!allBelong) {
        return res.status(400).json({ error: 'All selected photos must belong to this event.' });
      }
    }

    const updates: any = {};
    if (slug) {
      const existingWithSlug = await db.getGalleryBySlug(slug);
      if (existingWithSlug && existingWithSlug.id !== galleryId) {
        return res.status(409).json({ error: 'This shareable slug is already in use by another gallery.' });
      }
      updates.slug = slug;
    }
    if (pin) updates.pin_hash = await hashPin(pin);
    if (status) updates.status = status;
    if (selectedPhotoIds !== undefined) updates.selected_photo_ids = selectedPhotoIds;

    const gallery = await db.updateGallery(galleryId, updates);
    if (!gallery) return res.status(404).json({ error: 'Gallery not found' });

    const { pin_hash, ...safeGallery } = gallery;
    return res.json({ gallery: safeGallery });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Publish gallery (Admin only - Team member CANNOT publish)
router.post('/galleries/:id/publish', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const galleryId = req.params.id;
    const existingGallery = await db.getGalleryById(galleryId);
    if (!existingGallery) return res.status(404).json({ error: 'Gallery not found' });

    // Authorization: Admin must own the event
    const event = await db.getEventById(existingGallery.event_id);
    if (!event || event.created_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this gallery.' });
    }

    const gallery = await db.updateGallery(galleryId, { status: 'PUBLISHED' });
    if (!gallery) return res.status(404).json({ error: 'Gallery not found' });

    const { pin_hash, ...safeGallery } = gallery;
    return res.json({
      message: 'Gallery published successfully!',
      gallery: safeGallery,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin list all galleries (Scoped to authenticated admin)
router.get('/admin/galleries', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allGalleries = await db.getAllGalleries(req.user!.userId);
    const safeGalleries = allGalleries.map(({ pin_hash, ...rest }) => rest);
    return res.json({ galleries: safeGalleries });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin dashboard statistics
router.get('/admin/dashboard', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await db.getDashboardStats(req.user!.userId);
    return res.json({ stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. CUSTOMER GALLERY ACCESS (NO ACCOUNT NEEDED)
// ==========================================

// Public Gallery Info: returns gallery event name & status only
router.get('/gallery/:slug/info', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const gallery = await db.getGalleryBySlug(slug);

    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found or link is invalid.' });
    }

    if (gallery.status !== 'PUBLISHED') {
      return res.status(403).json({
        error: 'This gallery is currently in draft mode and is not yet published by the event lead.',
        isDraft: true,
      });
    }

    // Only return public metadata. Never return photos, never return PIN hash!
    return res.json({
      gallery: {
        id: gallery.id,
        slug: gallery.slug,
        eventName: gallery.event_name,
        publishedAt: gallery.published_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Verify Gallery PIN & Issue Temporary Session Token
router.post('/gallery/:slug/verify', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const { pin } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown-ip';

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'Please enter the gallery PIN.' });
    }

    // Check brute-force rate limit
    const rateCheck = checkPinRateLimit(slug, clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many incorrect PIN attempts. Please wait ${rateCheck.waitSeconds} seconds before trying again.`,
      });
    }

    const gallery = await db.getGalleryBySlug(slug);
    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found.' });
    }

    // Block access to unpublished galleries
    if (gallery.status !== 'PUBLISHED') {
      return res.status(403).json({
        error: 'This gallery is not published yet. Customers can only view published galleries.',
      });
    }

    // Verify PIN against stored bcrypt hash
    const isValid = await verifyPin(pin, gallery.pin_hash);
    if (!isValid) {
      recordFailedPinAttempt(slug, clientIp);
      return res.status(401).json({ error: 'Incorrect PIN. Please try again.' });
    }

    // Reset rate limit on success
    resetPinAttempts(slug, clientIp);

    // Issue secure temporary JWT Gallery Access Token (valid for 2 hours)
    const galleryToken = generateGalleryAccessToken(gallery.id, gallery.slug);

    return res.json({
      success: true,
      galleryToken,
      gallery: {
        id: gallery.id,
        slug: gallery.slug,
        eventName: gallery.event_name,
        publishedAt: gallery.published_at,
      },
    });
  } catch (err: any) {
    console.error('PIN verification error:', err);
    return res.status(500).json({ error: 'An error occurred while verifying the PIN.' });
  }
});

// Get Published Gallery Photos (Protected by Customer Gallery Token)
router.get(
  '/gallery/:slug/photos',
  verifyCustomerGallerySession,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const slug = req.params.slug;
      const gallery = await db.getGalleryBySlug(slug);

      if (!gallery) {
        return res.status(404).json({ error: 'Gallery not found.' });
      }

      if (gallery.status !== 'PUBLISHED') {
        return res.status(403).json({ error: 'Gallery is not published.' });
      }

      // Customer receives ONLY published photographs selected for this specific gallery
      const rawPhotos = await db.getPublishedGalleryPhotos(gallery.id);

      // Generate signed URLs
      const photos = await Promise.all(
        rawPhotos.map(async (p) => ({
          id: p.id,
          filename: p.filename,
          file_size: p.file_size,
          created_at: p.created_at,
          url: await getSignedPhotoUrl(p.storage_path),
        }))
      );

      return res.json({
        galleryName: gallery.event_name,
        photoCount: photos.length,
        photos,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Health and Configuration Status
router.get('/config-status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    firebaseConfigured: isFirebaseConfigured(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0384551552.firebasestorage.app',
    timestamp: new Date().toISOString(),
  });
});

export default router;
