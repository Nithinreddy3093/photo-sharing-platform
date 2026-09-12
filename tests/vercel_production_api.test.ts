import { describe, it, expect } from 'vitest';
import request from 'supertest';
import vercelApp from '../api/index.ts';
import { db } from '../server/db.ts';

describe('Vercel Production Serverless Architecture & API Routes', () => {
  let adminToken: string;
  let teamToken: string;
  let validGallerySlug = 'summer-gala-2026-vip';
  let validGalleryPin = '4826';
  let galleryAccessToken: string;

  it('1. Vercel Entrypoint & Health Check: /api/health returns valid JSON', async () => {
    const res = await request(vercelApp)
      .get('/api/health')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('2. Vercel Direct /health (stripped prefix compatibility): returns valid JSON', async () => {
    const res = await request(vercelApp)
      .get('/health')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.status).toBe('ok');
  });

  it('3. Unknown API Route: returns 404 JSON, NEVER HTML error page', async () => {
    const res = await request(vercelApp)
      .get('/api/unmatched/unknown-path')
      .expect(404);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).toContain('API endpoint not found');
  });

  it('4. Staff Login - Valid Credentials: POST /api/auth/login returns valid JSON session', async () => {
    const res = await request(vercelApp)
      .post('/api/auth/login')
      .send({
        email: 'admin@photoplatform.com',
        password: 'AdminPass123!',
      })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('admin@photoplatform.com');
    expect(res.body.user.role).toBe('ADMIN');
    adminToken = res.body.token;
  });

  it('5. Staff Login - Invalid Credentials: returns 401 JSON, NOT HTML', async () => {
    const res = await request(vercelApp)
      .post('/api/auth/login')
      .send({
        email: 'admin@photoplatform.com',
        password: 'WrongPassword999!',
      })
      .expect(401);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('6. Customer Gallery Info: GET /api/gallery/:slug/info returns gallery metadata', async () => {
    const res = await request(vercelApp)
      .get(`/api/gallery/${validGallerySlug}/info`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.gallery).toBeDefined();
    expect(res.body.gallery.slug).toBe(validGallerySlug);
    expect(res.body.gallery.eventName).toBeDefined();
  });

  it('7. Customer Gallery PIN Verification - Correct PIN: returns JSON with galleryToken', async () => {
    const res = await request(vercelApp)
      .post(`/api/gallery/${validGallerySlug}/verify`)
      .send({ pin: validGalleryPin })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.success).toBe(true);
    expect(res.body.galleryToken).toBeDefined();
    expect(res.body.gallery).toBeDefined();
    expect(res.body.gallery.slug).toBe(validGallerySlug);
    galleryAccessToken = res.body.galleryToken;
  });

  it('8. Customer Gallery PIN Verification - Wrong PIN: returns 401 JSON error', async () => {
    const res = await request(vercelApp)
      .post(`/api/gallery/${validGallerySlug}/verify`)
      .send({ pin: '0000' })
      .expect(401);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toBe('Incorrect PIN. Please try again.');
  });

  it('9. Customer Gallery PIN Verification - Nonexistent Gallery: returns 404 JSON error', async () => {
    const res = await request(vercelApp)
      .post('/api/gallery/does-not-exist-slug/verify')
      .send({ pin: '1234' })
      .expect(404);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toBe('Gallery not found.');
  });

  it('10. Customer Gallery Photos - Valid Token: returns 200 JSON with photo list', async () => {
    const res = await request(vercelApp)
      .get(`/api/gallery/${validGallerySlug}/photos`)
      .set('x-gallery-token', galleryAccessToken)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.photos).toBeDefined();
    expect(Array.isArray(res.body.photos)).toBe(true);
  });

  it('11. Customer Gallery Photos - Unauthenticated: returns 401 JSON error', async () => {
    const res = await request(vercelApp)
      .get(`/api/gallery/${validGallerySlug}/photos`)
      .expect(401);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toBe('Gallery PIN verification required to access this gallery.');
  });

  it('12. Customer Gallery Photos - Cross Gallery Isolation: rejects token for mismatched gallery', async () => {
    const res = await request(vercelApp)
      .get('/api/gallery/other-gallery-slug/photos')
      .set('x-gallery-token', galleryAccessToken)
      .expect(403);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toContain('Access token does not match requested gallery');
  });

  it('13. Admin Dashboard & Events: authenticated request succeeds with valid JSON', async () => {
    const res = await request(vercelApp)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.totalEvents).toBeGreaterThanOrEqual(1);
  });

  it('14. Config Status: GET /api/config-status returns JSON with Firebase status', async () => {
    const res = await request(vercelApp)
      .get('/api/config-status')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.status).toBe('ok');
    expect(res.body.firebaseConfigured).toBe(true);
  });
});
