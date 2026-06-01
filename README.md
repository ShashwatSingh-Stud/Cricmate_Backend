<div align="center">

# 🏏 CricMate Backend

### *Your Ultimate Cricket Ground Booking & Team Matchmaking Platform*

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Storage-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

---

**CricMate** is a production-ready RESTful API backend for a cricket ecosystem app — enabling players to discover and book cricket grounds, find teammates, organize matches, track live scores, handle payments, and climb leaderboards — all from their phone.

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Background Jobs](#-background-jobs)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [License](#-license)

---

## ✨ Features

### 🔐 Authentication & Users
- **Phone-based OTP login** via Supabase Auth (WhatsApp / SMS)
- JWT token verification with `requireAuth` and `optionalAuth` middleware
- User profile management with avatar, city, colony, date of birth
- Multi-language support (English / Hindi)
- FCM push notification token registration
- Account deletion with full cascade cleanup

### 🏟️ Ground Management
- **CRUD operations** for cricket grounds with rich metadata
- Pitch types: `TURF`, `CONCRETE`, `MATTING`, `BOX`
- Amenity tracking: Lighting, Nets, Parking, Changing Room, Drinking Water
- **Slot-based availability** with configurable open/close times
- Blocked date management for holidays or maintenance
- **Equipment rental** listings per ground (bats, pads, etc.)
- Ground photo uploads via Supabase Storage
- **Review & Rating** system with computed average ratings
- **Nearby search** with geo-coordinates & radius filtering
- City / colony / pincode based filtering and search

### 📅 Booking System
- Slot-based ground booking with date selection
- **Razorpay payment integration** — order creation, verification & webhooks
- Automated **QR code generation** for check-in at grounds
- Equipment rental add-ons during booking
- **Tiered cancellation policy**:
  - `> 24h` before → Full refund
  - `6–24h` before → 50% refund
  - `< 6h` before → No refund
- Platform fee calculation (5%, min ₹10)
- Ground owner dashboard: today's schedule, booking list, revenue analytics

### 🤝 Match Matchmaking
- Create matches with format: `T10`, `T20`, `ODI`, `TEST`, `PRACTICE`
- Match types: `TEAM_GAP` (need players), `CHALLENGE` (team vs team), `PRACTICE`
- **Role-based player requests**: Opener, Middle Order, Wicket Keeper, Fast Bowler, Spinner, Allrounder, etc.
- Skill level filtering: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `OPEN`
- **Application system** — players apply, captains accept/decline
- Match feed with city/colony filtering
- Match lifecycle: `OPEN → FULL → CONFIRMED → LIVE → COMPLETED`

### 📊 Live Scoring Engine
- Ball-by-ball delivery recording with full cricket semantics
- Tracks: runs, wickets, extras (Wide, No Ball, Leg Bye, Bye, Penalty)
- Dismissal types: Bowled, Caught, LBW, Run Out, Stumped, Hit Wicket, etc.
- **Auto-generated commentary** per delivery
- **Live scorecard** with batting & bowling stats (strike rate, economy)
- Innings management (start, record, complete)
- **Offline sync** — batch upload deliveries recorded without connectivity
- Undo last delivery support
- Match result posting with Player of the Match

### 💰 Payments
- **Razorpay** order creation and signature verification
- Webhook-based payment confirmation (raw body parsing for signature check)
- **Cost splitting** — captain sends Razorpay Payment Links to teammates
- Payment types: `BOOKING`, `SPLIT_SHARE`, `MENTOR_SESSION`, `EQUIPMENT_RENTAL`, `SUBSCRIPTION`
- Automated refund processing (full / partial)
- Payment history per user

### 🏆 Leaderboard & Gamification
- **City + Colony scoped leaderboards** with seasonal tracking
- Stats: matches played, runs scored, wickets taken, high score, best bowling, batting avg, bowling economy
- Personal rank lookup
- **Badge system** across 7 categories: Batting, Bowling, Fielding, Reliability, Milestone, Social, Ground
- Bilingual badge names (English + Hindi)
- Badge sharing support

### 👤 Player Discovery
- Browse players by city, colony, role, and skill level
- Detailed player profile with stats, badges, and match history
- **Trust Score** system (1.0 – 5.0):
  - `+0.1` for on-time check-in
  - `-1.0` for no-show
  - `-0.3` for same-day cancellation
  - `+0.2` milestone bonus per 10 matches
- **"CricMate Wrapped"** — annual stats summary (à la Spotify Wrapped)

### 🧑‍🏫 Mentor Sessions
- Experienced players can register as mentors with hourly rate
- Players can browse and book 1-on-1 coaching sessions
- Razorpay payment integration for session booking

### 🔔 Notifications
- **In-app notifications** with bilingual support (EN + HI)
- **WhatsApp notifications** via Twilio (booking confirmation, match applications, payment requests, weather alerts, badge earned)
- Notification types: match application, booking confirmed, match reminder, weather alert, payment request/received, badge earned, challenge received/accepted
- Mark as read (individual / bulk)

### 🌦️ Weather Alerts
- **OpenWeatherMap integration** for next-day rain forecasting
- Automated WhatsApp alerts when rain probability exceeds 50%
- Sent daily at 8 PM for bookings on the next day

### 🛡️ Security & Reliability
- **Helmet** for HTTP security headers
- **CORS** with configurable allowed origins
- **Rate limiting** — global API limiter + stricter auth-specific limiter
- **Zod** request validation on all mutation endpoints
- Centralized error handling with custom error classes
- **Winston** structured logging (file + console)
- Graceful shutdown with SIGINT/SIGTERM handling

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js ≥ 20 | Server runtime |
| **Language** | TypeScript 5.9 | Type-safe development |
| **Framework** | Express 4.x | HTTP server & routing |
| **ORM** | Prisma 6.x | Database access & migrations |
| **Database** | PostgreSQL (Supabase) | Primary data store |
| **Auth** | Supabase Auth | Phone OTP login, JWT verification |
| **Storage** | Supabase Storage | Ground photos, avatars |
| **Payments** | Razorpay | Orders, verification, refunds, payment links |
| **Messaging** | Twilio | WhatsApp notifications |
| **Weather** | OpenWeatherMap API | Rain forecasting & alerts |
| **Geocoding** | Google Maps API | Address ↔ coordinate conversion |
| **QR Codes** | `qrcode` | Booking check-in QR generation |
| **Validation** | Zod | Request schema validation |
| **Scheduling** | node-cron | Background cron jobs |
| **Logging** | Winston | Structured logging |
| **Security** | Helmet, CORS, express-rate-limit | HTTP hardening |
| **Deployment** | Render (Procfile) | Cloud hosting |

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────────────────────────────────┐
│   Mobile App │────▶│              Express Server                  │
│  (Frontend)  │◀────│                                              │
└──────────────┘     │  ┌────────────┐  ┌─────────────────────────┐ │
                     │  │ Middleware  │  │       Routes            │ │
                     │  │ ─ Auth     │  │ /api/auth               │ │
                     │  │ ─ Validate │  │ /api/grounds            │ │
                     │  │ ─ Rate Lim │  │ /api/bookings           │ │
                     │  │ ─ Owner    │  │ /api/matches            │ │
                     │  │ ─ Error    │  │ /api/scoring            │ │
                     │  └────────────┘  │ /api/payments           │ │
                     │                  │ /api/players             │ │
                     │  ┌────────────┐  │ /api/leaderboard        │ │
                     │  │ Services   │  │ /api/notifications      │ │
                     │  │ ─ Payment  │  │ /api/admin              │ │
                     │  │ ─ Weather  │  └─────────────────────────┘ │
                     │  │ ─ Scoring  │                              │
                     │  │ ─ Trust    │  ┌─────────────────────────┐ │
                     │  │ ─ Notif.   │  │     Cron Jobs           │ │
                     │  │ ─ Geocode  │  │ ─ Trust Score Recalc    │ │
                     │  │ ─ Storage  │  │ ─ Weather Alerts        │ │
                     │  │ ─ Wrapped  │  │ ─ Leaderboard Rebuild   │ │
                     │  └────────────┘  │ ─ Wrapped Generate      │ │
                     │                  └─────────────────────────┘ │
                     └──────────────────────────────────────────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
              ┌──────────┐      ┌──────────────┐     ┌──────────────┐
              │ Supabase │      │   Razorpay   │     │   Twilio     │
              │ (DB/Auth │      │  (Payments)  │     │ (WhatsApp)   │
              │ /Storage)│      └──────────────┘     └──────────────┘
              └──────────┘
```

---

## 📂 Project Structure

```
cricmate-backend/
├── prisma/
│   ├── schema.prisma          # Database models & enums (20+ models)
│   └── seed.ts                # Database seed script
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Server entrypoint & Prisma client
│   ├── controllers/           # Request handlers (11 controllers)
│   │   ├── auth.controller.ts
│   │   ├── bookings.controller.ts
│   │   ├── grounds.controller.ts
│   │   ├── matches.controller.ts
│   │   ├── scoring.controller.ts
│   │   ├── payments.controller.ts
│   │   ├── players.controller.ts
│   │   ├── leaderboard.controller.ts
│   │   ├── notifications.controller.ts
│   │   ├── users.controller.ts
│   │   └── admin.controller.ts
│   ├── routes/                # Route definitions (11 route files)
│   ├── services/              # Business logic & third-party integrations
│   │   ├── payment.service.ts       # Razorpay integration
│   │   ├── notification.service.ts  # Twilio WhatsApp + in-app
│   │   ├── weather.service.ts       # OpenWeatherMap forecast
│   │   ├── geocoding.service.ts     # Google Maps geocoding
│   │   ├── scoring.service.ts       # Scorecard & innings calculator
│   │   ├── trust.service.ts         # Trust score algorithm
│   │   ├── leaderboard.service.ts   # Leaderboard aggregations
│   │   ├── storage.service.ts       # Supabase storage uploads
│   │   └── wrapped.service.ts       # Annual player stats summary
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Supabase JWT verification
│   │   ├── validate.middleware.ts    # Zod schema validation
│   │   ├── rateLimit.middleware.ts   # API rate limiting
│   │   ├── groundOwner.middleware.ts # Ground ownership guard
│   │   └── errorHandler.middleware.ts# Global error handler
│   ├── validations/           # Zod schemas for request validation
│   ├── jobs/                  # Background cron jobs
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Constants, errors, logger, response helpers
├── package.json
├── tsconfig.json
├── Procfile                   # Render deployment
├── .env.example               # Environment variable template
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** (comes with Node.js)
- **PostgreSQL** database (or a [Supabase](https://supabase.com/) project)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/cricmate-backend.git
cd cricmate-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials (see section below)

# 4. Push the database schema
npx prisma db push

# 5. (Optional) Seed the database
npm run db:seed

# 6. Start the development server
npm run dev
```

The server will start at `http://localhost:3001` with a health check at `http://localhost:3001/health`.

### Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start dev server with hot-reload (ts-node-dev) |
| `build` | `npm run build` | Generate Prisma client & compile TypeScript |
| `start` | `npm start` | Run compiled production server |
| `db:push` | `npm run db:push` | Push Prisma schema to database |
| `db:seed` | `npm run db:seed` | Seed database with sample data |
| `db:migrate` | `npm run db:migrate` | Deploy pending migrations |
| `db:migrate:dev` | `npm run db:migrate:dev` | Create new migration (dev) |
| `db:studio` | `npm run db:studio` | Open Prisma Studio GUI |
| `lint` | `npm run lint` | TypeScript type checking |
| `test` | `npm test` | Run tests (Jest) |

---

## 🔑 Environment Variables

Create a `.env` file in the project root using `.env.example` as a template:

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification | ✅ |
| `RAZORPAY_KEY_ID` | Razorpay API key ID | ✅ |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret | ✅ |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature secret | ✅ |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | ⚠️ Optional |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | ⚠️ Optional |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number | ⚠️ Optional |
| `GOOGLE_MAPS_API_KEY` | Google Maps Geocoding API key | ⚠️ Optional |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key | ⚠️ Optional |
| `NODE_ENV` | `development` or `production` | ❌ |
| `PORT` | Server port (default: `3001`) | ❌ |
| `FRONTEND_URL` | Frontend app URL | ❌ |
| `CORS_ORIGINS` | Comma-separated allowed origins | ❌ |

> **Note:** Optional services (Twilio, Google Maps, OpenWeather) gracefully degrade with mock/skip behavior when credentials are absent — the server will not crash.

---

## 📡 API Reference

**Base URL:** `http://localhost:3001/api`

All protected routes require a `Bearer` token in the `Authorization` header.

### Health Check
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | ❌ | Server health & uptime |

### 🔐 Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/sync-user` | ✅ | Sync Supabase user to internal DB |
| `GET` | `/me` | ✅ | Get current user profile |
| `PUT` | `/profile` | ✅ | Update user profile |
| `POST` | `/fcm-token` | ✅ | Register FCM push token |
| `DELETE` | `/account` | ✅ | Delete user account |

### 👤 Users (`/api/users`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/:id` | 🔓 | Get public user profile |

### 🏟️ Grounds (`/api/grounds`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ❌ | List/search grounds (filters) |
| `GET` | `/nearby` | ❌ | Find grounds by lat/lng + radius |
| `GET` | `/:id` | 🔓 | Get ground details |
| `POST` | `/` | ✅ | Create a new ground |
| `PUT` | `/:id` | ✅ 👑 | Update ground (owner only) |
| `DELETE` | `/:id` | ✅ 👑 | Delete ground (owner only) |
| `GET` | `/:id/slots` | ❌ | Get ground time slots |
| `POST` | `/:id/block-dates` | ✅ 👑 | Block dates on ground |
| `DELETE` | `/:id/block-dates/:dateId` | ✅ 👑 | Unblock a date |
| `POST` | `/:id/photos` | ✅ 👑 | Upload ground photo |
| `DELETE` | `/:id/photos/:photoId` | ✅ 👑 | Remove ground photo |
| `GET` | `/:id/reviews` | ❌ | Get ground reviews |
| `POST` | `/:id/reviews` | ✅ | Post a review |

### 📅 Bookings (`/api/bookings`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | Get my bookings |
| `GET` | `/:id` | ✅ | Get booking details |
| `POST` | `/initiate` | ✅ | Create a new booking |
| `POST` | `/:id/cancel` | ✅ | Cancel a booking |
| `POST` | `/:id/checkin` | ✅ | Check in at ground |
| `GET` | `/:id/qr` | ✅ | Get booking QR code |
| `GET` | `/ground/:groundId` | ✅ 👑 | Owner: ground bookings |
| `GET` | `/ground/:groundId/today` | ✅ 👑 | Owner: today's schedule |
| `GET` | `/ground/:groundId/revenue` | ✅ 👑 | Owner: revenue analytics |

### 🤝 Matches (`/api/matches`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/feed` | 🔓 | Match feed (discovery) |
| `GET` | `/mine` | ✅ | My matches |
| `GET` | `/:id` | 🔓 | Match details |
| `GET` | `/:id/scorecard` | 🔓 | Match scorecard |
| `POST` | `/` | ✅ | Create a match |
| `PUT` | `/:id` | ✅ | Update match |
| `DELETE` | `/:id` | ✅ | Delete match |
| `POST` | `/:id/apply` | ✅ | Apply to join match |
| `DELETE` | `/:id/apply` | ✅ | Withdraw application |
| `PUT` | `/:id/applications/:appId` | ✅ | Accept/decline application |
| `POST` | `/:id/start` | ✅ | Start match (go LIVE) |
| `POST` | `/:id/complete` | ✅ | Mark match completed |
| `POST` | `/:id/result` | ✅ | Post match result |

### 📊 Scoring (`/api/scoring`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/:matchId/live` | 🔓 | Get live scorecard |
| `POST` | `/:matchId/innings` | ✅ | Start new innings |
| `POST` | `/:matchId/innings/:inningsId/delivery` | ✅ | Record a delivery |
| `DELETE` | `/:matchId/innings/:inningsId/delivery/last` | ✅ | Undo last delivery |
| `POST` | `/:matchId/innings/:inningsId/complete` | ✅ | Complete innings |
| `POST` | `/:matchId/sync` | ✅ | Sync offline scoring |

### 💰 Payments (`/api/payments`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/verify` | ✅ | Verify Razorpay payment |
| `POST` | `/split-request` | ✅ | Send split payment links |
| `GET` | `/my-payments` | ✅ | Payment history |

### 🏅 Players (`/api/players`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | 🔓 | Discover players |
| `GET` | `/mentors` | 🔓 | List mentors |
| `POST` | `/mentor-session` | ✅ | Book mentor session |
| `GET` | `/:id` | 🔓 | Player profile |
| `GET` | `/:id/stats` | 🔓 | Player statistics |
| `GET` | `/:id/badges` | 🔓 | Player badges |
| `GET` | `/:id/matches` | 🔓 | Player match history |
| `GET` | `/:id/wrapped` | ✅ | Player's annual wrapped |

### 🏆 Leaderboard (`/api/leaderboard`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | 🔓 | City/colony leaderboard |
| `GET` | `/my-rank` | ✅ | My current rank |

### 🔔 Notifications (`/api/notifications`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | Get notifications |
| `POST` | `/read-all` | ✅ | Mark all as read |
| `POST` | `/:id/read` | ✅ | Mark one as read |

### 🛡️ Admin (`/api/admin`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/stats` | ✅ 🔒 | Dashboard statistics |

> **Legend:** ✅ = Auth required · 🔓 = Optional auth · ❌ = Public · 👑 = Ground owner only · 🔒 = Admin only

---

## ⏰ Background Jobs

Automated cron jobs run via `node-cron`:

| Job | Schedule | Description |
|---|---|---|
| **Trust Score Recalculation** | Daily at midnight | Recalculates trust scores based on check-ins, no-shows & milestones |
| **Weather Alerts** | Daily at 8:00 PM | Sends WhatsApp alerts for bookings with >50% rain chance tomorrow |
| **Leaderboard Rebuild** | Every hour | Aggregates & rebuilds city/colony leaderboard rankings |
| **Wrapped Generation** | November 1st | Generates annual player stats summaries |

---

## 🗄️ Database Schema

The database consists of **20+ models** across 8 domains:

```
Users          → User, PlayerRole
Grounds        → Ground, GroundPhoto, Slot, BlockedDate, EquipmentRental, GroundReview
Bookings       → Booking, BookingRental
Matches        → Match, MatchPlayer, MatchApplication, MatchRoleNeeded, MatchCheckIn
Scoring        → Innings, Delivery, MatchResult
Payments       → Payment
Gamification   → Badge, PlayerBadge, LeaderboardEntry
Notifications  → Notification
Mentoring      → MentorSession
```

### Key Enums

| Enum | Values |
|---|---|
| `Role` | Opener, Middle Order, Lower Order, Wicket Keeper, Fast Bowler, Medium Pacer, Spinner, Allrounder |
| `MatchFormat` | T10, T20, ODI, Test, Practice |
| `MatchType` | Team Gap, Challenge, Practice |
| `PitchType` | Turf, Concrete, Matting, Box |
| `BookingStatus` | Pending, Confirmed, Checked In, Completed, Cancelled, Refunded |
| `DismissalType` | Bowled, Caught, LBW, Run Out, Stumped, Hit Wicket, Handled Ball, Obstructing Field |

---

## 🚢 Deployment

The project is configured for **Render** deployment via the `Procfile`:

```
web: node dist/server.js
```

### Deploy Steps

1. Connect your GitHub repository to Render
2. Set the **Build Command** to `npm install` (which triggers `postinstall → npm run build`)
3. Set the **Start Command** to `npm start`
4. Configure all environment variables in Render's dashboard
5. The server binds to `0.0.0.0` for Render compatibility

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

<div align="center">

**Built with ❤️ and 🏏 by the CricMate Team**

</div>

