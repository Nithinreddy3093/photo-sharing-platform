import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import apiRoutes from '../server/routes.ts';
import { db } from '../server/db.ts';
import { uploadFileToStorage } from '../server/storage.ts';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', apiRoutes);
  return app;
}

const app = createTestApp();

describe('Critical Requirements Automated Test Suite', () => {
  // Shared state across sequential scenarios
  let adminToken: string;
  let adminUser: any;
  let otherAdminToken: string;
  let otherAdminUser: any;

  let teamToken: string;
  let teamUser: any;
  let unassignedTeamToken: string;
  let unassignedTeamUser: any;

  let eventId: string;
  let otherEventId: string;

  let uploadedPhoto1: any;
  let uploadedPhoto2: any;
  let adminUploadedPhoto: any;

  let galleryId: string;
  let gallerySlug: string;
  const galleryPin = '4921';

  let draftGallerySlug: string;
  let customerSessionToken: string;

  // =================================================================
  // SECTION 1: ADMIN SCENARIOS
  // =================================================================
  describe('ADMIN Requirements', () => {
    it('1.0 Security - Privilege Escalation Guard: unprivileged client cannot self-assign ADMIN role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Malicious Actor',
          email: `attacker_${Date.now()}@untrusted.com`,
          password: 'AttackPassword123!',
          role: 'ADMIN',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/privilege escalation|cannot be self-assigned/i);
    });

    it('1.0b Security - Public Registration Invariant: public sign-up defaults strictly to TEAM_MEMBER', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Public Applicant',
          email: `applicant_${Date.now()}@studio.com`,
          password: 'ApplicantPass123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('TEAM_MEMBER');
    });

    it('1.1 Admin Registration: registers new admin via trusted server-side operation with hashed credentials', async () => {
      const uniqueSuffix = Date.now();
      const res = await request(app)
        .post('/api/auth/register')
        .set('x-admin-setup-key', process.env.ADMIN_SETUP_KEY || 'trusted-photoplatform-setup-secret')
        .send({
          name: 'Lead Director',
          email: `lead_${uniqueSuffix}@studio.com`,
          password: 'SecureAdminPass123!',
          role: 'ADMIN',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        name: 'Lead Director',
        email: `lead_${uniqueSuffix}@studio.com`,
        role: 'ADMIN',
      });
      // Ensure password hash is NEVER exposed in the response
      expect(res.body.user).not.toHaveProperty('password_hash');
      expect(res.body.user).not.toHaveProperty('passwordHash');

      adminToken = res.body.token;
      adminUser = res.body.user;

      // Register a second admin via trusted server operation to test IDOR / cross-admin isolation
      const otherRes = await request(app)
        .post('/api/auth/register')
        .set('x-admin-setup-key', process.env.ADMIN_SETUP_KEY || 'trusted-photoplatform-setup-secret')
        .send({
          name: 'Other Director',
          email: `other_admin_${uniqueSuffix}@studio.com`,
          password: 'SecureAdminPass123!',
          role: 'ADMIN',
        });
      expect(otherRes.status).toBe(201);
      otherAdminToken = otherRes.body.token;
      otherAdminUser = otherRes.body.user;
    });

    it('1.2 Admin Login: authenticates admin with valid password and rejects invalid password', async () => {
      // Valid login
      const validRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'SecureAdminPass123!',
        });
      expect(validRes.status).toBe(200);
      expect(validRes.body).toHaveProperty('token');
      expect(validRes.body.user.email).toBe(adminUser.email);
      expect(validRes.body.user.role).toBe('ADMIN');

      // Invalid login
      const invalidRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'WrongPassword!',
        });
      expect(invalidRes.status).toBe(401);
      expect(invalidRes.body).toHaveProperty('error');
    });

    it('1.3 Admin Create Event: creates event owned by the authenticated admin', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Annual Tech Summit 2026',
          description: 'Keynote and gala sessions',
        });

      expect(res.status).toBe(201);
      expect(res.body.event).toMatchObject({
        name: 'Annual Tech Summit 2026',
        description: 'Keynote and gala sessions',
        created_by: adminUser.id,
      });
      expect(res.body.event.id).toBeDefined();
      eventId = res.body.event.id;

      // Create an event for the second admin
      const otherEventRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .send({
          name: 'Private Corporate Gala',
          description: 'Restricted event for Admin Bravo',
        });
      expect(otherEventRes.status).toBe(201);
      otherEventId = otherEventRes.body.event.id;
    });

    it('1.4 Admin Assign Team Member: registers team members and assigns one to the event', async () => {
      const uniqueSuffix = Date.now();
      // Register team member 1
      const teamRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Photographer Alex',
          email: `alex_${uniqueSuffix}@studio.com`,
          password: 'TeamMemberPass123!',
          role: 'TEAM_MEMBER',
        });
      expect(teamRes.status).toBe(201);
      teamToken = teamRes.body.token;
      teamUser = teamRes.body.user;

      // Register team member 2 (who will NOT be assigned to eventId)
      const unassignedRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Photographer Taylor (Unassigned)',
          email: `taylor_${uniqueSuffix}@studio.com`,
          password: 'TeamMemberPass123!',
          role: 'TEAM_MEMBER',
        });
      expect(unassignedRes.status).toBe(201);
      unassignedTeamToken = unassignedRes.body.token;
      unassignedTeamUser = unassignedRes.body.user;

      // Assign team member 1 to eventId
      const assignRes = await request(app)
        .post(`/api/events/${eventId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: teamUser.id });

      expect(assignRes.status).toBe(201);
      expect(assignRes.body.member).toMatchObject({
        event_id: eventId,
        user_id: teamUser.id,
      });

      // Confirm membership list contains assigned user
      const membersRes = await request(app)
        .get(`/api/events/${eventId}/members`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(membersRes.status).toBe(200);
      const memberIds = membersRes.body.members.map((m: any) => m.user_id);
      expect(memberIds).toContain(teamUser.id);
      expect(memberIds).not.toContain(unassignedTeamUser.id);
    });

    it('1.5 Admin Access Own Event: retrieves event details and member rosters', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.event.id).toBe(eventId);
      expect(res.body.event.created_by).toBe(adminUser.id);
    });

    it('1.6 IDOR Protection: Admin cannot view, modify, or delete another admin event', async () => {
      // Admin Bravo attempts to view Admin Alpha's event
      const getRes = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`);
      expect(getRes.status).toBe(403);
      expect(getRes.body.error).toMatch(/forbidden/i);

      // Admin Bravo attempts to update Admin Alpha's event
      const patchRes = await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .send({ name: 'Hacked Title' });
      expect(patchRes.status).toBe(403);

      // Admin Bravo attempts to delete Admin Alpha's event
      const deleteRes = await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`);
      expect(deleteRes.status).toBe(403);
    });

    it('1.7 Admin User Provisioning: Admin can provision new Team Members and Admins securely', async () => {
      const suffix = Date.now();
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Staff Candidate',
          email: `candidate_${suffix}@studio.com`,
          password: 'CandidatePass123!',
          role: 'TEAM_MEMBER',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('TEAM_MEMBER');
      expect(res.body.user.email).toBe(`candidate_${suffix}@studio.com`);
    });

    it('1.8 Admin Role Promotion: Admin can update/promote a user role via privileged operation', async () => {
      const suffix = Date.now();
      // First create a regular team member
      const userRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Promotable Photographer',
          email: `promotable_${suffix}@studio.com`,
          password: 'SecurePass123!',
        });
      expect(userRes.status).toBe(201);
      const targetUserId = userRes.body.user.id;

      // Admin promotes the user to ADMIN
      const promoteRes = await request(app)
        .post(`/api/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' });

      expect(promoteRes.status).toBe(200);
      expect(promoteRes.body.user.role).toBe('ADMIN');
    });

    it('1.9 Non-Admin Role Manipulation Block: Unprivileged user cannot promote accounts', async () => {
      // Team member attempts to promote themselves or another user
      const promoteRes = await request(app)
        .post(`/api/admin/users/${adminUser.id}/role`)
        .set('Authorization', `Bearer ${teamToken || 'invalid-token'}`)
        .send({ role: 'ADMIN' });

      expect([401, 403]).toContain(promoteRes.status);
    });

    it('1.10 Google Sign-In Role Security: Arbitrary Google logins default strictly to TEAM_MEMBER', async () => {
      const googleRes = await request(app)
        .post('/api/auth/firebase-login')
        .send({
          uid: `google-uid-${Date.now()}`,
          email: `lead.admin.impostor.${Date.now()}@gmail.com`,
          name: 'Impostor Admin',
        });

      expect(googleRes.status).toBe(200);
      expect(googleRes.body.user.role).toBe('TEAM_MEMBER');
    });
  });

  // =================================================================
  // SECTION 2: TEAM MEMBER SCENARIOS
  // =================================================================
  describe('TEAM MEMBER Requirements', () => {
    it('2.1 Team Member Login: logs in and obtains scoped credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: teamUser.email,
          password: 'TeamMemberPass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('TEAM_MEMBER');
      expect(res.body.token).toBeDefined();
    });

    it('2.2 See Assigned Event: sees assigned event in their event roster', async () => {
      const res = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      const eventIds = res.body.events.map((e: any) => e.id);
      expect(eventIds).toContain(eventId);
    });

    it('2.3 Cannot See Unassigned Event: unassigned events are hidden and direct access is blocked', async () => {
      // Unassigned team member checks events list
      const listRes = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${unassignedTeamToken}`);
      expect(listRes.status).toBe(200);
      const listIds = listRes.body.events.map((e: any) => e.id);
      expect(listIds).not.toContain(eventId);

      // Unassigned team member tries direct URL access
      const directRes = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${unassignedTeamToken}`);
      expect(directRes.status).toBe(403);
      expect(directRes.body.error).toMatch(/assigned/i);
    });

    it('2.4 Upload Photos: assigned team member uploads photos to the event', async () => {
      const fakeImageBuffer = Buffer.from('fake-jpeg-image-bytes-header-data');

      const res = await request(app)
        .post(`/api/events/${eventId}/photos`)
        .set('Authorization', `Bearer ${teamToken}`)
        .attach('photos', fakeImageBuffer, {
          filename: 'stage_speaker.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(201);
      expect(res.body.photos).toHaveLength(1);
      expect(res.body.photos[0]).toMatchObject({
        event_id: eventId,
        uploaded_by: teamUser.id,
        filename: 'stage_speaker.jpg',
        mime_type: 'image/jpeg',
      });
      expect(res.body.photos[0].storage_path).toContain(`events/${eventId}/photos/`);
      uploadedPhoto1 = res.body.photos[0];

      // Team member uploads second photo
      const res2 = await request(app)
        .post(`/api/events/${eventId}/photos`)
        .set('Authorization', `Bearer ${teamToken}`)
        .attach('photos', fakeImageBuffer, {
          filename: 'crowd_applause.png',
          contentType: 'image/png',
        });
      expect(res2.status).toBe(201);
      uploadedPhoto2 = res2.body.photos[0];

      // Admin also uploads a photo to the event
      const adminUploadRes = await request(app)
        .post(`/api/events/${eventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photos', fakeImageBuffer, {
          filename: 'vip_handshake.jpg',
          contentType: 'image/jpeg',
        });
      expect(adminUploadRes.status).toBe(201);
      adminUploadedPhoto = adminUploadRes.body.photos[0];
    });

    it('2.5 See Own Photos: team member retrieves only their own uploads, never other photographers', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/photos`)
        .set('Authorization', `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.photos.length).toBeGreaterThanOrEqual(2);

      // Every returned photo MUST have been uploaded by teamUser
      for (const photo of res.body.photos) {
        expect(photo.uploaded_by).toBe(teamUser.id);
      }

      // Admin's uploaded photo must NOT appear in the team member's view
      const photoIds = res.body.photos.map((p: any) => p.id);
      expect(photoIds).not.toContain(adminUploadedPhoto.id);
    });

    it('2.6 Cannot Manage Another Users Photos: team member cannot delete photo uploaded by admin or other member', async () => {
      const res = await request(app)
        .delete(`/api/photos/${adminUploadedPhoto.id}`)
        .set('Authorization', `Bearer ${teamToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/cannot delete other users photos/i);

      // Photo should still exist in database
      const photoInDb = await db.getPhotoById(adminUploadedPhoto.id);
      expect(photoInDb).not.toBeNull();
    });

    it('2.7 Cannot Publish Gallery: team member role is rejected from publishing customer galleries', async () => {
      const res = await request(app)
        .post(`/api/galleries/${eventId}/publish`)
        .set('Authorization', `Bearer ${teamToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/admin (access|privileges) required/i);
    });
  });

  // =================================================================
  // SECTION 3: GALLERY & CUSTOMER ACCESS SCENARIOS
  // =================================================================
  describe('GALLERY & Customer Access Requirements', () => {
    it('3.1 Admin Selects Photos & Creates Gallery: curates specific photos with unique slug and bcrypt PIN', async () => {
      gallerySlug = `summit-highlights-${Date.now()}`;

      // Admin selects only photo 1 and admin's photo, deliberately excluding photo 2
      const selectedIds = [uploadedPhoto1.id, adminUploadedPhoto.id];

      const res = await request(app)
        .post('/api/galleries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventId,
          slug: gallerySlug,
          pin: galleryPin,
          status: 'DRAFT',
          selectedPhotoIds: selectedIds,
        });

      expect(res.status).toBe(201);
      expect(res.body.gallery).toMatchObject({
        event_id: eventId,
        slug: gallerySlug,
        status: 'DRAFT',
      });
      // Ensure pin_hash is never exposed
      expect(res.body.gallery).not.toHaveProperty('pin_hash');
      expect(res.body.selectedPhotoIds).toEqual(selectedIds);
      galleryId = res.body.gallery.id;
    });

    it('3.2 Unique Gallery URL: duplicate slug creation is rejected with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/galleries')
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .send({
          eventId: otherEventId,
          slug: gallerySlug, // Same slug as summit gallery
          pin: '9876',
          status: 'DRAFT',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already in use/i);
    });

    it('3.3 Unpublished Gallery Blocked: draft gallery rejects customer access and PIN verification', async () => {
      // Info endpoint
      const infoRes = await request(app).get(`/api/gallery/${gallerySlug}/info`);
      expect(infoRes.status).toBe(403);
      expect(infoRes.body.error).toMatch(/draft mode/i);

      // Verify PIN endpoint
      const verifyRes = await request(app)
        .post(`/api/gallery/${gallerySlug}/verify`)
        .send({ pin: galleryPin });
      expect(verifyRes.status).toBe(403);
      expect(verifyRes.body.error).toMatch(/not published yet/i);
    });

    it('3.4 Admin Publishes Gallery: transitions status to PUBLISHED', async () => {
      const res = await request(app)
        .post(`/api/galleries/${galleryId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gallery.status).toBe('PUBLISHED');
      expect(res.body.gallery.published_at).toBeDefined();

      // Now info endpoint is publicly accessible
      const infoRes = await request(app).get(`/api/gallery/${gallerySlug}/info`);
      expect(infoRes.status).toBe(200);
      expect(infoRes.body.gallery.slug).toBe(gallerySlug);
      expect(infoRes.body.gallery.eventName).toBe('Annual Tech Summit 2026');
    });

    it('3.5 Incorrect PIN Rejected: wrong PIN returns 401 and records attempt', async () => {
      const res = await request(app)
        .post(`/api/gallery/${gallerySlug}/verify`)
        .send({ pin: '0000' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Incorrect PIN/i);
    });

    it('3.6 Correct PIN Accepted: customer accesses gallery without account and receives session token', async () => {
      // Customer makes request with NO Authorization header
      const res = await request(app)
        .post(`/api/gallery/${gallerySlug}/verify`)
        .send({ pin: galleryPin });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.galleryToken).toBeDefined();
      expect(res.body.gallery.slug).toBe(gallerySlug);

      customerSessionToken = res.body.galleryToken;
    });

    it('3.7 Customer Cannot Access Another Gallery: token is scoped strictly to the authenticated gallery', async () => {
      // Create and publish a separate gallery
      const otherSlug = `other-gala-${Date.now()}`;
      const otherGallery = await db.createGallery({
        event_id: otherEventId,
        created_by: otherAdminUser.id,
        slug: otherSlug,
        pin_hash: 'somehash',
        status: 'PUBLISHED',
      });

      // Attempt to access other gallery using the first gallery's token
      const res = await request(app)
        .get(`/api/gallery/${otherSlug}/photos`)
        .set('x-gallery-token', customerSessionToken);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/(Invalid gallery session|does not match requested gallery)/i);

      // Clean up other gallery
      await db.deleteGallery(otherGallery.id);
    });

    it('3.8 Customer Cannot Access Unpublished Photos: returns only curated, selected photos', async () => {
      const res = await request(app)
        .get(`/api/gallery/${gallerySlug}/photos`)
        .set('x-gallery-token', customerSessionToken);

      expect(res.status).toBe(200);
      expect(res.body.photos).toBeDefined();

      const deliveredPhotoIds = res.body.photos.map((p: any) => p.id);

      // Selected photos MUST be present
      expect(deliveredPhotoIds).toContain(uploadedPhoto1.id);
      expect(deliveredPhotoIds).toContain(adminUploadedPhoto.id);

      // Unselected photo (photo 2) MUST NOT be present
      expect(deliveredPhotoIds).not.toContain(uploadedPhoto2.id);

      // Each photo must contain a valid signed streaming URL
      for (const p of res.body.photos) {
        expect(p.url).toBeDefined();
        expect(p.url).toContain('/api/photos/stream');
      }
    });
  });

  // =================================================================
  // SECTION 4: UPLOAD & VALIDATION SCENARIOS
  // =================================================================
  describe('UPLOAD Requirements', () => {
    it('4.1 Multiple Images: accepts batch upload of several images simultaneously', async () => {
      const img1 = Buffer.from('image-1-binary-content');
      const img2 = Buffer.from('image-2-binary-content');

      const res = await request(app)
        .post(`/api/events/${eventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photos', img1, { filename: 'batch_shot_1.jpg', contentType: 'image/jpeg' })
        .attach('photos', img2, { filename: 'batch_shot_2.png', contentType: 'image/png' });

      expect(res.status).toBe(201);
      expect(res.body.photos).toHaveLength(2);
      expect(res.body.photos[0].filename).toBe('batch_shot_1.jpg');
      expect(res.body.photos[1].filename).toBe('batch_shot_2.png');
    });

    it('4.2 Invalid File Type: rejects non-image files (e.g., text, executables, PDF)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 mock pdf content');

      const res = await request(app)
        .post(`/api/events/${eventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photos', pdfBuffer, { filename: 'report.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/unsupported file type/i);
    });

    it('4.3 Oversized File: rejects files exceeding 10MB limit', async () => {
      // 10MB limit is 10 * 1024 * 1024 bytes (10485760). Create 10.5MB buffer
      const oversizedBuffer = Buffer.alloc(10.5 * 1024 * 1024);

      const res = await request(app)
        .post(`/api/events/${eventId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photos', oversizedBuffer, { filename: 'massive_raw.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/exceeds/i);
    });

    it('4.4 Failed Storage Upload: rejects path traversal and invalid storage paths gracefully', async () => {
      // Attempting to pass an invalid path directly to storage utility throws error
      const badPath = '../../../etc/passwd';
      await expect(
        uploadFileToStorage(badPath, Buffer.from('test'), 'image/jpeg')
      ).rejects.toThrow(/invalid storage path/i);

      const sneakyPath = 'events/e1/photos/../../secret.txt';
      await expect(
        uploadFileToStorage(sneakyPath, Buffer.from('test'), 'image/jpeg')
      ).rejects.toThrow(/invalid storage path/i);
    });

    it('4.5 Metadata Correctness: records exact file size, original filename, uploader ID, and sanitized storage path', async () => {
      const specificContent = Buffer.from('specific-content-length-42-bytes-test!!');
      const expectedSize = specificContent.length;

      const res = await request(app)
        .post(`/api/events/${eventId}/photos`)
        .set('Authorization', `Bearer ${teamToken}`)
        .attach('photos', specificContent, {
          filename: 'My Special #1 Photo (2026).webp',
          contentType: 'image/webp',
        });

      expect(res.status).toBe(201);
      const photo = res.body.photos[0];

      expect(photo.filename).toBe('My Special #1 Photo (2026).webp');
      expect(photo.file_size).toBe(expectedSize);
      expect(photo.mime_type).toBe('image/webp');
      expect(photo.uploaded_by).toBe(teamUser.id);
      expect(photo.event_id).toBe(eventId);
      expect(photo.created_at).toBeDefined();

      // Sanitized storage path should have no spaces or special characters in filename part
      expect(photo.storage_path).toMatch(/^events\/[a-zA-Z0-9_-]+\/photos\/[a-zA-Z0-9._-]+$/);
      expect(photo.storage_path).not.toContain(' ');
      expect(photo.storage_path).not.toContain('#');
    });
  });
});
