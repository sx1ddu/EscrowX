# TrustTrade — Escrow-Based P2P Marketplace

TrustTrade is a full-stack peer-to-peer marketplace where every order is protected by escrow: a buyer's payment is held until delivery is confirmed (or auto-released after a grace period), with built-in disputes, real-time chat, and AI-assisted listings and fraud scoring.

Built with the **MERN** stack (MongoDB, Express, React, Node.js) plus Socket.IO for real-time features, Redis/Bull for background jobs, Razorpay for payments, and Google Gemini for AI features.

## ✨ Features

- **Escrow payments** — Funds are held after checkout and only released to the seller once the buyer confirms delivery, or automatically after a configurable grace period.
- **Role-based access** — Buyer, Seller, and Admin roles with protected and role-gated routes on both client and server.
- **Authentication** — Email/password with OTP email verification, JWT access + refresh tokens, and OAuth login via Google and GitHub.
- **Product listings** — Sellers create listings with multi-image upload (Cloudinary), category/condition tags, and full-text search.
- **AI-assisted listings** — Google Gemini generates an enhanced product description at listing time.
- **Real-time chat** — Buyer–seller messaging per product/order via Socket.IO, with typing indicators and unread tracking.
- **Disputes & AI risk scoring** — Either party can raise a dispute with evidence uploads; Gemini assigns an automatic fraud-risk score to help admins triage.
- **Admin dashboard** — Platform-wide stats, user management (ban/unban), product moderation, and dispute resolution.
- **Reviews & ratings** — Post-order reviews between buyer and seller, rolled up into user ratings.
- **Seller wallet** — Tracks balance, platform fee deductions, and released earnings per order.
- **Notifications** — In-app real-time notifications via Socket.IO rooms.

## 🏗️ Tech Stack

**Frontend (`client/`)**
- React 19 + Vite
- Redux Toolkit + React Redux (state) and TanStack Query (server state)
- React Router v7
- Tailwind CSS
- React Hook Form + Zod (forms & validation)
- Socket.IO Client
- Recharts (dashboards), Lucide React (icons), React Hot Toast (notifications)

**Backend (`server/`)**
- Node.js + Express 5
- MongoDB + Mongoose
- Socket.IO (real-time chat & notifications)
- Redis (ioredis) + Bull (escrow auto-release queue)
- Passport.js (Google & GitHub OAuth)
- JSON Web Tokens (access + refresh)
- Razorpay (payments & webhooks)
- Cloudinary + Multer (image uploads)
- Google Gemini (`@google/genai`) — AI descriptions & dispute risk scoring
- Nodemailer (OTP / transactional email)
- Winston + Morgan (logging), Helmet (security headers), express-rate-limit

## 📂 Project Structure

```
TrustTrade/
├── client/                      # React frontend (Vite)
│   └── src/
│       ├── components/          # auth guards, layout, shared UI
│       ├── pages/                # auth, buyer, seller, admin pages
│       ├── store/                # Redux slices + API client (Axios)
│       ├── hooks/                # useSocket, usePayment
│       └── constants/
│
├── server/                      # Express backend
│   └── src/
│       ├── config/              # db, redis, cloudinary, passport, razorpay
│       ├── controllers/         # auth, product, order, payment, chat, dispute, review, admin, user
│       ├── routes/
│       ├── models/              # user, product, order, dispute, chat, review
│       ├── middlewares/         # auth, error handler, rate limiter
│       ├── sockets/              # Socket.IO setup & helpers
│       ├── jobs/                 # Bull queue — escrow auto-release
│       └── utils/                # jwt, email, logger, apiResponse
│
└── docs/
```

## 🔄 How the Escrow Flow Works

1. **Order placed** — Buyer checks out; an `Order` is created with `escrowStatus: pending`.
2. **Payment** — Buyer pays via Razorpay; on verified payment, escrow status moves to `funded` and funds are considered held by the platform. A 2% platform fee is calculated and the remaining seller payout amount is recorded.
3. **Delivery** — Seller ships/delivers; order status updates accordingly.
4. **Release** — Buyer confirms delivery → status becomes `delivered` then `released`, and the seller's wallet is credited. If the buyer doesn't act, a Bull job **auto-releases** the funds after the configured window.
5. **Disputes** — Either party can raise a dispute on a `funded`/`delivered` order instead of releasing funds. Gemini scores the dispute for fraud risk to help admins prioritize review; an admin resolves it in favor of buyer or seller.

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS)
- MongoDB (local or Atlas)
- Redis (local or hosted, e.g. Upstash)
- Accounts/API keys for: Razorpay, Cloudinary, Google OAuth, GitHub OAuth, an SMTP provider, and Google Gemini

### 1. Clone and install

```bash
git clone <repo-url>
cd TrustTrade

# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure environment variables

**`server/.env`** (copy from `server/.env.example`):

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/trusttrade

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Redis
REDIS_URL=redis://localhost:6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=TrustTrade <noreply@trusttrade.com>

# Google Gemini (AI descriptions & dispute risk scoring)
GEMINI_API_KEY=your_gemini_api_key

# OAuth Redirect
OAUTH_REDIRECT_URL=http://localhost:5173/auth/callback
```

> **Note:** `GEMINI_API_KEY` is required for AI-generated product descriptions and dispute risk scoring but isn't listed in `server/.env.example` — add it manually as shown above. The AI calls are wrapped in try/catch, so the app keeps working without it; you'll just lose those AI-only features.

**`client/.env`** (copy from `client/.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 3. Run the app

```bash
# Terminal 1 — backend (http://localhost:5000)
cd server
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm run dev
```

Visit `http://localhost:5173` and `GET http://localhost:5000/health` to confirm the API is up.

## 📡 Key API Endpoints

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `/verify-otp`, `/login`, `/refresh-token`, `/logout`, `/forgot-password`, `/reset-password`, `GET /api/auth/google`, `/api/auth/github` |
| Users | `GET /api/users/me`, `PUT /api/users/me`, `GET /api/users/:id` |
| Products | `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` |
| Orders | `POST /api/orders`, `GET /api/orders/my`, `GET /api/orders/:id`, `PATCH /api/orders/:id/mark-delivered`, `PATCH /api/orders/:id/cancel` |
| Payments / Escrow | `POST /api/payments/create-order`, `/verify`, `/confirm-delivery/:orderId`, `/release-auto/:orderId` (internal), `GET /api/payments/wallet` |
| Chat | `GET /api/chats`, `GET /api/chats/:id`, `POST /api/chats/start`, `POST /api/chats/:id/messages` |
| Disputes | `POST /api/disputes`, `GET /api/disputes`, `PATCH /api/disputes/:id/resolve` (admin) |
| Reviews | `POST /api/reviews`, `GET /api/reviews/:userId` |
| Admin | `GET /api/admin/stats`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/ban` |

All routes are prefixed with the server's base URL (`http://localhost:5000` in development). Razorpay webhooks are received at `POST /api/payments/webhook`.

## 🔐 User Roles

| Role | Capabilities |
|---|---|
| **Buyer** | Browse/search products, place orders, fund escrow, chat with sellers, confirm delivery, raise disputes, leave reviews |
| **Seller** | Everything a buyer can do, plus create/manage listings, view orders received, track wallet & payouts |
| **Admin** | Platform stats dashboard, manage/ban users, moderate listings, resolve disputes |

## 🧪 Scripts

**Server**
```bash
npm run dev    # start with nodemon (auto-restart)
npm start      # start in production mode
```

**Client**
```bash
npm run dev      # start Vite dev server
npm run build    # production build
npm run preview  # preview production build locally
npm run lint     # run ESLint
```

## 📦 Deployment Notes

- The client includes a `vercel.json`, suggesting Vercel as the intended frontend host.
- The server needs a persistent Node host (Render, Railway, a VM, etc.) since it runs Socket.IO and a Bull worker — not a serverless function.
- Make sure `CLIENT_URL` (server) and `VITE_API_URL` / `VITE_SOCKET_URL` (client) point to your deployed URLs, and that your Razorpay webhook is configured to hit `/api/payments/webhook` on your deployed server.

## 📄 License

No license file is currently included — add one (e.g. MIT) if you intend to open-source this project.
