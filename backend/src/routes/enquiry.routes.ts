import { Router, Response } from 'express';
import { SheetsService } from '../services/sheets.service';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const enquiryRouter = Router();

enquiryRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const enquiries = await SheetsService.getEnquiries(search, status);
    res.json({ enquiries });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch enquiries.' });
  }
});

enquiryRouter.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enquiry = await SheetsService.getEnquiryById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }
    res.json({ enquiry });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch enquiry.' });
  }
});

enquiryRouter.post('/', authMiddleware, requireRole(['ADMIN', 'SALES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customer, contactPerson, assignedPerson, city, state, phone, email, reference, status, remarks, items } = req.body;
    if (!customer) {
      return res.status(400).json({ error: 'Customer is required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required.' });
    }

    const enquiry = await SheetsService.saveEnquiry({
      customer,
      contactPerson,
      assignedPerson: assignedPerson || req.user?.name,
      city,
      state,
      phone,
      email,
      reference,
      status: status || 'Open',
      remarks,
      items,
    });

    res.status(201).json({ enquiry, message: `Enquiry ${enquiry.id} created successfully.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save enquiry.' });
  }
});

enquiryRouter.put('/:id', authMiddleware, requireRole(['ADMIN', 'SALES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enquiry = await SheetsService.saveEnquiry({
      id: req.params.id,
      ...req.body,
    });
    res.json({ enquiry, message: `Enquiry ${enquiry.id} updated successfully.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update enquiry.' });
  }
});
