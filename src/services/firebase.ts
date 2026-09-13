import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, Event, EventMember, Photo, Gallery } from '../types/index';

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with configured databaseId (CRITICAL: Required for multi-db or custom DB)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Operational Types for Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Firestore connectivity validation test on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connection verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    // Expected non-existent document will still contact the server without throwing offline errors
    return false;
  }
}

// Run connection check
testConnection();

// Firebase Auth sign-in with Google Popup
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

export async function signOutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

// =========================================================================
// Firestore Realtime & Query Helpers with Standardized Error Handling
// =========================================================================

export const firestoreService = {
  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async setUserProfile(profile: UserProfile): Promise<void> {
    const path = `users/${profile.id}`;
    try {
      await setDoc(doc(db, 'users', profile.id), profile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Events
  async getEvents(): Promise<Event[]> {
    const path = 'events';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Event));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getEvent(eventId: string): Promise<Event | null> {
    const path = `events/${eventId}`;
    try {
      const snap = await getDoc(doc(db, 'events', eventId));
      return snap.exists() ? ({ ...snap.data(), id: snap.id } as Event) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async saveEvent(event: Event): Promise<void> {
    const path = `events/${event.id}`;
    try {
      await setDoc(doc(db, 'events', event.id), event);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Real-time Event Photos listener
  subscribeEventPhotos(
    eventId: string,
    onData: (photos: Photo[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `events/${eventId}/photos`;
    return onSnapshot(
      collection(db, 'events', eventId, 'photos'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const photos = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Photo));
        onData(photos);
      },
      (error) => {
        if (onError) {
          onError(error);
        }
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  // Real-time Event Members listener
  subscribeEventMembers(
    eventId: string,
    onData: (members: EventMember[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `events/${eventId}/members`;
    return onSnapshot(
      collection(db, 'events', eventId, 'members'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const members = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EventMember));
        onData(members);
      },
      (error) => {
        if (onError) {
          onError(error);
        }
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
};
