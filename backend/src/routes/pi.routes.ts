import { Router, Response } from 'express';
import { SheetsService } from '../services/sheets.service';
import { DocumentService } from '../services/document.service';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const piRouter = Router();

piRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const pis = await SheetsService.getPIs(search);
    res.json({ pis });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch Proforma Invoices.' });
  }
});

piRouter.post('/generate', authMiddleware, requireRole(['ADMIN', 'OPERATIONS']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Source orderId is required.' });
    }
    const result = await DocumentService.generatePI(orderId);
    res.status(201).json({
      message: `Proforma Invoice ${result.docNo} generated successfully.`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate Proforma Invoice.' });
  }
});
