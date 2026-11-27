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

authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

authRouter.get('/users', (req: Request, res: Response) => {
  res.json({ users: AuthService.listAuthorizedUsers() });
});
