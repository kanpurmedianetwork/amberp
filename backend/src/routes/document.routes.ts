import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { SheetsService } from '../services/sheets.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

export const documentRouter = Router();

documentRouter.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;
    const entries = await SheetsService.getDocLog(search, type);
    res.json({ documents: entries });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch document history.' });
  }
});

documentRouter.get('/download', (req: Request, res: Response) => {
  try {
    const filePath = req.query.file as string;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const resolved = path.resolve(filePath);
    // Security check: only allow files inside output or templates dir
    const allowedDir = path.resolve(__dirname, '../../');
    if (!resolved.startsWith(allowedDir)) {
      return res.status(403).json({ error: 'Access forbidden.' });
    }

    const fileName = path.basename(resolved);
    res.download(resolved, fileName);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to download file.' });
  }
});
