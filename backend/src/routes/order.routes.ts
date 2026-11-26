import { Router, Response } from 'express';
import { SheetsService } from '../services/sheets.service';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const orderRouter = Router();

orderRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const orders = await SheetsService.getOrders(search);
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch orders.' });
  }
});

orderRouter.post('/convert', authMiddleware, requireRole(['ADMIN', 'OPERATIONS']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enquiryId, modeOfDispatch, docketNumber } = req.body;
    if (!enquiryId) {
      return res.status(400).json({ error: 'Source enquiryId is required.' });
    }
    const order = await SheetsService.convertEnquiryToOrder(enquiryId, { modeOfDispatch, docketNumber });
    res.status(201).json({ order, message: `Enquiry converted into Order ${order.id}.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to convert enquiry to order.' });
  }
});
