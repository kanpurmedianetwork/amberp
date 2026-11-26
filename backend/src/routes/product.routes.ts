import { Router, Response } from 'express';
import { SheetsService } from '../services/sheets.service';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const productRouter = Router();

productRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const activeOnly = req.query.active === 'true';
    const products = await SheetsService.getProducts(q, activeOnly);
    res.json({ products });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch products.' });
  }
});

productRouter.post('/', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description, notes, active } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Product description is required.' });
    }
    const product = await SheetsService.saveProduct({ description, notes, active });
    res.status(201).json({ product, message: 'Product created successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create product.' });
  }
});

productRouter.put('/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = await SheetsService.updateProduct(req.params.id, req.body);
    res.json({ product, message: 'Product updated successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update product.' });
  }
});
