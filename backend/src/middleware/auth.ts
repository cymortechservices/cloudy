import type { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { ApiError } from '../utils/errors.js';

declare global { namespace Express { interface Request { userId: string; userEmail?: string } } }

/** Verifies the Supabase access token with Supabase Auth; identity comes only from the verified token. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');
    const { data, error } = await db.auth.getUser(h.slice(7));
    if (error || !data.user) throw new ApiError(401, 'INVALID_TOKEN', 'Your session is invalid or expired.');
    req.userId = data.user.id; req.userEmail = data.user.email ?? undefined;
    next();
  } catch (e) { next(e); }
}
