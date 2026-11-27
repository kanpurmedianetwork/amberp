import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { SheetsService } from '../services/sheets.service';
import { AuditService } from '../services/audit.service';
import { config } from '../config';

export const adminRouter = Router();

// Protect ALL admin routes: Must be authenticated and have ADMIN role
adminRouter.use(authMiddleware);
adminRouter.use(requireRole(['ADMIN']));

// ==========================================
// 1. DOWNLOAD ALL DATA (MASTER EXCEL WORKBOOK)
// ==========================================
adminRouter.get('/export/all-excel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await SheetsService.init();
    const wb = SheetsService.workbook;
    if (!wb) {
      return res.status(500).json({ error: 'Workbook is not initialized.' });
    }

    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const buffer = await wb.xlsx.writeBuffer();
    const fileSizeStr = `${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB`;

    // Record Export in Audit History
    await AuditService.recordExport({
      user: req.user!,
      ip,
      exportType: 'FULL_EXCEL_WORKBOOK',
      format: 'XLSX',
      recordsCount: wb.worksheets.length,
      fileSize: fileSizeStr,
      userAgent,
    });

    const filename = `Ambica_Engineers_ERP_MASTER_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export master workbook.' });
  }
});

// ==========================================
// 2. DOWNLOAD ALL DATA (FULL JSON DATABASE DUMP)
// ==========================================
adminRouter.get('/export/all-json', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await SheetsService.init();
    const [customers, products, enquiries, orders, quotations, pis, docLogs, stats] = await Promise.all([
      SheetsService.getCustomers(),
      SheetsService.getProducts(),
      SheetsService.getEnquiries(),
      SheetsService.getOrders(),
      SheetsService.getQuotations(),
      SheetsService.getPIs(),
      SheetsService.getDocLog(),
      SheetsService.getDashboardStats(),
    ]);

    const exportLogs = await AuditService.getExportLogs();
    const loginLogs = await AuditService.getLoginLogs();
    const editLogs = await AuditService.getEditLogs();

    const fullDump = {
      meta: {
        exportedAt: new Date().toISOString(),
        exportedBy: req.user,
        system: 'Ambica Engineers & Lubricants Pvt. Ltd. ERP',
        version: '1.0.0',
      },
      stats,
      data: {
        customers,
        products,
        enquiries,
        orders,
        quotations,
        proformaInvoices: pis,
        documentLogs: docLogs,
      },
      audit: {
        exportHistory: exportLogs,
        loginHistory: loginLogs,
        editHistory: editLogs,
      },
    };

    const jsonStr = JSON.stringify(fullDump, null, 2);
    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const totalRecords =
      customers.length + products.length + enquiries.length + orders.length + quotations.length + pis.length;
    const fileSizeStr = `${(Buffer.byteLength(jsonStr, 'utf-8') / 1024).toFixed(1)} KB`;

    await AuditService.recordExport({
      user: req.user!,
      ip,
      exportType: 'FULL_JSON_BACKUP',
      format: 'JSON',
      recordsCount: totalRecords,
      fileSize: fileSizeStr,
      userAgent,
    });

    const filename = `Ambica_ERP_FULL_DATABASE_DUMP_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(jsonStr);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export full JSON backup.' });
  }
});

// ==========================================
// 3. EXPORT INDIVIDUAL CSV TABLES
// ==========================================
adminRouter.get('/export/csv/:entity', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await SheetsService.init();
    const entity = (req.params.entity || '').toLowerCase().trim();
    let csvData = '';
    let recordCount = 0;
    let exportType = '';

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    if (entity === 'customers') {
      exportType = 'CUSTOMERS_CSV';
      const data = await SheetsService.getCustomers();
      recordCount = data.length;
      csvData = 'Customer ID,Name,Contact Person,Phone,Email,City,State,GSTIN\n';
      csvData += data
        .map((c) =>
          [c.id, c.name, c.contactPerson || '', c.phone || '', c.email || '', c.city || '', c.state || '', c.gstin || '']
            .map(escapeCsv)
            .join(',')
        )
        .join('\n');
    } else if (entity === 'products') {
      exportType = 'PRODUCTS_CSV';
      const data = await SheetsService.getProducts();
      recordCount = data.length;
      csvData = 'Product ID,Description,Price,Old Price,Active\n';
      csvData += data
        .map((p) => [p.id, p.description, p.defaultPrice || 0, p.oldPrice || 0, p.active ? 'Yes' : 'No'].map(escapeCsv).join(','))
        .join('\n');
    } else if (entity === 'enquiries') {
      exportType = 'ENQUIRIES_CSV';
      const data = await SheetsService.getEnquiries();
      recordCount = data.length;
      csvData = 'Enquiry ID,Date,Customer,Assigned,City,State,Phone,Status,Summary\n';
      csvData += data
        .map((e) =>
          [e.id, e.date, e.customer, e.assignedPerson || '', e.city || '', e.state || '', e.phone || '', e.status, e.allSummary || '']
            .map(escapeCsv)
            .join(',')
        )
        .join('\n');
    } else if (entity === 'orders') {
      exportType = 'ORDERS_CSV';
      const data = await SheetsService.getOrders();
      recordCount = data.length;
      csvData = 'Order ID,Date,Customer,Reference,City,Status,Items\n';
      csvData += data
        .map((o) => [o.id, o.date, o.customer, o.reference || '', o.city || '', o.status, o.allSummary || ''].map(escapeCsv).join(','))
        .join('\n');
    } else if (entity === 'quotations') {
      exportType = 'QUOTATIONS_CSV';
      const data = await SheetsService.getQuotations();
      recordCount = data.length;
      csvData = 'Quotation ID,Date,Customer,City,Status,Items\n';
      csvData += data
        .map((q) => [q.id, q.date, q.customer, q.city || '', q.status, q.allSummary || ''].map(escapeCsv).join(','))
        .join('\n');
    } else if (entity === 'pi') {
      exportType = 'PI_CSV';
      const data = await SheetsService.getPIs();
      recordCount = data.length;
      csvData = 'PI ID,Date,Customer,PO Number,City,Status,Items\n';
      csvData += data
        .map((p) => [p.id, p.date, p.customer, p.purchaseOrder || '', p.city || '', p.status, p.allSummary || ''].map(escapeCsv).join(','))
        .join('\n');
    } else {
      return res.status(400).json({ error: `Unknown export entity: ${entity}. Use customers, products, enquiries, orders, quotations, or pi.` });
    }

    const ip = AuditService.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const fileSizeStr = `${(Buffer.byteLength(csvData, 'utf-8') / 1024).toFixed(1)} KB`;

    await AuditService.recordExport({
      user: req.user!,
      ip,
      exportType,
      format: 'CSV',
      recordsCount: recordCount,
      fileSize: fileSizeStr,
      userAgent,
    });

    const filename = `Ambica_${entity.toUpperCase()}_EXPORT_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export CSV.' });
  }
});

// ==========================================
// 4. AUDIT QUERY ENDPOINTS
// ==========================================
adminRouter.get('/audit/exports', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await AuditService.getExportLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch export audit logs.' });
  }
});

adminRouter.get('/audit/logins', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await AuditService.getLoginLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch login audit logs.' });
  }
});

adminRouter.get('/audit/edits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const entityType = req.query.entityType as string;
    const logs = await AuditService.getEditLogs(search, entityType);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch edit audit logs.' });
  }
});

adminRouter.get('/audit/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await AuditService.getAuditStats();
    res.json({ stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit stats.' });
  }
});
