import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SheetsService } from '../services/sheets.service';
import { DocumentService } from '../services/document.service';
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

// Dynamic View / Print Route
documentRouter.get('/view', async (req: Request, res: Response) => {
  try {
    const type = ((req.query.type as string) || '').toLowerCase();
    const id = (req.query.id as string) || '';
    const filePath = (req.query.file as string) || '';

    if (type === 'quotation' && id) {
      const html = await DocumentService.getQuotationHtmlById(id);
      if (!html) return res.status(404).send('Quotation not found.');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    if (type === 'pi' && id) {
      const html = await DocumentService.getPIHtmlById(id);
      if (!html) return res.status(404).send('Proforma Invoice not found.');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    if (filePath && fs.existsSync(filePath)) {
      const resolved = path.resolve(filePath);
      const allowedDirs = [
        path.resolve(__dirname, '../../'),
        path.resolve(os.tmpdir()),
      ];
      const isAllowed = allowedDirs.some((dir) => resolved.startsWith(dir));
      if (isAllowed) {
        const content = fs.readFileSync(resolved, 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(content);
      }
    }

    res.status(404).send('Document not found.');
  } catch (err: any) {
    res.status(500).send('Error rendering document.');
  }
});

// Dynamic In-Memory Excel Download Route
documentRouter.get('/excel', async (req: Request, res: Response) => {
  try {
    const type = ((req.query.type as string) || '').toLowerCase();
    const id = (req.query.id as string) || '';

    if (type === 'quotation' && id) {
      const buffer = await DocumentService.generateQuotationExcelBuffer(id);
      if (!buffer) return res.status(404).send('Quotation not found.');
      const safeName = id.replace(/[\/\\:]/g, '_');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Quotation - ${safeName}.xlsx"`);
      return res.send(buffer);
    }

    if (type === 'pi' && id) {
      const buffer = await DocumentService.generatePIExcelBuffer(id);
      if (!buffer) return res.status(404).send('Proforma Invoice not found.');
      const safeName = id.replace(/[\/\\:]/g, '_');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="PI - ${safeName}.xlsx"`);
      return res.send(buffer);
    }

    res.status(400).send('Invalid document type or ID.');
  } catch (err: any) {
    res.status(500).send('Error generating Excel file.');
  }
});
