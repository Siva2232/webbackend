# Lancaster Warranty System Documentation

## Overview

A complete A-to-Z documentation for both frontend and backend. This project is a full-stack system for warranty registration, product management, and service tracking.

- Frontend: React (Vite), Tailwind CSS, lucide-react icons, API calls with axios, mobile-friendly UI.
- Backend: Node.js + Express + MongoDB (Mongoose), JWT auth, product/registration/service management, QR generation.

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Core Flows](#core-flows)
5. [API Endpoints](#api-endpoints)
6. [Security](#security)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Project Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB running locally or connection string for cloud

### Setup frontend

```bash
cd frontend
npm install
npm run dev
```

### Setup backend

```bash
cd webbackend
npm install
npm run dev
```

- `webbackend/.env` should include `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL` etc.

---

## Frontend Architecture

### Folder structure

- `src/main.jsx` – app entry point.
- `src/App.jsx` – route container.
- `src/api/axios.js` – axios instance with baseURL and interceptors.
- `src/Context/AuthContext.jsx` – auth methods and user state.
- `src/Context/DataContext.jsx` – data fetch caching for customers/products.
- `src/pages`:
  - `CustomerHome.jsx` - customer portal.
  - `RegisterWarranty.jsx` - registration flow + QR scanning.
  - `Products.jsx` - admin product management + QR label generation.
  - `Customers.jsx` - admin customer management.
  - `ServiceTracker.jsx` etc.
- `src/components` – modal and UI components.
- `src/layouts` – page layouts, navbars, footer.

### Key features

- QR generator in backend, displayed in frontend as image.
- `RegisterWarranty` uses `model` + base64 `s` token instead of plain `serial` in URL.
- Product/customer list has filter, search, pagination, selection, delete.
- Bulk product generation and print helpers.

### QR security flow

- `Products.jsx` uses:
  - `href="/customer-home?model=${encodeURIComponent(model)}&s=${btoa(serial)}"`
- `CustomerHome.jsx` decodes `s` with `atob` and fetches model from backend.
- `RegisterWarranty.jsx` uses `s` decoded to serial for validation and lock.

---

## Backend Architecture

### Folder structure

- `index.js` - app main with routes and middleware.
- `config/db.js` - mongoose connect.
- `controllers` - logic by domain.
   - `productController.js`: create/get/delete + bulk and QR generation.
   - `registrationController.js`: register/update/delete warranties.
   - `serviceController.js`, `statsController.js`, `notificationController.js`, `authController.js`.
- `models`: `Product.js`, `Registration.js`, `ServiceRecord.js`, `Admin.js`, etc.
- `routes`: Express routes using controllers.
- `middleware/authMiddleware.js`: JWT route protection.
- `utils/qrGenerator.js`: builds QR url with `model` + base64 `s`.

### QR logic

- `generateQRCode(serialNumber, modelNumber)`
  - URL: `${baseUrl}/register-warranty?model=${modelNumber}&s=${base64(serialNumber)}`
  - produces data URL image.

---

## Core Flows

### Add product + QR
1. Admin creates product in `Products.jsx` form.
2. Backend `createProduct` checks duplicate serial.
3. `generateQRCode` builds payload and stores `qrCodeUrl`.
4. Product appears in grid and print preview.

### Customer scan + register
1. Scan code with mobile using `RegisterWarranty` camera.
2. If URL has `s` + `model`, form pre-fills with model and encoded serial.
3. `RegisterWarranty` fetches product details by serial.
4. Submit registration to `POST /register`.

### Security improvement made
- Removed `?serial=` from QR payload.
- Added `s` token base64(serial) + optional `model`.
- Retains fallback for old `serial` param.

---

## API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`

### Products
- `GET /api/products` (protected)
- `GET /api/products/:serial` (public)
- `POST /api/products` (protected)
- `POST /api/products/bulk` (protected)
- `DELETE /api/products/:id` (protected)
- `DELETE /api/products` (bulk, protected)

### Registration
- `POST /api/register` (public)
- `GET /api/register` (protected)
- `PUT /api/register/:id` (protected)
- `DELETE /api/register/:id` (protected)
- `DELETE /api/register` (bulk protected)

### Service
- `/api/service` with list and update routes.

---

## Security

- Password verify for deletion operations.
- Business logic ensures protected updates on core data.
- Use HTTPS on production for all endpoints.

### Security checklist
- [x] HTTPS enforced in production environment.
- [x] Strong JWT secret in `JWT_SECRET` and rolling keys as needed.
- [x] `express-rate-limit` installed (`/api` endpoint at 100 requests/15m).
- [x] `helmet`, `xss-clean`, `express-mongo-sanitize`, `hpp` configured in backend.
- [x] `express-validator` on all request payloads in auth/product/registration/service routes.
- [x] Global 404 + error handler in `index.js`.
- [x] Token auto logout on 401 in axios interceptor.
- [x] CORS restricted to `FRONTEND_URL` only (production domain blocklist).
- [x] Request size limit in body parser `express.json({ limit: '10kb' })`.
- [x] HTTP request logging with `morgan("combined")` for login/audit/security events.

### CI / security checks
- Add `webbackend/package.json` script: `npm run audit` → `npm audit --audit-level=high`.
- Add `webbackend/package.json` script: `npm run security-check` → `npm run audit && npm run test`.
- Run `npm run security-check` before merge or deploy.

### To further harden
- Replace base64 token with secure JWT/HMAC URL token.
- Rate limit registration endpoint.
- Validate `modelNumber` from token URL.

---

## Deployment

### Frontend
- Build: `npm run build`.
- Serve static from Netlify/Vercel or any static host.

### Backend
- `npm run start` or `npm run dev`.
- Ensure `MONGO_URI` in environment.
- `FRONTEND_URL` should match actual public frontend URL.

---

## Troubleshooting

- Favicon path for Vite should be `/src/assets/Logo11.png` in `frontend/index.html`.
- On auth failure, verify `JWT_SECRET` and token expiry.
- On product scanning mismatch, confirm `s` base64 decode of expected serial.

---

## Notes

- Keep docs in `DOCUMENTATION.md` and move to `/docs/` if desired.
- Add extra subsections as technology evolves.

---

## Quick commands

- `npm i` in both directories
- `npm run dev` in both directories
- `npm test` currently placeholder

---
## Today’s Updates (21 March 2026)

### Frontend
- Added functional "Forgot password" flow in `frontend/src/pages/AdminLogin.jsx`.
- New modal form includes email + current password + new password.
- Added visual status feedback for success/failure in modal (`ShieldCheck`, red error banner).
- Fixed modal submission scope: moved modal outside login form so password reset does not trigger login submission.
- Updated API call to `POST /api/auth/forgot-password`.
- Added `ShieldCheck` import to avoid runtime icon errors.

### Backend
- Replaced `changePassword` with `forgotPassword` in `webbackend/controllers/authController.js`.
- `forgotPassword` verifies current password, hashes new password with bcrypt, and updates using `findByIdAndUpdate` (robust against pre-save double-hashing issues).
- Added route `POST /api/auth/forgot-password` in `webbackend/routes/authRoutes.js`.
- Added seeded admin user `admin1@lancaster.com` in `webbackend/seedAdmin.js`.
- Reset all admin passwords in DB to `lancaster@123` with correct hashing.

### Notifications
- Enhanced `Navbar` and service logic to auto-load notifications (unread count + list) without manual click; the bell count refreshes every 10 seconds.
- Added service-specific notifications for `SERVICE_IN_PROGRESS` and `SERVICE_RETURNED` with technician name in message.

### QR Expiry and Service Dashboard
- `Products.jsx` now marks QR records created more than 24 hours ago as `Locked`, with `Deletable` only for records within the first 24 hours.
- Backend checks in `productController` reject deletes beyond 24h and returns count details for `deleted` vs `blocked`.
- AdminFooter and navbar now support a dedicated **Service dashboard** context with minimal service-only nav links (SERVICE_PORTAL mode) separated from main admin links.

### Verification
- Frontend production build passes: `vite build` success verified.
- No more 400 login errors from forgot-password flow.

---
## Conclusion

This file is the complete A-Z guidance for your app. Modify with your own environment values and continue iteration.
