import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserProfile, UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.substring(7).trim();
  try {
    const user = AuthService.verifySessionToken(token);
    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid authentication token.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access Denied: Your role '${req.user.role}' cannot perform this action. Required: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}
