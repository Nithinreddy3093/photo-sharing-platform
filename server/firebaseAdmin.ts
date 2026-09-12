import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;

/**
 * Initializes and returns the Firebase Admin SDK App.
 * Configured using firebase-applet-config.json and environment overrides.
 */
export function getFirebaseAdminApp(): App | null {
  if (adminApp) return adminApp;

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    let projectId = process.env.FIREBASE_PROJECT_ID;
    let storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      projectId = projectId || config.projectId;
      storageBucket = storageBucket || config.storageBucket;
    }

    if (!projectId) {
      projectId = 'gen-lang-client-0384551552';
    }

    if (!storageBucket) {
      storageBucket = 'gen-lang-client-0384551552.firebasestorage.app';
    }

    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
      return adminApp;
    }

    adminApp = initializeApp({
      projectId,
      storageBucket,
    });

    return adminApp;
  } catch (err) {
    console.warn('[Firebase Admin] Initialization notice:', (err as Error).message);
    return null;
  }
}

/**
 * Synchronizes user role with Firebase Auth custom claims and Firestore security collections.
 * Ensures consistent RBAC enforcement across Firebase Auth and Cloud Firestore.
 */
export async function syncFirebaseUserRole(
  authUserId: string,
  email: string,
  role: 'ADMIN' | 'TEAM_MEMBER'
): Promise<void> {
  const app = getFirebaseAdminApp();
  if (!app) return;

  try {
    const auth = getAuth(app);
    // 1. Synchronize Firebase Auth custom claims
    try {
      await auth.setCustomUserClaims(authUserId, {
        role,
        admin: role === 'ADMIN',
      });
    } catch {
      // Non-fatal if local or mock user without an existing Firebase Auth record
    }

    // 2. Synchronize Firestore users and admins collections
    try {
      const firestore = getFirestore(app);
      const userRef = firestore.collection('users').doc(authUserId);
      await userRef.set(
        {
          role,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      const adminRef = firestore.collection('admins').doc(authUserId);
      if (role === 'ADMIN') {
        await adminRef.set({
          uid: authUserId,
          email,
          assigned_at: new Date().toISOString(),
        });
      } else {
        await adminRef.delete();
      }
    } catch {
      // Non-fatal in local/offline test mode
    }
  } catch (err: any) {
    console.warn('[Firebase Role Sync] Notice:', err.message);
  }
}

