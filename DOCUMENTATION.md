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

## Conclusion

This file is the complete A-Z guidance for your app. Modify with your own environment values and continue iteration.
