import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Extends Express Request with authenticated user payload.
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    name: string;
  };
}

/**
 * Verify JWT from the Authorization header and attach decoded payload to req.user.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing or invalid token' });
    return;
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      role: string;
      name: string;
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

/**
 * Role-based authorization gate. Must come after authenticate().
 * Usage: authorize('admin', 'doctor')
 */
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
