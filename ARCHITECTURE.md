# Photo Sharing Platform — System Architecture & Technical Specification

> **Audience**: Technical Interviewers, Systems Architects, and Engineering Evaluators  
> **Project**: Collaborative Photo-Sharing Platform (Full-Stack Internship Challenge)  
> **Tech Stack**: React 18, TypeScript, Tailwind CSS, Node.js, Express, Firebase (Authentication, Cloud Firestore, Firebase Storage)

---

## 1. High-Level System Architecture

The platform follows a **three-tier architecture** with strict role separation and Firebase as the single unified backend:

```
+--------------------------------------------------------------------------------+
|                                CLIENT TIER (SPA)                               |
|                                                                                |
|  +------------------------+  +------------------------+  +------------------+  |
|  |    Admin Dashboard     |  | Photographers' Studio  |  | Customer Portal  |  |
|  | (Events, Curation, PIN)|  |  (Upload & Own Photos) |  | (PIN & Lightbox) |  |
|  +-----------+------------+  +-----------+------------+  +--------+---------+  |
+--------------|---------------------------|-------------------------|-----------+
               |                           |                         |
               | Authorization: Bearer JWT | Authorization: Bearer   | x-gallery-token /
               | (role: 'ADMIN')           | (role: 'TEAM_MEMBER')   | HMAC Signed URL
               v                           v                         v
+--------------------------------------------------------------------------------+
|                        API & APPLICATION TIER (Express)                        |
|                                                                                |
|  +--------------------------------------------------------------------------+  |
|  |                           Security Middlewares                           |  |
|  |  • authenticateUser       • requireAdmin         • verifyGallerySession  |  |
|  |  • rateLimiter (PIN)      • multer fileFilter    • pathTraversalGuard    |  |
|  +--------------------------------------------------------------------------+  |
|                                      |                                         |
|  +-----------------------------------+--------------------------------------+  |
|  |                         Controllers & Domain Logic                       |  |
|  |  • Auth & Bcrypt          • Event Management     • Photo Ingestion       |  |
|  |  • Curation Engine        • PIN Hashing          • HMAC URL Signer       |  |
|  +-----------------------------------+--------------------------------------+  |
+--------------------------------------|-----------------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
+--------------------------------------+   +-------------------------------------+
|         PERSISTENCE LAYER            |   |         OBJECT STORAGE TIER         |
|                                      |   |                                     |
|  • Cloud Firestore                   |   |  • Firebase Storage                 |
|  • users, admins, events, members    |   |  • Private Bucket                   |
|  • photos (metadata), galleries      |   |  • Short-lived HMAC / Signed URLs   |
|  • gallery_secrets (PIN hashes)      |   |  • storage.rules Guarded            |
|  • firestore.rules Guarded           |   |  • Path: events/{id}/photos/{uuid}  |
+--------------------------------------+   +-------------------------------------+
```

---

## 2. Database Schema & Firestore Data Model

The data model is structured for high performance, document isolation, and zero-trust security:

```
    +----------------------------------+
    |             USERS                |
    +----------------------------------+
    | id (String, UUID)                |
    | auth_user_id (String)            |
    | name (String)                    |
    | email (String, UNIQUE)           |
    | role ("ADMIN" | "TEAM_MEMBER")   |
    | created_at (ISO String)          |
    +-----------------+----------------+
                      | 1
                      |
                      | creates
                      | N
    +-----------------v----------------+        1:N       +------------------------+
    |              EVENTS              +------------------>      EVENT MEMBERS     |
    +----------------------------------+                  +------------------------+
    | id (String, UUID)                |                  | id (String, UUID)      |
    | name (String)                    |                  | event_id (Reference)   |
    | description (String)             |                  | user_id (Reference)    |
    | created_by (Ref -> USERS)        |                  | created_at (ISO String)|
    | created_at (ISO String)          |                  | (events/{id}/members)  |
    | updated_at (ISO String)          |                  +------------------------+
    +--------+--------------------+----+
             | 1                  | 1
             |                    |
             | uploads            | configures
             | N                  | 1..N
    +--------v---------+     +----v--------------------+     +-------------------------+
    |      PHOTOS      |     |        GALLERIES        |     |     GALLERY_SECRETS     |
    +------------------+     +-------------------------+     +-------------------------+
    | id (String, UUID)|     | id (String, UUID)       |     | id (String, UUID)       |
    | event_id (Ref)   |     | event_id (Ref -> EVENTS)|     | pin_hash (bcrypt hash)  |
    | uploaded_by (Ref)|     | created_by (Ref)        |     | created_at (ISO String) |
    | storage_path     |     | slug (String, UNIQUE)   |     +-------------------------+
    | filename         |     | status (DRAFT/PUBLISHED)|             (Privileged Store:
    | file_size        |     | published_at            |              Admin / Server Only,
    | mime_type        |     | (NO PIN OR PIN HASH)    |              Never in Client Doc)
    | created_at       |     +------------+------------+
    | is_selected      |                  | 1
    +--------+---------+                  |
             |                            |
             |        +-------------------+
             |        |
             | N      | N
    +--------v--------v----------------+
    |          GALLERY_PHOTOS          |
    |   (galleries/{id}/photos/{pid})  |
    +----------------------------------+
    | id (String, UUID)                |
    | gallery_id (Ref)                 |
    | photo_id (Ref)                   |
    | created_at (ISO String)          |
    +----------------------------------+
```

### Relational Invariants:
1. **Cascade Deletes**: Deleting an Event removes its members, photos, galleries, gallery secrets, and join records.
2. **Orphan Prevention**: Deleting a photo cleans up all gallery curation mappings and unlinks binary files in object storage.
3. **Cross-Event Isolation**: Foreign keys ensure a photo belonging to Event A cannot be curated into a gallery belonging to Event B.
4. **Secret Separation**: The `pin_hash` is strictly decoupled from the public `galleries/{id}` document and stored in server-only `gallery_secrets/{id}`.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Resource / Action | Admin | Assigned Team Member | Unassigned Team Member | Customer (Public) |
|---|:---:|:---:|:---:|:---:|
| **Create Event** | Allowed | Denied (`403`) | Denied (`403`) | Denied (`401`) |
| **View Event Roster** | Own Events | Own Events | Denied (`403`) | Denied (`401`) |
| **Assign Photographers** | Allowed | Denied (`403`) | Denied (`403`) | Denied (`401`) |
| **Upload Photos** | Allowed | Assigned Event Only | Denied (`403`) | Denied (`401`) |
| **View Uploaded Photos** | All Event Photos | Own Uploads Only | Denied (`403`) | Curated Only (`x-gallery-token`) |
| **Delete Photo** | Any Event Photo | Own Uploads Only | Denied (`403`) | Denied (`401`) |
| **Curate / Toggle Selection** | Allowed | Denied (`403`) | Denied (`403`) | Denied (`401`) |
| **Publish Gallery** | Allowed | Denied (`403`) | Denied (`403`) | Denied (`401`) |
| **Access Gallery Without PIN** | Allowed (Owner) | Denied (`401`) | Denied (`401`) | Denied (`401`) |
| **Access Gallery With PIN** | Allowed | Allowed | Allowed | Allowed (`200` + Token) |

---

## 4. Authentication & Token Architecture

```
                                [Client Request]
                                       |
                 +---------------------+---------------------+
                 |                                           |
           (Bearer JWT)                               (x-gallery-token)
                 v                                           v
    [authenticateUser Middleware]             [verifyCustomerGallerySession]
                 |                                           |
         Decode JWT Header                           Decode Session Token
                 |                                           |
         Verify signature with                       Verify signature with
             JWT_SECRET                                  JWT_SECRET
                 |                                           |
       Fetch Profile by userId                     Validate { galleryId, slug }
                 v                                           v
       Attach req.user:                            Attach req.gallerySession:
       { userId, email, role }                     { galleryId, slug, eventId }
                 |                                           |
     +-----------+-----------+                     Allow Curated Photos Access
     |                       |
(role === 'ADMIN')   (role === 'TEAM_MEMBER')
     v                       v
Pass requireAdmin      Filter queries by
     check             req.user.userId
```

---

## 5. Storage Architecture & Upload Pipeline

```
[Client Multi-File Upload]
       |
       | 1. Multipart Form POST to /api/events/:id/photos/upload
       v
[Multer Middleware (MemoryStorage)]
       |
       | 2. Checks file size (<= 10MB) & MIME type (image/jpeg, png, webp)
       v
[Upload Controller]
       |
       | 3. Authorization Check:
       |    • Is user Admin? -> Must own event
       |    • Is user Team Member? -> Must be in event_members for this event
       |
       | 4. Filename Sanitization & Storage Path Generation:
       |    • Removes path traversal characters (../, /, null bytes)
       |    • Generates path: events/{eventId}/photos/{uuid}-{safeName}
       v
[Storage Tier (Firebase Storage / Local Fallback)]
       |
       | 5. Saves binary payload into private bucket guarded by storage.rules
       v
[Database Tier (Cloud Firestore)]
       |
       | 6. Creates photo record in Firestore 'photos' collection:
       |    (id, event_id, uploaded_by, storage_path, file_size, mime_type)
       v
[Response]
       |
       | 7. Returns 201 Created with photo metadata array
```

---

## 6. Gallery Publishing & Curation Flow

1. **Photo Curation**:
   - The Lead Admin inspects all event photos in the curation view.
   - Admin checks or unchecks photos to construct the `selectedPhotoIds` list.
   - Server enforces `validatePhotosBelongToEvent`: prevents cross-event photo injection attacks.
2. **PIN Hashing**:
   - The Admin specifies a PIN (or accepts the auto-generated PIN).
   - Server runs `hashPin(pin)` using bcrypt (`$2a$10$...`).
   - The raw PIN is never stored in the database.
   - The `pin_hash` is written to `gallery_secrets/{id}` (never in `galleries/{id}`).
3. **Slug Registration**:
   - Admin sets a human-readable slug (e.g., `summer-gala-2026-vip`).
   - Server validates global slug uniqueness; returns `409 Conflict` on collisions.
4. **Publishing**:
   - `POST /api/galleries/:id/publish` validates admin ownership.
   - Transitions `status` from `DRAFT` to `PUBLISHED` and timestamps `published_at`.
   - Populates the `gallery_photos` join collection.

---

## 7. Customer PIN Verification & Session Token Architecture

```
[Customer visits /gallery/summer-gala-2026-vip]
       |
       | 1. GET /api/gallery/:slug/info
       v
[Server Info Endpoint]
       |
       | 2. Checks gallery exists & status === 'PUBLISHED'
       | 3. Returns { id, slug, status, event_name, requiresPin: true }
       v
[Customer enters 4-digit PIN in UI]
       |
       | 4. POST /api/gallery/:slug/verify with { pin: "4826" }
       v
[Rate Limiter]
       |
       | 5. Checks (slug + IP) consecutive failure counter (< 5 attempts)
       v
[PIN Validator]
       |
       | 6. Fetches pin_hash from gallery_secrets
       | 7. Compares bcrypt.compare(pin, pin_hash)
       |    • Failure -> Increments counter; returns 401 Unauthorized
       |    • Success -> Resets failure counter
       v
[Token Generator]
       |
       | 8. Issues signed HMAC-SHA256 JWT containing:
       |    { galleryId, slug, eventId, exp: 4 hours }
       v
[Customer Receives Token]
       |
       | 9. Sends 'x-gallery-token' on GET /api/gallery/:slug/photos
       v
[Server Photos Endpoint]
       |
       | 10. Verifies token matches slug
       | 11. Queries only curated photos from gallery_photos
       | 12. Generates time-limited signed streaming URLs
       v
[Customer Enjoys Lightbox Gallery & High-Res Downloads]
```

---

## 8. Rate Limiting & Anti-Brute-Force Architecture

- **Window**: 15 minutes.
- **Max Failures**: 5 consecutive incorrect PIN attempts per unique IP + gallery slug combination.
- **Lockout Action**: Rejects all subsequent verification attempts with `429 Too Many Requests` and returns `retryAfterSeconds`.
- **Reset**: Successful PIN verification immediately purges the lockout record.

---

## 9. Security Model Summary

| Vulnerability Vector | Threat | Applied Mitigation |
|---|---|---|
| **IDOR on Events** | Attacker accesses or modifies another admin's event | Server verifies `event.created_by === req.user.userId` on all event mutation endpoints. |
| **Team Member Escalation** | Photographer attempts to publish or see all uploads | Server isolates team members to assigned events and only returns photos where `uploaded_by === req.user.userId`. |
| **Brute-Force PIN Attack** | Attacker attempts to guess 4-digit PIN (10,000 combinations) | In-memory rate limiter locks IP/slug for 15 minutes after 5 consecutive failures (`429 Too Many Requests`). |
| **Unpublished Photo Leak** | Customer queries uncurated event photos | Customer photo query strictly selects from `gallery_photos` join table on `PUBLISHED` galleries only. |
| **Database Credential Leak** | Backend database credentials leaked to frontend | Firebase Admin credentials and JWT secrets are kept strictly server-side; zero secrets in client builds. |
| **PIN Hash Leak** | Customer inspects public Firestore document for PIN hash | `pin_hash` is strictly decoupled into `gallery_secrets/{id}` with `allow read, write: if false;`. |
| **Storage Traversal** | Attacker uses `../` to read server host files | Whitelisted regex pattern matching and `path.resolve` containment checks prevent directory traversal. |
| **File Injection** | Attacker uploads malware disguised as an image | Multi-layer check: Multer MIME filter, file extension whitelist, and byte-level size limits. |
| **Cross-Event Injection** | Admin links photo from Event B into Event A's gallery | `validatePhotosBelongToEvent` ensures every selected photo ID belongs to the target event before persisting. |
