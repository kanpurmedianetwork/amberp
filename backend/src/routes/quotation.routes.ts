import { Router, Response } from 'express';
import { SheetsService } from '../services/sheets.service';
import { DocumentService } from '../services/document.service';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const quotationRouter = Router();

quotationRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const quotations = await SheetsService.getQuotations(search);
    res.json({ quotations });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch quotations.' });
  }
});

quotationRouter.post('/generate', authMiddleware, requireRole(['ADMIN', 'SALES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enquiryId } = req.body;
    if (!enquiryId) {
      return res.status(400).json({ error: 'Source enquiryId is required.' });
    }
    const result = await DocumentService.generateQuotation(enquiryId);
    res.status(201).json({
      message: `Quotation ${result.docNo} generated successfully.`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate quotation.' });
  }
});
