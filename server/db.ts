import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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

export function isFirebaseConfigured(): boolean {
  return true;
}

// In-Memory Synchronized State with Seed Data
interface InMemoryStore {
  profiles: UserProfile[];
  passwords: Map<string, string>; // email -> bcrypt hashed password
  events: Event[];
  eventMembers: EventMember[];
  photos: Photo[];
  galleries: Gallery[];
  gallerySecrets: Map<string, string>; // gallery_id -> bcrypt hashed PIN
  galleryPhotos: { id: string; gallery_id: string; photo_id: string; created_at: string }[];
}

// Default Seed Users (Password: AdminPass123! and TeamPass123!)
const defaultAdminPassHash = bcrypt.hashSync('AdminPass123!', 10);
const defaultTeamPassHash = bcrypt.hashSync('TeamPass123!', 10);
const defaultGalleryPinHash = bcrypt.hashSync('4826', 10); // PIN: 4826

function initStore(): InMemoryStore {
  const store: InMemoryStore = {
    profiles: [
      {
        id: 'u0000000-0000-0000-0000-000000000001',
        auth_user_id: 'firebase-admin-uid-001',
        name: 'Sarah Director',
        email: 'admin@photoplatform.com',
        role: 'ADMIN',
        created_at: new Date().toISOString(),
      },
      {
        id: 'u0000000-0000-0000-0000-000000000002',
        auth_user_id: 'firebase-team-uid-002',
        name: 'Alex Photographer',
        email: 'team@photoplatform.com',
        role: 'TEAM_MEMBER',
        created_at: new Date().toISOString(),
      },
      {
        id: 'u0000000-0000-0000-0000-000000000003',
        auth_user_id: 'firebase-team-uid-003',
        name: 'Jordan Assistant',
        email: 'unassigned@photoplatform.com',
        role: 'TEAM_MEMBER',
        created_at: new Date().toISOString(),
      },
    ],
    passwords: new Map([
      ['admin@photoplatform.com', defaultAdminPassHash],
      ['team@photoplatform.com', defaultTeamPassHash],
      ['unassigned@photoplatform.com', defaultTeamPassHash],
    ]),
    events: [
      {
        id: 'e1111111-1111-1111-1111-111111111111',
        name: 'Summer Gala 2026',
        description: 'Annual summer charity gala and award ceremony at the Grand Ballroom.',
        created_by: 'u0000000-0000-0000-0000-000000000001',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'e2222222-2222-2222-2222-222222222222',
        name: 'Corporate Summit 2026',
        description: 'Tech innovation and networking summit keynote speeches and panels.',
        created_by: 'u0000000-0000-0000-0000-000000000001',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    eventMembers: [
      {
        id: 'm1111111-1111-1111-1111-111111111111',
        event_id: 'e1111111-1111-1111-1111-111111111111',
        user_id: 'u0000000-0000-0000-0000-000000000002',
        created_at: new Date().toISOString(),
      },
    ],
    photos: [
      {
        id: 'p1111111-1111-1111-1111-111111111111',
        event_id: 'e1111111-1111-1111-1111-111111111111',
        uploaded_by: 'u0000000-0000-0000-0000-000000000002',
        filename: 'keynote_speech_01.jpg',
        storage_path: 'events/e1111111-1111-1111-1111-111111111111/photos/sample_keynote.jpg',
        file_size: 2450800,
        mime_type: 'image/jpeg',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        is_selected: true,
      },
      {
        id: 'p2222222-2222-2222-2222-222222222222',
        event_id: 'e1111111-1111-1111-1111-111111111111',
        uploaded_by: 'u0000000-0000-0000-0000-000000000002',
        filename: 'vip_cocktails_02.jpg',
        storage_path: 'events/e1111111-1111-1111-1111-111111111111/photos/sample_cocktails.jpg',
        file_size: 1980400,
        mime_type: 'image/jpeg',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        is_selected: true,
      },
      {
        id: 'p3333333-3333-3333-3333-333333333333',
        event_id: 'e1111111-1111-1111-1111-111111111111',
        uploaded_by: 'u0000000-0000-0000-0000-000000000001',
        filename: 'stage_lighting_03.jpg',
        storage_path: 'events/e1111111-1111-1111-1111-111111111111/photos/sample_stage.jpg',
        file_size: 3120100,
        mime_type: 'image/jpeg',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        is_selected: false,
      },
    ],
    galleries: [
      {
        id: 'g1111111-1111-1111-1111-111111111111',
        event_id: 'e1111111-1111-1111-1111-111111111111',
        created_by: 'u0000000-0000-0000-0000-000000000001',
        slug: 'summer-gala-2026-vip',
        pin_hash: defaultGalleryPinHash,
        status: 'PUBLISHED',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    gallerySecrets: new Map([
      ['g1111111-1111-1111-1111-111111111111', defaultGalleryPinHash],
    ]),
    galleryPhotos: [
      {
        id: 'gp111111-1111-1111-1111-111111111111',
        gallery_id: 'g1111111-1111-1111-1111-111111111111',
        photo_id: 'p1111111-1111-1111-1111-111111111111',
        created_at: new Date().toISOString(),
      },
      {
        id: 'gp222222-2222-2222-2222-222222222222',
        gallery_id: 'g1111111-1111-1111-1111-111111111111',
        photo_id: 'p2222222-2222-2222-2222-222222222222',
        created_at: new Date().toISOString(),
      },
    ],
  };

  return store;
}

const memoryDb = initStore();

export const db = {
  // Profiles / Users
  async findProfileByEmail(email: string): Promise<UserProfile | null> {
    const user = memoryDb.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    return user || null;
  },

  async findProfileById(id: string): Promise<UserProfile | null> {
    const user = memoryDb.profiles.find((p) => p.id === id);
    return user || null;
  },

  async findProfileByAuthId(authUserId: string): Promise<UserProfile | null> {
    const user = memoryDb.profiles.find((p) => p.auth_user_id === authUserId);
    return user || null;
  },

  async getPasswordHash(email: string): Promise<string | null> {
    return memoryDb.passwords.get(email.toLowerCase()) || null;
  },

  async verifyUserCredentials(email: string, plainTextPassword: string): Promise<UserProfile | null> {
    const user = await this.findProfileByEmail(email);
    if (!user) return null;

    const hash = memoryDb.passwords.get(email.toLowerCase());
    if (!hash) return null;

    const isValid = await bcrypt.compare(plainTextPassword, hash);
    if (!isValid) return null;

    return user;
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
    const newProfile: UserProfile = {
      id: profile.id || crypto.randomUUID(),
      auth_user_id: profile.auth_user_id || `auth-${crypto.randomUUID()}`,
      name: profile.name,
      email: profile.email.toLowerCase(),
      role: profile.role,
      created_at: profile.created_at || new Date().toISOString(),
    };

    memoryDb.profiles.push(newProfile);

    if (profile.passwordHash) {
      memoryDb.passwords.set(newProfile.email, profile.passwordHash);
    } else if (plainTextPassword) {
      const hashed = await bcrypt.hash(plainTextPassword, 10);
      memoryDb.passwords.set(newProfile.email, hashed);
    }

    return newProfile;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    return [...memoryDb.profiles];
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    return this.getAllUsers();
  },

  async updateUserRole(userId: string, newRole: UserRole): Promise<UserProfile | null> {
    const user = memoryDb.profiles.find((p) => p.id === userId || p.auth_user_id === userId);
    if (!user) return null;
    user.role = newRole;
    return user;
  },

  // Events
  async getEventsForUser(userId: string, role: UserRole): Promise<Event[]> {
    if (role === 'ADMIN') {
      return memoryDb.events.filter((e) => e.created_by === userId);
    }

    // TEAM_MEMBER: Only assigned events
    const assignedEventIds = new Set(
      memoryDb.eventMembers.filter((m) => m.user_id === userId).map((m) => m.event_id)
    );
    return memoryDb.events.filter((e) => assignedEventIds.has(e.id));
  },

  async getEventById(id: string): Promise<Event | null> {
    const event = memoryDb.events.find((e) => e.id === id);
    return event || null;
  },

  async createEvent(data: { name: string; description?: string; created_by: string }): Promise<Event> {
    const newEvent: Event = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description || '',
      created_by: data.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryDb.events.unshift(newEvent);
    return newEvent;
  },

  async updateEvent(id: string, data: { name?: string; description?: string }): Promise<Event | null> {
    const index = memoryDb.events.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const updated: Event = {
      ...memoryDb.events[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    memoryDb.events[index] = updated;
    return updated;
  },

  async deleteEvent(id: string): Promise<void> {
    memoryDb.events = memoryDb.events.filter((e) => e.id !== id);
    memoryDb.eventMembers = memoryDb.eventMembers.filter((m) => m.event_id !== id);
    const photoIdsToDelete = new Set(
      memoryDb.photos.filter((p) => p.event_id === id).map((p) => p.id)
    );
    memoryDb.photos = memoryDb.photos.filter((p) => p.event_id !== id);
    const galleriesToDelete = memoryDb.galleries.filter((g) => g.event_id === id);
    for (const g of galleriesToDelete) {
      memoryDb.galleryPhotos = memoryDb.galleryPhotos.filter((gp) => gp.gallery_id !== g.id);
      memoryDb.gallerySecrets.delete(g.id);
    }
    memoryDb.galleries = memoryDb.galleries.filter((g) => g.event_id !== id);
    memoryDb.galleryPhotos = memoryDb.galleryPhotos.filter((gp) => !photoIdsToDelete.has(gp.photo_id));
  },

  // Event Members
  async getEventMembers(eventId: string): Promise<EventMember[]> {
    const members = memoryDb.eventMembers.filter((m) => m.event_id === eventId);
    return members.map((m) => {
      const user = memoryDb.profiles.find((p) => p.id === m.user_id);
      return {
        ...m,
        user_name: user?.name || 'Unknown',
        user_email: user?.email || 'unknown@studio.com',
        user_role: user?.role || 'TEAM_MEMBER',
      };
    });
  },

  async isUserAssignedToEvent(eventId: string, userId: string): Promise<boolean> {
    return memoryDb.eventMembers.some((m) => m.event_id === eventId && m.user_id === userId);
  },

  async addEventMember(eventId: string, userId: string): Promise<EventMember> {
    const existing = memoryDb.eventMembers.find(
      (m) => m.event_id === eventId && m.user_id === userId
    );
    if (existing) {
      const user = memoryDb.profiles.find((p) => p.id === userId);
      return {
        ...existing,
        user_name: user?.name,
        user_email: user?.email,
        user_role: user?.role,
      };
    }

    const newMember: EventMember = {
      id: crypto.randomUUID(),
      event_id: eventId,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    memoryDb.eventMembers.push(newMember);

    const user = memoryDb.profiles.find((p) => p.id === userId);
    return {
      ...newMember,
      user_name: user?.name,
      user_email: user?.email,
      user_role: user?.role,
    };
  },

  async removeEventMember(eventId: string, userId: string): Promise<void> {
    memoryDb.eventMembers = memoryDb.eventMembers.filter(
      (m) => !(m.event_id === eventId && m.user_id === userId)
    );
  },

  // Photos
  async getPhotosForEvent(eventId: string, uploaderId?: string): Promise<Photo[]> {
    let photos = memoryDb.photos.filter((p) => p.event_id === eventId);
    if (uploaderId) {
      photos = photos.filter((p) => p.uploaded_by === uploaderId);
    }
    return photos.map((p) => {
      const uploader = memoryDb.profiles.find((u) => u.id === p.uploaded_by);
      return {
        ...p,
        uploader_name: uploader?.name || 'Photographer',
      };
    });
  },

  async getPhotoById(photoId: string): Promise<Photo | null> {
    const photo = memoryDb.photos.find((p) => p.id === photoId);
    if (!photo) return null;
    const uploader = memoryDb.profiles.find((u) => u.id === photo.uploaded_by);
    return {
      ...photo,
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
    const newPhoto: Photo = {
      id: crypto.randomUUID(),
      event_id: data.event_id,
      uploaded_by: data.uploaded_by,
      filename: data.filename,
      storage_path: data.storage_path,
      file_size: data.file_size,
      mime_type: data.mime_type,
      created_at: new Date().toISOString(),
      is_selected: data.is_selected ?? false,
    };

    memoryDb.photos.unshift(newPhoto);
    const uploader = memoryDb.profiles.find((u) => u.id === newPhoto.uploaded_by);
    return {
      ...newPhoto,
      uploader_name: uploader?.name || 'Photographer',
    };
  },

  async deletePhoto(photoId: string): Promise<void> {
    memoryDb.photos = memoryDb.photos.filter((p) => p.id !== photoId);
    memoryDb.galleryPhotos = memoryDb.galleryPhotos.filter((gp) => gp.photo_id !== photoId);
  },

  async updatePhoto(photoId: string, data: Partial<Photo>): Promise<Photo | null> {
    const index = memoryDb.photos.findIndex((p) => p.id === photoId);
    if (index === -1) return null;

    const updated: Photo = {
      ...memoryDb.photos[index],
      ...data,
    };
    memoryDb.photos[index] = updated;
    return updated;
  },

  // Galleries
  async getGalleryForEvent(eventId: string): Promise<Gallery | null> {
    const gallery = memoryDb.galleries.find((g) => g.event_id === eventId);
    if (!gallery) return null;
    const secretHash = memoryDb.gallerySecrets.get(gallery.id) || '';
    return {
      ...gallery,
      pin_hash: secretHash,
    };
  },

  async getGalleryByEventId(eventId: string): Promise<Gallery | null> {
    return this.getGalleryForEvent(eventId);
  },

  async getGalleryBySlug(slug: string): Promise<Gallery | null> {
    const gallery = memoryDb.galleries.find((g) => g.slug === slug);
    if (!gallery) return null;
    const event = memoryDb.events.find((e) => e.id === gallery.event_id);
    const secretHash = memoryDb.gallerySecrets.get(gallery.id) || '';
    return {
      ...gallery,
      pin_hash: secretHash,
      event_name: event?.name,
    };
  },

  async getGalleryById(id: string): Promise<Gallery | null> {
    const gallery = memoryDb.galleries.find((g) => g.id === id);
    if (!gallery) return null;
    const secretHash = memoryDb.gallerySecrets.get(gallery.id) || '';
    return {
      ...gallery,
      pin_hash: secretHash,
    };
  },

  async getGalleryPinHash(galleryId: string): Promise<string | null> {
    return memoryDb.gallerySecrets.get(galleryId) || null;
  },

  async getGalleriesForAdmin(adminUserId?: string): Promise<Gallery[]> {
    let galleries = [...memoryDb.galleries];
    if (adminUserId) {
      galleries = galleries.filter((g) => g.created_by === adminUserId);
    }
    return galleries.map((g) => {
      const event = memoryDb.events.find((e) => e.id === g.event_id);
      const secretHash = memoryDb.gallerySecrets.get(g.id) || '';
      return {
        ...g,
        pin_hash: secretHash,
        event_name: event?.name,
      };
    });
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
    const id = crypto.randomUUID();
    const status = data.status || 'DRAFT';
    const newGallery: Gallery = {
      id,
      event_id: data.event_id,
      created_by: data.created_by,
      slug: data.slug,
      pin_hash: data.pin_hash,
      status,
      published_at: status === 'PUBLISHED' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryDb.galleries.unshift(newGallery);
    // Store secret PIN hash separately in gallery_secrets
    memoryDb.gallerySecrets.set(id, data.pin_hash);

    // Save curated photo mapping
    const photoIds = data.selected_photo_ids || data.selectedPhotoIds || selectedPhotoIdsArg || [];
    if (photoIds.length > 0) {
      for (const photoId of photoIds) {
        memoryDb.galleryPhotos.push({
          id: crypto.randomUUID(),
          gallery_id: id,
          photo_id: photoId,
          created_at: new Date().toISOString(),
        });
      }
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
    const index = memoryDb.galleries.findIndex((g) => g.id === id);
    if (index === -1) return null;

    const existing = memoryDb.galleries[index];
    const isPublishing = data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';

    const updated: Gallery = {
      ...existing,
      ...data,
      published_at: isPublishing
        ? new Date().toISOString()
        : data.status === 'DRAFT'
        ? null
        : existing.published_at,
      updated_at: new Date().toISOString(),
    };

    memoryDb.galleries[index] = updated;

    if (data.pin_hash) {
      memoryDb.gallerySecrets.set(id, data.pin_hash);
    }

    const photoIds = data.selectedPhotoIds || data.selected_photo_ids;
    if (photoIds !== undefined) {
      memoryDb.galleryPhotos = memoryDb.galleryPhotos.filter((gp) => gp.gallery_id !== id);
      for (const photoId of photoIds) {
        memoryDb.galleryPhotos.push({
          id: crypto.randomUUID(),
          gallery_id: id,
          photo_id: photoId,
          created_at: new Date().toISOString(),
        });
      }
    }

    const secretHash = memoryDb.gallerySecrets.get(id) || '';
    return {
      ...updated,
      pin_hash: secretHash,
    };
  },

  async deleteGallery(id: string): Promise<void> {
    memoryDb.galleries = memoryDb.galleries.filter((g) => g.id !== id);
    memoryDb.galleryPhotos = memoryDb.galleryPhotos.filter((gp) => gp.gallery_id !== id);
    memoryDb.gallerySecrets.delete(id);
  },

  async getPublishedGalleryPhotos(galleryId: string): Promise<Photo[]> {
    const photoIds = new Set(
      memoryDb.galleryPhotos.filter((gp) => gp.gallery_id === galleryId).map((gp) => gp.photo_id)
    );
    return memoryDb.photos.filter((p) => photoIds.has(p.id));
  },

  async getSelectedPhotoIdsForGallery(galleryId: string): Promise<string[]> {
    return memoryDb.galleryPhotos
      .filter((gp) => gp.gallery_id === galleryId)
      .map((gp) => gp.photo_id);
  },

  async getDashboardStats(adminUserId?: string): Promise<DashboardStats> {
    const events = adminUserId
      ? memoryDb.events.filter((e) => e.created_by === adminUserId)
      : memoryDb.events;
    const eventIds = new Set(events.map((e) => e.id));

    const photos = memoryDb.photos.filter((p) => eventIds.has(p.event_id));
    const galleries = memoryDb.galleries.filter((g) => eventIds.has(g.event_id));

    const totalSelectedPhotos = memoryDb.photos.filter(
      (p) => eventIds.has(p.event_id) && p.is_selected
    ).length;

    const totalTeamMembers = new Set(
      memoryDb.eventMembers.filter((m) => eventIds.has(m.event_id)).map((m) => m.user_id)
    ).size;

    return {
      totalEvents: events.length,
      totalPhotos: photos.length,
      totalSelectedPhotos,
      totalGalleries: galleries.length,
      totalTeamMembers,
    };
  },
};
