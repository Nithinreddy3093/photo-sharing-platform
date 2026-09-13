// server/app.ts
import express2 from "express";

// server/routes.ts
import express from "express";
import multer from "multer";
import { z } from "zod";
import fs3 from "fs";
import path3 from "path";
import jwt2 from "jsonwebtoken";

// server/db.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";
function isFirebaseConfigured() {
  return true;
}
var defaultAdminPassHash = bcrypt.hashSync("AdminPass123!", 10);
var defaultTeamPassHash = bcrypt.hashSync("TeamPass123!", 10);
var defaultGalleryPinHash = bcrypt.hashSync("4826", 10);
function initStore() {
  const store = {
    profiles: [
      {
        id: "u0000000-0000-0000-0000-000000000001",
        auth_user_id: "firebase-admin-uid-001",
        name: "Sarah Director",
        email: "admin@photoplatform.com",
        role: "ADMIN",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "u0000000-0000-0000-0000-000000000002",
        auth_user_id: "firebase-team-uid-002",
        name: "Alex Photographer",
        email: "team@photoplatform.com",
        role: "TEAM_MEMBER",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "u0000000-0000-0000-0000-000000000003",
        auth_user_id: "firebase-team-uid-003",
        name: "Jordan Assistant",
        email: "unassigned@photoplatform.com",
        role: "TEAM_MEMBER",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    passwords: /* @__PURE__ */ new Map([
      ["admin@photoplatform.com", defaultAdminPassHash],
      ["team@photoplatform.com", defaultTeamPassHash],
      ["unassigned@photoplatform.com", defaultTeamPassHash]
    ]),
    events: [
      {
        id: "e1111111-1111-1111-1111-111111111111",
        name: "Summer Gala 2026",
        description: "Annual summer charity gala and award ceremony at the Grand Ballroom.",
        created_by: "u0000000-0000-0000-0000-000000000001",
        created_at: new Date(Date.now() - 864e5 * 5).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "e2222222-2222-2222-2222-222222222222",
        name: "Corporate Summit 2026",
        description: "Tech innovation and networking summit keynote speeches and panels.",
        created_by: "u0000000-0000-0000-0000-000000000001",
        created_at: new Date(Date.now() - 864e5 * 2).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    eventMembers: [
      {
        id: "m1111111-1111-1111-1111-111111111111",
        event_id: "e1111111-1111-1111-1111-111111111111",
        user_id: "u0000000-0000-0000-0000-000000000002",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    photos: [
      {
        id: "p1111111-1111-1111-1111-111111111111",
        event_id: "e1111111-1111-1111-1111-111111111111",
        uploaded_by: "u0000000-0000-0000-0000-000000000002",
        filename: "keynote_speech_01.jpg",
        storage_path: "events/e1111111-1111-1111-1111-111111111111/photos/sample_keynote.jpg",
        file_size: 2450800,
        mime_type: "image/jpeg",
        created_at: new Date(Date.now() - 36e5 * 4).toISOString(),
        is_selected: true
      },
      {
        id: "p2222222-2222-2222-2222-222222222222",
        event_id: "e1111111-1111-1111-1111-111111111111",
        uploaded_by: "u0000000-0000-0000-0000-000000000002",
        filename: "vip_cocktails_02.jpg",
        storage_path: "events/e1111111-1111-1111-1111-111111111111/photos/sample_cocktails.jpg",
        file_size: 1980400,
        mime_type: "image/jpeg",
        created_at: new Date(Date.now() - 36e5 * 3).toISOString(),
        is_selected: true
      },
      {
        id: "p3333333-3333-3333-3333-333333333333",
        event_id: "e1111111-1111-1111-1111-111111111111",
        uploaded_by: "u0000000-0000-0000-0000-000000000001",
        filename: "stage_lighting_03.jpg",
        storage_path: "events/e1111111-1111-1111-1111-111111111111/photos/sample_stage.jpg",
        file_size: 3120100,
        mime_type: "image/jpeg",
        created_at: new Date(Date.now() - 36e5 * 2).toISOString(),
        is_selected: false
      }
    ],
    galleries: [
      {
        id: "g1111111-1111-1111-1111-111111111111",
        event_id: "e1111111-1111-1111-1111-111111111111",
        created_by: "u0000000-0000-0000-0000-000000000001",
        slug: "summer-gala-2026-vip",
        pin_hash: defaultGalleryPinHash,
        status: "PUBLISHED",
        published_at: (/* @__PURE__ */ new Date()).toISOString(),
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    gallerySecrets: /* @__PURE__ */ new Map([
      ["g1111111-1111-1111-1111-111111111111", defaultGalleryPinHash]
    ]),
    galleryPhotos: [
      {
        id: "gp111111-1111-1111-1111-111111111111",
        gallery_id: "g1111111-1111-1111-1111-111111111111",
        photo_id: "p1111111-1111-1111-1111-111111111111",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "gp222222-2222-2222-2222-222222222222",
        gallery_id: "g1111111-1111-1111-1111-111111111111",
        photo_id: "p2222222-2222-2222-2222-222222222222",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  };
  return store;
}
var memoryDb = initStore();
var db = {
  // Profiles / Users
  async findProfileByEmail(email) {
    const user = memoryDb.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    return user || null;
  },
  async findProfileById(id) {
    const user = memoryDb.profiles.find((p) => p.id === id);
    return user || null;
  },
  async findProfileByAuthId(authUserId) {
    const user = memoryDb.profiles.find((p) => p.auth_user_id === authUserId);
    return user || null;
  },
  async getPasswordHash(email) {
    return memoryDb.passwords.get(email.toLowerCase()) || null;
  },
  async verifyUserCredentials(email, plainTextPassword) {
    const user = await this.findProfileByEmail(email);
    if (!user) return null;
    const hash = memoryDb.passwords.get(email.toLowerCase());
    if (!hash) return null;
    const isValid = await bcrypt.compare(plainTextPassword, hash);
    if (!isValid) return null;
    return user;
  },
  async createProfile(profile, plainTextPassword) {
    const newProfile = {
      id: profile.id || crypto.randomUUID(),
      auth_user_id: profile.auth_user_id || `auth-${crypto.randomUUID()}`,
      name: profile.name,
      email: profile.email.toLowerCase(),
      role: profile.role,
      created_at: profile.created_at || (/* @__PURE__ */ new Date()).toISOString()
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
  async getAllUsers() {
    return [...memoryDb.profiles];
  },
  async getAllProfiles() {
    return this.getAllUsers();
  },
  async updateUserRole(userId, newRole) {
    const user = memoryDb.profiles.find((p) => p.id === userId || p.auth_user_id === userId);
    if (!user) return null;
    user.role = newRole;
    return user;
  },
  // Events
  async getEventsForUser(userId, role) {
    if (role === "ADMIN") {
      return memoryDb.events.filter((e) => e.created_by === userId);
    }
    const assignedEventIds = new Set(
      memoryDb.eventMembers.filter((m) => m.user_id === userId).map((m) => m.event_id)
    );
    return memoryDb.events.filter((e) => assignedEventIds.has(e.id));
  },
  async getEventById(id) {
    const event = memoryDb.events.find((e) => e.id === id);
    return event || null;
  },
  async createEvent(data) {
    const newEvent = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description || "",
      created_by: data.created_by,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    memoryDb.events.unshift(newEvent);
    return newEvent;
  },
  async updateEvent(id, data) {
    const index = memoryDb.events.findIndex((e) => e.id === id);
    if (index === -1) return null;
    const updated = {
      ...memoryDb.events[index],
      ...data,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    memoryDb.events[index] = updated;
    return updated;
  },
  async deleteEvent(id) {
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
  async getEventMembers(eventId) {
    const members = memoryDb.eventMembers.filter((m) => m.event_id === eventId);
    return members.map((m) => {
      const user = memoryDb.profiles.find((p) => p.id === m.user_id);
      return {
        ...m,
        user_name: user?.name || "Unknown",
        user_email: user?.email || "unknown@studio.com",
        user_role: user?.role || "TEAM_MEMBER"
      };
    });
  },
  async isUserAssignedToEvent(eventId, userId) {
    return memoryDb.eventMembers.some((m) => m.event_id === eventId && m.user_id === userId);
  },
  async addEventMember(eventId, userId) {
    const existing = memoryDb.eventMembers.find(
      (m) => m.event_id === eventId && m.user_id === userId
    );
    if (existing) {
      const user2 = memoryDb.profiles.find((p) => p.id === userId);
      return {
        ...existing,
        user_name: user2?.name,
        user_email: user2?.email,
        user_role: user2?.role
      };
    }
    const newMember = {
      id: crypto.randomUUID(),
      event_id: eventId,
      user_id: userId,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    memoryDb.eventMembers.push(newMember);
    const user = memoryDb.profiles.find((p) => p.id === userId);
    return {
      ...newMember,
      user_name: user?.name,
      user_email: user?.email,
      user_role: user?.role
    };
  },
  async removeEventMember(eventId, userId) {
    memoryDb.eventMembers = memoryDb.eventMembers.filter(
      (m) => !(m.event_id === eventId && m.user_id === userId)
    );
  },
  // Photos
  async getPhotosForEvent(eventId, uploaderId) {
    let photos = memoryDb.photos.filter((p) => p.event_id === eventId);
    if (uploaderId) {
      photos = photos.filter((p) => p.uploaded_by === uploaderId);
    }
    return photos.map((p) => {
      const uploader = memoryDb.profiles.find((u) => u.id === p.uploaded_by);
      return {
        ...p,
        uploader_name: uploader?.name || "Photographer"
      };
    });
  },
  async getPhotoById(photoId) {
    const photo = memoryDb.photos.find((p) => p.id === photoId);
    if (!photo) return null;
    const uploader = memoryDb.profiles.find((u) => u.id === photo.uploaded_by);
    return {
      ...photo,
      uploader_name: uploader?.name || "Photographer"
    };
  },
  async createPhoto(data) {
    const newPhoto = {
      id: crypto.randomUUID(),
      event_id: data.event_id,
      uploaded_by: data.uploaded_by,
      filename: data.filename,
      storage_path: data.storage_path,
      file_size: data.file_size,
      mime_type: data.mime_type,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      is_selected: data.is_selected ?? false
    };
    memoryDb.photos.unshift(newPhoto);
    const uploader = memoryDb.profiles.find((u) => u.id === newPhoto.uploaded_by);
    return {
      ...newPhoto,
      uploader_name: uploader?.name || "Photographer"
    };
  },
  async deletePhoto(photoId) {
    memoryDb.photos = memoryDb.photos.filter((p) => p.id !== photoId);
    memoryDb.galleryPhotos = memoryDb.galleryPhotos.filter((gp) => gp.photo_id !== photoId);
  },
  async updatePhoto(photoId, data) {
    const index = memoryDb.photos.findIndex((p) => p.id === photoId);
    if (index === -1) return null;
    const updated = {
      ...memoryDb.photos[index],
      ...data
    };
    memoryDb.photos[index] = updated;
    return updated;
  },
  // Galleries
  async getGalleryForEvent(eventId) {
    const gallery = memoryDb.galleries.find((g) => g.event_id === eventId);
    if (!gallery) return null;
    const secretHash = memoryDb.gallerySecrets.get(gallery.id) || "";
    return {
      ...gallery,
      pin_hash: secretHash
    };
  },
  async getGalleryByEventId(eventId) {
    return this.getGalleryForEvent(eventId);
  },
  async getGalleryBySlug(slug) {
    const gallery = memoryDb.galleries.find((g) => g.slug === slug);
    if (!gallery) return null;
    const event = memoryDb.events.find((e) => e.id === gallery.event_id);
    const secretHash = memoryDb.gallerySecrets.get(gallery.id) || "";
    return {
      ...gallery,
      pin_hash: secretHash,
      event_name: event?.name
    };
  },
  async getGalleryById(id) {
    const gallery = memoryDb.galleries.find((g) => g.id === id);
    if (!gallery) return null;
    const secretHash = memoryDb.gallerySecrets.get(gallery.id) || "";
    return {
      ...gallery,
      pin_hash: secretHash
    };
  },
  async getGalleryPinHash(galleryId) {
    return memoryDb.gallerySecrets.get(galleryId) || null;
  },
  async getGalleriesForAdmin(adminUserId) {
    let galleries = [...memoryDb.galleries];
    if (adminUserId) {
      galleries = galleries.filter((g) => g.created_by === adminUserId);
    }
    return galleries.map((g) => {
      const event = memoryDb.events.find((e) => e.id === g.event_id);
      const secretHash = memoryDb.gallerySecrets.get(g.id) || "";
      return {
        ...g,
        pin_hash: secretHash,
        event_name: event?.name
      };
    });
  },
  async getAllGalleries(adminUserId) {
    return this.getGalleriesForAdmin(adminUserId);
  },
  async createGallery(data, selectedPhotoIdsArg = []) {
    const id = crypto.randomUUID();
    const status = data.status || "DRAFT";
    const newGallery = {
      id,
      event_id: data.event_id,
      created_by: data.created_by,
      slug: data.slug,
      pin_hash: data.pin_hash,
      status,
      published_at: status === "PUBLISHED" ? (/* @__PURE__ */ new Date()).toISOString() : null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    memoryDb.galleries.unshift(newGallery);
    memoryDb.gallerySecrets.set(id, data.pin_hash);
    const photoIds = data.selected_photo_ids || data.selectedPhotoIds || selectedPhotoIdsArg || [];
    if (photoIds.length > 0) {
      for (const photoId of photoIds) {
        memoryDb.galleryPhotos.push({
          id: crypto.randomUUID(),
          gallery_id: id,
          photo_id: photoId,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    return newGallery;
  },
  async updateGallery(id, data) {
    const index = memoryDb.galleries.findIndex((g) => g.id === id);
    if (index === -1) return null;
    const existing = memoryDb.galleries[index];
    const isPublishing = data.status === "PUBLISHED" && existing.status !== "PUBLISHED";
    const updated = {
      ...existing,
      ...data,
      published_at: isPublishing ? (/* @__PURE__ */ new Date()).toISOString() : data.status === "DRAFT" ? null : existing.published_at,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    memoryDb.galleries[index] = updated;
    if (data.pin_hash) {
      memoryDb.gallerySecrets.set(id, data.pin_hash);
    }
    const photoIds = data.selectedPhotoIds || data.selected_photo_ids;
    if (photoIds !== void 0) {
      memoryDb.galleryPhotos = memoryDb.galleryPhotos.filter((gp) => gp.gallery_id !== id);
      for (const photoId of photoIds) {
        memoryDb.galleryPhotos.push({
          id: crypto.randomUUID(),
          gallery_id: id,
          photo_id: photoId,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    const secretHash = memoryDb.gallerySecrets.get(id) || "";
    return {
      ...updated,
      pin_hash: secretHash
    };
  },
  async deleteGallery(id) {
    memoryDb.galleries = memoryDb.galleries.filter((g) => g.id !== id);
    memoryDb.galleryPhotos = memoryDb.galleryPhotos.filter((gp) => gp.gallery_id !== id);
    memoryDb.gallerySecrets.delete(id);
  },
  async getPublishedGalleryPhotos(galleryId) {
    const photoIds = new Set(
      memoryDb.galleryPhotos.filter((gp) => gp.gallery_id === galleryId).map((gp) => gp.photo_id)
    );
    return memoryDb.photos.filter((p) => photoIds.has(p.id));
  },
  async getSelectedPhotoIdsForGallery(galleryId) {
    return memoryDb.galleryPhotos.filter((gp) => gp.gallery_id === galleryId).map((gp) => gp.photo_id);
  },
  async getDashboardStats(adminUserId) {
    const events = adminUserId ? memoryDb.events.filter((e) => e.created_by === adminUserId) : memoryDb.events;
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
      totalTeamMembers
    };
  }
};

// server/auth.ts
import bcrypt2 from "bcryptjs";
import jwt from "jsonwebtoken";

// server/firebaseAdmin.ts
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
var adminApp = null;
function getFirebaseAdminApp() {
  if (adminApp) return adminApp;
  try {
    let projectId = process.env.FIREBASE_PROJECT_ID;
    let storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    const candidatePaths = [
      path.resolve(process.cwd(), "firebase-applet-config.json"),
      path.resolve(process.cwd(), "dist", "firebase-applet-config.json"),
      path.resolve("/tmp", "firebase-applet-config.json")
    ];
    for (const configPath of candidatePaths) {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          projectId = projectId || config.projectId;
          storageBucket = storageBucket || config.storageBucket;
          break;
        } catch {
        }
      }
    }
    if (!projectId) {
      projectId = "gen-lang-client-0384551552";
    }
    if (!storageBucket) {
      storageBucket = "gen-lang-client-0384551552.firebasestorage.app";
    }
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
      return adminApp;
    }
    let credentialOption = void 0;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credentialOption = cert(sa);
      } catch (e) {
        console.warn("[Firebase Admin] Could not parse FIREBASE_SERVICE_ACCOUNT_KEY JSON");
      }
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credentialOption = cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      });
    }
    const initOptions = {
      projectId,
      storageBucket
    };
    if (credentialOption) {
      initOptions.credential = credentialOption;
    }
    adminApp = initializeApp(initOptions);
    return adminApp;
  } catch (err) {
    console.warn("[Firebase Admin] Initialization notice:", err.message);
    return null;
  }
}
async function syncFirebaseUserRole(authUserId, email, role) {
  const app2 = getFirebaseAdminApp();
  if (!app2) return;
  try {
    const auth = getAuth(app2);
    try {
      await auth.setCustomUserClaims(authUserId, {
        role,
        admin: role === "ADMIN"
      });
    } catch {
    }
    try {
      const firestore = getFirestore(app2);
      const userRef = firestore.collection("users").doc(authUserId);
      await userRef.set(
        {
          role,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        },
        { merge: true }
      );
      const adminRef = firestore.collection("admins").doc(authUserId);
      if (role === "ADMIN") {
        await adminRef.set({
          uid: authUserId,
          email,
          assigned_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        await adminRef.delete();
      }
    } catch {
    }
  } catch (err) {
    console.warn("[Firebase Role Sync] Notice:", err.message);
  }
}

// server/auth.ts
import { getAuth as getAuth2 } from "firebase-admin/auth";
var JWT_SECRET = process.env.JWT_SECRET || "photo-platform-jwt-secret-internship-2026";
var PIN_SALT_ROUNDS = 10;
var PASSWORD_SALT_ROUNDS = 10;
async function hashPassword(plainText) {
  return bcrypt2.hash(plainText, PASSWORD_SALT_ROUNDS);
}
async function hashPin(pin) {
  return bcrypt2.hash(pin.trim(), PIN_SALT_ROUNDS);
}
async function verifyPin(pin, hashedPin) {
  return bcrypt2.compare(pin.trim(), hashedPin);
}
function generateUserToken(user) {
  const payload = {
    userId: user.id,
    authUserId: user.auth_user_id,
    email: user.email,
    name: user.name,
    role: user.role
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function verifyUserToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function generateGalleryAccessToken(galleryId, slug) {
  const payload = {
    galleryId,
    slug,
    type: "CUSTOMER_GALLERY_SESSION"
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Missing or invalid Bearer token." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.userId) {
      req.user = decoded;
      return next();
    }
  } catch {
  }
  try {
    const adminApp2 = getFirebaseAdminApp();
    if (adminApp2) {
      const adminAuth = getAuth2(adminApp2);
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
            role: decodedFirebase.role || profile.role
          };
          return next();
        }
      }
    }
  } catch {
  }
  return res.status(401).json({ error: "Session expired or token invalid. Please log in again." });
}
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden. Admin privileges required." });
  }
  next();
}
function verifyCustomerGallerySession(req, res, next) {
  const token = req.headers["x-gallery-token"] || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null) || req.query.galleryToken;
  if (!token) {
    return res.status(401).json({ error: "Gallery PIN verification required to access this gallery." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "CUSTOMER_GALLERY_SESSION") {
      return res.status(403).json({ error: "Invalid gallery access token" });
    }
    const routeSlug = req.params.slug;
    if (routeSlug && decoded.slug !== routeSlug) {
      return res.status(403).json({ error: "Access token does not match requested gallery" });
    }
    req.customerGallery = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Gallery session has expired. Please re-enter the PIN." });
  }
}

// server/storage.ts
import fs2 from "fs";
import path2 from "path";
import crypto2 from "crypto";
import { getStorage } from "firebase-admin/storage";
var LOCAL_STORAGE_DIR = process.env.VERCEL ? path2.join("/tmp", "uploads") : path2.join(process.cwd(), "uploads");
try {
  if (!fs2.existsSync(LOCAL_STORAGE_DIR)) {
    fs2.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
} catch {
}
var ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var JWT_SECRET2 = process.env.JWT_SECRET || "photo-platform-jwt-secret-internship-2026";
function getBucket() {
  const app2 = getFirebaseAdminApp();
  if (!app2) return null;
  try {
    return getStorage(app2).bucket();
  } catch {
    return null;
  }
}
function sanitizeFilename(originalName) {
  const clean = path2.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return clean.slice(0, 100);
}
function isValidStoragePath(storagePath) {
  if (!storagePath || typeof storagePath !== "string") return false;
  const regex = /^events\/[a-zA-Z0-9_-]+\/photos\/[a-zA-Z0-9._-]+$/;
  return regex.test(storagePath);
}
function generatePhotoStreamSignature(storagePath, exp) {
  return crypto2.createHmac("sha256", JWT_SECRET2).update(`${storagePath}:${exp}`).digest("hex");
}
function verifyPhotoStreamSignature(storagePath, exp, sig) {
  if (!sig || !exp || typeof exp !== "number") return false;
  const expMs = exp < 1e10 ? exp * 1e3 : exp;
  if (Date.now() > expMs) return false;
  const expected = generatePhotoStreamSignature(storagePath, exp);
  try {
    return crypto2.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}
function generateStoragePath(eventId, originalFilename) {
  const safeName = sanitizeFilename(originalFilename);
  const uuid = crypto2.randomUUID();
  return `events/${eventId}/photos/${uuid}-${safeName}`;
}
async function uploadFileToStorage(storagePath, buffer, mimeType) {
  if (!isValidStoragePath(storagePath)) {
    throw new Error("Invalid storage path format.");
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
            uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      });
      uploadedToFirebase = true;
    } catch (err) {
      console.warn("[Firebase Storage] Bucket upload note:", err.message);
    }
  }
  const resolvedBase = path2.resolve(LOCAL_STORAGE_DIR);
  const fullLocalPath = path2.resolve(LOCAL_STORAGE_DIR, storagePath);
  if (!fullLocalPath.startsWith(resolvedBase + path2.sep)) {
    throw new Error("Security error: Path traversal detected.");
  }
  const parentDir = path2.dirname(fullLocalPath);
  if (!fs2.existsSync(parentDir)) {
    fs2.mkdirSync(parentDir, { recursive: true });
  }
  fs2.writeFileSync(fullLocalPath, buffer);
  return { storagePath };
}
async function deleteFileFromStorage(storagePath) {
  if (!isValidStoragePath(storagePath)) return;
  const bucket = getBucket();
  if (bucket) {
    try {
      await bucket.file(storagePath).delete({ ignoreNotFound: true });
    } catch (err) {
      console.warn("[Firebase Storage] Delete note:", err.message);
    }
  }
  try {
    const resolvedBase = path2.resolve(LOCAL_STORAGE_DIR);
    const fullLocalPath = path2.resolve(LOCAL_STORAGE_DIR, storagePath);
    if (fullLocalPath.startsWith(resolvedBase + path2.sep) && fs2.existsSync(fullLocalPath)) {
      fs2.unlinkSync(fullLocalPath);
    }
  } catch (err) {
    console.warn("Error deleting local file:", err.message);
  }
}
async function getSignedPhotoUrl(storagePath, expiresInSeconds = 7200) {
  const bucket = getBucket();
  if (bucket) {
    try {
      const file = bucket.file(storagePath);
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + expiresInSeconds * 1e3
      });
      if (signedUrl) return signedUrl;
    } catch {
    }
  }
  const exp = Date.now() + expiresInSeconds * 1e3;
  const sig = generatePhotoStreamSignature(storagePath, exp);
  return `/api/photos/stream?path=${encodeURIComponent(storagePath)}&exp=${exp}&sig=${sig}`;
}
function getLocalFilePath(storagePath) {
  if (!isValidStoragePath(storagePath)) {
    return null;
  }
  const resolvedBase = path2.resolve(LOCAL_STORAGE_DIR);
  const fullLocalPath = path2.resolve(LOCAL_STORAGE_DIR, storagePath);
  if (!fullLocalPath.startsWith(resolvedBase + path2.sep)) {
    return null;
  }
  if (fs2.existsSync(fullLocalPath)) {
    return fullLocalPath;
  }
  return null;
}

// server/routes.ts
var router = express.Router();
var JWT_SECRET3 = process.env.JWT_SECRET || "photo-platform-jwt-secret-internship-2026";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 20
    // Max 20 photos per batch upload
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP`));
    }
  }
});
var handleUpload = (req, res, next) => {
  upload.array("photos", 20)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File exceeds 10MB limit." });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || "File upload validation failed." });
    }
    next();
  });
};
var pinAttemptStore = /* @__PURE__ */ new Map();
function checkPinRateLimit(slug, ip) {
  const key = `${slug}:${ip}`;
  const now = Date.now();
  const entry = pinAttemptStore.get(key);
  if (!entry) {
    return { allowed: true };
  }
  if (entry.lockUntil > now) {
    const waitSeconds = Math.ceil((entry.lockUntil - now) / 1e3);
    return { allowed: false, waitSeconds };
  }
  if (entry.lockUntil <= now && entry.lockUntil > 0) {
    pinAttemptStore.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}
function recordFailedPinAttempt(slug, ip) {
  const key = `${slug}:${ip}`;
  const now = Date.now();
  const entry = pinAttemptStore.get(key) || { attempts: 0, lockUntil: 0 };
  entry.attempts += 1;
  if (entry.attempts >= 5) {
    entry.lockUntil = now + 15 * 60 * 1e3;
  }
  pinAttemptStore.set(key, entry);
}
function resetPinAttempts(slug, ip) {
  pinAttemptStore.delete(`${slug}:${ip}`);
}
async function validatePhotosBelongToEvent(photoIds, eventId) {
  if (!photoIds || photoIds.length === 0) return true;
  const eventPhotos = await db.getPhotosForEvent(eventId);
  const eventPhotoIds = new Set(eventPhotos.map((p) => p.id));
  return photoIds.every((id) => eventPhotoIds.has(id));
}
var RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().optional()
});
router.post("/auth/register", async (req, res) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { name, email, password, role: requestedRole } = parsed.data;
    const existing = await db.findProfileByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    let isCallerAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token2 = authHeader.split(" ")[1];
      const decoded = verifyUserToken(token2);
      if (decoded && decoded.role === "ADMIN") {
        isCallerAdmin = true;
      }
    }
    const trustedSetupKey = process.env.ADMIN_SETUP_KEY || "trusted-photoplatform-setup-secret";
    const providedSetupKey = req.headers["x-admin-setup-key"];
    const hasTrustedSetupKey = typeof providedSetupKey === "string" && providedSetupKey === trustedSetupKey;
    const isTrustedServerOperation = isCallerAdmin || hasTrustedSetupKey;
    if (requestedRole === "ADMIN" && !isTrustedServerOperation) {
      return res.status(403).json({
        error: "Privilege escalation rejected: The Admin role cannot be self-assigned via public registration."
      });
    }
    const assignedRole = isTrustedServerOperation && requestedRole === "ADMIN" ? "ADMIN" : "TEAM_MEMBER";
    const passwordHash = await hashPassword(password);
    const profile = await db.createProfile({
      name,
      email,
      role: assignedRole,
      passwordHash
    });
    await syncFirebaseUserRole(profile.auth_user_id, profile.email, profile.role);
    const token = generateUserToken(profile);
    return res.status(201).json({
      token,
      user: profile,
      message: "Registration successful"
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
var LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});
router.post("/auth/login", async (req, res) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;
    const user = await db.verifyUserCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (user.auth_user_id) {
      syncFirebaseUserRole(user.auth_user_id, user.email, user.role).catch((err) => {
        console.warn("[Login Firebase Sync] Non-fatal notification:", err?.message);
      });
    }
    const token = generateUserToken(user);
    return res.json({
      token,
      user,
      message: "Logged in successfully"
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
var FirebaseLoginSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional()
});
router.post("/auth/firebase-login", async (req, res) => {
  try {
    const parsed = FirebaseLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { uid, email, name } = parsed.data;
    let user = await db.findProfileByEmail(email);
    if (!user) {
      const isBootstrapAdmin = email.toLowerCase() === "admin@photoplatform.com" || process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
      const assignedRole = isBootstrapAdmin ? "ADMIN" : "TEAM_MEMBER";
      user = await db.createProfile({
        auth_user_id: uid,
        name: name || email.split("@")[0],
        email,
        role: assignedRole,
        passwordHash: ""
      });
      await syncFirebaseUserRole(uid, email, assignedRole);
    }
    const token = generateUserToken(user);
    return res.json({
      token,
      user,
      message: "Logged in successfully via Firebase Auth"
    });
  } catch (err) {
    console.error("Firebase login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/auth/me", authenticateUser, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const profile = await db.findProfileById(req.user.userId);
  if (!profile) return res.status(404).json({ error: "User profile not found" });
  return res.json({ user: profile });
});
router.get("/users", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const profiles = await db.getAllProfiles();
    return res.json({ users: profiles });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var AdminCreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6).optional().default("TempPass123!"),
  role: z.enum(["ADMIN", "TEAM_MEMBER"]).default("TEAM_MEMBER")
});
router.post("/admin/users", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const parsed = AdminCreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { name, email, password, role } = parsed.data;
    const existing = await db.findProfileByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "A user with this email already exists." });
    }
    const passwordHash = await hashPassword(password);
    const profile = await db.createProfile({
      name,
      email,
      role,
      passwordHash
    });
    await syncFirebaseUserRole(profile.auth_user_id, profile.email, profile.role);
    return res.status(201).json({
      user: profile,
      message: `${role === "ADMIN" ? "Admin" : "Team Member"} account created successfully.`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to create user" });
  }
});
var AssignRoleSchema = z.object({
  role: z.enum(["ADMIN", "TEAM_MEMBER"])
});
var handleAssignRole = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = AssignRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { role } = parsed.data;
    const targetUser = await db.findProfileById(id);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user profile not found" });
    }
    const updatedProfile = await db.updateUserRole(id, role);
    if (!updatedProfile) {
      return res.status(500).json({ error: "Failed to update user role" });
    }
    await syncFirebaseUserRole(updatedProfile.auth_user_id, updatedProfile.email, role);
    return res.json({
      user: updatedProfile,
      message: `User role successfully updated to ${role}.`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to assign role" });
  }
};
router.post("/admin/users/:id/role", authenticateUser, requireAdmin, handleAssignRole);
router.put("/admin/users/:id/role", authenticateUser, requireAdmin, handleAssignRole);
var AdminInviteSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "TEAM_MEMBER"]).default("TEAM_MEMBER"),
  eventId: z.string().optional()
});
router.post("/admin/invite", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const parsed = AdminInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { name, email, role, eventId } = parsed.data;
    let user = await db.findProfileByEmail(email);
    if (!user) {
      const defaultHash = await hashPassword("InvitedMember123!");
      user = await db.createProfile({
        name,
        email,
        role,
        passwordHash: defaultHash
      });
      await syncFirebaseUserRole(user.auth_user_id, user.email, role);
    }
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
      message: `Team member ${user.name} invited and approved successfully.`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to process invite" });
  }
});
var CreateEventSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters").max(200),
  description: z.string().optional().default("")
});
router.get("/events", authenticateUser, async (req, res) => {
  try {
    const events = await db.getEventsForUser(req.user.userId, req.user.role);
    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post("/events", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const parsed = CreateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const newEvent = await db.createEvent({
      name: parsed.data.name,
      description: parsed.data.description,
      created_by: req.user.userId
    });
    return res.status(201).json({ event: newEvent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get("/events/:id", authenticateUser, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (req.user.role === "ADMIN") {
      if (event.created_by !== req.user.userId) {
        return res.status(403).json({ error: "Forbidden. You do not own this event." });
      }
    } else {
      const isAssigned = await db.isUserAssignedToEvent(eventId, req.user.userId);
      if (!isAssigned) {
        return res.status(403).json({ error: "Forbidden. You are not assigned to this event." });
      }
    }
    return res.json({ event });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.patch("/events/:id", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.created_by !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }
    const updated = await db.updateEvent(req.params.id, req.body);
    return res.json({ event: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.delete("/events/:id", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.created_by !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }
    await db.deleteEvent(req.params.id);
    return res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get("/events/:id/members", authenticateUser, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (req.user.role === "ADMIN") {
      if (event.created_by !== req.user.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else {
      const isAssigned = await db.isUserAssignedToEvent(eventId, req.user.userId);
      if (!isAssigned) return res.status(403).json({ error: "Forbidden" });
    }
    const members = await db.getEventMembers(eventId);
    return res.json({ members });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post("/events/:id/members", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.created_by !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }
    const targetUser = await db.findProfileById(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    const member = await db.addEventMember(eventId, userId);
    return res.status(201).json({ member });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});
router.delete("/events/:id/members/:userId", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id: eventId, userId } = req.params;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.created_by !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }
    await db.removeEventMember(eventId, userId);
    return res.json({ success: true, message: "Member removed from event" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post(
  "/events/:id/photos",
  authenticateUser,
  handleUpload,
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const event = await db.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (req.user.role === "ADMIN") {
        if (event.created_by !== req.user.userId) {
          return res.status(403).json({ error: "Forbidden. You do not own this event." });
        }
      } else {
        const isAssigned = await db.isUserAssignedToEvent(eventId, req.user.userId);
        if (!isAssigned) {
          return res.status(403).json({ error: "Forbidden. You are not assigned to this event." });
        }
      }
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No photo files were provided." });
      }
      const uploadedPhotos = [];
      const uploadErrors = [];
      for (const file of files) {
        try {
          if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            uploadErrors.push(`${file.originalname}: Unsupported file type (${file.mimetype}).`);
            continue;
          }
          if (file.size > MAX_FILE_SIZE) {
            uploadErrors.push(`${file.originalname}: Exceeds 10MB limit.`);
            continue;
          }
          const storagePath = generateStoragePath(eventId, file.originalname);
          await uploadFileToStorage(storagePath, file.buffer, file.mimetype);
          const photoRecord = await db.createPhoto({
            event_id: eventId,
            uploaded_by: req.user.userId,
            filename: file.originalname,
            storage_path: storagePath,
            file_size: file.size,
            mime_type: file.mimetype
          });
          uploadedPhotos.push(photoRecord);
        } catch (fileErr) {
          uploadErrors.push(`${file.originalname}: ${fileErr.message || "Storage error"}`);
        }
      }
      if (uploadedPhotos.length === 0 && uploadErrors.length > 0) {
        return res.status(400).json({ error: `Upload failed: ${uploadErrors.join(" ")}` });
      }
      return res.status(201).json({
        message: `Successfully uploaded ${uploadedPhotos.length} photo(s).` + (uploadErrors.length ? ` (${uploadErrors.length} file(s) failed)` : ""),
        photos: uploadedPhotos,
        errors: uploadErrors.length > 0 ? uploadErrors : void 0
      });
    } catch (err) {
      console.error("Photo upload error:", err);
      return res.status(500).json({ error: err.message || "Photo upload failed." });
    }
  }
);
router.get("/events/:id/photos", authenticateUser, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    let uploaderFilter = void 0;
    if (req.user.role === "ADMIN") {
      if (event.created_by !== req.user.userId) {
        return res.status(403).json({ error: "Forbidden. You do not own this event." });
      }
      if (req.query.uploaderId) {
        uploaderFilter = req.query.uploaderId;
      }
    } else {
      const isAssigned = await db.isUserAssignedToEvent(eventId, req.user.userId);
      if (!isAssigned) {
        return res.status(403).json({ error: "Forbidden. You are not assigned to this event." });
      }
      uploaderFilter = req.user.userId;
    }
    const rawPhotos = await db.getPhotosForEvent(eventId, uploaderFilter);
    const gallery = await db.getGalleryByEventId(eventId);
    const selectedPhotoIds = gallery ? new Set(await db.getSelectedPhotoIdsForGallery(gallery.id)) : /* @__PURE__ */ new Set();
    const photos = await Promise.all(
      rawPhotos.map(async (p) => ({
        ...p,
        is_selected: selectedPhotoIds.has(p.id),
        url: await getSignedPhotoUrl(p.storage_path)
      }))
    );
    return res.json({ photos });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.delete("/photos/:id", authenticateUser, async (req, res) => {
  try {
    const photoId = req.params.id;
    const photo = await db.getPhotoById(photoId);
    if (!photo) return res.status(404).json({ error: "Photo not found" });
    const event = await db.getEventById(photo.event_id);
    if (!event) return res.status(404).json({ error: "Associated event not found" });
    if (req.user.role === "ADMIN") {
      if (event.created_by !== req.user.userId) {
        return res.status(403).json({ error: "Forbidden. You do not own this event." });
      }
    } else {
      if (photo.uploaded_by !== req.user.userId) {
        return res.status(403).json({ error: "Forbidden. Team members cannot delete other users photos." });
      }
      const isAssigned = await db.isUserAssignedToEvent(photo.event_id, req.user.userId);
      if (!isAssigned) {
        return res.status(403).json({ error: "Forbidden. You are not assigned to this event." });
      }
    }
    await deleteFileFromStorage(photo.storage_path);
    await db.deletePhoto(photoId);
    return res.json({ success: true, message: "Photo deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get("/photos/stream", async (req, res) => {
  try {
    const storagePath = req.query.path;
    const exp = req.query.exp ? parseInt(req.query.exp, 10) : 0;
    const sig = req.query.sig;
    if (!storagePath) return res.status(400).send("Missing path parameter");
    if (!isValidStoragePath(storagePath)) {
      return res.status(400).send("Invalid storage path format");
    }
    const isSigned = sig && exp && verifyPhotoStreamSignature(storagePath, exp, sig);
    if (!isSigned) {
      const authHeader = req.headers.authorization;
      const galleryToken = req.headers["x-gallery-token"] || req.query.galleryToken;
      let isAuthorized = false;
      if (galleryToken) {
        try {
          const decoded = jwt2.verify(galleryToken, JWT_SECRET3);
          if (decoded.type === "CUSTOMER_GALLERY_SESSION") {
            const galleryPhotos = await db.getPublishedGalleryPhotos(decoded.galleryId);
            if (galleryPhotos.some((p) => p.storage_path === storagePath)) {
              isAuthorized = true;
            }
          }
        } catch {
        }
      }
      if (!isAuthorized && authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          const decoded = jwt2.verify(token, JWT_SECRET3);
          const photoEventId = storagePath.split("/")[1];
          if (decoded.role === "ADMIN") {
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
        }
      }
      if (!isAuthorized) {
        return res.status(403).send("Forbidden: Invalid or expired photo access signature.");
      }
    }
    const localPath = getLocalFilePath(storagePath);
    if (localPath && fs3.existsSync(localPath)) {
      const ext = path3.extname(localPath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      return res.sendFile(localPath);
    }
    const filename = storagePath.split("/").pop() || "photo.jpg";
    const svg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="24">Event Photography Asset</text>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="16">${filename}</text>
      </svg>
    `;
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(svg);
  } catch (err) {
    return res.status(500).send("Error streaming photo");
  }
});
var CreateGallerySchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  slug: z.string().min(3).regex(/^[a-z0-9-_]+$/, "Slug must only contain lowercase letters, numbers, hyphens and underscores"),
  pin: z.string().min(4, "PIN must be at least 4 characters").max(12),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  selectedPhotoIds: z.array(z.string()).default([])
});
router.get("/events/:id/gallery", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.created_by !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const gallery = await db.getGalleryByEventId(eventId);
    if (!gallery) {
      return res.json({ gallery: null, selectedPhotoIds: [] });
    }
    const selectedPhotoIds = await db.getSelectedPhotoIdsForGallery(gallery.id);
    const { pin_hash, ...safeGallery } = gallery;
    return res.json({ gallery: safeGallery, selectedPhotoIds });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post("/galleries", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const parsed = CreateGallerySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { eventId, slug, pin, status, selectedPhotoIds } = parsed.data;
    const event = await db.getEventById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.created_by !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }
    if (selectedPhotoIds && selectedPhotoIds.length > 0) {
      const allBelong = await validatePhotosBelongToEvent(selectedPhotoIds, eventId);
      if (!allBelong) {
        return res.status(400).json({ error: "All selected photos must belong to this event." });
      }
    }
    const existingSlug = await db.getGalleryBySlug(slug);
    const existingEventGallery = await db.getGalleryByEventId(eventId);
    if (existingSlug && (!existingEventGallery || existingSlug.id !== existingEventGallery.id)) {
      return res.status(409).json({ error: "This shareable slug is already in use by another gallery." });
    }
    const pinHash = await hashPin(pin);
    let gallery;
    if (existingEventGallery) {
      gallery = await db.updateGallery(existingEventGallery.id, {
        slug,
        pin_hash: pinHash,
        status,
        selected_photo_ids: selectedPhotoIds
      });
    } else {
      gallery = await db.createGallery({
        event_id: eventId,
        created_by: req.user.userId,
        slug,
        pin_hash: pinHash,
        status,
        selected_photo_ids: selectedPhotoIds
      });
    }
    const { pin_hash, ...safeGallery } = gallery;
    return res.status(201).json({ gallery: safeGallery, selectedPhotoIds });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.patch("/galleries/:id", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const galleryId = req.params.id;
    const existingGallery = await db.getGalleryById(galleryId);
    if (!existingGallery) return res.status(404).json({ error: "Gallery not found" });
    const event = await db.getEventById(existingGallery.event_id);
    if (!event || event.created_by !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this gallery." });
    }
    const { slug, pin, status, selectedPhotoIds } = req.body;
    if (selectedPhotoIds !== void 0 && selectedPhotoIds.length > 0) {
      const allBelong = await validatePhotosBelongToEvent(selectedPhotoIds, existingGallery.event_id);
      if (!allBelong) {
        return res.status(400).json({ error: "All selected photos must belong to this event." });
      }
    }
    const updates = {};
    if (slug) {
      const existingWithSlug = await db.getGalleryBySlug(slug);
      if (existingWithSlug && existingWithSlug.id !== galleryId) {
        return res.status(409).json({ error: "This shareable slug is already in use by another gallery." });
      }
      updates.slug = slug;
    }
    if (pin) updates.pin_hash = await hashPin(pin);
    if (status) updates.status = status;
    if (selectedPhotoIds !== void 0) updates.selected_photo_ids = selectedPhotoIds;
    const gallery = await db.updateGallery(galleryId, updates);
    if (!gallery) return res.status(404).json({ error: "Gallery not found" });
    const { pin_hash, ...safeGallery } = gallery;
    return res.json({ gallery: safeGallery });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post("/galleries/:id/publish", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const galleryId = req.params.id;
    const existingGallery = await db.getGalleryById(galleryId);
    if (!existingGallery) return res.status(404).json({ error: "Gallery not found" });
    const event = await db.getEventById(existingGallery.event_id);
    if (!event || event.created_by !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this gallery." });
    }
    const gallery = await db.updateGallery(galleryId, { status: "PUBLISHED" });
    if (!gallery) return res.status(404).json({ error: "Gallery not found" });
    const { pin_hash, ...safeGallery } = gallery;
    return res.json({
      message: "Gallery published successfully!",
      gallery: safeGallery
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get("/admin/galleries", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const allGalleries = await db.getAllGalleries(req.user.userId);
    const safeGalleries = allGalleries.map(({ pin_hash, ...rest }) => rest);
    return res.json({ galleries: safeGalleries });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get("/admin/dashboard", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const stats = await db.getDashboardStats(req.user.userId);
    return res.json({ stats });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get("/gallery/:slug/info", async (req, res) => {
  try {
    const slug = req.params.slug;
    const gallery = await db.getGalleryBySlug(slug);
    if (!gallery) {
      return res.status(404).json({ error: "Gallery not found or link is invalid." });
    }
    if (gallery.status !== "PUBLISHED") {
      return res.status(403).json({
        error: "This gallery is currently in draft mode and is not yet published by the event lead.",
        isDraft: true
      });
    }
    return res.json({
      gallery: {
        id: gallery.id,
        slug: gallery.slug,
        eventName: gallery.event_name,
        publishedAt: gallery.published_at
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post("/gallery/:slug/verify", async (req, res) => {
  try {
    const slug = req.params.slug;
    const { pin } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || "unknown-ip";
    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ error: "Please enter the gallery PIN." });
    }
    const rateCheck = checkPinRateLimit(slug, clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many incorrect PIN attempts. Please wait ${rateCheck.waitSeconds} seconds before trying again.`
      });
    }
    const gallery = await db.getGalleryBySlug(slug);
    if (!gallery) {
      return res.status(404).json({ error: "Gallery not found." });
    }
    if (gallery.status !== "PUBLISHED") {
      return res.status(403).json({
        error: "This gallery is not published yet. Customers can only view published galleries."
      });
    }
    const isValid = await verifyPin(pin, gallery.pin_hash);
    if (!isValid) {
      recordFailedPinAttempt(slug, clientIp);
      return res.status(401).json({ error: "Incorrect PIN. Please try again." });
    }
    resetPinAttempts(slug, clientIp);
    const galleryToken = generateGalleryAccessToken(gallery.id, gallery.slug);
    return res.json({
      success: true,
      galleryToken,
      gallery: {
        id: gallery.id,
        slug: gallery.slug,
        eventName: gallery.event_name,
        publishedAt: gallery.published_at
      }
    });
  } catch (err) {
    console.error("PIN verification error:", err);
    return res.status(500).json({ error: "An error occurred while verifying the PIN." });
  }
});
router.get(
  "/gallery/:slug/photos",
  verifyCustomerGallerySession,
  async (req, res) => {
    try {
      const slug = req.params.slug;
      const gallery = await db.getGalleryBySlug(slug);
      if (!gallery) {
        return res.status(404).json({ error: "Gallery not found." });
      }
      if (gallery.status !== "PUBLISHED") {
        return res.status(403).json({ error: "Gallery is not published." });
      }
      const rawPhotos = await db.getPublishedGalleryPhotos(gallery.id);
      const photos = await Promise.all(
        rawPhotos.map(async (p) => ({
          id: p.id,
          filename: p.filename,
          file_size: p.file_size,
          created_at: p.created_at,
          url: await getSignedPhotoUrl(p.storage_path)
        }))
      );
      return res.json({
        galleryName: gallery.event_name,
        photoCount: photos.length,
        photos
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);
router.get("/config-status", (req, res) => {
  res.json({
    status: "ok",
    firebaseConfigured: isFirebaseConfigured(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "gen-lang-client-0384551552.firebasestorage.app",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var routes_default = router;

// server/app.ts
function createExpressApp() {
  const app2 = express2();
  app2.use(express2.json({ limit: "15mb" }));
  app2.use(express2.urlencoded({ extended: true, limit: "15mb" }));
  app2.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-gallery-token");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/auth") || req.path.startsWith("/gallery")) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });
  const healthHandler = (_req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      env: process.env.NODE_ENV || "development",
      serverless: Boolean(process.env.VERCEL)
    });
  };
  app2.get("/api/health", healthHandler);
  app2.get("/health", healthHandler);
  app2.use("/api", routes_default);
  app2.use("/", routes_default);
  app2.use("/api/*", (req, res) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`
    });
  });
  app2.use((err, _req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error("[API Error]", err);
    const status = typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      error: err.message || "Internal Server Error"
    });
  });
  return app2;
}
var app = createExpressApp();
var app_default = app;
export {
  app,
  createExpressApp,
  app_default as default
};
