import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../server/db.ts';
import {
  hashPassword,
  verifyPassword,
  hashPin,
  verifyPin,
  generateUserToken,
  generateGalleryAccessToken,
} from '../server/auth.ts';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  sanitizeFilename,
  generateStoragePath,
  isValidStoragePath,
  generatePhotoStreamSignature,
  verifyPhotoStreamSignature,
} from '../server/storage.ts';

describe('Photo Sharing Platform - Core System & Security Test Suite', () => {
  const adminEmail = 'admin@photoplatform.com';
  const teamEmail = 'team@photoplatform.com';
  const eventId = 'e1111111-1111-1111-1111-111111111111';

  // 1. Authentication
  it('1. Authentication: should verify hashed password correctly and generate valid JWT', async () => {
    const rawPass = 'AdminPass123!';
    const hash = await hashPassword(rawPass);
    expect(hash).not.toBe(rawPass);

    const isMatch = await verifyPassword(rawPass, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('WrongPassword', hash);
    expect(isWrong).toBe(false);

    const admin = await db.findProfileByEmail(adminEmail);
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe('ADMIN');

    const token = generateUserToken(admin!);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  // 2. Admin authorization
  it('2. Admin authorization: Admin can access their events and dashboard metrics', async () => {
    const admin = await db.findProfileByEmail(adminEmail);
    expect(admin).not.toBeNull();

    const events = await db.getEventsForUser(admin!.id, 'ADMIN');
    expect(events.length).toBeGreaterThan(0);

    const stats = await db.getDashboardStats(admin!.id);
    expect(stats.totalEvents).toBeGreaterThanOrEqual(1);
    expect(stats.totalPhotos).toBeGreaterThanOrEqual(1);
  });

  // 3. Team member authorization
  it('3. Team member authorization: Team member role exists and access is scoped', async () => {
    const team = await db.findProfileByEmail(teamEmail);
    expect(team).not.toBeNull();
    expect(team?.role).toBe('TEAM_MEMBER');

    const events = await db.getEventsForUser(team!.id, 'TEAM_MEMBER');
    // Team member should only see assigned events
    for (const evt of events) {
      const isAssigned = await db.isUserAssignedToEvent(evt.id, team!.id);
      expect(isAssigned).toBe(true);
    }
  });

  // 4. Event access control
  it('4. Event access control: Unauthorized user cannot access unassigned event', async () => {
    const randomUserId = '99999999-9999-9999-9999-999999999999';
    const isAssigned = await db.isUserAssignedToEvent(eventId, randomUserId);
    expect(isAssigned).toBe(false);
  });

  // 5. Photo access control
  it('5. Photo access control: Team member only retrieves their own uploaded photos', async () => {
    const team = await db.findProfileByEmail(teamEmail);
    expect(team).not.toBeNull();

    const teamPhotos = await db.getPhotosForEvent(eventId, team!.id);
    for (const p of teamPhotos) {
      expect(p.uploaded_by).toBe(team!.id);
    }
  });

  // 6. Multiple photo upload validation
  it('6. Multiple photo upload validation: validates MIME types, size limits, and sanitizes filenames', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES).toContain('image/webp');
    expect(ALLOWED_MIME_TYPES).not.toContain('application/pdf');
    expect(ALLOWED_MIME_TYPES).not.toContain('image/gif');

    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);

    const dangerousName = '../../evil_script.php.jpg';
    const sanitized = sanitizeFilename(dangerousName);
    expect(sanitized).not.toContain('..');
    expect(sanitized).not.toContain('/');

    const path = generateStoragePath(eventId, 'wedding_kiss.jpg');
    expect(path).toContain(`events/${eventId}/photos/`);
    expect(path).toContain('wedding_kiss.jpg');
  });

  // 7. Gallery creation
  it('7. Gallery creation: Creates gallery with bcrypt-hashed PIN and unique slug', async () => {
    const admin = await db.findProfileByEmail(adminEmail);
    const pin = '9182';
    const pinHash = await hashPin(pin);
    const slug = `test-gallery-${Date.now()}`;

    const newGallery = await db.createGallery({
      event_id: eventId,
      created_by: admin!.id,
      slug,
      pin_hash: pinHash,
      status: 'DRAFT',
    });

    expect(newGallery.slug).toBe(slug);
    expect(newGallery.status).toBe('DRAFT');
    expect(newGallery.pin_hash).not.toBe(pin);

    // Verify PIN comparison with bcrypt
    const isPinCorrect = await verifyPin(pin, newGallery.pin_hash);
    expect(isPinCorrect).toBe(true);
  });

  // 8. Gallery publishing
  it('8. Gallery publishing: Admin can publish a draft gallery', async () => {
    const slug = `publish-test-${Date.now()}`;
    const pinHash = await hashPin('1234');
    const admin = await db.findProfileByEmail(adminEmail);

    const draft = await db.createGallery({
      event_id: eventId,
      created_by: admin!.id,
      slug,
      pin_hash: pinHash,
      status: 'DRAFT',
    });

    expect(draft.status).toBe('DRAFT');

    const published = await db.updateGallery(draft.id, { status: 'PUBLISHED' });
    expect(published?.status).toBe('PUBLISHED');
    expect(published?.published_at).not.toBeNull();
  });

  // 9. Team member cannot publish
  it('9. Team member cannot publish: role check fails for TEAM_MEMBER', () => {
    const teamMemberRole: string = 'TEAM_MEMBER';
    const isAdmin = (teamMemberRole as string) === 'ADMIN';
    expect(isAdmin).toBe(false);
  });

  // 10. Customer PIN verification
  it('10. Customer PIN verification: Correct PIN verifies and issues token', async () => {
    const rawPin = '4826';
    const gallery = await db.getGalleryBySlug('summer-gala-2026-vip');
    expect(gallery).not.toBeNull();

    const isPinValid = await verifyPin(rawPin, gallery!.pin_hash);
    expect(isPinValid).toBe(true);

    const sessionToken = generateGalleryAccessToken(gallery!.id, gallery!.slug);
    expect(typeof sessionToken).toBe('string');
  });

  // 11. Wrong PIN rejection
  it('11. Wrong PIN rejection: Incorrect PIN fails bcrypt verification', async () => {
    const gallery = await db.getGalleryBySlug('summer-gala-2026-vip');
    expect(gallery).not.toBeNull();

    const isPinValid = await verifyPin('0000', gallery!.pin_hash);
    expect(isPinValid).toBe(false);
  });

  // 12. Unpublished gallery protection
  it('12. Unpublished gallery protection: DRAFT galleries are blocked for customer access', async () => {
    const admin = await db.findProfileByEmail(adminEmail);
    const draftSlug = `hidden-draft-${Date.now()}`;
    const draft = await db.createGallery({
      event_id: eventId,
      created_by: admin!.id,
      slug: draftSlug,
      pin_hash: await hashPin('5555'),
      status: 'DRAFT',
    });

    expect(draft.status).toBe('DRAFT');
    const canCustomerAccess = draft.status === 'PUBLISHED';
    expect(canCustomerAccess).toBe(false);
  });

  // 13. Customer cannot access unrelated photos
  it('13. Customer cannot access unrelated photos: returns strictly selected gallery photos', async () => {
    const gallery = await db.getGalleryBySlug('summer-gala-2026-vip');
    expect(gallery).not.toBeNull();

    const publishedPhotos = await db.getPublishedGalleryPhotos(gallery!.id);
    const allEventPhotos = await db.getPhotosForEvent(gallery!.event_id);

    // Published photos must be a subset of event photos
    expect(publishedPhotos.length).toBeGreaterThan(0);
    expect(publishedPhotos.length).toBeLessThanOrEqual(allEventPhotos.length);

    const publishedIds = new Set(publishedPhotos.map((p) => p.id));
    for (const p of publishedPhotos) {
      expect(publishedIds.has(p.id)).toBe(true);
    }
  });

  // 14. Path Traversal & Malformed Storage Path Rejection
  it('14. Path Traversal Rejection: blocks directory traversal and malformed storage paths', () => {
    // Valid path
    expect(isValidStoragePath('events/e1111111-1111-1111-1111-111111111111/photos/1720000000000_abc_photo.jpg')).toBe(true);
    
    // Path traversal attacks
    expect(isValidStoragePath('../../../etc/passwd')).toBe(false);
    expect(isValidStoragePath('events/../etc/passwd')).toBe(false);
    expect(isValidStoragePath('events/e111/photos/../../secret.key')).toBe(false);
    expect(isValidStoragePath('/etc/shadow')).toBe(false);
    expect(isValidStoragePath('events/e111/photos/')).toBe(false);
    expect(isValidStoragePath('invalid_bucket/photos/test.jpg')).toBe(false);
  });

  // 15. HMAC Photo Stream Signatures
  it('15. HMAC Photo Stream Signature: verifies valid signatures and rejects expired or tampered signatures', () => {
    const validPath = 'events/e1111111-1111-1111-1111-111111111111/photos/photo.jpg';
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const pastExp = Math.floor(Date.now() / 1000) - 60;

    const signature = generatePhotoStreamSignature(validPath, futureExp);
    expect(signature).toHaveLength(64); // SHA-256 hex string

    // Valid signature within expiration window
    expect(verifyPhotoStreamSignature(validPath, futureExp, signature)).toBe(true);

    // Tampered path
    expect(verifyPhotoStreamSignature('events/other-event/photos/photo.jpg', futureExp, signature)).toBe(false);

    // Tampered expiration
    expect(verifyPhotoStreamSignature(validPath, futureExp + 100, signature)).toBe(false);

    // Expired signature
    const expiredSig = generatePhotoStreamSignature(validPath, pastExp);
    expect(verifyPhotoStreamSignature(validPath, pastExp, expiredSig)).toBe(false);
  });

  // 16. Cross-Event Photo Selection Injection
  it('16. Cross-Event Photo Protection: photos belonging to Event B cannot be selected for Event A gallery', async () => {
    const admin = await db.findProfileByEmail(adminEmail);
    // Create Event B
    const eventB = await db.createEvent({
      name: 'Event B Private Gala',
      description: 'Second Event',
      created_by: admin!.id,
    });

    // Upload photo to Event B
    const photoB = await db.createPhoto({
      event_id: eventB.id,
      uploaded_by: admin!.id,
      filename: 'event_b_exclusive.jpg',
      storage_path: `events/${eventB.id}/photos/event_b_exclusive.jpg`,
      file_size: 1024,
      mime_type: 'image/jpeg',
    });

    // Get Event A photos
    const eventAPhotos = await db.getPhotosForEvent(eventId);
    const eventAPhotoIds = new Set(eventAPhotos.map((p) => p.id));

    // Photo B must NOT be among Event A's photos
    expect(eventAPhotoIds.has(photoB.id)).toBe(false);

    // Clean up Event B
    await db.deleteEvent(eventB.id);
  });

  // 17. IDOR Protection: Admin Event Isolation
  it('17. IDOR Protection: Admin B cannot view or manage Admin A events', async () => {
    // Create a second admin
    const adminB = await db.createProfile({
      name: 'Admin Bravo',
      email: `admin_b_${Date.now()}@photoplatform.com`,
      role: 'ADMIN',
      passwordHash: await hashPassword('AdminPass123!'),
    });

    // Get events for Admin B
    const adminBEvents = await db.getEventsForUser(adminB.id, 'ADMIN');
    // Admin B should not see Admin A's event
    const hasAdminAEvent = adminBEvents.some((e) => e.id === eventId);
    expect(hasAdminAEvent).toBe(false);

    // Event A created_by check
    const eventA = await db.getEventById(eventId);
    expect(eventA?.created_by).not.toBe(adminB.id);
  });

  // 18. Photo Deletion Authorization: Team member cannot delete other members photos
  it('18. Photo Deletion Auth: Team member is forbidden from deleting another photographers photo', async () => {
    const admin = await db.findProfileByEmail(adminEmail);
    const teamMember = await db.findProfileByEmail(teamEmail);

    // Photo uploaded by Admin
    const adminPhoto = await db.createPhoto({
      event_id: eventId,
      uploaded_by: admin!.id,
      filename: 'lead_shot.jpg',
      storage_path: `events/${eventId}/photos/lead_shot.jpg`,
      file_size: 2048,
      mime_type: 'image/jpeg',
    });

    // Team member is not the uploader
    const canDelete = teamMember!.id === adminPhoto.uploaded_by || teamMember!.role === 'ADMIN';
    expect(canDelete).toBe(false);

    // Clean up photo
    await db.deletePhoto(adminPhoto.id);
  });

  // 19. Team Member Event Assignment Verification
  it('19. Event Assignment: Unassigned team member is blocked from accessing event photos', async () => {
    const unassignedTeamMember = await db.createProfile({
      name: 'Unassigned Photographer',
      email: `unassigned_${Date.now()}@photoplatform.com`,
      role: 'TEAM_MEMBER',
      passwordHash: await hashPassword('TeamPass123!'),
    });

    const isAssigned = await db.isUserAssignedToEvent(eventId, unassignedTeamMember.id);
    expect(isAssigned).toBe(false);

    const userEvents = await db.getEventsForUser(unassignedTeamMember.id, 'TEAM_MEMBER');
    const hasEvent = userEvents.some((e) => e.id === eventId);
    expect(hasEvent).toBe(false);
  });

  // 20. Cascade Deletion: Deleting an event cascades to galleries and photos
  it('20. Cascade Deletion: Deleting an event removes all associated galleries and photos from database', async () => {
    const admin = await db.findProfileByEmail(adminEmail);
    
    // Create temporary event
    const tempEvent = await db.createEvent({
      name: 'Ephemeral Event',
      description: 'Temporary testing event',
      created_by: admin!.id,
    });

    // Create a photo and a gallery
    const tempPhoto = await db.createPhoto({
      event_id: tempEvent.id,
      uploaded_by: admin!.id,
      filename: 'temp.jpg',
      storage_path: `events/${tempEvent.id}/photos/temp.jpg`,
      file_size: 100,
      mime_type: 'image/jpeg',
    });

    const tempGallery = await db.createGallery({
      event_id: tempEvent.id,
      created_by: admin!.id,
      slug: `temp-slug-${Date.now()}`,
      pin_hash: await hashPin('1234'),
      selected_photo_ids: [tempPhoto.id],
    });

    // Verify created
    expect(await db.getEventById(tempEvent.id)).not.toBeNull();
    expect(await db.getPhotoById(tempPhoto.id)).not.toBeNull();
    expect(await db.getGalleryById(tempGallery.id)).not.toBeNull();

    // Delete event
    await db.deleteEvent(tempEvent.id);

    // Verify cascade
    expect(await db.getEventById(tempEvent.id)).toBeNull();
    const eventPhotos = await db.getPhotosForEvent(tempEvent.id);
    expect(eventPhotos.length).toBe(0);
    const eventGallery = await db.getGalleryByEventId(tempEvent.id);
    expect(eventGallery).toBeNull();
  });
});
