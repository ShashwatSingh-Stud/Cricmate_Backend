# CricMate — Complete Backend Build Prompt

## Project Overview
Build the complete backend for **CricMate** — a cricket ground booking and team matchmaking platform. This is a production-ready REST API + database + serverless functions system deployed on **Railway** (Node.js server) + **Supabase** (PostgreSQL database + Auth + Storage + Realtime).

---

## Tech Stack (Backend)
- **Runtime:** Node.js 20
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL via Supabase (hosted)
- **ORM:** Prisma
- **Auth:** Supabase Auth (phone OTP) — JWT verification middleware
- **Payments:** Razorpay (orders, webhooks, split payments via Razorpay Route/Contacts)
- **File Storage:** Supabase Storage
- **Realtime:** Supabase Realtime (Postgres changes broadcast)
- **Notifications:** Twilio WhatsApp API (match confirmations, payment requests, weather alerts)
- **Weather:** OpenWeatherMap API
- **Maps/Geocoding:** Google Maps Geocoding API
- **Background Jobs:** node-cron (scheduled jobs: trust score recalculation, weather alerts, wrapped generation)
- **Validation:** Zod
- **Logging:** Winston
- **Testing:** Jest + Supertest
- **Deployment:** Railway (auto-deploy from GitHub)

---

## Environment Variables
```env
DATABASE_URL=postgresql://postgres:[password]@[supabase-host]:5432/postgres
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (NEVER expose this on frontend)
SUPABASE_JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENWEATHER_API_KEY=your_openweather_key

NODE_ENV=production
PORT=3001
FRONTEND_URL=https://cricmate.in
CORS_ORIGINS=https://cricmate.in,https://www.cricmate.in
```

---

## Complete Project Structure

```
/src
  /routes
    auth.routes.ts
    users.routes.ts
    grounds.routes.ts
    bookings.routes.ts
    matches.routes.ts
    players.routes.ts
    scoring.routes.ts
    payments.routes.ts
    leaderboard.routes.ts
    notifications.routes.ts
    admin.routes.ts
  /controllers
    auth.controller.ts
    users.controller.ts
    grounds.controller.ts
    bookings.controller.ts
    matches.controller.ts
    players.controller.ts
    scoring.controller.ts
    payments.controller.ts
    leaderboard.controller.ts
  /middleware
    auth.middleware.ts          # Supabase JWT verification
    groundOwner.middleware.ts   # Check ground ownership
    rateLimit.middleware.ts     # express-rate-limit
    validate.middleware.ts      # Zod request validation
    errorHandler.middleware.ts  # Global error handler
  /services
    trust.service.ts            # Trust score calculation
    payment.service.ts          # Razorpay operations
    notification.service.ts     # WhatsApp via Twilio
    weather.service.ts          # OpenWeatherMap
    geocoding.service.ts        # Google Maps Geocoding
    scoring.service.ts          # Match scoring logic
    leaderboard.service.ts      # Rankings calculation
    wrapped.service.ts          # Annual player stats
    storage.service.ts          # Supabase Storage
  /jobs
    trustScore.job.ts           # Recalculate trust scores daily
    weatherAlert.job.ts         # Send pre-match weather alerts
    leaderboard.job.ts          # Rebuild leaderboard cache hourly
    wrappedGenerate.job.ts      # Generate wrapped data in November
  /utils
    logger.ts
    response.ts                 # Standard API response format
    errors.ts                   # Custom error classes
    constants.ts
  /types
    index.ts
  /validations
    ground.validation.ts
    booking.validation.ts
    match.validation.ts
    scoring.validation.ts
  app.ts
  server.ts

/prisma
  schema.prisma
  /migrations/
  seed.ts
```

---

## Complete Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USERS ────────────────────────────────────────────────────────────────────

model User {
  id              String    @id @default(uuid())
  supabaseId      String    @unique @map("supabase_id")
  phone           String    @unique
  name            String?
  avatarUrl       String?   @map("avatar_url")
  city            String?
  colony          String?
  dateOfBirth     DateTime? @map("date_of_birth")
  isGroundOwner   Boolean   @default(false) @map("is_ground_owner")
  isMentor        Boolean   @default(false) @map("is_mentor")
  mentorRate      Int?      @map("mentor_rate")  // per hour in rupees
  language        String    @default("en")       // "en" or "hi"
  fcmToken        String?   @map("fcm_token")    // push notification token
  trustScore      Float     @default(5.0) @map("trust_score")
  trustMatchCount Int       @default(0) @map("trust_match_count")
  noShowCount     Int       @default(0) @map("no_show_count")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  roles               PlayerRole[]
  grounds             Ground[]
  bookings            Booking[]
  matchPlayers        MatchPlayer[]
  captainedMatches    Match[]            @relation("MatchCaptain")
  receivedApplications MatchApplication[] @relation("ApplicationTarget")
  sentApplications    MatchApplication[] @relation("ApplicationSender")
  reviews             GroundReview[]
  badgesEarned        PlayerBadge[]
  leaderboardEntries  LeaderboardEntry[]
  checkIns            MatchCheckIn[]
  paymentsSent        Payment[]          @relation("PaymentSender")
  paymentsReceived    Payment[]          @relation("PaymentReceiver")
  mentorSessionsGiven MentorSession[]    @relation("MentorSessions")
  mentorSessionsBooked MentorSession[]   @relation("PlayerSessions")
  notifications       Notification[]

  @@map("users")
}

model PlayerRole {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  role      Role
  isPrimary Boolean  @default(false) @map("is_primary")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("player_roles")
}

enum Role {
  OPENER
  MIDDLE_ORDER
  LOWER_ORDER
  WICKET_KEEPER
  FAST_BOWLER
  MEDIUM_PACER
  SPINNER
  ALLROUNDER
}

// ─── GROUNDS ──────────────────────────────────────────────────────────────────

model Ground {
  id              String      @id @default(uuid())
  ownerId         String      @map("owner_id")
  name            String
  description     String?
  addressLine     String      @map("address_line")
  city            String
  colony          String?
  state           String
  pincode         String
  latitude        Float
  longitude       Float
  pitchType       PitchType   @map("pitch_type")
  hasLighting     Boolean     @default(false) @map("has_lighting")
  hasNets         Boolean     @default(false) @map("has_nets")
  hasParking      Boolean     @default(false) @map("has_parking")
  hasChangingRoom Boolean     @default(false) @map("has_changing_room")
  hasDrinkingWater Boolean    @default(false) @map("has_drinking_water")
  capacityPlayers Int         @default(22) @map("capacity_players")
  pricePerSlot    Int         @map("price_per_slot")  // in rupees
  slotDuration    Int         @default(120) @map("slot_duration")  // in minutes
  openTime        String      @default("06:00") @map("open_time")  // HH:MM
  closeTime       String      @default("22:00") @map("close_time")
  isActive        Boolean     @default(true) @map("is_active")
  isVerified      Boolean     @default(false) @map("is_verified")
  avgRating       Float       @default(0) @map("avg_rating")
  reviewCount     Int         @default(0) @map("review_count")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  owner           User          @relation(fields: [ownerId], references: [id])
  photos          GroundPhoto[]
  slots           Slot[]
  bookings        Booking[]
  reviews         GroundReview[]
  equipmentRentals EquipmentRental[]
  blockedDates    BlockedDate[]

  @@map("grounds")
}

enum PitchType {
  TURF
  CONCRETE
  MATTING
  BOX
}

model GroundPhoto {
  id        String   @id @default(uuid())
  groundId  String   @map("ground_id")
  url       String
  isPrimary Boolean  @default(false) @map("is_primary")
  order     Int      @default(0)
  ground    Ground   @relation(fields: [groundId], references: [id], onDelete: Cascade)
  @@map("ground_photos")
}

model Slot {
  id         String      @id @default(uuid())
  groundId   String      @map("ground_id")
  startTime  String      @map("start_time")  // HH:MM
  endTime    String      @map("end_time")
  isActive   Boolean     @default(true) @map("is_active")
  ground     Ground      @relation(fields: [groundId], references: [id], onDelete: Cascade)
  bookings   Booking[]
  @@map("slots")
}

model BlockedDate {
  id       String   @id @default(uuid())
  groundId String   @map("ground_id")
  date     DateTime
  reason   String?
  ground   Ground   @relation(fields: [groundId], references: [id], onDelete: Cascade)
  @@map("blocked_dates")
}

model EquipmentRental {
  id          String   @id @default(uuid())
  groundId    String   @map("ground_id")
  name        String   // "Batting Pads", "Helmet", "Stumps Set", "Ball"
  pricePerDay Int      @map("price_per_day")
  quantity    Int      @default(1)
  isAvailable Boolean  @default(true) @map("is_available")
  ground      Ground   @relation(fields: [groundId], references: [id], onDelete: Cascade)
  @@map("equipment_rentals")
}

model GroundReview {
  id        String   @id @default(uuid())
  groundId  String   @map("ground_id")
  userId    String   @map("user_id")
  rating    Int      // 1–5
  comment   String?
  createdAt DateTime @default(now()) @map("created_at")
  ground    Ground   @relation(fields: [groundId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  @@unique([groundId, userId])
  @@map("ground_reviews")
}

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

model Booking {
  id                  String        @id @default(uuid())
  groundId            String        @map("ground_id")
  slotId              String        @map("slot_id")
  userId              String        @map("user_id")  // captain who booked
  matchId             String?       @unique @map("match_id")
  date                DateTime
  startTime           String        @map("start_time")
  endTime             String        @map("end_time")
  format              MatchFormat?
  playersExpected     Int?          @map("players_expected")
  baseAmount          Int           @map("base_amount")
  rentalAmount        Int           @default(0) @map("rental_amount")
  platformFee         Int           @map("platform_fee")
  totalAmount         Int           @map("total_amount")
  status              BookingStatus @default(PENDING)
  razorpayOrderId     String?       @unique @map("razorpay_order_id")
  razorpayPaymentId   String?       @unique @map("razorpay_payment_id")
  qrCode              String?       @map("qr_code")  // unique QR code for check-in
  checkedInAt         DateTime?     @map("checked_in_at")
  cancelledAt         DateTime?     @map("cancelled_at")
  cancellationReason  String?       @map("cancellation_reason")
  refundAmount        Int?          @map("refund_amount")
  refundId            String?       @map("refund_id")
  createdAt           DateTime      @default(now()) @map("created_at")

  ground              Ground        @relation(fields: [groundId], references: [id])
  slot                Slot          @relation(fields: [slotId], references: [id])
  user                User          @relation(fields: [userId], references: [id])
  match               Match?        @relation(fields: [matchId], references: [id])
  rentedItems         BookingRental[]

  @@map("bookings")
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  COMPLETED
  CANCELLED
  REFUNDED
}

enum MatchFormat {
  T10
  T20
  ODI
  TEST
  PRACTICE
}

model BookingRental {
  id                String          @id @default(uuid())
  bookingId         String          @map("booking_id")
  equipmentRentalId String          @map("equipment_rental_id")
  quantity          Int
  totalPrice        Int             @map("total_price")
  booking           Booking         @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  @@map("booking_rentals")
}

// ─── MATCHES ──────────────────────────────────────────────────────────────────

model Match {
  id              String        @id @default(uuid())
  captainId       String        @map("captain_id")
  groundId        String?       @map("ground_id")
  format          MatchFormat
  date            DateTime
  city            String
  colony          String?
  skillLevel      SkillLevel    @map("skill_level")
  maxPlayers      Int           @default(11) @map("max_players")
  description     String?
  type            MatchType
  status          MatchStatus   @default(OPEN)
  challengedTeamId String?      @map("challenged_team_id")  // for team challenges
  isPublic        Boolean       @default(true) @map("is_public")
  publicScorecardUrl String?    @map("public_scorecard_url")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  captain         User          @relation("MatchCaptain", fields: [captainId], references: [id])
  booking         Booking?
  players         MatchPlayer[]
  applications    MatchApplication[]
  rolesNeeded     MatchRoleNeeded[]
  innings         Innings[]
  checkIns        MatchCheckIn[]
  result          MatchResult?

  @@map("matches")
}

enum MatchType {
  TEAM_GAP     // captain needs more players
  CHALLENGE    // team vs team challenge
  PRACTICE     // practice/nets session
}

enum MatchStatus {
  OPEN         // accepting applications
  FULL         // all spots filled
  CONFIRMED    // match confirmed, no more applications
  LIVE         // currently being scored
  COMPLETED    // finished
  CANCELLED
}

enum SkillLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  OPEN
}

model MatchRoleNeeded {
  id       String  @id @default(uuid())
  matchId  String  @map("match_id")
  role     Role
  count    Int     @default(1)
  filled   Int     @default(0)
  match    Match   @relation(fields: [matchId], references: [id], onDelete: Cascade)
  @@map("match_roles_needed")
}

model MatchPlayer {
  id         String            @id @default(uuid())
  matchId    String            @map("match_id")
  userId     String            @map("user_id")
  role       Role?
  teamNumber Int               @default(1) @map("team_number")  // 1 or 2
  isCaptain  Boolean           @default(false) @map("is_captain")
  paymentStatus PaymentStatus  @default(PENDING) @map("payment_status")
  joinedAt   DateTime          @default(now()) @map("joined_at")
  match      Match             @relation(fields: [matchId], references: [id], onDelete: Cascade)
  user       User              @relation(fields: [userId], references: [id])
  @@unique([matchId, userId])
  @@map("match_players")
}

enum PaymentStatus {
  PENDING
  PAID
  WAIVED
  REFUNDED
}

model MatchApplication {
  id          String            @id @default(uuid())
  matchId     String            @map("match_id")
  applicantId String            @map("applicant_id")
  captainId   String            @map("captain_id")
  role        Role?
  message     String?
  status      ApplicationStatus @default(PENDING)
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")
  match       Match             @relation(fields: [matchId], references: [id], onDelete: Cascade)
  applicant   User              @relation("ApplicationSender", fields: [applicantId], references: [id])
  captain     User              @relation("ApplicationTarget", fields: [captainId], references: [id])
  @@map("match_applications")
}

enum ApplicationStatus {
  PENDING
  ACCEPTED
  DECLINED
  WITHDRAWN
}

model MatchCheckIn {
  id        String   @id @default(uuid())
  matchId   String   @map("match_id")
  userId    String   @map("user_id")
  checkedAt DateTime @default(now()) @map("checked_at")
  latitude  Float?
  longitude Float?
  match     Match    @relation(fields: [matchId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
  @@unique([matchId, userId])
  @@map("match_check_ins")
}

// ─── SCORING ──────────────────────────────────────────────────────────────────

model Innings {
  id             String     @id @default(uuid())
  matchId        String     @map("match_id")
  inningsNumber  Int        @map("innings_number")  // 1 or 2
  battingTeam    Int        @map("batting_team")    // 1 or 2
  totalRuns      Int        @default(0) @map("total_runs")
  totalWickets   Int        @default(0) @map("total_wickets")
  totalOvers     Float      @default(0) @map("total_overs")
  extras         Int        @default(0)
  isCompleted    Boolean    @default(false) @map("is_completed")
  createdAt      DateTime   @default(now()) @map("created_at")
  match          Match      @relation(fields: [matchId], references: [id], onDelete: Cascade)
  deliveries     Delivery[]
  @@unique([matchId, inningsNumber])
  @@map("innings")
}

model Delivery {
  id              String        @id @default(uuid())
  inningsId       String        @map("innings_id")
  overNumber      Int           @map("over_number")
  ballNumber      Int           @map("ball_number")  // 1–6 (legal balls), can exceed for extras
  batsmanId       String        @map("batsman_id")
  bowlerId        String        @map("bowler_id")
  runs            Int           @default(0)
  isWicket        Boolean       @default(false) @map("is_wicket")
  dismissalType   DismissalType? @map("dismissal_type")
  dismissedPlayerId String?     @map("dismissed_player_id")
  fielderId       String?       @map("fielder_id")
  extras          Int           @default(0)
  extraType       ExtraType?    @map("extra_type")
  isLegal         Boolean       @default(true) @map("is_legal")
  commentary      String?
  createdAt       DateTime      @default(now()) @map("created_at")
  innings         Innings       @relation(fields: [inningsId], references: [id], onDelete: Cascade)
  @@map("deliveries")
}

enum DismissalType {
  BOWLED
  CAUGHT
  LBW
  RUN_OUT
  STUMPED
  HIT_WICKET
  HANDLED_BALL
  OBSTRUCTING_FIELD
}

enum ExtraType {
  WIDE
  NO_BALL
  LEG_BYE
  BYE
  PENALTY
}

model MatchResult {
  id           String   @id @default(uuid())
  matchId      String   @unique @map("match_id")
  winnerTeam   Int?     @map("winner_team")   // 1 or 2, null for draw/no result
  resultType   String   @map("result_type")   // "by X runs", "by X wickets", "draw", "no result"
  margin       Int?
  marginType   String?  @map("margin_type")   // "runs" or "wickets"
  playerOfMatch String? @map("player_of_match")
  summary      String?
  createdAt    DateTime @default(now()) @map("created_at")
  match        Match    @relation(fields: [matchId], references: [id])
  @@map("match_results")
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

model Payment {
  id                String        @id @default(uuid())
  senderId          String?       @map("sender_id")
  receiverId        String?       @map("receiver_id")
  bookingId         String?       @map("booking_id")
  amount            Int
  type              PaymentType
  status            PaymentStatus
  razorpayOrderId   String?       @unique @map("razorpay_order_id")
  razorpayPaymentId String?       @unique @map("razorpay_payment_id")
  razorpayLinkId    String?       @unique @map("razorpay_link_id")  // for payment links
  description       String?
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")
  sender            User?         @relation("PaymentSender", fields: [senderId], references: [id])
  receiver          User?         @relation("PaymentReceiver", fields: [receiverId], references: [id])
  @@map("payments")
}

enum PaymentType {
  BOOKING              // ground booking
  SPLIT_SHARE          // player's share of ground booking
  MENTOR_SESSION       // mentor coaching session
  EQUIPMENT_RENTAL
  SUBSCRIPTION         // captain pro or ground owner premium
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

model LeaderboardEntry {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  city         String
  colony       String?
  season       String   // e.g. "2024-06" (year-month) or "2024" (annual)
  matchesPlayed Int     @default(0) @map("matches_played")
  runsScored   Int      @default(0) @map("runs_scored")
  wicketsTaken Int      @default(0) @map("wickets_taken")
  highScore    Int      @default(0) @map("high_score")
  bestBowling  String?  @map("best_bowling")  // "5/23"
  battingAvg   Float    @default(0) @map("batting_avg")
  bowlingEcon  Float    @default(0) @map("bowling_econ")
  updatedAt    DateTime @updatedAt @map("updated_at")
  user         User     @relation(fields: [userId], references: [id])
  @@unique([userId, city, colony, season])
  @@map("leaderboard_entries")
}

// ─── GAMIFICATION ─────────────────────────────────────────────────────────────

model Badge {
  id          String        @id @default(uuid())
  key         String        @unique  // e.g. "first_fifty", "century_scorer", "no_show_free"
  name        String
  nameHi      String        @map("name_hi")  // Hindi translation
  description String
  descHi      String        @map("desc_hi")
  iconUrl     String        @map("icon_url")
  category    BadgeCategory
  @@map("badges")
}

enum BadgeCategory {
  BATTING
  BOWLING
  FIELDING
  RELIABILITY
  MILESTONE
  SOCIAL
  GROUND
}

model PlayerBadge {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  badgeId    String   @map("badge_id")
  earnedAt   DateTime @default(now()) @map("earned_at")
  sharedAt   DateTime? @map("shared_at")
  user       User     @relation(fields: [userId], references: [id])
  badge      Badge    @relation(fields: [badgeId], references: [id])
  @@unique([userId, badgeId])
  @@map("player_badges")
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

model Notification {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")
  type      NotificationType
  title     String
  titleHi   String           @map("title_hi")
  body      String
  bodyHi    String           @map("body_hi")
  data      Json?
  isRead    Boolean          @default(false) @map("is_read")
  createdAt DateTime         @default(now()) @map("created_at")
  user      User             @relation(fields: [userId], references: [id])
  @@map("notifications")
}

enum NotificationType {
  MATCH_APPLICATION
  APPLICATION_ACCEPTED
  APPLICATION_DECLINED
  BOOKING_CONFIRMED
  MATCH_REMINDER
  WEATHER_ALERT
  PAYMENT_REQUEST
  PAYMENT_RECEIVED
  BADGE_EARNED
  CHALLENGE_RECEIVED
  CHALLENGE_ACCEPTED
}

// ─── MENTOR SESSIONS ──────────────────────────────────────────────────────────

model MentorSession {
  id              String        @id @default(uuid())
  mentorId        String        @map("mentor_id")
  playerId        String        @map("player_id")
  groundId        String?       @map("ground_id")
  date            DateTime
  durationMinutes Int           @default(60) @map("duration_minutes")
  ratePerHour     Int           @map("rate_per_hour")
  totalAmount     Int           @map("total_amount")
  status          BookingStatus
  razorpayOrderId String?       @unique @map("razorpay_order_id")
  notes           String?
  createdAt       DateTime      @default(now()) @map("created_at")
  mentor          User          @relation("MentorSessions", fields: [mentorId], references: [id])
  player          User          @relation("PlayerSessions", fields: [playerId], references: [id])
  @@map("mentor_sessions")
}
```

---

## Complete API Routes

### Auth Routes (`/api/auth`)
```
POST   /api/auth/sync-user      # Called after Supabase OTP success — creates/updates user record
GET    /api/auth/me             # Get current authenticated user's full profile
PUT    /api/auth/profile        # Update user profile (name, city, colony, language, roles)
POST   /api/auth/fcm-token      # Save FCM push token
DELETE /api/auth/account        # Soft delete account
```

### Ground Routes (`/api/grounds`)
```
GET    /api/grounds             # List grounds (with filters: city, pitchType, hasLighting, lat/lng/radius, priceMin/Max)
GET    /api/grounds/nearby      # Grounds within radius (lat, lng, radiusKm required)
GET    /api/grounds/:id         # Single ground detail
POST   /api/grounds             # Create ground (owner only)
PUT    /api/grounds/:id         # Update ground (owner only)
DELETE /api/grounds/:id         # Deactivate ground (owner only)

GET    /api/grounds/:id/slots           # Available slots for a date
GET    /api/grounds/:id/availability    # 30-day availability calendar
POST   /api/grounds/:id/block-dates     # Block dates (owner only)
DELETE /api/grounds/:id/block-dates/:dateId # Unblock date

POST   /api/grounds/:id/photos          # Upload photo (owner only)
DELETE /api/grounds/:id/photos/:photoId # Delete photo

GET    /api/grounds/:id/reviews         # Get reviews
POST   /api/grounds/:id/reviews         # Post review (must have played there)
```

### Booking Routes (`/api/bookings`)
```
GET    /api/bookings                    # My bookings
GET    /api/bookings/:id               # Single booking detail
POST   /api/bookings/initiate          # Step 1: Create booking + Razorpay order
POST   /api/bookings/:id/confirm       # Step 2: Called after payment success
POST   /api/bookings/:id/cancel        # Cancel booking (refund logic)
POST   /api/bookings/:id/checkin       # QR check-in (validates QR code + geofence)
GET    /api/bookings/:id/qr            # Get QR code for check-in

# Ground owner endpoints
GET    /api/bookings/ground/:groundId          # All bookings for owner's ground
GET    /api/bookings/ground/:groundId/today    # Today's schedule
GET    /api/bookings/ground/:groundId/revenue  # Revenue analytics
```

### Match Routes (`/api/matches`)
```
GET    /api/matches/feed        # Team gap posts near user (lat, lng required)
GET    /api/matches/mine        # My upcoming + past matches
GET    /api/matches/:id         # Single match detail (public)
POST   /api/matches             # Create match (team gap or challenge)
PUT    /api/matches/:id         # Update match details (captain only)
DELETE /api/matches/:id         # Cancel match (captain only)

POST   /api/matches/:id/apply              # Apply to join match
PUT    /api/matches/:id/applications/:appId # Accept/decline application (captain)
DELETE /api/matches/:id/apply              # Withdraw application

POST   /api/matches/:id/start              # Start match / begin scoring
POST   /api/matches/:id/complete           # Complete match
GET    /api/matches/:id/scorecard          # Public scorecard (no auth)
POST   /api/matches/:id/result             # Post match result (captain)
```

### Scoring Routes (`/api/scoring`)
```
POST   /api/scoring/:matchId/innings               # Start innings
POST   /api/scoring/:matchId/innings/:inningsId/delivery  # Record a delivery
DELETE /api/scoring/:matchId/innings/:inningsId/delivery/last  # Undo last ball
POST   /api/scoring/:matchId/innings/:inningsId/complete       # Complete innings
POST   /api/scoring/:matchId/sync                  # Sync offline scoring data (bulk insert)
GET    /api/scoring/:matchId/live                  # Live scorecard data
```

### Payment Routes (`/api/payments`)
```
POST   /api/payments/create-order      # Create Razorpay order
POST   /api/payments/verify            # Verify payment signature
POST   /api/payments/split-request     # Create split payment links for match players
GET    /api/payments/my-payments       # Payment history
POST   /api/webhooks/razorpay          # Razorpay webhook (no auth)
```

### Player Routes (`/api/players`)
```
GET    /api/players             # Discover players (city, role, availability, skillLevel)
GET    /api/players/:id         # Player public profile
GET    /api/players/:id/stats   # Career stats
GET    /api/players/:id/badges  # Badges earned
GET    /api/players/:id/matches # Match history (paginated)
GET    /api/players/:id/wrapped # Annual wrapped data
GET    /api/players/mentors     # List available mentors in city
POST   /api/players/mentor-session  # Book mentor session
```

### Leaderboard Routes (`/api/leaderboard`)
```
GET    /api/leaderboard         # Rankings (city, colony, season, category query params)
GET    /api/leaderboard/my-rank # Current user's rank
```

### Notification Routes (`/api/notifications`)
```
GET    /api/notifications               # My notifications (paginated)
PUT    /api/notifications/:id/read      # Mark as read
PUT    /api/notifications/read-all      # Mark all as read
```

---

## Key Service Implementations

### Trust Score Service (`/src/services/trust.service.ts`)
```typescript
// Trust Score Algorithm:
// Base: 5.0 for new players
// 
// DEDUCTIONS:
// -1.0 per confirmed no-show (checked in players / total confirmed players < threshold)
// -0.3 per same-day cancellation (< 6 hours before match)
// -0.2 per late cancellation (< 24 hours before match)
//
// ADDITIONS:
// +0.1 per match attended on time (checked in before match starts)
// +0.05 per positive team rating received
// +0.2 per 10 matches completed
//
// Floor: 1.0 (never goes below)
// Ceiling: 5.0
//
// Recalculate after every: match completion, check-in, cancellation
// Also: daily batch job recalculates for all users who had match activity

export async function recalculateTrustScore(userId: string): Promise<number> {
  // Implementation:
  // 1. Fetch last 20 matches the player was confirmed for
  // 2. Count: attended, no-shows, late cancellations, on-time
  // 3. Apply formula
  // 4. Update user.trustScore in DB
  // 5. Check if badge should be awarded ("10 matches, 0 no-shows" = Reliable badge)
}
```

### Payment Service (`/src/services/payment.service.ts`)
```typescript
// Ground booking flow:
// 1. POST /bookings/initiate → Create Razorpay order (amount in paise)
// 2. Frontend opens Razorpay checkout
// 3. On success → POST /payments/verify → verify signature with HMAC SHA256
// 4. On verified → mark booking CONFIRMED, send WhatsApp confirmation
//
// Split payment flow:
// 1. Captain requests split after booking confirmed
// 2. For each confirmed player: create Razorpay Payment Link via API
//    POST https://api.razorpay.com/v1/payment_links with amount, description, player phone
// 3. Razorpay sends SMS + links to each player
// 4. Webhook: payment.captured → mark player's share as paid
//
// Webhook events to handle:
// - payment.captured → confirm booking / mark split share paid
// - payment.failed → notify user, keep booking in PENDING
// - refund.created → update booking status

import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createBookingOrder(amount: number, bookingId: string) {
  return await razorpay.orders.create({
    amount: amount * 100,  // convert to paise
    currency: 'INR',
    receipt: bookingId,
    notes: { bookingId }
  });
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

export async function createSplitPaymentLinks(players: { phone: string; amount: number; name: string }[], bookingId: string) {
  return Promise.all(players.map(player =>
    razorpay.paymentLink.create({
      amount: player.amount * 100,
      currency: 'INR',
      description: `CricMate ground booking share`,
      customer: { contact: player.phone, name: player.name },
      notify: { sms: true, whatsapp: true },
      reminder_enable: true,
      notes: { bookingId }
    })
  ));
}
```

### Notification Service (`/src/services/notification.service.ts`)
```typescript
// WhatsApp via Twilio (Twilio Sandbox or approved template)
// For production: use Twilio WhatsApp Business or Meta Cloud API

import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendWhatsApp(to: string, message: string) {
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:+91${to}`,
    body: message
  });
}

// Message templates:
export const templates = {
  bookingConfirmed: (groundName: string, date: string, time: string, bookingId: string) =>
    `✅ *CricMate Booking Confirmed!*\n\nGround: ${groundName}\nDate: ${date}\nTime: ${time}\nBooking ID: ${bookingId}\n\nShow your QR code at the ground for check-in.\n\nTeam cricket khelo! 🏏`,

  matchApplication: (captainName: string, matchDate: string, format: string) =>
    `🏏 *New Match Application - CricMate*\n\n${captainName} ke match mein ek player apply kiya hai.\nDate: ${matchDate} | Format: ${format}\n\nApp open karo accept/decline karne ke liye.`,

  paymentRequest: (amount: number, captainName: string, groundName: string, link: string) =>
    `💰 *Ground Booking Payment - CricMate*\n\n${captainName} ne aapko ${groundName} ke liye ₹${amount} ka payment request bheja hai.\n\nPay karo: ${link}`,

  weatherAlert: (groundName: string, date: string, rainChance: number) =>
    `🌧️ *CricMate Weather Alert*\n\nAapka match ${date} ko book hai ${groundName} mein.\n\nKal ${rainChance}% baarish ki sambhavna hai. Match plan check karo!`,

  badgeEarned: (badgeName: string, badgeNameHi: string) =>
    `🏆 *Naya Badge Mila! - CricMate*\n\nBadhaai ho! Aapne "${badgeName}" (${badgeNameHi}) badge earn kiya!\n\nApp mein dekho aur share karo!`,
};
```

### Weather Alert Job (`/src/jobs/weatherAlert.job.ts`)
```typescript
// Runs daily at 8 PM
// For all bookings happening tomorrow:
//   1. Fetch weather for booking's city from OpenWeatherMap
//   2. If rain probability > 50%: send WhatsApp alert to captain + all confirmed players
//   3. Also set a flag on the booking: weather_alert_sent = true

import cron from 'node-cron';

cron.schedule('0 20 * * *', async () => {
  // Find all confirmed bookings for tomorrow
  // For each: check weather API
  // If rain > 50%: send WhatsApp to all players
});
```

### Scoring Sync (`/api/scoring/:matchId/sync`)
```typescript
// This endpoint handles offline scoring sync
// Accepts: { deliveries: DeliveryInput[], inningsId: string, lastSyncedAt: string }
// Process:
//   1. Get existing deliveries after lastSyncedAt
//   2. Deduplicate (by overNumber + ballNumber)
//   3. Insert new deliveries
//   4. Recalculate innings totals
//   5. Return updated innings state
//   6. Broadcast via Supabase Realtime to public scorecard
```

### Leaderboard Service (`/src/services/leaderboard.service.ts`)
```typescript
// Leaderboard is rebuilt every hour by a cron job
// Stores aggregated stats in leaderboard_entries table
// Query pattern: by city + colony + season + category
//
// For city-level: aggregate all players where user.city = city
// For colony-level: aggregate where user.colony = colony AND user.city = city
//
// Season = "YYYY-MM" for monthly, "YYYY" for annual
//
// Rebuild query (runs hourly via cron):
// 1. Find all completed matches in current month
// 2. For each match: aggregate batting/bowling stats per player
// 3. Upsert into leaderboard_entries
// 4. Update ranks (simple ORDER BY)

cron.schedule('0 * * * *', async () => {
  await rebuildCurrentMonthLeaderboard();
});
```

### Badge Awarding Service
```typescript
// Called after every match completion and trust score update
// Check conditions for each badge:
export const badgeConditions = {
  first_fifty: (stats) => stats.highScore >= 50 && !alreadyHas('first_fifty'),
  century_scorer: (stats) => stats.highScore >= 100,
  five_wicket_haul: (stats) => stats.bestBowlingWickets >= 5,
  iron_man: (stats) => stats.matchesPlayed >= 50,
  reliable_100: (stats) => stats.matchesPlayed >= 100 && stats.noShowCount === 0,
  team_player: (stats) => stats.matchesPlayed >= 10 && stats.trustScore >= 4.5,
  ground_explorer: (stats) => stats.uniqueGroundsPlayed >= 10,
};
// On badge award: create PlayerBadge record + send WhatsApp notification
```

---

## Auth Middleware
```typescript
// /src/middleware/auth.middleware.ts
import { createClient } from '@supabase/supabase-js';

export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  // Attach user to request
  req.supabaseUser = user;
  req.userId = await getUserIdFromSupabaseId(user.id); // Get internal user ID
  next();
};
```

---

## Standard API Response Format
```typescript
// All endpoints return:
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}

// Errors:
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message"
}

// Paginated:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Supabase Row Level Security (RLS) Policies

Run these in Supabase SQL Editor:

```sql
-- Users: can only update own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = supabase_id);

-- Grounds: anyone can view active grounds, only owner can modify
ALTER TABLE grounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active grounds" ON grounds FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage own grounds" ON grounds FOR ALL USING (owner_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text));

-- Bookings: users see own bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own bookings" ON bookings FOR SELECT USING (user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text));

-- Deliveries: public read for live scorecard
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view deliveries" ON deliveries FOR SELECT USING (true);
CREATE POLICY "Only scorer can insert deliveries" ON deliveries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM matches m
    JOIN match_players mp ON mp.match_id = m.id
    WHERE m.id = (SELECT match_id FROM innings WHERE id = innings_id)
    AND mp.user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text)
    AND mp.is_captain = true)
);
```

---

## Database Indexes for Performance

```sql
-- Add these indexes for query performance
CREATE INDEX idx_grounds_city ON grounds(city);
CREATE INDEX idx_grounds_location ON grounds USING GIST(point(longitude, latitude));
CREATE INDEX idx_bookings_ground_date ON bookings(ground_id, date);
CREATE INDEX idx_matches_city_status ON matches(city, status);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_deliveries_innings ON deliveries(innings_id, over_number, ball_number);
CREATE INDEX idx_leaderboard_city_season ON leaderboard_entries(city, season);
CREATE INDEX idx_leaderboard_colony_season ON leaderboard_entries(colony, season);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
```

---

## Deployment (Railway)

1. Create a Railway project → connect GitHub repo
2. Railway auto-detects Node.js and runs `npm start`
3. Add all environment variables in Railway dashboard
4. Set `PORT=3001` — Railway auto-assigns public URL
5. Add `Procfile`:
   ```
   web: node dist/server.js
   ```
6. `package.json` scripts:
   ```json
   {
     "build": "tsc",
     "start": "node dist/server.js",
     "dev": "ts-node-dev src/server.ts",
     "db:push": "prisma db push",
     "db:seed": "ts-node prisma/seed.ts",
     "db:migrate": "prisma migrate deploy"
   }
   ```
7. Run migrations: `railway run npm run db:migrate`
8. Seed initial badges: `railway run npm run db:seed`

**CORS Configuration:**
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(','),
  credentials: true
}));
```

---

## Security Checklist
- Razorpay webhook: always verify `X-Razorpay-Signature` header before processing
- All mutation endpoints: require `requireAuth` middleware
- Ground management: require `groundOwner` middleware (verify user owns the ground)
- Payment amounts: always recalculate server-side — never trust frontend amount
- Rate limiting: apply `express-rate-limit` to all auth and payment routes
- Input validation: every endpoint uses Zod schema validation
- SQL injection: impossible via Prisma ORM (parameterised queries)
- Phone numbers: store without country code, add +91 only when sending via Twilio
- Trust score: write only from backend services, never from direct API calls
