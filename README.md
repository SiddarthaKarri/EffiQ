# EffiQ

EffiQ is a smart queue-management web app built with React + TypeScript + Vite + Firebase.
It lets users book time slots, track queue position, manage profiles/bookings, and includes admin tools for scheduling and analytics.

---

## 1) Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Routing: React Router
- Auth: Firebase Authentication (email/password)
- Database: Cloud Firestore
- Charts: Recharts
- Icons/UI helpers: Lucide React, React Datepicker

---

## 2) Features (What users can do)

### User features
- Sign up / login with email & password
- Book slots by category → service → specific service → date → time
- Token-fee based booking with balance checks
- Dashboard for active/upcoming bookings and booking history
- Cancel bookings (with token refund logic)
- Queue tracking page with notifications and estimated wait info
- Emergency fast-track booking (with location detection)
- Profile management (name, phone, password update, payment methods)
- Peak rush analysis for malls (search, crowd trends, history, reviews)
- Dark mode toggle in app layout

### Admin features
- Admin panel to manage service schedules and time slots
- Manage token fees
- View and manage bookings
- Admin analytics dashboard (bookings, status, revenue, occupancy trends)

---

## 3) Project Structure (important files)

- `src/App.tsx` — all routes
- `src/firebaseConfig.ts` — Firebase client config
- `src/pages/*` — feature pages
- `src/components/*` — reusable UI components
- `scripts/firestore/*` — optional Firestore data setup/migration utilities
- `scripts/lib/firebaseAdmin.js` — shared Firebase Admin initialization for scripts

---

## 4) Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm 9+
- A Firebase project with:
  - Authentication (Email/Password enabled)
  - Cloud Firestore enabled

Optional (for root seeding/migration scripts):
- Firebase Admin credentials via environment variables

---

## 5) Initial Setup (Local Development)

### Step A: Install dependencies

```bash
npm install
```

### Step B: Configure Firebase client

Copy env template and fill it with your Firebase web app config:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then update `.env` values:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Get these values from Firebase Console → Project Settings → Your Apps.

### Step C: Run app

```bash
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

---

## 6) Firebase Configuration Checklist

### Authentication
In Firebase Console:
1. Go to **Authentication → Sign-in method**
2. Enable **Email/Password**

### Firestore
1. Create Firestore database
2. Start in test mode for local development (or configure secure rules before production)
3. Ensure key collections exist as data is created:
   - `users`
   - `services`
   - `bookings`
   - `malls` (for Peak Rush Analysis)

---

## 7) Admin Access Setup

Admin pages are protected by auth and service-level admin mappings.

In Firestore `services` documents, add your user UID to:
- `adminId: ["YOUR_USER_UID"]`

After that user logs in, admin panel and analytics can load service data assigned to that admin.

---

## 8) Optional: Seed / Migration Scripts

Scripts are organized under `scripts/firestore/`:
- `scripts/firestore/migrateFirestore.js`
- `scripts/firestore/addServices.js`
- `scripts/firestore/addBookings.js`
- `scripts/firestore/newadd.js`
- `scripts/firestore/peakadd.js`
- `scripts/firestore/reviewsadd.js`
- `scripts/firestore/7hills.js`
- `scripts/firestore/struc.js`

These use **Firebase Admin SDK** and read credentials from environment variables:

- `FIREBASE_SERVICE_ACCOUNT_PATH` (path to service account JSON file), or
- `FIREBASE_SERVICE_ACCOUNT_JSON` (entire JSON content as one string)

Run examples:

```bash
npm run seed:services
npm run db:migrate
npm run db:structure
```

> Important: never commit service account keys or `.env` files to Git.

---

## 9) Available npm Commands

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint
- `npm run seed:services` — seed service data
- `npm run seed:bookings` — copy booking history data to service bookings
- `npm run seed:reviews` — seed mall reviews
- `npm run seed:malls` — seed malls and peak-hour data
- `npm run seed:sevenhills` — seed Seven Hills sample data
- `npm run db:migrate` — run Firestore migration script
- `npm run db:structure` — print Firestore structure for inspection

---

## 10) Build for Production

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` output to your hosting platform.

---

## 11) Common Troubleshooting

### Push blocked by GitHub secret scanning
- Cause: secret detected in git history (for example, service account key)
- Fix: remove secrets from history, rotate compromised keys, push cleaned history

### Firebase auth not working
- Verify Email/Password provider is enabled
- Verify `VITE_FIREBASE_*` values in `.env` are correct

### Empty services / booking dropdowns
- Firestore `services` and `specificServices` data may be missing
- Seed data using your root scripts or add data manually

### Admin panel shows no services
- Current user UID is not in service `adminId` array

---

## 12) Security Notes (must follow)

- Never commit service account keys, API secrets, `.env` secrets, or credentials
- Rotate any key immediately if it was accidentally pushed
- Use least privilege IAM roles for service accounts
- Before production, replace permissive Firestore rules with secure rules

---

## 13) Suggested Next Improvements

- Add role-based route guards for admin routes
- Add test coverage for booking, cancellation, and queue calculations
- Add CI checks for lint/build and secret scanning

---

## 14) Quick Start Summary

```bash
npm install
# copy .env.example to .env and fill VITE_FIREBASE_* values
npm run dev
```

Create an account from `/signup`, then start booking and tracking queues.
