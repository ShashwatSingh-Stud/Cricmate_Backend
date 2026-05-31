// ─── Platform Settings ────────────────────────────────────────────────────────

/** Platform fee percentage charged on each booking (e.g., 5 = 5%) */
export const PLATFORM_FEE_PERCENT = 5;

/** Minimum platform fee in rupees */
export const MIN_PLATFORM_FEE = 10;

// ─── Trust Score ──────────────────────────────────────────────────────────────

export const TRUST_SCORE = {
  DEFAULT: 5.0,
  MIN: 1.0,
  MAX: 5.0,

  // Deductions
  NO_SHOW_PENALTY: -1.0,
  SAME_DAY_CANCEL_PENALTY: -0.3,    // < 6 hours before match
  LATE_CANCEL_PENALTY: -0.2,         // < 24 hours before match

  // Additions
  ON_TIME_BONUS: 0.1,               // checked in before match starts
  POSITIVE_RATING_BONUS: 0.05,
  MILESTONE_BONUS: 0.2,             // per 10 matches completed
  MILESTONE_INTERVAL: 10,

  // Calculation window
  RECENT_MATCHES_WINDOW: 20,        // last N matches for calculation
} as const;

// ─── Cancellation Windows ─────────────────────────────────────────────────────

export const CANCELLATION = {
  FULL_REFUND_HOURS: 24,     // > 24h before → full refund
  PARTIAL_REFUND_HOURS: 6,   // 6–24h before → 50% refund
  PARTIAL_REFUND_PERCENT: 50,
  // < 6h before → no refund
} as const;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ─── Nearby Search ────────────────────────────────────────────────────────────

export const NEARBY = {
  DEFAULT_RADIUS_KM: 10,
  MAX_RADIUS_KM: 50,
} as const;

// ─── Match Defaults ───────────────────────────────────────────────────────────

export const MATCH = {
  DEFAULT_MAX_PLAYERS: 11,
  MIN_PLAYERS: 2,
  MAX_PLAYERS_PER_TEAM: 11,
} as const;

// ─── Weather Alert Thresholds ─────────────────────────────────────────────────

export const WEATHER = {
  RAIN_ALERT_THRESHOLD: 50, // percentage
} as const;

// ─── Cron Schedules ───────────────────────────────────────────────────────────

export const CRON_SCHEDULES = {
  TRUST_SCORE_RECALC: '0 0 * * *',     // Daily at midnight
  WEATHER_ALERT: '0 20 * * *',          // Daily at 8 PM
  LEADERBOARD_REBUILD: '0 * * * *',     // Every hour
  WRAPPED_GENERATE: '0 0 1 11 *',       // November 1st
} as const;

// ─── Supabase Storage Buckets ─────────────────────────────────────────────────

export const STORAGE_BUCKETS = {
  GROUND_PHOTOS: 'ground-photos',
  AVATARS: 'avatars',
} as const;
