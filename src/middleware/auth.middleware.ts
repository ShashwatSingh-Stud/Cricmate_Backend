import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { prisma } from '../server';

const supabaseUrl = process.env.SUPABASE_URL?.startsWith('http') 
  ? process.env.SUPABASE_URL 
  : 'http://placeholder.url';

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
);

/**
 * Middleware to require valid Supabase JWT auth.
 * Verifies the token, fetches the user from Supabase, and looks up the internal DB user.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authorization token provided');
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Lookup internal user by Supabase ID
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, isActive: true },
    });

    if (dbUser && !dbUser.isActive) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    // Attach to request
    req.supabaseUser = user;
    if (dbUser) {
      req.userId = dbUser.id;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Auth middleware.
 * Verifies token if present, but doesn't fail if absent.
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      const dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { id: true, isActive: true },
      });
      
      if (dbUser?.isActive) {
        req.supabaseUser = user;
        req.userId = dbUser.id;
      }
    }

    next();
  } catch (error) {
    // Fail silently for optional auth
    next();
  }
};
