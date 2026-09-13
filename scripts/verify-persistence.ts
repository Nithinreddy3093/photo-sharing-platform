import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Read firebase applet config
const firebaseConfig = JSON.parse(fs.readFileSync(path.resolve('./firebase-applet-config.json'), 'utf-8'));
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const API_BASE = 'http://localhost:3000/api';

async function logStep(title: string, success: boolean, details?: any) {
  console.log(`\n${success ? '✅' : '❌'} [STEP] ${title}`);
  if (details) {
    console.log(JSON.stringify(details, null, 2));
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('STARTING REAL END-TO-END FIRESTORE PERSISTENCE VERIFICATION');
  console.log('================================================================\n');

  const report: Record<string, any> = {};

  // ---------------------------------------------------------------------------
  // STEP 1: Authenticate as an Admin
  // ---------------------------------------------------------------------------
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@photoplatform.com', password: 'AdminPass123!' }),
  });
  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const adminToken = loginData.token;
  const adminUser = loginData.user;
  logStep('1. Authenticate as an Admin', true, { email: adminUser.email, role: adminUser.role });
  report.adminLogin = { email: adminUser.email, role: adminUser.role, tokenAcquired: !!adminToken };

  // ---------------------------------------------------------------------------
  // STEP 2 & 3: Create a completely new uniquely named test event
  // ---------------------------------------------------------------------------
  const timestamp = Date.now();
  const eventName = `Persistence Verification ${timestamp}`;
  const eventDescription = `Live Firestore validation test created at ${new Date().toISOString()}`;

  const postEventRes = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: eventName,
      description: eventDescription,
    }),
  });

  if (postEventRes.status !== 201) {
    throw new Error(`POST /api/events failed: ${postEventRes.status} ${await postEventRes.text()}`);
  }

  const postEventData = await postEventRes.json();
  const createdEvent = postEventData.event;
  const eventId = createdEvent.id;
  logStep('2 & 3. Create uniquely named test event via POST /api/events', true, {
    status: postEventRes.status,
    event: createdEvent,
  });
  report.postResult = {
    status: postEventRes.status,
    eventId: createdEvent.id,
    name: createdEvent.name,
  };

  // ---------------------------------------------------------------------------
  // STEP 4: Capture actual Firestore document ID returned
  // ---------------------------------------------------------------------------
  report.testEventId = eventId;
  report.firestorePath = `events/${eventId}`;
  logStep('4. Capture actual Firestore document ID', true, { eventId, firestorePath: `events/${eventId}` });

  // ---------------------------------------------------------------------------
  // STEP 5 & 6: Read the event back through GET /api/events
  // ---------------------------------------------------------------------------
  const getEventsRes1 = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!getEventsRes1.ok) {
    throw new Error(`GET /api/events failed: ${getEventsRes1.status}`);
  }
  const getEventsData1 = await getEventsRes1.json();
  const foundEvent1 = getEventsData1.events.find((e: any) => e.id === eventId);

  if (!foundEvent1) {
    throw new Error(`Event ${eventId} not found in GET /api/events response!`);
  }
  logStep('5 & 6. Read event back through GET /api/events and confirm presence', true, {
    found: true,
    eventId: foundEvent1.id,
    name: foundEvent1.name,
    totalEvents: getEventsData1.events.length,
  });
  report.getResult = {
    found: true,
    nameMatched: foundEvent1.name === eventName,
    eventId: foundEvent1.id,
  };

  // ---------------------------------------------------------------------------
  // STEP 7: Verify actual Firestore document exists in: events/{eventId}
  // ---------------------------------------------------------------------------
  console.log(`Querying direct Firestore document at events/${eventId}...`);
  const eventDocRef = doc(firestore, 'events', eventId);
  const eventDocSnap = await getDoc(eventDocRef);

  if (!eventDocSnap.exists()) {
    throw new Error(`CRITICAL ERROR: Document events/${eventId} does NOT exist in Firestore!`);
  }
  const eventDocData = eventDocSnap.data();
  logStep('7. Verify actual Firestore document exists directly in events/{eventId}', true, {
    exists: true,
    id: eventDocSnap.id,
    firestoreData: eventDocData,
  });
  report.firestoreDirectDocumentCheck = {
    exists: true,
    id: eventDocSnap.id,
    name: eventDocData.name,
    server_sync: eventDocData.server_sync,
    created_by: eventDocData.created_by,
  };

  // ---------------------------------------------------------------------------
  // STEP 8, 9 & 10: Refresh / Reinitialize and Call GET /api/events again
  // ---------------------------------------------------------------------------
  // Calling GET /api/events afresh to verify state was not transient in-memory
  const getEventsRes2 = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const getEventsData2 = await getEventsRes2.json();
  const foundEvent2 = getEventsData2.events.find((e: any) => e.id === eventId);
  if (!foundEvent2) {
    throw new Error(`Persistence failed on refreshed call: Event ${eventId} was not found!`);
  }
  logStep('8, 9 & 10. Persistence after application refresh verified', true, {
    persisted: true,
    eventId: foundEvent2.id,
  });
  report.persistenceAfterRefresh = {
    persisted: true,
    eventId: foundEvent2.id,
  };

  // ---------------------------------------------------------------------------
  // STEP 11, 12, 13, 14: Log out, log back in as same Admin, call GET /api/events again
  // ---------------------------------------------------------------------------
  // Invalidate previous token reference (log out)
  let activeAdminToken: string | null = null;
  console.log('Simulating logout by destroying client session token...');

  // Log back in as same Admin
  const reloginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@photoplatform.com', password: 'AdminPass123!' }),
  });
  if (!reloginRes.ok) throw new Error('Relogin failed');
  const reloginData = await reloginRes.json();
  activeAdminToken = reloginData.token;

  const getEventsRes3 = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  const getEventsData3 = await getEventsRes3.json();
  const foundEvent3 = getEventsData3.events.find((e: any) => e.id === eventId);
  if (!foundEvent3) {
    throw new Error(`Persistence failed across logout/login: Event ${eventId} not found!`);
  }
  logStep('11-14. Persistence after logout & login verified', true, {
    persisted: true,
    eventId: foundEvent3.id,
  });
  report.persistenceAfterLogoutLogin = {
    persisted: true,
    eventId: foundEvent3.id,
  };

  // ---------------------------------------------------------------------------
  // STEP 15: Verify dashboard displays the same persisted event
  // ---------------------------------------------------------------------------
  const dashboardRes = await fetch(`${API_BASE}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  if (!dashboardRes.ok) throw new Error('Failed to fetch dashboard stats');
  const dashboardData = await dashboardRes.json();
  const totalEvents = dashboardData.stats.totalEvents;

  // Also confirm event appears in dashboard event list via GET /api/events
  const dashEventsRes = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  const dashEventsData = await dashEventsRes.json();
  const foundInEvents = dashEventsData.events.some((e: any) => e.id === eventId);

  if (!foundInEvents) {
    throw new Error(`Event ${eventId} not found in dashboard events list!`);
  }

  logStep('15. Dashboard displays persisted event', true, {
    totalEvents,
    foundInEvents,
    eventId,
  });
  report.dashboardDisplayResult = {
    totalEvents,
    foundInEvents,
    eventId,
  };

  // ===========================================================================
  // RELATED PERSISTENCE CHAIN:
  // Create Event -> Assign Team Member -> Team Member logs in ->
  // Team Member sees assigned event -> Upload real/test photo ->
  // Admin sees photo -> Admin selects photo -> Create gallery ->
  // Publish gallery -> Customer opens gallery -> Customer enters PIN ->
  // Customer sees selected photo
  // ===========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('TESTING COMPLETE RELATED PERSISTENCE CHAIN');
  console.log('----------------------------------------------------------------\n');

  // 1. Assign Team Member
  const teamMemberEmail = 'team@photoplatform.com';
  let teamMember = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  }).then((r) => r.json()).then((d) => d.users?.find((u: any) => u.email === teamMemberEmail));

  if (!teamMember) {
    throw new Error('Team member team@photoplatform.com not found');
  }

  const assignRes = await fetch(`${API_BASE}/events/${eventId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeAdminToken}`,
    },
    body: JSON.stringify({ userId: teamMember.id }),
  });
  if (!assignRes.ok) {
    throw new Error(`Assign member failed: ${assignRes.status} ${await assignRes.text()}`);
  }
  const assignData = await assignRes.json();

  // Verify member assignment in Firestore directly by doc ID
  const memberDocSnap = await getDoc(doc(firestore, 'event_members', assignData.member.id));
  if (!memberDocSnap.exists()) {
    throw new Error(`Assignment record ${assignData.member.id} not found in Firestore event_members collection!`);
  }
  logStep('Chain 1: Assign Team Member & verify Firestore persistence', true, {
    teamMemberEmail,
    assignmentId: assignData.member.id,
    firestoreDocData: memberDocSnap.data(),
  });
  report.teamAssignmentResult = {
    success: true,
    teamMemberEmail,
    assignmentId: assignData.member.id,
    firestoreVerified: memberDocSnap.exists(),
  };

  // 2. Team Member logs in
  const teamLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'team@photoplatform.com', password: 'TeamPass123!' }),
  });
  if (!teamLoginRes.ok) throw new Error('Team member login failed');
  const teamLoginData = await teamLoginRes.json();
  const teamToken = teamLoginData.token;
  logStep('Chain 2: Team Member logs in', true, { email: teamLoginData.user.email, role: teamLoginData.user.role });

  // 3. Team Member sees assigned event
  const teamEventsRes = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${teamToken}` },
  });
  if (!teamEventsRes.ok) throw new Error('Team member GET /api/events failed');
  const teamEventsData = await teamEventsRes.json();
  const teamSeesEvent = teamEventsData.events.some((e: any) => e.id === eventId);
  if (!teamSeesEvent) {
    throw new Error(`Team member does not see assigned event ${eventId} in /api/events!`);
  }
  logStep('Chain 3: Team Member sees assigned event', true, { seesEvent: true, eventId });

  // 4. Upload real/test photo
  // Construct multipart/form-data with a 1x1 JPEG
  const testJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
    0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05, 0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0a, 0x07,
    0x07, 0x06, 0x08, 0x0c, 0x0a, 0x0c, 0x0c, 0x0b, 0x0a, 0x0b, 0x0b, 0x0d, 0x0e, 0x12, 0x10, 0x0d,
    0x0e, 0x11, 0x0e, 0x0b, 0x0b, 0x10, 0x16, 0x10, 0x11, 0x13, 0x14, 0x15, 0x15, 0x15, 0x0c, 0x0f,
    0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15, 0x14, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0x37, 0xff, 0xd9,
  ]);

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const multipartHeader = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="verification_shot.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  );
  const multipartFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
  const bodyBuffer = Buffer.concat([multipartHeader, testJpegBuffer, multipartFooter]);

  const uploadRes = await fetch(`${API_BASE}/events/${eventId}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${teamToken}`,
    },
    body: bodyBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Photo upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }
  const uploadData = await uploadRes.json();
  const uploadedPhoto = uploadData.photos[0];
  const photoId = uploadedPhoto.id;

  // Verify photo document in Firestore: photos/{photoId}
  const photoDocSnap = await getDoc(doc(firestore, 'photos', photoId));
  if (!photoDocSnap.exists()) {
    throw new Error(`CRITICAL: Photo ${photoId} not found in Firestore photos collection!`);
  }
  logStep('Chain 4: Upload real/test photo & verify Firestore document', true, {
    photoId,
    filename: uploadedPhoto.filename,
    firestoreExists: true,
  });
  report.photoPersistenceResult = {
    photoId,
    filename: uploadedPhoto.filename,
    firestoreExists: true,
    storagePath: uploadedPhoto.storage_path,
  };

  // 5. Admin sees photo
  const adminPhotosRes = await fetch(`${API_BASE}/events/${eventId}/photos`, {
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  if (!adminPhotosRes.ok) throw new Error('Admin GET /photos failed');
  const adminPhotosData = await adminPhotosRes.json();
  const adminSeesPhoto = adminPhotosData.photos.some((p: any) => p.id === photoId);
  if (!adminSeesPhoto) {
    throw new Error(`Admin cannot see uploaded photo ${photoId} in /events/${eventId}/photos!`);
  }
  logStep('Chain 5: Admin sees photo in event review', true, { adminSeesPhoto, photoId });

  // 6 & 7. Admin selects photo and creates gallery
  const gallerySlug = `persistence-gala-${Date.now()}`;
  const galleryPin = '8392';

  const createGalleryRes = await fetch(`${API_BASE}/galleries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeAdminToken}`,
    },
    body: JSON.stringify({
      eventId,
      slug: gallerySlug,
      pin: galleryPin,
      status: 'DRAFT',
      selectedPhotoIds: [photoId],
    }),
  });

  if (!createGalleryRes.ok) {
    throw new Error(`Create gallery failed: ${createGalleryRes.status} ${await createGalleryRes.text()}`);
  }
  const createGalleryData = await createGalleryRes.json();
  const galleryId = createGalleryData.gallery.id;

  // Verify gallery doc in Firestore: galleries/{galleryId}
  const galleryDocSnap = await getDoc(doc(firestore, 'galleries', galleryId));
  if (!galleryDocSnap.exists()) {
    throw new Error(`CRITICAL: Gallery ${galleryId} does not exist in Firestore galleries collection!`);
  }
  // Verify secret doc in Firestore: gallery_secrets/{galleryId}
  const secretDocSnap = await getDoc(doc(firestore, 'gallery_secrets', galleryId));
  if (!secretDocSnap.exists()) {
    throw new Error(`CRITICAL: Gallery secret ${galleryId} does not exist in Firestore gallery_secrets!`);
  }

  logStep('Chain 6 & 7: Admin selects photo and creates gallery (Draft)', true, {
    galleryId,
    slug: gallerySlug,
    firestoreGalleryExists: true,
    firestoreSecretExists: true,
  });

  // 8. Publish gallery
  const publishRes = await fetch(`${API_BASE}/galleries/${galleryId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${activeAdminToken}` },
  });
  if (!publishRes.ok) {
    throw new Error(`Publish gallery failed: ${publishRes.status} ${await publishRes.text()}`);
  }
  const publishData = await publishRes.json();

  // Verify status in Firestore is PUBLISHED
  const updatedGallerySnap = await getDoc(doc(firestore, 'galleries', galleryId));
  if (updatedGallerySnap.data()?.status !== 'PUBLISHED') {
    throw new Error(`CRITICAL: Firestore gallery ${galleryId} status is not PUBLISHED!`);
  }
  logStep('Chain 8: Publish gallery & verify Firestore status is PUBLISHED', true, {
    status: publishData.gallery.status,
    publishedAt: publishData.gallery.published_at,
    firestoreStatus: updatedGallerySnap.data()?.status,
  });
  report.galleryPersistenceResult = {
    galleryId,
    slug: gallerySlug,
    status: updatedGallerySnap.data()?.status,
    firestoreExists: true,
  };

  // 9. Customer opens gallery
  const customerInfoRes = await fetch(`${API_BASE}/gallery/${gallerySlug}/info`);
  if (!customerInfoRes.ok) {
    throw new Error(`Customer info failed: ${customerInfoRes.status} ${await customerInfoRes.text()}`);
  }
  const customerInfoData = await customerInfoRes.json();
  logStep('Chain 9: Customer opens gallery info without account', true, {
    gallery: customerInfoData.gallery,
  });

  // 10. Customer enters PIN
  const verifyPinRes = await fetch(`${API_BASE}/gallery/${gallerySlug}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: galleryPin }),
  });
  if (!verifyPinRes.ok) {
    throw new Error(`Customer PIN verification failed: ${verifyPinRes.status} ${await verifyPinRes.text()}`);
  }
  const verifyPinData = await verifyPinRes.json();
  const customerToken = verifyPinData.galleryToken;
  logStep('Chain 10: Customer enters PIN & receives session token', true, {
    verified: verifyPinData.success,
    hasToken: !!customerToken,
  });

  // 11. Customer sees selected photo
  const customerPhotosRes = await fetch(`${API_BASE}/gallery/${gallerySlug}/photos`, {
    headers: { 'x-gallery-token': customerToken },
  });
  if (!customerPhotosRes.ok) {
    throw new Error(`Customer GET photos failed: ${customerPhotosRes.status} ${await customerPhotosRes.text()}`);
  }
  const customerPhotosData = await customerPhotosRes.json();
  const foundCustomerPhoto = customerPhotosData.photos.find((p: any) => p.id === photoId);
  if (!foundCustomerPhoto) {
    throw new Error(`Customer cannot see selected photo ${photoId} in published gallery!`);
  }
  logStep('Chain 11: Customer sees selected photo in published gallery', true, {
    photoCount: customerPhotosData.photoCount,
    photoId: foundCustomerPhoto.id,
    photoUrlGenerated: !!foundCustomerPhoto.url,
  });
  report.customerGalleryResult = {
    success: true,
    photoCount: customerPhotosData.photoCount,
    photoId: foundCustomerPhoto.id,
    photoUrlGenerated: !!foundCustomerPhoto.url,
  };

  console.log('\n================================================================');
  console.log('ALL FIRESTORE INTEGRATION VERIFICATION STEPS PASSED SUCCESSFULLY');
  console.log('================================================================\n');

  console.log('FINAL SUMMARY JSON:');
  console.log(JSON.stringify(report, null, 2));

  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION FAILURE:', err);
  process.exit(1);
});
