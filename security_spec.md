# Security Specification: Photo Sharing Platform

## 1. Data Invariants
1. **Master Gate & Membership Integrity**: Photos and event member records are strictly scoped subcollections under `/events/{eventId}`. A team member can ONLY upload photos to an event if they have been assigned as an active member in `/events/{eventId}/members/{userId}` or if the user is an Admin.
2. **Identity & Non-Spoofing**: The `uploaded_by` field on a photo MUST strictly match `request.auth.uid`. The `created_by` field on an event or gallery MUST match `request.auth.uid`.
3. **Role Elevation Prevention**: Users cannot modify their own `role` or create arbitrary admin accounts in `/admins/{adminId}`. Admin status is verified via server-authoritative `/admins/{uid}` registry.
4. **Gallery Publishing & Status Protection**: Only an Admin can publish a gallery (`status: 'PUBLISHED'`). Once a gallery is published, its event association and slug cannot be hijacked.
5. **Customer Gallery Access**: Customers access published galleries via secure slug lookups and hashed PIN validation. Draft galleries cannot be viewed by customers.
6. **Immutable Fields**: `created_at`, `event_id`, and `created_by` / `uploaded_by` are strictly immutable once a document is created.
7. **Denial-of-Wallet Guards**: All IDs, string fields, and text inputs are bounded by strict `.size()` constraints to prevent oversized payload attacks.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1: Identity Spoofing (Photo Upload)**
   - Target: `/events/evt-1/photos/ph-1`
   - Attacker attempts to upload a photo setting `uploaded_by: "victim-uid"` while authenticated as `"attacker-uid"`.
   - Expected: `PERMISSION_DENIED`.

2. **Payload 2: Unassigned Team Member Upload**
   - Target: `/events/evt-1/photos/ph-2`
   - Attacker is a valid team member, but is NOT a member of `evt-1` (no `/events/evt-1/members/attacker-uid` record).
   - Expected: `PERMISSION_DENIED`.

3. **Payload 3: Privilege Escalation (Self-Promote to Admin)**
   - Target: `/users/attacker-uid`
   - Attacker sends an update payload changing `role: "ADMIN"`.
   - Expected: `PERMISSION_DENIED`.

4. **Payload 4: Admin Registry Injection**
   - Target: `/admins/attacker-uid`
   - Attacker attempts to create a document in the trusted `/admins` collection.
   - Expected: `PERMISSION_DENIED`.

5. **Payload 5: Ghost Field Injection (Shadow Update)**
   - Target: `/events/evt-1`
   - Attacker attempts to update an event with extra unauthorized fields like `is_approved: true` or `shadow_admin: true`.
   - Expected: `PERMISSION_DENIED`.

6. **Payload 6: Unauthenticated Gallery Creation**
   - Target: `/galleries/gal-1`
   - Unauthenticated client attempts to create or update a gallery record.
   - Expected: `PERMISSION_DENIED`.

7. **Payload 7: Non-Admin Gallery Publish**
   - Target: `/galleries/gal-1`
   - Standard team member attempts to publish or modify gallery records.
   - Expected: `PERMISSION_DENIED`.

8. **Payload 8: ID Poisoning (Oversized Document ID)**
   - Target: `/events/evt-1/photos/` + "A".repeat(1024)
   - Attacker attempts to create a document with an excessively long or malformed ID containing control characters.
   - Expected: `PERMISSION_DENIED`.

9. **Payload 9: Large Payload Denial-of-Wallet Attack**
   - Target: `/events/evt-1`
   - Attacker sends a 5MB description string violating `.size() <= 1000`.
   - Expected: `PERMISSION_DENIED`.

10. **Payload 10: Event Creator Tampering on Update**
    - Target: `/events/evt-1`
    - Attacker tries to alter the immutable `created_by` field to take ownership of an event.
    - Expected: `PERMISSION_DENIED`.

11. **Payload 11: Draft Gallery Read without Auth**
    - Target: `/galleries/draft-gal`
    - Public client tries to read a gallery when `status == 'DRAFT'`.
    - Expected: `PERMISSION_DENIED`.

12. **Payload 12: Orphaned Photo Creation**
    - Target: `/events/non-existent-event-999/photos/ph-test`
    - Attacker attempts to create photos under an event that does not exist in `/events`.
    - Expected: `PERMISSION_DENIED`.
