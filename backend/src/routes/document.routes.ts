import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
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
    // Security check: allow files inside app root or system tmpdir
    const allowedDirs = [
      path.resolve(__dirname, '../../'),
      path.resolve(os.tmpdir()),
    ];
    const isAllowed = allowedDirs.some((dir) => resolved.startsWith(dir));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Access forbidden.' });
    }

    const fileName = path.basename(resolved);
    res.download(resolved, fileName);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to download file.' });
  }
});

documentRouter.get('/view', (req: Request, res: Response) => {
  try {
    const filePath = req.query.file as string;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('Document not found.');
    }

    const resolved = path.resolve(filePath);
    const allowedDirs = [
      path.resolve(__dirname, '../../'),
      path.resolve(os.tmpdir()),
    ];
    const isAllowed = allowedDirs.some((dir) => resolved.startsWith(dir));
    if (!isAllowed) {
      return res.status(403).send('Access forbidden.');
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  } catch (err: any) {
    res.status(500).send('Failed to display document.');
  }
});
