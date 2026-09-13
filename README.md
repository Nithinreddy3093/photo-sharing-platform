📸 Photo Sharing Platform — Collaborative Event Photography

TrizenAI Technologies Private Limited — Full Stack Internship Challenge

A full-stack photo sharing platform designed for professional photography teams and event studios.

The platform enables Admins to create and manage events, assign photographers, review and curate uploaded photos, and publish secure customer galleries. Team Members can upload photos to their assigned events, while Customers can access published galleries using a shareable URL and PIN.

🚀 Live Demo 

Production Application: https://photo-sharing-platform-kappa.vercel.app/

Demo Admin

Email: admin@photoplatform.com

Password: AdminPass123!

Demo Team Member

Email: team@photoplatform.com

Password: TeamPass123!

Demo Customer Gallery

Gallery: YOUR_VERCEL_PRODUCTION_URL/gallery/summer-gala-2026-vip

PIN: 4826

⚠️ Verify the demo credentials and gallery URL against the final production deployment before submission.

✨ Features

👨‍💼 Admin / Lead

Secure login and authentication

Create and manage events

Assign Team Members to events

View uploaded photos from event photographers

Filter and review photos

Select photos for customer delivery

Create customer galleries

Configure and regenerate gallery PINs

Publish curated galleries

Generate shareable gallery URLs

View event and photo activity

📷 Team Member / Photographer

Secure login

View assigned events

Upload multiple photos

Drag-and-drop photo upload

JPG, PNG and WEBP support

Maximum 10MB per photo

View own uploaded photos

Event-level access isolation

Cannot publish galleries

Cannot modify other photographers' photos

Cannot access unassigned events

👤 Customer

No account or registration required

Access gallery through a unique URL

PIN-protected gallery access

Brute-force protection

View only Admin-selected and published photos

Responsive photo gallery

Fullscreen/lightbox viewer

High-resolution photo access/download where enabled

🏗️ Technology Stack

Layer

Technology

Frontend

React 18

Language

TypeScript

Styling

Tailwind CSS

Backend API

Express

Authentication

Firebase Authentication + Server-side JWT

Database

Cloud Firestore

Object/File Storage

Firebase Storage

Password/PIN Hashing

bcrypt

Authorization

Server-side role and event access middleware

Testing

Vitest + Firebase Rules Tests

Deployment

Vercel

Source Control

GitHub

Firebase is used as the unified backend for Authentication, Firestore and Storage.

🏛️ System Architecture

                              ┌───────────────────────┐
                              │    Client Browsers    │
                              └───────────┬───────────┘
                                          │
                ┌─────────────────────────┼─────────────────────────┐
                │                         │                         │
                ▼                         ▼                         ▼
       ┌────────────────┐        ┌────────────────┐        ┌────────────────┐
       │     Admin      │        │  Team Member   │        │    Customer    │
       │   Dashboard    │        │ Photo Upload   │        │  Gallery + PIN │
       │   Curation     │        │ Assigned Events│        │ Curated Photos │
       └───────┬────────┘        └───────┬────────┘        └───────┬────────┘
               │                         │                         │
               └─────────────────────────┼─────────────────────────┘
                                         │
                                  HTTP / REST + JWT
                                         │
                                         ▼
                         ┌──────────────────────────────┐
                         │       Express API            │
                         │──────────────────────────────│
                         │ Authentication & Authorization│
                         │ Role / Event Access Controls │
                         │ PIN Verification + Rate Limit│
                         │ File Validation              │
                         │ Secure Photo Delivery        │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                         ▼                             ▼
              ┌────────────────────┐       ┌────────────────────┐
              │   Cloud Firestore  │       │ Firebase Storage   │
              │────────────────────│       │────────────────────│
              │ Users / Admins     │       │ Private bucket    │
              │ Events / Members   │       │ events/{id}/photos│
              │ Photo Metadata     │       │ Storage Rules     │
              │ Galleries          │       │ Signed/HMAC Access│
              │ Gallery Secrets    │       └────────────────────┘
              └────────────────────┘

🔄 Application Workflow

Admin Login
     │
     ▼
Create Event
     │
     ▼
Assign Team Member
     │
     ▼
Team Member Login
     │
     ▼
Upload Photos
     │
     ▼
Admin Reviews Photos
     │
     ▼
Admin Selects Photos
     │
     ▼
Create Gallery + PIN
     │
     ▼
Publish Gallery
     │
     ▼
Customer Receives URL + PIN
     │
     ▼
Customer Enters PIN
     │
     ▼
Customer Views Published Photos

👥 Role & Permission Boundaries

Admin

Full event management

Team assignment

View all event photos

Photo curation

Gallery creation

Gallery publishing

Gallery PIN management

Team Member

Assigned events only

Own photo uploads

Own uploaded-photo management

No gallery publishing

No gallery PIN management

No access to unassigned events

No management of other users' photos

Customer

No staff account

No access to unpublished galleries

No access to unselected photos

Gallery-scoped temporary session after successful PIN verification

🗄️ Database Schema

The application uses Cloud Firestore for application data.

users/{userId}
  - id
  - auth_user_id
  - name
  - email
  - role: "ADMIN" | "TEAM_MEMBER"
  - created_at

admins/{userId}
  - uid
  - email

events/{eventId}
  - id
  - name
  - description
  - created_by
  - created_at
  - updated_at

events/{eventId}/members/{memberId}
  - id
  - event_id
  - user_id
  - created_at

photos/{photoId}
  - id
  - event_id
  - uploaded_by
  - filename
  - storage_path
  - file_size
  - mime_type
  - created_at
  - is_selected

galleries/{galleryId}
  - id
  - event_id
  - created_by
  - slug
  - status: "DRAFT" | "PUBLISHED"
  - published_at
  - created_at
  - updated_at

gallery_secrets/{galleryId}
  - id
  - pin_hash
  - created_at

galleries/{galleryId}/photos/{photoId}
  - id
  - gallery_id
  - photo_id
  - created_at

Photo Storage

Photo files are not stored directly in Firestore.

Actual image files are stored in Firebase Storage:

events/{eventId}/photos/{photoId}

Firestore stores the corresponding metadata and storage path.

🔐 Security

Security is enforced at both the API and Firebase levels.

Authentication

Email/password authentication

Google Sign-In through Firebase Authentication

Server-side authentication and role synchronization

Server-issued JWT for application API authorization

Firebase custom claims for role information

Authorization

Server-side requireAdmin

Server-side requireEventAccess

Event-level Team Member isolation

Photo ownership checks

Gallery ownership and publishing checks

Customer gallery-scoped access

Password & PIN Security

Passwords hashed using bcrypt

Gallery PINs stored only as bcrypt hashes

PIN hashes are never stored in the public gallery document

Customer sessions use temporary gallery-scoped JWTs

Customer JWT expiry: 2 hours

PIN Brute-Force Protection

Maximum 5 failed PIN attempts

15-minute lockout window

Rate limiting based on request/session context

Upload Security

JPEG, PNG and WEBP only

Maximum 10MB per file

Filename sanitization

Storage path validation

Protection against path traversal

Authenticated/event-scoped uploads

Customer Photo Isolation

Customers receive only photographs that:

Belong to the requested gallery.

Have been selected by the Admin.

Are available through a published gallery.

Unselected team uploads and unpublished gallery photos are never exposed through the customer API.

🛡️ Firebase Security Rules

The repository includes:

firestore.rules

storage.rules

Firebase Storage rules enforce:

Authentication requirements

Event assignment checks

Admin access

MIME type restrictions

File-size limits

Scoped storage paths

Firestore rules protect:

User data

Events

Event membership

Photo metadata

Gallery data

Ownership fields

Role-sensitive operations

Server-side authorization remains an additional protection layer for API requests.

🧪 Automated Testing

81 Passing Tests

The project includes 81 automated tests covering functional requirements, authorization, security boundaries, API behavior and Firebase security rules.

A. Critical Challenge Requirements — 32 Tests

tests/critical_scenarios.test.ts

Covers:

Admin authentication

Event creation

Team Member assignment

Admin ownership and IDOR isolation

Assigned-event access

Unassigned-event blocking

Photo upload

Own-photo scoping

Protection against deleting other users' photos

Team Member prohibition from publishing galleries

Photo selection and curation

Gallery slug collision handling

Draft gallery protection

Gallery publishing

Incorrect PIN rejection

Correct PIN verification

Cross-gallery token protection

Unpublished photo isolation

Batch uploads

Non-image rejection

10MB file-size enforcement

Storage path traversal protection

Metadata integrity

B. Platform & Core API Tests — 20 Tests

tests/platform.test.ts

Covers:

Password hashing

JWT generation and validation

Metric aggregation

Rate limiting

HMAC photo streaming signatures

Core API behavior

C. Vercel Production API Tests — 17 Tests

Covers production/serverless API behavior including:

Health endpoint

Configuration endpoint

Authentication endpoints

Event APIs

Photo APIs

Gallery APIs

Authorization behavior

Structured API error responses

Production routing and bundling behavior

D. Firebase Firestore Rules Tests — 12 Tests

tests/firestore.rules.test.ts

Covers adversarial security scenarios including:

Cross-tenant access

Role spoofing

Unassigned Team Member access

Unauthorized writes

Ownership tampering

ID poisoning

Protected field modification

Run Tests

npm test

🔥 Firebase Integration

Firebase provides the unified backend services.

Firebase Authentication

Email/password authentication

Google Sign-In

Role synchronization

Custom claims

Cloud Firestore

Stores:

User profiles

Admin records

Events

Event memberships

Photo metadata

Galleries

Gallery secrets

Gallery/photo relationships

Firebase Storage

Stores the actual uploaded photo files in a private bucket.

Firebase Configuration Files

firebase-blueprint.json
firestore.rules
storage.rules

⚙️ Local Development

Prerequisites

Node.js

npm

Firebase project

Required Firebase configuration/credentials

1. Clone Repository

git clone YOUR_GITHUB_REPOSITORY_URL
cd photo-sharing-platform

2. Install Dependencies

npm install

3. Configure Environment Variables

Create a .env file using .env.example.

Example:

PORT=3000
NODE_ENV=development

# Server-only secret
JWT_SECRET=replace-with-a-long-random-server-only-secret

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket

Important: Never commit production secrets to GitHub. JWT_SECRET must be a strong random server-only secret and must never use a VITE_ or public/client-side environment variable.

4. Run Tests

npm test

5. Start Development Server

npm run dev

6. Production Build

npm run build
npm start

☁️ Deployment

The application is deployed on Vercel with Firebase providing the backend services.

Deployment Steps

Connect the GitHub repository to Vercel.

Configure production environment variables.

Configure Firebase Authentication for the production domain.

Deploy Firestore security rules.

Deploy Firebase Storage security rules.

Run the production build.

Verify the production API.

Perform the complete Admin → Team Member → Customer workflow.

Production Verification Flow

/api/health
     ↓
Admin Login
     ↓
Create Event
     ↓
Assign Team Member
     ↓
Team Member Login
     ↓
Upload Photo
     ↓
Admin Reviews / Selects Photo
     ↓
Create Gallery
     ↓
Set PIN
     ↓
Publish Gallery
     ↓
Customer Opens Gallery
     ↓
Enter PIN
     ↓
View Published Photo

📊 Project Verification

The application has been verified across the major challenge requirements:

Authentication and role authorization

Admin event creation

Team Member assignment

Event-level access control

Photo upload and persistence

Photo metadata persistence

Admin photo review and selection

Gallery creation

PIN hashing and verification

Gallery publishing

Customer PIN-protected access

Published-photo isolation

Firebase Firestore persistence

Firebase Storage integration

Production API routing

Automated security tests

📁 Repository Documentation

Additional documentation included in the repository:

File

Description

README.md

Project overview and setup

ARCHITECTURE.md

Detailed architecture and security specification

SUBMISSION_CHECKLIST.md

Challenge requirements and evaluation checklist

firestore.rules

Firestore security rules

storage.rules

Firebase Storage security rules

firebase-blueprint.json

Firebase data model/configuration

tests/

Automated functional and security tests

🚧 Known Limitations

Customer access is intentionally account-free and uses a gallery URL + PIN.

Gallery PINs are numerical and protected using bcrypt hashing and rate limiting.

Photo delivery uses controlled/signed access rather than public storage URLs.

The application is designed for the internship challenge and can be further extended for larger production workloads.

🔮 Future Enhancements

Possible future improvements include:

Automatic image thumbnails and resizing

CDN-backed image delivery

Gallery expiration dates

Advanced photo search and filtering

Pagination for large events

Bulk photo downloads

Enhanced bulk upload workflows

CI/CD deployment checks

Expanded monitoring and analytics

📝 Internship Challenge Submission

Organization: TrizenAI Technologies Private Limited

Challenge: Full Stack Internship Challenge

Project: Full Stack Photo Sharing Platform

Live Application: YOUR_VERCEL_PRODUCTION_URL

GitHub Repository: YOUR_GITHUB_REPOSITORY_URL

Demo Admin

Email: admin@photoplatform.com
Password: AdminPass123!

Demo Team Member

Email: team@photoplatform.com
Password: TeamPass123!

Demo Customer Gallery

Gallery: YOUR_VERCEL_PRODUCTION_URL/gallery/summer-gala-2026-vip
PIN: 4826
