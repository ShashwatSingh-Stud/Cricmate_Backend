import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { User as SupabaseUser } from '@supabase/supabase-js';

// ─── Extended Express Request ─────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request<ParamsDictionary, any, any, Record<string, any>> {
  supabaseUser?: SupabaseUser;
  userId?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(query: PaginationQuery): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  return { page, limit, skip: (page - 1) * limit };
}

// ─── Ground Filters ───────────────────────────────────────────────────────────

export interface GroundFilters {
  city?: string;
  pitchType?: string;
  hasLighting?: string;
  hasNets?: string;
  priceMin?: string;
  priceMax?: string;
  lat?: string;
  lng?: string;
  radiusKm?: string;
}

// ─── Match Filters ────────────────────────────────────────────────────────────

export interface MatchFilters {
  city?: string;
  format?: string;
  skillLevel?: string;
  type?: string;
  lat?: string;
  lng?: string;
}

// ─── Player Filters ───────────────────────────────────────────────────────────

export interface PlayerFilters {
  city?: string;
  role?: string;
  skillLevel?: string;
}

// ─── Leaderboard Filters ──────────────────────────────────────────────────────

export interface LeaderboardFilters {
  city: string;
  colony?: string;
  season?: string;
  category?: 'batting' | 'bowling' | 'allround';
}
