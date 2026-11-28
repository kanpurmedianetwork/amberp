import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Missing idToken in request body.' });
    }
    const result = await AuthService.verifyGoogleToken(idToken);
    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    await AuditService.recordLogin({ user: result.user, ip, userAgent, status: 'SUCCESS' });
    res.json(result);
  } catch (err: any) {
    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    AuditService.recordLogin({
      user: { email: 'unknown@login', name: 'Unknown', role: 'VIEWER' },
      ip,
      userAgent,
      status: 'FAILED',
    }).catch(() => {});
    res.status(401).json({ error: err.message || 'Authentication failed.' });
  }
});

authRouter.post('/login-as', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email.' });
    }
    const result = AuthService.loginAs(email);
    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    await AuditService.recordLogin({ user: result.user, ip, userAgent, status: 'SUCCESS' });
    res.json(result);
  } catch (err: any) {
    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    AuditService.recordLogin({
      user: { email: req.body?.email || 'unknown', name: 'Unauthorized', role: 'VIEWER' },
      ip,
      userAgent,
      status: 'FAILED',
    }).catch(() => {});
    res.status(403).json({ error: err.message || 'Access denied.' });
  }
});

authRouter.post('/session', async (req: Request, res: Response) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.body?.token && typeof req.body.token === 'string') {
      token = req.body.token.trim();
    }

    let user = req.body?.user;
    if (token) {
      try {
        user = AuthService.verifySessionToken(token);
      } catch {}
    }

    if (!user && req.body?.email) {
      const email = String(req.body.email).toLowerCase().trim();
      const authUser = AuthService.listAuthorizedUsers().find((u) => u.email.toLowerCase().trim() === email);
      if (authUser) {
        user = authUser;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Valid session token or recognized email required.' });
    }

    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const loginEntry = await AuditService.recordLogin({ user, ip, userAgent, status: 'SUCCESS' });
    res.json({
      ok: true,
      user,
      ip: loginEntry.ipAddress,
      ipChanged: loginEntry.ipChanged,
      previousIp: loginEntry.previousIp,
      timestamp: loginEntry.timestamp,
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Session verification failed.' });
  }
});

authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    AuditService.recordLogin({ user: req.user, ip, userAgent, status: 'SUCCESS' }).catch(() => {});
  }
  res.json({ user: req.user });
});

authRouter.get('/users', (req: Request, res: Response) => {
  res.json({ users: AuthService.listAuthorizedUsers() });
});
