export type UserRole = 'ADMIN' | 'TEAM_MEMBER';

export type GalleryStatus = 'DRAFT' | 'PUBLISHED';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  member_count?: number;
  photo_count?: number;
  selected_photo_count?: number;
}

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_role?: UserRole;
}

export interface Photo {
  id: string;
  event_id: string;
  uploaded_by: string;
  filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  uploader_name?: string;
  uploader_email?: string;
  url?: string;
  is_selected?: boolean;
}

export interface Gallery {
  id: string;
  event_id: string;
  created_by: string;
  slug: string;
  pin_hash?: string;
  status: GalleryStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  event_name?: string;
  photo_count?: number;
}

export interface GalleryPhoto {
  id: string;
  gallery_id: string;
  photo_id: string;
  created_at: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}

export interface CustomerGallerySession {
  galleryToken: string;
  gallery: {
    id: string;
    slug: string;
    status: GalleryStatus;
    event_name: string;
    published_at: string | null;
  };
}

export interface DashboardStats {
  totalEvents: number;
  totalPhotos: number;
  totalSelectedPhotos: number;
  totalGalleries: number;
  totalTeamMembers: number;
}
