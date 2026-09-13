import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;

/**
 * Initializes and returns the Firebase Admin SDK App.
 * Configured using firebase-applet-config.json and server environment variables.
 */
export function getFirebaseAdminApp(): App | null {
  if (adminApp) return adminApp;

  try {
    let projectId = process.env.FIREBASE_PROJECT_ID;
    let storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    // Check multiple candidate locations for firebase-applet-config.json
    const candidatePaths = [
      path.resolve(process.cwd(), 'firebase-applet-config.json'),
      path.resolve(process.cwd(), 'dist', 'firebase-applet-config.json'),
      path.resolve('/tmp', 'firebase-applet-config.json'),
    ];

    for (const configPath of candidatePaths) {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          projectId = projectId || config.projectId;
          storageBucket = storageBucket || config.storageBucket;
          break;
        } catch {
          // continue checking
        }
      }
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

    // Determine credential setup if provided in environment
    let credentialOption: any = undefined;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credentialOption = cert(sa);
      } catch (e) {
        console.warn('[Firebase Admin] Could not parse FIREBASE_SERVICE_ACCOUNT_KEY JSON');
      }
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credentialOption = cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }

    const initOptions: any = {
      projectId,
      storageBucket,
    };
    if (credentialOption) {
      initOptions.credential = credentialOption;
    }

    adminApp = initializeApp(initOptions);
    return adminApp;
  } catch (err) {
    console.warn('[Firebase Admin] Initialization notice:', (err as Error).message);
    return null;
  }
}

/**
 * Asynchronously loads Firebase Admin Auth on demand.
 * This prevents unnecessary startup evaluation and ensures safe serverless execution.
 */
export async function getAdminAuth(app?: App | null) {
  const targetApp = app || getFirebaseAdminApp();
  if (!targetApp) return null;
  try {
    const { getAuth } = await import('firebase-admin/auth');
    return getAuth(targetApp);
  } catch (err: any) {
    console.warn('[Firebase Auth] Failed to load auth:', err.message);
    return null;
  }
}

/**
 * Asynchronously loads Firebase Admin Firestore on demand.
 */
export async function getAdminFirestore(app?: App | null) {
  const targetApp = app || getFirebaseAdminApp();
  if (!targetApp) return null;
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    return getFirestore(targetApp);
  } catch (err: any) {
    console.warn('[Firebase Firestore] Failed to load firestore:', err.message);
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
    const auth = await getAdminAuth(app);
    // 1. Synchronize Firebase Auth custom claims
    if (auth) {
      try {
        await auth.setCustomUserClaims(authUserId, {
          role,
          admin: role === 'ADMIN',
        });
      } catch {
        // Non-fatal if local or mock user without an existing Firebase Auth record
      }
    }

    // 2. Synchronize Firestore users and admins collections
    try {
      const firestore = await getAdminFirestore(app);
      if (firestore) {
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
      }
    } catch {
      // Non-fatal in local/offline test mode
    }
  } catch (err: any) {
    console.warn('[Firebase Role Sync] Notice:', err.message);
  }
}

