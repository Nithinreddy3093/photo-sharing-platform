import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type {
  UserProfile,
  UserRole,
  Event,
  EventMember,
  Photo,
  Gallery,
  GalleryStatus,
  DashboardStats,
} from '../src/types/index';
import firebaseConfig from '../firebase-applet-config.json';

export function isFirebaseConfigured(): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// Firestore Singleton Connection
// ---------------------------------------------------------------------------
let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

function getDb(): Firestore {
  if (!firestoreInstance) {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestoreInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
  }
  return firestoreInstance;
}

// ---------------------------------------------------------------------------
// Seed Initialization (Idempotent into Firestore)
// ---------------------------------------------------------------------------
const defaultAdminPassHash = bcrypt.hashSync('AdminPass123!', 10);
const defaultTeamPassHash = bcrypt.hashSync('TeamPass123!', 10);
const defaultGalleryPinHash = bcrypt.hashSync('4826', 10);

let seedPromise: Promise<void> | null = null;

async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const db = getDb();
        const adminRef = doc(db, 'users', 'u0000000-0000-0000-0000-000000000001');
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
          const now = new Date().toISOString();

          // 1. Seed Users
          await setDoc(adminRef, {
            id: 'u0000000-0000-0000-0000-000000000001',
            auth_user_id: 'firebase-admin-uid-001',
            name: 'Sarah Director',
            email: 'admin@photoplatform.com',
            role: 'ADMIN',
            password_hash: defaultAdminPassHash,
            created_at: now,
            server_sync: true,
          });

          await setDoc(doc(db, 'users', 'u0000000-0000-0000-0000-000000000002'), {
            id: 'u0000000-0000-0000-0000-000000000002',
            auth_user_id: 'firebase-team-uid-002',
            name: 'Alex Photographer',
            email: 'team@photoplatform.com',
            role: 'TEAM_MEMBER',
            password_hash: defaultTeamPassHash,
            created_at: now,
            server_sync: true,
          });

          await setDoc(doc(db, 'users', 'u0000000-0000-0000-0000-000000000003'), {
            id: 'u0000000-0000-0000-0000-000000000003',
            auth_user_id: 'firebase-team-uid-003',
            name: 'Jordan Assistant',
            email: 'unassigned@photoplatform.com',
            role: 'TEAM_MEMBER',
            password_hash: defaultTeamPassHash,
            created_at: now,
            server_sync: true,
          });

          // 2. Seed Events
          await setDoc(doc(db, 'events', 'e1111111-1111-1111-1111-111111111111'), {
            id: 'e1111111-1111-1111-1111-111111111111',
            name: 'Summer Gala 2026',
            description: 'Annual summer charity gala and award ceremony at the Grand Ballroom.',
            created_by: 'u0000000-0000-0000-0000-000000000001',
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            updated_at: now,
            server_sync: true,
          });

          await setDoc(doc(db, 'events', 'e2222222-2222-2222-2222-222222222222'), {
            id: 'e2222222-2222-2222-2222-222222222222',
            name: 'Corporate Summit 2026',
            description: 'Tech innovation and networking summit keynote speeches and panels.',
            created_by: 'u0000000-0000-0000-0000-000000000001',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            updated_at: now,
            server_sync: true,
          });

          // 3. Seed Event Members
          await setDoc(doc(db, 'event_members', 'm1111111-1111-1111-1111-111111111111'), {
            id: 'm1111111-1111-1111-1111-111111111111',
            event_id: 'e1111111-1111-1111-1111-111111111111',
            user_id: 'u0000000-0000-0000-0000-000000000002',
            created_at: now,
            server_sync: true,
          });

          // 4. Seed Photos
          await setDoc(doc(db, 'photos', 'p1111111-1111-1111-1111-111111111111'), {
            id: 'p1111111-1111-1111-1111-111111111111',
            event_id: 'e1111111-1111-1111-1111-111111111111',
            uploaded_by: 'u0000000-0000-0000-0000-000000000002',
            filename: 'gala_opening_keynote.jpg',
            storage_path: 'events/e1111111-1111-1111-1111-111111111111/photos/gala_opening_keynote.jpg',
            file_size: 2457600,
            mime_type: 'image/jpeg',
            created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
            is_selected: true,
            server_sync: true,
          });

          await setDoc(doc(db, 'photos', 'p2222222-2222-2222-2222-222222222222'), {
            id: 'p2222222-2222-2222-2222-222222222222',
            event_id: 'e1111111-1111-1111-1111-111111111111',
            uploaded_by: 'u0000000-0000-0000-0000-000000000002',
            filename: 'charity_auction_highlight.jpg',
            storage_path: 'events/e1111111-1111-1111-1111-111111111111/photos/charity_auction_highlight.jpg',
            file_size: 3145728,
            mime_type: 'image/jpeg',
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            is_selected: true,
            server_sync: true,
          });

          // 5. Seed Gallery
          await setDoc(doc(db, 'galleries', 'g1111111-1111-1111-1111-111111111111'), {
            id: 'g1111111-1111-1111-1111-111111111111',
            event_id: 'e1111111-1111-1111-1111-111111111111',
            created_by: 'u0000000-0000-0000-0000-000000000001',
            slug: 'summer-gala-2026-vip',
            status: 'PUBLISHED',
            published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            updated_at: now,
            server_sync: true,
          });

          await setDoc(doc(db, 'gallery_secrets', 'g1111111-1111-1111-1111-111111111111'), {
            id: 'g1111111-1111-1111-1111-111111111111',
            gallery_id: 'g1111111-1111-1111-1111-111111111111',
            pin_hash: defaultGalleryPinHash,
            server_sync: true,
          });

          await setDoc(doc(db, 'gallery_photos', 'gp111111-1111-1111-1111-111111111111'), {
            id: 'gp111111-1111-1111-1111-111111111111',
            gallery_id: 'g1111111-1111-1111-1111-111111111111',
            photo_id: 'p1111111-1111-1111-1111-111111111111',
            created_at: now,
            server_sync: true,
          });

          await setDoc(doc(db, 'gallery_photos', 'gp222222-2222-2222-2222-222222222222'), {
            id: 'gp222222-2222-2222-2222-222222222222',
            gallery_id: 'g1111111-1111-1111-1111-111111111111',
            photo_id: 'p2222222-2222-2222-2222-222222222222',
            created_at: now,
            server_sync: true,
          });
        }
      } catch (err) {
        console.error('[Firestore] ensureSeeded error:', err);
      }
    })();
  }
  return seedPromise;
}

// ---------------------------------------------------------------------------
// Single Source of Truth Firestore Database Layer
// ---------------------------------------------------------------------------
export const db = {
  // -------------------------------------------------------------------------
  // Profiles / Users
  // -------------------------------------------------------------------------
  async findProfileByEmail(email: string): Promise<UserProfile | null> {
    await ensureSeeded();
    const firestore = getDb();
    const q = query(
      collection(firestore, 'users'),
      where('server_sync', '==', true),
      where('email', '==', email.toLowerCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0].data();
    return {
      id: d.id || snap.docs[0].id,
      auth_user_id: d.auth_user_id,
      name: d.name,
      email: d.email,
      role: d.role,
      created_at: d.created_at,
    };
  },

  async findProfileById(id: string): Promise<UserProfile | null> {
    await ensureSeeded();
    const firestore = getDb();
    // 1. Check by document ID
    const snap = await getDoc(doc(firestore, 'users', id));
    if (snap.exists()) {
      const d = snap.data();
      return {
        id: d.id || snap.id,
        auth_user_id: d.auth_user_id,
        name: d.name,
        email: d.email,
        role: d.role,
        created_at: d.created_at,
      };
    }

    // 2. Query by auth_user_id
    const qAuth = query(
      collection(firestore, 'users'),
      where('server_sync', '==', true),
      where('auth_user_id', '==', id)
    );
    const authSnap = await getDocs(qAuth);
    if (!authSnap.empty) {
      const d = authSnap.docs[0].data();
      return {
        id: d.id || authSnap.docs[0].id,
        auth_user_id: d.auth_user_id,
        name: d.name,
        email: d.email,
        role: d.role,
        created_at: d.created_at,
      };
    }

    // 3. Fallback query by email if id looks like an email
    if (id.includes('@')) {
      return this.findProfileByEmail(id);
    }

    return null;
  },

  async findProfileByAuthId(authUserId: string): Promise<UserProfile | null> {
    return this.findProfileById(authUserId);
  },

  async getPasswordHash(email: string): Promise<string | null> {
    await ensureSeeded();
    const firestore = getDb();
    const q = query(
      collection(firestore, 'users'),
      where('server_sync', '==', true),
      where('email', '==', email.toLowerCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data().password_hash || null;
  },

  async verifyUserCredentials(email: string, plainTextPassword: string): Promise<UserProfile | null> {
    await ensureSeeded();
    const firestore = getDb();
    const q = query(
      collection(firestore, 'users'),
      where('server_sync', '==', true),
      where('email', '==', email.toLowerCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0].data();
    const hash = docData.password_hash;
    if (!hash) return null;

    const isValid = await bcrypt.compare(plainTextPassword, hash);
    if (!isValid) return null;

    return {
      id: docData.id || snap.docs[0].id,
      auth_user_id: docData.auth_user_id,
      name: docData.name,
      email: docData.email,
      role: docData.role,
      created_at: docData.created_at,
    };
  },

  async createProfile(
    profile: {
      id?: string;
      auth_user_id?: string;
      name: string;
      email: string;
      role: UserRole;
      passwordHash?: string;
      created_at?: string;
    },
    plainTextPassword?: string
  ): Promise<UserProfile> {
    await ensureSeeded();
    const firestore = getDb();
    const existing = await this.findProfileByEmail(profile.email);
    if (existing) {
      if (profile.role && existing.role !== profile.role) {
        await this.updateUserRole(existing.id, profile.role);
        existing.role = profile.role;
      }
      return existing;
    }

    const userId = profile.id || crypto.randomUUID();
    const authUserId = profile.auth_user_id || `auth-${crypto.randomUUID()}`;
    let pHash = profile.passwordHash || '';
    if (!pHash && plainTextPassword) {
      pHash = await bcrypt.hash(plainTextPassword, 10);
    }

    const now = profile.created_at || new Date().toISOString();
    const newProfileDoc = {
      id: userId,
      auth_user_id: authUserId,
      name: profile.name,
      email: profile.email.toLowerCase(),
      role: profile.role,
      password_hash: pHash,
      created_at: now,
      server_sync: true,
    };

    await setDoc(doc(firestore, 'users', userId), newProfileDoc);

    return {
      id: userId,
      auth_user_id: authUserId,
      name: profile.name,
      email: profile.email.toLowerCase(),
      role: profile.role,
      created_at: now,
    };
  },

  async getAllUsers(): Promise<UserProfile[]> {
    await ensureSeeded();
    const firestore = getDb();
    const q = query(collection(firestore, 'users'), where('server_sync', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        auth_user_id: data.auth_user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        created_at: data.created_at,
      };
    });
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    return this.getAllUsers();
  },

  async updateUserRole(userId: string, newRole: UserRole): Promise<UserProfile | null> {
    await ensureSeeded();
    const user = await this.findProfileById(userId);
    if (!user) return null;

    const firestore = getDb();
    await setDoc(
      doc(firestore, 'users', user.id),
      { role: newRole, server_sync: true },
      { merge: true }
    );
    user.role = newRole;
    return user;
  },

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------
  async getEventsForUser(userId: string, role: UserRole): Promise<Event[]> {
    await ensureSeeded();
    const firestore = getDb();

    if (role === 'ADMIN') {
      const q = query(
        collection(firestore, 'events'),
        where('server_sync', '==', true),
        where('created_by', '==', userId)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: data.id || d.id,
            name: data.name,
            description: data.description || '',
            created_by: data.created_by,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // TEAM_MEMBER: Only assigned events
    const memberQ = query(
      collection(firestore, 'event_members'),
      where('server_sync', '==', true),
      where('user_id', '==', userId)
    );
    const memberSnap = await getDocs(memberQ);
    const eventIds = memberSnap.docs.map((d) => d.data().event_id);
    if (eventIds.length === 0) return [];

    const events: Event[] = [];
    for (const eid of eventIds) {
      const eSnap = await getDoc(doc(firestore, 'events', eid));
      if (eSnap.exists()) {
        const d = eSnap.data();
        events.push({
          id: d.id || eSnap.id,
          name: d.name,
          description: d.description || '',
          created_by: d.created_by,
          created_at: d.created_at,
          updated_at: d.updated_at,
        });
      }
    }
    return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getEventById(id: string): Promise<Event | null> {
    await ensureSeeded();
    const firestore = getDb();
    const snap = await getDoc(doc(firestore, 'events', id));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      id: d.id || snap.id,
      name: d.name,
      description: d.description || '',
      created_by: d.created_by,
      created_at: d.created_at,
      updated_at: d.updated_at,
    };
  },

  async createEvent(data: {
    id?: string;
    name: string;
    description?: string;
    created_by: string;
  }): Promise<Event> {
    await ensureSeeded();
    const firestore = getDb();
    const eventId = data.id || `e${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const newEvent: Event = {
      id: eventId,
      name: data.name,
      description: data.description || '',
      created_by: data.created_by,
      created_at: now,
      updated_at: now,
    };

    await setDoc(doc(firestore, 'events', eventId), {
      ...newEvent,
      server_sync: true,
    });

    return newEvent;
  },

  async updateEvent(id: string, data: { name?: string; description?: string }): Promise<Event | null> {
    await ensureSeeded();
    const firestore = getDb();
    const ref = doc(firestore, 'events', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const existing = snap.data();
    const updated: Event = {
      id: existing.id || snap.id,
      name: data.name !== undefined ? data.name : existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      created_by: existing.created_by,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    await setDoc(ref, { ...updated, server_sync: true });
    return updated;
  },

  async deleteEvent(id: string): Promise<void> {
    await ensureSeeded();
    const firestore = getDb();

    // Query in parallel
    const [mSnap, pSnap, gSnap] = await Promise.all([
      getDocs(query(collection(firestore, 'event_members'), where('server_sync', '==', true), where('event_id', '==', id))),
      getDocs(query(collection(firestore, 'photos'), where('server_sync', '==', true), where('event_id', '==', id))),
      getDocs(query(collection(firestore, 'galleries'), where('server_sync', '==', true), where('event_id', '==', id))),
      deleteDoc(doc(firestore, 'events', id)),
    ]);

    const deletions: Promise<any>[] = [];
    for (const d of mSnap.docs) deletions.push(deleteDoc(d.ref));
    for (const d of pSnap.docs) deletions.push(deleteDoc(d.ref));

    for (const d of gSnap.docs) {
      deletions.push(deleteDoc(doc(firestore, 'gallery_secrets', d.id)));
      deletions.push(deleteDoc(d.ref));
      deletions.push(
        getDocs(query(collection(firestore, 'gallery_photos'), where('server_sync', '==', true), where('gallery_id', '==', d.id)))
          .then((gpSnap) => Promise.all(gpSnap.docs.map((gpd) => deleteDoc(gpd.ref))))
      );
    }

    await Promise.all(deletions);
  },

  // -------------------------------------------------------------------------
  // Event Members
  // -------------------------------------------------------------------------
  async getEventMembers(eventId: string): Promise<EventMember[]> {
    await ensureSeeded();
    const firestore = getDb();
    const mQ = query(
      collection(firestore, 'event_members'),
      where('server_sync', '==', true),
      where('event_id', '==', eventId)
    );
    const mSnap = await getDocs(mQ);
    const members: EventMember[] = [];

    for (const d of mSnap.docs) {
      const data = d.data();
      const user = await this.findProfileById(data.user_id);
      members.push({
        id: data.id || d.id,
        event_id: data.event_id,
        user_id: data.user_id,
        created_at: data.created_at,
        user_name: user?.name || 'Unknown',
        user_email: user?.email || 'unknown@studio.com',
        user_role: user?.role || 'TEAM_MEMBER',
      });
    }

    return members;
  },

  async isUserAssignedToEvent(eventId: string, userId: string): Promise<boolean> {
    await ensureSeeded();
    const firestore = getDb();
    const user = await this.findProfileById(userId);
    const resolvedUserId = user ? user.id : userId;

    const mQ = query(
      collection(firestore, 'event_members'),
      where('server_sync', '==', true),
      where('event_id', '==', eventId),
      where('user_id', '==', resolvedUserId)
    );
    const snap = await getDocs(mQ);
    if (!snap.empty) return true;

    if (resolvedUserId !== userId) {
      const altQ = query(
        collection(firestore, 'event_members'),
        where('server_sync', '==', true),
        where('event_id', '==', eventId),
        where('user_id', '==', userId)
      );
      const altSnap = await getDocs(altQ);
      return !altSnap.empty;
    }

    return false;
  },

  async addEventMember(eventId: string, userId: string): Promise<EventMember> {
    await ensureSeeded();
    const firestore = getDb();
    const targetUser = await this.findProfileById(userId);
    const resolvedUserId = targetUser ? targetUser.id : userId;

    const exists = await this.isUserAssignedToEvent(eventId, resolvedUserId);
    if (exists) {
      const members = await this.getEventMembers(eventId);
      const found = members.find((m) => m.user_id === resolvedUserId || m.user_id === userId);
      if (found) return found;
    }

    const memberId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newMemberDoc = {
      id: memberId,
      event_id: eventId,
      user_id: resolvedUserId,
      created_at: now,
      server_sync: true,
    };

    await setDoc(doc(firestore, 'event_members', memberId), newMemberDoc);

    return {
      id: memberId,
      event_id: eventId,
      user_id: resolvedUserId,
      created_at: now,
      user_name: targetUser?.name,
      user_email: targetUser?.email,
      user_role: targetUser?.role,
    };
  },

  async removeEventMember(eventId: string, userId: string): Promise<void> {
    await ensureSeeded();
    const firestore = getDb();
    const targetUser = await this.findProfileById(userId);
    const resolvedUserId = targetUser ? targetUser.id : userId;

    const mQ = query(
      collection(firestore, 'event_members'),
      where('server_sync', '==', true),
      where('event_id', '==', eventId)
    );
    const mSnap = await getDocs(mQ);
    for (const d of mSnap.docs) {
      const uid = d.data().user_id;
      if (uid === resolvedUserId || uid === userId) {
        await deleteDoc(d.ref);
      }
    }
  },

  // -------------------------------------------------------------------------
  // Photos
  // -------------------------------------------------------------------------
  async getPhotosForEvent(eventId: string, uploaderId?: string): Promise<Photo[]> {
    await ensureSeeded();
    const firestore = getDb();
    let pQ = query(
      collection(firestore, 'photos'),
      where('server_sync', '==', true),
      where('event_id', '==', eventId)
    );

    const snap = await getDocs(pQ);
    let photos = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        event_id: data.event_id,
        uploaded_by: data.uploaded_by,
        filename: data.filename,
        storage_path: data.storage_path,
        file_size: data.file_size,
        mime_type: data.mime_type,
        created_at: data.created_at,
        is_selected: data.is_selected ?? false,
      };
    });

    if (uploaderId) {
      photos = photos.filter((p) => p.uploaded_by === uploaderId);
    }

    return photos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getPhotoById(photoId: string): Promise<Photo | null> {
    await ensureSeeded();
    const firestore = getDb();
    const snap = await getDoc(doc(firestore, 'photos', photoId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const uploader = await this.findProfileById(data.uploaded_by);

    return {
      id: data.id || snap.id,
      event_id: data.event_id,
      uploaded_by: data.uploaded_by,
      filename: data.filename,
      storage_path: data.storage_path,
      file_size: data.file_size,
      mime_type: data.mime_type,
      created_at: data.created_at,
      is_selected: data.is_selected ?? false,
      uploader_name: uploader?.name || 'Photographer',
    };
  },

  async createPhoto(data: {
    event_id: string;
    uploaded_by: string;
    filename: string;
    storage_path: string;
    file_size: number;
    mime_type: string;
    is_selected?: boolean;
  }): Promise<Photo> {
    await ensureSeeded();
    const firestore = getDb();
    const photoId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newPhoto: Photo = {
      id: photoId,
      event_id: data.event_id,
      uploaded_by: data.uploaded_by,
      filename: data.filename,
      storage_path: data.storage_path,
      file_size: data.file_size,
      mime_type: data.mime_type,
      created_at: now,
      is_selected: data.is_selected ?? false,
    };

    await setDoc(doc(firestore, 'photos', photoId), {
      ...newPhoto,
      server_sync: true,
    });

    const uploader = await this.findProfileById(data.uploaded_by);
    return {
      ...newPhoto,
      uploader_name: uploader?.name || 'Photographer',
    };
  },

  async deletePhoto(photoId: string): Promise<void> {
    await ensureSeeded();
    const firestore = getDb();
    await deleteDoc(doc(firestore, 'photos', photoId));

    // Remove from gallery_photos mappings
    const gpQ = query(
      collection(firestore, 'gallery_photos'),
      where('server_sync', '==', true),
      where('photo_id', '==', photoId)
    );
    const gpSnap = await getDocs(gpQ);
    for (const d of gpSnap.docs) {
      await deleteDoc(d.ref);
    }
  },

  async updatePhoto(photoId: string, data: Partial<Photo>): Promise<Photo | null> {
    await ensureSeeded();
    const firestore = getDb();
    const ref = doc(firestore, 'photos', photoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const existing = snap.data();
    const updated: Photo = {
      id: existing.id || snap.id,
      event_id: existing.event_id,
      uploaded_by: existing.uploaded_by,
      filename: data.filename !== undefined ? data.filename : existing.filename,
      storage_path: data.storage_path !== undefined ? data.storage_path : existing.storage_path,
      file_size: data.file_size !== undefined ? data.file_size : existing.file_size,
      mime_type: data.mime_type !== undefined ? data.mime_type : existing.mime_type,
      created_at: existing.created_at,
      is_selected: data.is_selected !== undefined ? data.is_selected : existing.is_selected,
    };

    await setDoc(ref, { ...updated, server_sync: true });
    return updated;
  },

  // -------------------------------------------------------------------------
  // Galleries
  // -------------------------------------------------------------------------
  async getGalleryForEvent(eventId: string): Promise<Gallery | null> {
    await ensureSeeded();
    const firestore = getDb();
    const gQ = query(
      collection(firestore, 'galleries'),
      where('server_sync', '==', true),
      where('event_id', '==', eventId)
    );
    const snap = await getDocs(gQ);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    const secretHash = await this.getGalleryPinHash(data.id || snap.docs[0].id);

    return {
      id: data.id || snap.docs[0].id,
      event_id: data.event_id,
      created_by: data.created_by,
      slug: data.slug,
      pin_hash: secretHash || '',
      status: data.status,
      published_at: data.published_at || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  async getGalleryByEventId(eventId: string): Promise<Gallery | null> {
    return this.getGalleryForEvent(eventId);
  },

  async getGalleryBySlug(slug: string): Promise<Gallery | null> {
    await ensureSeeded();
    const firestore = getDb();
    const gQ = query(
      collection(firestore, 'galleries'),
      where('server_sync', '==', true),
      where('slug', '==', slug)
    );
    const snap = await getDocs(gQ);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    const event = await this.getEventById(data.event_id);
    const secretHash = await this.getGalleryPinHash(data.id || snap.docs[0].id);

    return {
      id: data.id || snap.docs[0].id,
      event_id: data.event_id,
      created_by: data.created_by,
      slug: data.slug,
      pin_hash: secretHash || '',
      status: data.status,
      published_at: data.published_at || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      event_name: event?.name,
    };
  },

  async getGalleryById(id: string): Promise<Gallery | null> {
    await ensureSeeded();
    const firestore = getDb();
    const snap = await getDoc(doc(firestore, 'galleries', id));
    if (!snap.exists()) return null;
    const data = snap.data();
    const secretHash = await this.getGalleryPinHash(id);

    return {
      id: data.id || snap.id,
      event_id: data.event_id,
      created_by: data.created_by,
      slug: data.slug,
      pin_hash: secretHash || '',
      status: data.status,
      published_at: data.published_at || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  async getGalleryPinHash(galleryId: string): Promise<string | null> {
    await ensureSeeded();
    const firestore = getDb();
    const snap = await getDoc(doc(firestore, 'gallery_secrets', galleryId));
    if (!snap.exists()) return null;
    return snap.data().pin_hash || null;
  },

  async getGalleriesForAdmin(adminUserId?: string): Promise<Gallery[]> {
    await ensureSeeded();
    const firestore = getDb();
    let gQ = query(collection(firestore, 'galleries'), where('server_sync', '==', true));
    if (adminUserId) {
      gQ = query(
        collection(firestore, 'galleries'),
        where('server_sync', '==', true),
        where('created_by', '==', adminUserId)
      );
    }
    const snap = await getDocs(gQ);
    const galleries: Gallery[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      const gid = data.id || d.id;
      const event = await this.getEventById(data.event_id);
      const secretHash = await this.getGalleryPinHash(gid);
      galleries.push({
        id: gid,
        event_id: data.event_id,
        created_by: data.created_by,
        slug: data.slug,
        pin_hash: secretHash || '',
        status: data.status,
        published_at: data.published_at || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        event_name: event?.name,
      });
    }

    return galleries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getAllGalleries(adminUserId?: string): Promise<Gallery[]> {
    return this.getGalleriesForAdmin(adminUserId);
  },

  async createGallery(
    data: {
      event_id: string;
      created_by: string;
      slug: string;
      pin_hash: string;
      status?: GalleryStatus;
      selected_photo_ids?: string[];
      selectedPhotoIds?: string[];
    },
    selectedPhotoIdsArg: string[] = []
  ): Promise<Gallery> {
    await ensureSeeded();
    const firestore = getDb();
    const id = crypto.randomUUID();
    const status = data.status || 'DRAFT';
    const now = new Date().toISOString();

    const newGallery: Gallery = {
      id,
      event_id: data.event_id,
      created_by: data.created_by,
      slug: data.slug,
      pin_hash: data.pin_hash,
      status,
      published_at: status === 'PUBLISHED' ? now : null,
      created_at: now,
      updated_at: now,
    };

    // Stored in galleries collection WITHOUT secret pin_hash
    const galleryDoc = {
      id,
      event_id: data.event_id,
      created_by: data.created_by,
      slug: data.slug,
      status,
      published_at: status === 'PUBLISHED' ? now : null,
      created_at: now,
      updated_at: now,
      server_sync: true,
    };

    await setDoc(doc(firestore, 'galleries', id), galleryDoc);

    await setDoc(doc(firestore, 'gallery_secrets', id), {
      id,
      gallery_id: id,
      pin_hash: data.pin_hash,
      server_sync: true,
    });

    const photoIds = data.selected_photo_ids || data.selectedPhotoIds || selectedPhotoIdsArg || [];
    for (const photoId of photoIds) {
      const gpId = crypto.randomUUID();
      await setDoc(doc(firestore, 'gallery_photos', gpId), {
        id: gpId,
        gallery_id: id,
        photo_id: photoId,
        created_at: now,
        server_sync: true,
      });
    }

    return newGallery;
  },

  async updateGallery(
    id: string,
    data: Partial<Gallery> & {
      pin_hash?: string;
      selectedPhotoIds?: string[];
      selected_photo_ids?: string[];
    }
  ): Promise<Gallery | null> {
    await ensureSeeded();
    const firestore = getDb();
    const ref = doc(firestore, 'galleries', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const existing = snap.data();
    const isPublishing = data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';
    const now = new Date().toISOString();

    const updated: Gallery = {
      id: existing.id || snap.id,
      event_id: existing.event_id,
      created_by: existing.created_by,
      slug: data.slug !== undefined ? data.slug : existing.slug,
      pin_hash: data.pin_hash !== undefined ? data.pin_hash : existing.pin_hash,
      status: data.status !== undefined ? data.status : existing.status,
      published_at: isPublishing
        ? now
        : data.status === 'DRAFT'
        ? null
        : existing.published_at,
      created_at: existing.created_at,
      updated_at: now,
    };

    const galleryDoc = {
      id: existing.id || snap.id,
      event_id: existing.event_id,
      created_by: existing.created_by,
      slug: data.slug !== undefined ? data.slug : existing.slug,
      status: data.status !== undefined ? data.status : existing.status,
      published_at: isPublishing
        ? now
        : data.status === 'DRAFT'
        ? null
        : existing.published_at,
      created_at: existing.created_at,
      updated_at: now,
      server_sync: true,
    };

    await setDoc(ref, galleryDoc);

    if (data.pin_hash) {
      await setDoc(doc(firestore, 'gallery_secrets', id), {
        id,
        gallery_id: id,
        pin_hash: data.pin_hash,
        server_sync: true,
      });
    }

    const photoIds = data.selectedPhotoIds || data.selected_photo_ids;
    if (photoIds !== undefined) {
      const gpQ = query(
        collection(firestore, 'gallery_photos'),
        where('server_sync', '==', true),
        where('gallery_id', '==', id)
      );
      const gpSnap = await getDocs(gpQ);
      for (const gpd of gpSnap.docs) {
        await deleteDoc(gpd.ref);
      }

      for (const photoId of photoIds) {
        const gpId = crypto.randomUUID();
        await setDoc(doc(firestore, 'gallery_photos', gpId), {
          id: gpId,
          gallery_id: id,
          photo_id: photoId,
          created_at: now,
          server_sync: true,
        });
      }
    }

    const secretHash = (await this.getGalleryPinHash(id)) || '';
    return {
      ...updated,
      pin_hash: secretHash,
    };
  },

  async deleteGallery(id: string): Promise<void> {
    await ensureSeeded();
    const firestore = getDb();
    await deleteDoc(doc(firestore, 'galleries', id));
    await deleteDoc(doc(firestore, 'gallery_secrets', id));

    const gpQ = query(
      collection(firestore, 'gallery_photos'),
      where('server_sync', '==', true),
      where('gallery_id', '==', id)
    );
    const gpSnap = await getDocs(gpQ);
    for (const d of gpSnap.docs) {
      await deleteDoc(d.ref);
    }
  },

  async getPublishedGalleryPhotos(galleryId: string): Promise<Photo[]> {
    await ensureSeeded();
    const firestore = getDb();
    const gpQ = query(
      collection(firestore, 'gallery_photos'),
      where('server_sync', '==', true),
      where('gallery_id', '==', galleryId)
    );
    const gpSnap = await getDocs(gpQ);
    const photoIds = gpSnap.docs.map((d) => d.data().photo_id);
    if (photoIds.length === 0) return [];

    const photos: Photo[] = [];
    for (const pid of photoIds) {
      const p = await this.getPhotoById(pid);
      if (p) photos.push(p);
    }
    return photos;
  },

  async getSelectedPhotoIdsForGallery(galleryId: string): Promise<string[]> {
    await ensureSeeded();
    const firestore = getDb();
    const gpQ = query(
      collection(firestore, 'gallery_photos'),
      where('server_sync', '==', true),
      where('gallery_id', '==', galleryId)
    );
    const gpSnap = await getDocs(gpQ);
    return gpSnap.docs.map((d) => d.data().photo_id);
  },

  async getDashboardStats(adminUserId?: string): Promise<DashboardStats> {
    await ensureSeeded();
    const firestore = getDb();
    let events: Event[] = [];

    if (adminUserId) {
      events = await this.getEventsForUser(adminUserId, 'ADMIN');
    } else {
      const eQ = query(collection(firestore, 'events'), where('server_sync', '==', true));
      const eSnap = await getDocs(eQ);
      events = eSnap.docs.map((d) => ({
        id: d.data().id || d.id,
        name: d.data().name,
        description: d.data().description || '',
        created_by: d.data().created_by,
        created_at: d.data().created_at,
        updated_at: d.data().updated_at,
      }));
    }

    const eventIds = new Set(events.map((e) => e.id));
    if (eventIds.size === 0) {
      return {
        totalEvents: 0,
        totalPhotos: 0,
        totalSelectedPhotos: 0,
        totalGalleries: 0,
        totalTeamMembers: 0,
      };
    }

    const pQ = query(collection(firestore, 'photos'), where('server_sync', '==', true));
    const pSnap = await getDocs(pQ);
    const photos = pSnap.docs
      .map((d) => d.data())
      .filter((p) => eventIds.has(p.event_id));

    const totalSelectedPhotos = photos.filter((p) => p.is_selected).length;

    const gQ = query(collection(firestore, 'galleries'), where('server_sync', '==', true));
    const gSnap = await getDocs(gQ);
    const galleries = gSnap.docs
      .map((d) => d.data())
      .filter((g) => eventIds.has(g.event_id));

    const mQ = query(collection(firestore, 'event_members'), where('server_sync', '==', true));
    const mSnap = await getDocs(mQ);
    const relevantMembers = mSnap.docs
      .map((d) => d.data())
      .filter((m) => eventIds.has(m.event_id));

    const totalTeamMembers = new Set(relevantMembers.map((m) => m.user_id)).size;

    return {
      totalEvents: events.length,
      totalPhotos: photos.length,
      totalSelectedPhotos,
      totalGalleries: galleries.length,
      totalTeamMembers,
    };
  },
};
