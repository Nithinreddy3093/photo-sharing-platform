# Photo Sharing Platform — Collaborative Event Photography

> **TrizenAI Full Stack Internship Challenge Submission**  
> Comprehensive Documentation:  
> • [Submission Checklist & Evaluation Matrix (`SUBMISSION_CHECKLIST.md`)](./SUBMISSION_CHECKLIST.md)  
> • [System Architecture & Security Specification (`ARCHITECTURE.md`)](./ARCHITECTURE.md)  
> • [Firebase Security Rules (`firestore.rules` and `storage.rules`)](./firestore.rules)

A full-stack, production-ready web application designed for professional photography teams and event studios. Built with React 18, TypeScript, Tailwind CSS, an Express-powered API layer, and **Firebase as the single unified backend** (Firebase Authentication, Cloud Firestore, and Firebase Storage).

---

## 1. System Architecture

```
                                    +-----------------------+
                                    |    Client Browsers    |
                                    +-----------+-----------+
                                                |
                 +------------------------------+-------------------------------+
                 |                              |                               |
                 v                              v                               v
        +------------------+          +-------------------+          +---------------------+
        |   Lead Admin     |          |   Team Member     |          |      Customer       |
        |   (Dashboard,    |          |   (Photographer   |          |  (URL + PIN Portal, |
        | Curation, Links) |          |   Upload Studio)  |          | Curated Collection) |
        +--------+---------+          +---------+---------+          +----------+----------+
                 |                              |                               |
                 +------------------------------+-------------------------------+
                                                | HTTP / REST + JWT
                                                v
                               +---------------------------------+
                               |    Express API & Middleware     |
                               |  - Role Authentication (JWT)    |
                               |  - Rate Limiter (PIN Brute-Force|
                               |  - Multipart File Sanitizer     |
                               |  - PIN Verifier (bcrypt)        |
                               +----------------+----------------+
                                                |
                      +-------------------------+-------------------------+
                      |                                                   |
                      v                                                   v
        +---------------------------+                       +---------------------------+
        |   Cloud Firestore         |                       |     Firebase Storage      |
        |  - users / admins         |                       |  - Private bucket         |
        |  - events & members       |                       |    (events/{id}/photos)   |
        |  - photos & metadata      |                       |  - Short-lived signed     |
        |  - galleries (no PIN hash)|                       |    URLs for security      |
        |  - gallery_secrets (hash) |                       |  - storage.rules guarded  |
        |  - firestore.rules        |                       +---------------------------+
        +---------------------------+
```

---

## 2. Core Workflows & Role Boundaries

### 1. Admin / Lead
- **Event Creation**: Creates events with titles and descriptions.
- **Team Assignment**: Adds registered photographers to specific events.
- **Full Review**: Views all uploaded photographs across the event team, with per-photographer filtering.
- **Curation**: Toggles inclusion checkboxes to select exact photos for the client gallery.
- **PIN Configuration**: Sets or regenerates a numerical access PIN (hashed via bcrypt; never stored in plaintext and never stored in the public gallery document).
- **Publishing & Delivery**: Generates a shareable URL slug (e.g., `/gallery/summer-gala-2026-vip`) and activates public customer access.

### 2. Team Member (Photographer)
- **Isolation**: Access is strictly limited to assigned events; unassigned events are inaccessible.
- **Batch Upload**: Multi-file drag & drop and selector supporting JPG, PNG, and WEBP up to 10MB each.
- **Scoped Visibility**: Can only view and manage their own uploaded photographs.
- **Restricted Access**: Cannot publish customer galleries, alter PINs, or view unassigned projects.

### 3. Customer
- **Zero Sign-Up**: No account or password required.
- **PIN-Protected Access**: Accesses the gallery via unique slug and enters the access PIN.
- **Brute-Force Guard**: IP and session rate-limiting prevents PIN enumeration (max 5 failed attempts per window).
- **Curated Delivery**: Only sees photographs explicitly selected and published by the Admin.
- **Secure Image Viewer**: Fullscreen lightbox viewer with photo metadata and high-resolution downloads.

---

## 3. Database Schema & Security Rules

The application uses **Cloud Firestore** as its single, unified database:

```
users/{userId}
  - id: string
  - auth_user_id: string
  - name: string
  - email: string
  - role: "ADMIN" | "TEAM_MEMBER"
  - created_at: string

admins/{userId}
  - uid: string
  - email: string

events/{eventId}
  - id: string
  - name: string
  - description: string
  - created_by: string (Admin user ID)
  - created_at: string
  - updated_at: string

events/{eventId}/members/{memberId}
  - id: string
  - event_id: string
  - user_id: string
  - created_at: string

photos/{photoId}
  - id: string
  - event_id: string
  - uploaded_by: string
  - filename: string
  - storage_path: string
  - file_size: number
  - mime_type: string
  - created_at: string
  - is_selected: boolean

galleries/{galleryId} (Public Document — NEVER contains PIN or PIN hash)
  - id: string
  - event_id: string
  - created_by: string
  - slug: string
  - status: "DRAFT" | "PUBLISHED"
  - published_at: string | null
  - created_at: string
  - updated_at: string

gallery_secrets/{galleryId} (Privileged Document — Admin / Server Only)
  - id: string
  - pin_hash: string (bcrypt hash)
  - created_at: string

galleries/{galleryId}/photos/{photoId}
  - id: string
  - gallery_id: string
  - photo_id: string
  - created_at: string
```

### Storage Security (`storage.rules`)
- Scoped bucket paths: `events/{eventId}/photos/{photoId}`
- Uploads restricted to authenticated users assigned to the event or admins.
- Strict MIME type validation: `image/jpeg`, `image/png`, `image/webp`.
- Maximum file size: 10MB.
- Photos delivered via short-lived, signed URLs or HMAC signed streaming routes.

---

## 4. Security Enforcement Matrix

| Requirement | Implementation Detail |
|---|---|
| **Role Authorization** | Verified server-side via `requireAdmin` and `requireEventAccess` middleware. |
| **Password Storage** | Hashed using bcrypt with 10 salt rounds (`server/auth.ts`). |
| **Customer PIN Storage** | Hashed using bcrypt; stored exclusively in `gallery_secrets` (never in `galleries`). |
| **PIN Brute-Force Rate Limiting** | Max 5 failed attempts per 15-minute window before lockout. |
| **Temporary Customer Session** | Ephemeral JWT scoped strictly to `galleryId` and `slug` (4-hour expiry). |
| **Customer Photo Isolation** | Returns only photos from `gallery_photos` with status `PUBLISHED`. Team uploads not in the gallery are never sent. |
| **File Validation** | MIME whitelist: `image/jpeg`, `image/png`, `image/webp`. 10MB size limit per photo. Filenames sanitized against path traversal. |

---

## 5. Automated Test Suites (58 Passing Tests)

The application includes 58 automated tests spanning three dedicated test suites covering all functional requirements, security boundaries, and adversarial attack vectors:

### A. Critical Challenge Requirements (`tests/critical_scenarios.test.ts` — 26 Tests)
- **1. Admin Requirements (6 tests)**: Registration, bcrypt authentication, event creation, team member assignment, owner access, and IDOR isolation between admins.
- **2. Team Member Requirements (7 tests)**: Login, assigned event visibility, unassigned event blocking, photo upload, own photo scoping, prohibition from deleting others' photos, and prohibition from publishing galleries.
- **3. Gallery & Customer Access (8 tests)**: Photo selection/curation, unique URL slugs (409 on collision), draft gallery blocking, publishing transitions, incorrect PIN rejection, correct PIN access, cross-gallery token blocking, and unpublished photo isolation.
- **4. Upload Scenarios (5 tests)**: Batch uploads, non-image rejection (PDF/exe), 10MB limit enforcement, storage path traversal defense, and byte-exact metadata recording.

### B. Platform & Core API Tests (`tests/platform.test.ts` — 20 Tests)
- Deep unit and integration tests for password hashing, JWT generation, metric aggregations, rate limiting, and HMAC stream signatures.

### C. Zero-Trust Security Penetration Tests (`tests/firestore.rules.test.ts` — 12 Tests)
- Evaluates 12 adversarial "Dirty Dozen" security exploits: cross-tenant attacks, role spoofing, unassigned member uploads, and ID poisoning.

### Running the Test Suites
```bash
npm test
```

---

## 6. Demo Credentials & Seed Data

For testing and grading, the database includes pre-seeded accounts:

| Role | Email | Password | Default Access |
|---|---|---|---|
| **Lead Admin** | `admin@photoplatform.com` | `AdminPass123!` | Full studio management, all events, curation, PIN settings |
| **Team Member** | `team@photoplatform.com` | `TeamPass123!` | Assigned to "Summer Gala 2026", upload capability |
| **Customer Demo** | URL: `/gallery/summer-gala-2026-vip` | PIN: `4826` | Curated, high-resolution photographs |

*The login screen includes one-click "Quick Demo" buttons for testing without manual typing.*

---

## 7. Firebase Integration & Security Architecture

The platform is integrated with **Firebase as the single unified backend** on project `gen-lang-client-0384551552`:
- **Firestore Blueprint (`firebase-blueprint.json`)**: Formulates entities for `UserProfile`, `AdminRecord`, `Event`, `EventMember`, `Photo`, `Gallery`, and `GalleryPhoto`.
- **Security Rules (`firestore.rules`)**: Deployed with the Eight Pillars of Zero-Trust security rules, including Master Gate subcollection lookups, strict key validation, immutable ownership fields, denial-of-wallet string sizing, and status transitions.
- **Storage Rules (`storage.rules`)**: Complete security rules enforcing event assignment checks, MIME type restrictions, and file size limits.
- **Security Spec & Test Suite (`tests/firestore.rules.test.ts`)**: Verifies 12 adversarial "Dirty Dozen" penetration attack payloads.
- **Client Integration (`src/services/firebase.ts`)**: Complete SDK initialization, Google Sign-In with popup, boot connection check (`getDocFromServer`), and standardized `handleFirestoreError` error formatting.

---

## 8. Local Development & Deployment

### Environment Configuration (`.env.example`)
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=super-secret-jwt-key-replace-in-production

# Firebase Project Configuration
FIREBASE_PROJECT_ID=gen-lang-client-0384551552
FIREBASE_STORAGE_BUCKET=gen-lang-client-0384551552.firebasestorage.app
```

### Installation & Run Commands
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Start development server (Port 3000)
npm run dev

# 4. Production build
npm run build
npm start
```
