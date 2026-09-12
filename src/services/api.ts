import {
  UserProfile,
  Event,
  EventMember,
  Photo,
  Gallery,
  DashboardStats,
  CustomerGallerySession,
} from '../types/index.ts';

const TOKEN_KEY = 'photo_platform_token';
const USER_KEY = 'photo_platform_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): UserProfile | null {
  const u = localStorage.getItem(USER_KEY);
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: UserProfile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }): Promise<{ token: string; user: UserProfile }> {
    const data = await request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setAuthSession(data.token, data.user);
    return data;
  },

  async register(data: { name: string; email: string; password: string; role?: 'ADMIN' | 'TEAM_MEMBER' }): Promise<{ token: string; user: UserProfile }> {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthSession(res.token, res.user);
    return res;
  },

  async loginWithFirebase(firebaseUser: { uid: string; email: string; displayName?: string | null }): Promise<{ token: string; user: UserProfile }> {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || undefined,
      }),
    });
    setAuthSession(res.token, res.user);
    return res;
  },

  async getCurrentUser(): Promise<UserProfile> {
    const res = await request<{ user: UserProfile }>('/api/auth/me');
    return res.user;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const res = await request<{ users: UserProfile[] }>('/api/users');
    return res.users;
  },

  async adminCreateUser(data: { name: string; email: string; password?: string; role: 'ADMIN' | 'TEAM_MEMBER' }): Promise<{ user: UserProfile; message: string }> {
    return request<{ user: UserProfile; message: string }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async assignUserRole(userId: string, role: 'ADMIN' | 'TEAM_MEMBER'): Promise<{ user: UserProfile; message: string }> {
    return request<{ user: UserProfile; message: string }>(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  // Events
  async getEvents(): Promise<Event[]> {
    const res = await request<{ events: Event[] }>('/api/events');
    return res.events;
  },

  async getEventById(id: string): Promise<Event> {
    const res = await request<{ event: Event }>(`/api/events/${id}`);
    return res.event;
  },

  async createEvent(data: { name: string; description: string }): Promise<Event> {
    const res = await request<{ event: Event }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.event;
  },

  async updateEvent(id: string, data: { name?: string; description?: string }): Promise<Event> {
    const res = await request<{ event: Event }>(`/api/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.event;
  },

  async deleteEvent(id: string): Promise<void> {
    await request(`/api/events/${id}`, { method: 'DELETE' });
  },

  // Event Members
  async getEventMembers(eventId: string): Promise<EventMember[]> {
    const res = await request<{ members: EventMember[] }>(`/api/events/${eventId}/members`);
    return res.members;
  },

  async addEventMember(eventId: string, userId: string): Promise<EventMember> {
    const res = await request<{ member: EventMember }>(`/api/events/${eventId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return res.member;
  },

  async removeEventMember(eventId: string, userId: string): Promise<void> {
    await request(`/api/events/${eventId}/members/${userId}`, { method: 'DELETE' });
  },

  // Photos
  async getEventPhotos(eventId: string, uploaderId?: string): Promise<Photo[]> {
    const query = uploaderId ? `?uploaderId=${encodeURIComponent(uploaderId)}` : '';
    const res = await request<{ photos: Photo[] }>(`/api/events/${eventId}/photos${query}`);
    return res.photos;
  },

  async uploadPhotos(eventId: string, files: File[]): Promise<Photo[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));

    const res = await request<{ photos: Photo[] }>(`/api/events/${eventId}/photos`, {
      method: 'POST',
      body: formData,
    });
    return res.photos;
  },

  async deletePhoto(photoId: string): Promise<void> {
    await request(`/api/photos/${photoId}`, { method: 'DELETE' });
  },

  // Gallery
  async getEventGallery(eventId: string): Promise<{ gallery: Gallery | null; selectedPhotoIds: string[] }> {
    return request<{ gallery: Gallery | null; selectedPhotoIds: string[] }>(`/api/events/${eventId}/gallery`);
  },

  async saveGallery(data: {
    eventId: string;
    slug: string;
    pin: string;
    status: 'DRAFT' | 'PUBLISHED';
    selectedPhotoIds: string[];
  }): Promise<{ gallery: Gallery; selectedPhotoIds: string[] }> {
    return request<{ gallery: Gallery; selectedPhotoIds: string[] }>('/api/galleries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGallery(
    galleryId: string,
    data: { slug?: string; pin?: string; status?: 'DRAFT' | 'PUBLISHED'; selectedPhotoIds?: string[] }
  ): Promise<{ gallery: Gallery }> {
    return request<{ gallery: Gallery }>(`/api/galleries/${galleryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async publishGallery(galleryId: string): Promise<{ gallery: Gallery; message: string }> {
    return request<{ gallery: Gallery; message: string }>(`/api/galleries/${galleryId}/publish`, {
      method: 'POST',
    });
  },

  async getAllGalleries(): Promise<Gallery[]> {
    const res = await request<{ galleries: Gallery[] }>('/api/admin/galleries');
    return res.galleries;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await request<{ stats: DashboardStats }>('/api/admin/dashboard');
    return res.stats;
  },

  // Customer Gallery (No user account required)
  async getCustomerGalleryInfo(slug: string): Promise<{
    gallery: { id: string; slug: string; eventName: string; publishedAt: string | null };
  }> {
    const res = await fetch(`/api/gallery/${slug}/info`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load gallery');
    return data;
  },

  async verifyCustomerPin(slug: string, pin: string): Promise<CustomerGallerySession> {
    const res = await fetch(`/api/gallery/${slug}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'PIN verification failed');
    return data;
  },

  async getCustomerGalleryPhotos(slug: string, galleryToken: string): Promise<{
    galleryName: string;
    photoCount: number;
    photos: { id: string; filename: string; file_size: number; created_at: string; url: string }[];
  }> {
    const res = await fetch(`/api/gallery/${slug}/photos`, {
      headers: {
        'x-gallery-token': galleryToken,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load photos');
    return data;
  },

  async getConfigStatus(): Promise<{ firebaseConfigured: boolean; storageBucket: string }> {
    const res = await fetch('/api/config-status');
    return res.json();
  },
};
