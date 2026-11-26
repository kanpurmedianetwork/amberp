import { Router, Response } from 'express';
import { SheetsService } from '../services/sheets.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

export const dashboardRouter = Router();

dashboardRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await SheetsService.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard metrics.' });
  }
});
