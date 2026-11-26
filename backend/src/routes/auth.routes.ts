import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Missing idToken in request body.' });
    }
    const result = await AuthService.verifyGoogleToken(idToken);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Authentication failed.' });
  }
});

authRouter.post('/login-as', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email.' });
    }
    const result = AuthService.loginAs(email);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Access denied.' });
  }
});

authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

authRouter.get('/users', (req: Request, res: Response) => {
  res.json({ users: AuthService.listAuthorizedUsers() });
});
