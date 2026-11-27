import { Router, Response } from 'express';
import { SheetsService } from '../services/sheets.service';
import { AuditService } from '../services/audit.service';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const customerRouter = Router();

customerRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const customers = await SheetsService.getCustomers(q);
    res.json({ customers });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch customers.' });
  }
});

customerRouter.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await SheetsService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json({ customer });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch customer.' });
  }
});

customerRouter.post('/', authMiddleware, requireRole(['ADMIN', 'SALES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, contactPerson, designation, phone, email, city, state, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    const customer = await SheetsService.saveCustomer({
      name,
      contactPerson,
      designation,
      phone,
      email,
      city,
      state,
      notes,
    });

    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    AuditService.recordEdit({
      user: req.user!,
      ip,
      action: 'CREATE',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      details: `Created customer record for ${customer.name} (${customer.city || ''})`,
      userAgent,
    }).catch(() => {});

    res.status(201).json({ customer, message: 'Customer created successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save customer.' });
  }
});

customerRouter.put('/:id', authMiddleware, requireRole(['ADMIN', 'SALES']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await SheetsService.updateCustomer(req.params.id, req.body);
    res.json({ customer, message: 'Customer updated successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update customer.' });
  }
});
