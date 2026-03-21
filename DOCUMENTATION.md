# Lancaster Warranty System - Backend Documentation

## 🚀 Overview
The backend is a Node.js + Express application built on MongoDB. It provides the core business logic for warranty registration, product tracking, service history, and administrator functions.

---

## 🛠 Features

### 1. **Authentication & Security** (Updated)
- **JWT-Based Protection**: All admin and service routes are protected via a `protect` middleware.
- **Failed Login Lockout**: 
  - 3 failed attempts = 15-minute lock.
  - Subsequent failures = 1-hour lock.
  - Tracked in `Admin` model via `loginAttempts` and `lockUntil`.
- **Infrastructure Protection**:
  - `express-rate-limit`: Global API limit (100/15min) and Strict Login limit (10/15min).
  - `helmet`: Critical security headers.
  - `express-mongo-sanitize`: Prevents NoSQL Injections.
  - `hpp`: Prevents HTTP Parameter Pollution.
- **XSS Sanitization**: User inputs are sanitized using the `xss` library before saving.

### 2. **Product Management**
- **Bulk Creation**: Create hundreds of products with unique serial numbers.
- **QR Generation**: Generates labels with secure base64-encoded serial numbers (`s` param).
- **History Tracking**: Links products to customer registrations and service records.

### 3. **Warranty Registration**
- **Digital Registration**: Customers scan a QR code to register.
- **Expiry Logic**: Automatically calculates warranty end dates based on product type.
- **Manual Overrides**: Service centers can create records for non-registered legacy products.

### 4. **Service Records**
- **Workflow-Driven**: Track products from "Store Accept" to "Store Send".
- **Real-Time Status**: Customers lookup status via serial number.

---

## 📂 Project Structure

- `index.js`: App initialization, security middleware, and route registration.
- `config/db.js`: MongoDB connection setup.
- `controllers/`: 
  - `authController.js`: Login, Lockout, and Password resets.
  - `productController.js`: CRUD for products and bulk operations.
  - `registrationController.js`: Customer registration and digital warranties.
  - `serviceController.js`: Service history and repair tracking.
  - `statsController.js`: Dashboard analytics.
- `models/`: Mongoose schemas (`Admin`, `Product`, `Registration`, `ServiceRecord`, `Notification`).
- `routes/`: Express router definitions.
- `utils/qrGenerator.js`: Utility for generating secure QR code data.

---

## 📡 API Endpoints

### **Auth**
- `POST /api/auth/login`: Admin login with lockout tracking.
- `POST /api/auth/register`: Create new admin (requires auth).
- `POST /api/auth/forgot-password`: Update password.

### **Products**
- `GET /api/products`: List all products (Protected).
- `POST /api/products`: Create a single product (Protected).
- `POST /api/products/bulk`: Bulk create products (Protected).
- `DELETE /api/products/:id`: Delete product (Protected).

### **Registrations**
- `POST /api/register`: Public endpoint for warranty sign-up.
- `GET /api/register`: List registrations (Protected).

### **Service**
- `GET /api/service/history`: Lookup status by serial number (Public).
- `POST /api/service`: Add new repair record (Protected).

---

## ⚙️ Environment Variables (.env)
- `PORT`: Server port (default 5000).
- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: Random string for signing tokens.
- `FRONTEND_URL`: URL of the React app for CORS.


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
