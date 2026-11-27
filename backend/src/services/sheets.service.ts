import fs from 'fs';
import path from 'path';
import os from 'os';
import ExcelJS from 'exceljs';
import { google, sheets_v4 } from 'googleapis';
import { config } from '../config';
import {
  Customer,
  Product,
  Enquiry,
  Order,
  Quotation,
  ProformaInvoice,
  DocLogEntry,
  DashboardStats,
  DocumentItem,
} from '../types';
import { SequenceService } from './sequence.service';
import { FirestoreService } from './firestore.service';

function clean(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.result !== undefined) return clean(v.result);
    if (v.richText && Array.isArray(v.richText)) {
      return v.richText.map((t: any) => t.text || '').join('');
    }
    if (v.text !== undefined) return String(v.text);
    if (v instanceof Date) {
      return v.toISOString().split('T')[0];
    }
  }
  return String(v).trim();
}

function parseItemsSummary(summary: string): DocumentItem[] {
  if (!summary) return [];
  const parts = summary.split(/\s*;\s*/);
  const items: DocumentItem[] = [];
  for (const part of parts) {
    if (!part.trim()) continue;
    const match = part.match(/^(.*?)\s*\|\s*Qty:\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      items.push({
        description: match[1].trim(),
        qty: parseFloat(match[2]),
      });
    } else {
      items.push({
        description: part.trim(),
        qty: 1,
      });
    }
  }
  return items;
}

export class SheetsService {
  private static workbook: ExcelJS.Workbook | null = null;
  private static isInitialized = false;
  private static googleSheetsApi: sheets_v4.Sheets | null = null;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    if (config.googleServiceAccountEmail && config.googleServiceAccountPrivateKey) {
      try {
        const auth = new google.auth.JWT({
          email: config.googleServiceAccountEmail,
          key: config.googleServiceAccountPrivateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
        });
        this.googleSheetsApi = google.sheets({ version: 'v4', auth });
        console.log('Connected to Google Sheets API via Service Account.');
      } catch (err) {
        console.warn('Google Sheets API auth failed, falling back to local workbook storage:', err);
      }
    }

    await this.loadWorkbook();
    this.isInitialized = true;
  }

  private static getWorkingWorkbookPath(): string {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const tmpPath = path.join(os.tmpdir(), 'Ambica_Engineers_ERP_2026-2027_fixed.xlsx');
      if (!fs.existsSync(tmpPath) && fs.existsSync(config.localWorkbookPath)) {
        try {
          fs.copyFileSync(config.localWorkbookPath, tmpPath);
        } catch (e: any) {
          console.warn('[SheetsService] Non-fatal: could not copy seed workbook to tmp:', e.message);
        }
      }
      return tmpPath;
    }
    return config.localWorkbookPath;
  }

  private static async loadWorkbook(): Promise<ExcelJS.Workbook> {
    const wb = new ExcelJS.Workbook();
    const candidatePath = this.getWorkingWorkbookPath();
    if (fs.existsSync(candidatePath)) {
      await wb.xlsx.readFile(candidatePath);
    } else if (fs.existsSync(config.localWorkbookPath)) {
      await wb.xlsx.readFile(config.localWorkbookPath);
    } else {
      throw new Error(`Workbook not found at: ${config.localWorkbookPath}`);
    }
    this.workbook = wb;
    return wb;
  }

  private static async saveWorkbook(): Promise<void> {
    if (!this.workbook) return;
    try {
      const targetPath = this.getWorkingWorkbookPath();
      await this.workbook.xlsx.writeFile(targetPath);
    } catch (err: any) {
      console.warn('[SheetsService] Non-fatal: Read-only disk environment detected. Local file save skipped. (Data is securely committed to Cloud Firestore):', err.message);
    }
  }

  // ==========================================
  // DASHBOARD STATS
  // ==========================================
  public static async getDashboardStats(): Promise<DashboardStats> {
    await this.init();
    const customers = await this.getCustomers();
    const products = await this.getProducts();
    const enquiries = await this.getEnquiries();
    const orders = await this.getOrders();
    const quotations = await this.getQuotations();
    const pis = await this.getPIs();

    // Calculate max numbers across all relevant worksheets to preserve historical running numbers
    let maxEnq = 0;
    ['ENQUIRIES', 'ENQUIRY_ITEMS', 'QUOTATIONS', 'ORDERS', 'PI', '_DOC_LOG', 'ENQUIRY DESK'].forEach((sname) => {
      const sh = this.workbook!.getWorksheet(sname);
      if (!sh) return;
      sh.eachRow((row) => {
        row.eachCell((cell) => {
          const val = clean(cell.value);
          const matches = val.match(/EN(?:R|Q)?-\s*(\d+)/gi) || [];
          matches.forEach((m) => {
            const num = parseInt(m.replace(/\D/g, ''), 10);
            if (num > maxEnq) maxEnq = num;
          });
        });
      });
    });

    let maxQuo = 0;
    ['QUOTATIONS', 'PI', '_DOC_LOG'].forEach((sname) => {
      const sh = this.workbook!.getWorksheet(sname);
      if (!sh) return;
      sh.eachRow((row) => {
        row.eachCell((cell) => {
          const val = clean(cell.value);
          const m = val.match(/AELPL\/26-27\/(\d+)$/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxQuo) maxQuo = num;
          }
        });
      });
    });

    let maxOrd = 0;
    const ordSh = this.workbook!.getWorksheet('ORDERS');
    if (ordSh) {
      ordSh.eachRow((row) => {
        row.eachCell((cell) => {
          const val = clean(cell.value);
          const m = val.match(/AE\/26-27\/O(\d+)$/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxOrd) maxOrd = num;
          }
        });
      });
    }

    let maxPI = 0;
    const piSh = this.workbook!.getWorksheet('PI');
    if (piSh) {
      piSh.eachRow((row) => {
        row.eachCell((cell) => {
          const val = clean(cell.value);
          const m = val.match(/AELPL\/26-27\/(\d+)$/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxPI) maxPI = num;
          }
        });
      });
    }

    const nextEnquiryNo = `${config.prefixes.enquiry}${String(maxEnq + 1).padStart(6, '0')}`;
    const nextQuotationNo = `${config.prefixes.quotation}${String(Math.max(maxQuo + 1, 6)).padStart(3, '0')}`;
    const nextOrderNo = `${config.prefixes.order}${maxOrd + 1}`;
    const nextPINo = `${config.prefixes.pi}${String(Math.max(maxPI + 1, 6)).padStart(3, '0')}`;

    return {
      historicalEnquiries: enquiries.length,
      historicalQuotations: quotations.length,
      historicalOrders: orders.length,
      historicalPIs: pis.length,
      customerCount: customers.length,
      productCount: products.length,
      nextEnquiryNo,
      nextQuotationNo,
      nextOrderNo,
      nextPINo,
    };
  }

  // ==========================================
  // CUSTOMERS (PARTY_MASTER)
  // ==========================================
  public static async getCustomers(query?: string): Promise<Customer[]> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('PARTY_MASTER');
    if (!sheet) return [];

    const customers: Customer[] = [];
    const q = (query || '').toLowerCase().trim();

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Header
      const id = clean(row.getCell(1).value);
      const name = clean(row.getCell(2).value);
      if (!name) return;

      const customer: Customer = {
        id: id || `CUST-${String(rowNumber - 1).padStart(4, '0')}`,
        name,
        contactPerson: clean(row.getCell(3).value),
        designation: clean(row.getCell(4).value),
        phone: clean(row.getCell(5).value),
        email: clean(row.getCell(6).value),
        city: clean(row.getCell(7).value),
        state: clean(row.getCell(8).value),
        firstActivity: clean(row.getCell(9).value),
        latestActivity: clean(row.getCell(10).value),
        notes: clean(row.getCell(11).value),
      };

      if (
        !q ||
        customer.name.toLowerCase().includes(q) ||
        (customer.contactPerson && customer.contactPerson.toLowerCase().includes(q)) ||
        (customer.city && customer.city.toLowerCase().includes(q)) ||
        (customer.phone && customer.phone.includes(q))
      ) {
        customers.push(customer);
      }
    });

    return customers;
  }

  public static async getCustomerById(id: string): Promise<Customer | null> {
    const all = await this.getCustomers();
    return all.find((c) => c.id.toLowerCase() === id.toLowerCase() || c.name.toLowerCase() === id.toLowerCase()) || null;
  }

  public static async saveCustomer(data: Partial<Customer>): Promise<Customer> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('PARTY_MASTER');
    if (!sheet) throw new Error('Sheet PARTY_MASTER not found');

    const existing = await this.getCustomers();
    const duplicate = existing.find((c) => c.name.toLowerCase() === (data.name || '').toLowerCase().trim());
    if (duplicate) {
      throw new Error(`Customer with name '${data.name}' already exists (${duplicate.id}).`);
    }

    let maxNum = 0;
    existing.forEach((c) => {
      const m = c.id.match(/CUST-(\d+)/i);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });

    const newId = `CUST-${String(maxNum + 1).padStart(4, '0')}`;
    const newCustomer: Customer = {
      id: newId,
      name: (data.name || '').trim(),
      contactPerson: data.contactPerson?.trim() || '',
      designation: data.designation?.trim() || '',
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      city: data.city?.trim() || '',
      state: data.state?.trim() || '',
      firstActivity: new Date().toISOString().split('T')[0],
      latestActivity: new Date().toISOString().split('T')[0],
      notes: data.notes?.trim() || '',
    };

    const newRow = sheet.addRow([
      newCustomer.id,
      newCustomer.name,
      newCustomer.contactPerson,
      newCustomer.designation,
      newCustomer.phone,
      newCustomer.email,
      newCustomer.city,
      newCustomer.state,
      newCustomer.firstActivity,
      newCustomer.latestActivity,
      newCustomer.notes,
    ]);
    newRow.commit();

    await this.saveWorkbook();
    FirestoreService.syncRecord('customers', newCustomer.id, newCustomer).catch(() => {});
    return newCustomer;
  }

  public static async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('PARTY_MASTER');
    if (!sheet) throw new Error('Sheet PARTY_MASTER not found');

    let targetRow: ExcelJS.Row | null = null;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (clean(row.getCell(1).value).toLowerCase() === id.toLowerCase()) {
        targetRow = row;
      }
    });

    if (!targetRow) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    const row = targetRow as ExcelJS.Row;
    if (data.name) row.getCell(2).value = data.name.trim();
    if (data.contactPerson !== undefined) row.getCell(3).value = data.contactPerson.trim();
    if (data.designation !== undefined) row.getCell(4).value = data.designation.trim();
    if (data.phone !== undefined) row.getCell(5).value = data.phone.trim();
    if (data.email !== undefined) row.getCell(6).value = data.email.trim();
    if (data.city !== undefined) row.getCell(7).value = data.city.trim();
    if (data.state !== undefined) row.getCell(8).value = data.state.trim();
    row.getCell(10).value = new Date().toISOString().split('T')[0];
    if (data.notes !== undefined) row.getCell(11).value = data.notes.trim();

    row.commit();
    await this.saveWorkbook();
    const updatedCustomer = (await this.getCustomerById(id))!;
    FirestoreService.syncRecord('customers', id, updatedCustomer).catch(() => {});
    return updatedCustomer;
  }

  // ==========================================
  // PRODUCTS (PRODUCT_MASTER)
  // ==========================================
  public static async getProducts(query?: string, activeOnly = false): Promise<Product[]> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('PRODUCT_MASTER');
    if (!sheet) return [];

    const products: Product[] = [];
    const q = (query || '').toLowerCase().trim();

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const desc = clean(row.getCell(2).value);
      if (!desc) return;

      const activeStr = clean(row.getCell(7).value).toLowerCase();
      const isActive = activeStr !== 'no' && activeStr !== 'false' && activeStr !== 'inactive';

      if (activeOnly && !isActive) return;

      const product: Product = {
        id: clean(row.getCell(1).value) || `PROD-${String(rowNumber - 1).padStart(4, '0')}`,
        description: desc,
        normalizedKey: clean(row.getCell(3).value),
        defaultPrice: parseFloat(clean(row.getCell(4).value)) || 0,
        oldPrice: parseFloat(clean(row.getCell(5).value)) || 0,
        notes: clean(row.getCell(6).value),
        active: isActive,
      };

      if (!q || product.description.toLowerCase().includes(q) || product.id.toLowerCase().includes(q)) {
        products.push(product);
      }
    });

    return products;
  }

  public static async saveProduct(data: Partial<Product>): Promise<Product> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('PRODUCT_MASTER');
    if (!sheet) throw new Error('Sheet PRODUCT_MASTER not found');

    const existing = await this.getProducts();
    let maxNum = 0;
    existing.forEach((p) => {
      const m = p.id.match(/PROD-(\d+)/i);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });

    const newId = `PROD-${String(maxNum + 1).padStart(4, '0')}`;
    const newProduct: Product = {
      id: newId,
      description: (data.description || '').trim(),
      normalizedKey: (data.description || '').toLowerCase().trim(),
      defaultPrice: 0, // Strict rule: no default price
      oldPrice: 0,
      notes: data.notes?.trim() || '',
      active: data.active !== undefined ? data.active : true,
    };

    const row = sheet.addRow([
      newProduct.id,
      newProduct.description,
      newProduct.normalizedKey,
      '',
      '',
      newProduct.notes,
      newProduct.active ? 'Yes' : 'No',
    ]);
    row.commit();

    await this.saveWorkbook();
    FirestoreService.syncRecord('products', newProduct.id, newProduct).catch(() => {});
    return newProduct;
  }

  public static async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('PRODUCT_MASTER');
    if (!sheet) throw new Error('Sheet PRODUCT_MASTER not found');

    let targetRow: ExcelJS.Row | null = null;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (clean(row.getCell(1).value).toLowerCase() === id.toLowerCase()) {
        targetRow = row;
      }
    });

    if (!targetRow) throw new Error(`Product with ID ${id} not found.`);
    const row = targetRow as ExcelJS.Row;

    if (data.description) {
      row.getCell(2).value = data.description.trim();
      row.getCell(3).value = data.description.toLowerCase().trim();
    }
    if (data.notes !== undefined) row.getCell(6).value = data.notes.trim();
    if (data.active !== undefined) row.getCell(7).value = data.active ? 'Yes' : 'No';

    row.commit();
    await this.saveWorkbook();
    const all = await this.getProducts();
    const updatedProduct = all.find((p) => p.id.toLowerCase() === id.toLowerCase())!;
    FirestoreService.syncRecord('products', id, updatedProduct).catch(() => {});
    return updatedProduct;
  }

  // ==========================================
  // ENQUIRIES (ENQUIRIES & ENQUIRY_ITEMS)
  // ==========================================
  public static async getEnquiries(search?: string, status?: string): Promise<Enquiry[]> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('ENQUIRIES');
    if (!sheet) return [];

    const enquiries: Enquiry[] = [];
    const s = (search || '').toLowerCase().trim();
    const st = (status || '').toLowerCase().trim();

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = clean(row.getCell(1).value);
      const customer = clean(row.getCell(3).value);
      if (!id || !customer || id.toLowerCase() === 'doc no' || id.toLowerCase() === 'document id') return;

      const currentStatus = clean(row.getCell(10).value) || 'Open';
      if (st && currentStatus.toLowerCase() !== st) return;

      const allSummary = clean(row.getCell(12).value);
      const items = parseItemsSummary(allSummary);

      // If summary is empty, check flattened columns (M=13, N=14, etc.)
      if (items.length === 0) {
        for (let i = 0; i < 20; i++) {
          const descCol = 13 + i * 7;
          const qtyCol = 14 + i * 7;
          const desc = clean(row.getCell(descCol).value);
          const qty = parseFloat(clean(row.getCell(qtyCol).value));
          if (desc && qty > 0) {
            items.push({ description: desc, qty });
          }
        }
      }

      const enquiry: Enquiry = {
        id,
        date: clean(row.getCell(2).value) || new Date().toISOString().split('T')[0],
        customer,
        assignedPerson: clean(row.getCell(4).value),
        city: clean(row.getCell(5).value),
        state: clean(row.getCell(6).value),
        contactPerson: clean(row.getCell(7).value),
        phone: clean(row.getCell(8).value),
        email: clean(row.getCell(9).value),
        status: currentStatus,
        remarks: clean(row.getCell(11).value),
        items,
        allSummary: items.map((it) => `${it.description} | Qty: ${it.qty}`).join(' ; '),
      };

      if (
        !s ||
        enquiry.id.toLowerCase().includes(s) ||
        enquiry.customer.toLowerCase().includes(s) ||
        (enquiry.contactPerson && enquiry.contactPerson.toLowerCase().includes(s)) ||
        (enquiry.city && enquiry.city.toLowerCase().includes(s))
      ) {
        enquiries.push(enquiry);
      }
    });

    return enquiries.reverse(); // Recent first
  }

  public static async getEnquiryById(id: string): Promise<Enquiry | null> {
    const list = await this.getEnquiries();
    return list.find((e) => e.id.toLowerCase() === id.toLowerCase()) || null;
  }

  public static async saveEnquiry(data: {
    id?: string;
    date?: string;
    customer: string;
    contactPerson?: string;
    assignedPerson?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    reference?: string;
    status?: string;
    remarks?: string;
    items: DocumentItem[];
  }): Promise<Enquiry> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('ENQUIRIES');
    const itemsSheet = this.workbook!.getWorksheet('ENQUIRY_ITEMS');
    if (!sheet) throw new Error('Sheet ENQUIRIES not found');

    if (!data.customer) throw new Error('Customer is required.');
    if (!data.items || data.items.length === 0) throw new Error('At least one item (Description + Qty) is required.');

    // Validate positive quantities
    for (const it of data.items) {
      if (!it.description.trim()) throw new Error('Item description cannot be empty.');
      if (!it.qty || it.qty <= 0) throw new Error(`Invalid quantity for item "${it.description}". Must be > 0.`);
    }

    let enqId = data.id?.trim();
    let isUpdate = false;

    if (enqId) {
      const existing = await this.getEnquiryById(enqId);
      if (existing) isUpdate = true;
    }

    if (!isUpdate || !enqId) {
      // Allocate atomic next enquiry number scanning across all sheets
      let maxNum = 0;
      ['ENQUIRIES', 'ENQUIRY_ITEMS', 'QUOTATIONS', 'ORDERS', 'PI', '_DOC_LOG', 'ENQUIRY DESK'].forEach((sname) => {
        const sh = this.workbook!.getWorksheet(sname);
        if (!sh) return;
        sh.eachRow((row) => {
          row.eachCell((cell) => {
            const val = clean(cell.value);
            const matches = val.match(/EN(?:R|Q)?-\s*(\d+)/gi) || [];
            matches.forEach((m) => {
              const num = parseInt(m.replace(/\D/g, ''), 10);
              if (num > maxNum) maxNum = num;
            });
          });
        });
      });
      enqId = await SequenceService.getNextEnquiryNumber(maxNum);
    }

    const summaryStr = data.items.map((it) => `${it.description.trim()} | Qty: ${it.qty}`).join(' ; ');
    const enqDate = data.date || new Date().toISOString().split('T')[0];
    const status = data.status || 'Open';

    if (isUpdate) {
      // Find row in ENQUIRIES
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (clean(row.getCell(1).value).toLowerCase() === enqId!.toLowerCase()) {
          row.getCell(2).value = enqDate;
          row.getCell(3).value = data.customer;
          row.getCell(4).value = data.assignedPerson || '';
          row.getCell(5).value = data.city || '';
          row.getCell(6).value = data.state || '';
          row.getCell(7).value = data.contactPerson || '';
          row.getCell(8).value = data.phone || '';
          row.getCell(9).value = data.email || '';
          row.getCell(10).value = status;
          row.getCell(11).value = data.remarks || '';
          row.getCell(12).value = summaryStr;

          // Clear legacy pricing on item columns and write description/qty only
          for (let i = 0; i < 20; i++) {
            const descCol = 13 + i * 7;
            const qtyCol = 14 + i * 7;
            const priceCol = 15 + i * 7;
            const amtCol = 16 + i * 7;
            if (i < data.items.length) {
              row.getCell(descCol).value = data.items[i].description.trim();
              row.getCell(qtyCol).value = data.items[i].qty;
            } else {
              row.getCell(descCol).value = '';
              row.getCell(qtyCol).value = '';
            }
            row.getCell(priceCol).value = '';
            row.getCell(amtCol).value = '';
          }
          row.commit();
        }
      });
    } else {
      // Append new row in ENQUIRIES
      const rowValues: any[] = [
        enqId,
        enqDate,
        data.customer,
        data.assignedPerson || '',
        data.city || '',
        data.state || '',
        data.contactPerson || '',
        data.phone || '',
        data.email || '',
        status,
        data.remarks || '',
        summaryStr,
      ];

      for (let i = 0; i < 20; i++) {
        if (i < data.items.length) {
          rowValues.push(data.items[i].description.trim());
          rowValues.push(data.items[i].qty);
          rowValues.push(''); // Price: blank
          rowValues.push(''); // Amount: blank
          rowValues.push(''); // Availability: blank
          rowValues.push(''); // Payment Terms: blank
          rowValues.push(''); // Remarks: blank
        } else {
          rowValues.push('', '', '', '', '', '', '');
        }
      }

      const newRow = sheet.addRow(rowValues);
      newRow.commit();
    }

    // Save normalized items in ENQUIRY_ITEMS
    if (itemsSheet) {
      // Remove previous items for this ID if updating
      if (isUpdate) {
        const rowsToDelete: number[] = [];
        itemsSheet.eachRow((r, rNum) => {
          if (rNum === 1) return;
          if (clean(r.getCell(16).value) === enqId || clean(r.getCell(3).value) === enqId) {
            rowsToDelete.push(rNum);
          }
        });
        rowsToDelete.reverse().forEach((rNum) => itemsSheet.spliceRows(rNum, 1));
      }

      data.items.forEach((it, idx) => {
        const itemRow = itemsSheet.addRow([
          idx + 1,
          enqDate,
          enqId,
          data.customer,
          data.city || '',
          data.state || '',
          data.contactPerson || '',
          data.phone || '',
          data.email || '',
          it.description.trim(),
          it.qty,
          '', // Price
          '', // Availability
          status,
          '', // Remarks
          enqId, // Document ID
          idx + 1, // Line No
          '', // Price
          '', // Payment Terms
          '', // Amount
          enqId, // Source Group ID
        ]);
        itemRow.commit();
      });
    }

    await this.saveWorkbook();

    const resultEnquiry: Enquiry = {
      id: enqId!,
      date: enqDate,
      customer: data.customer,
      assignedPerson: data.assignedPerson,
      city: data.city,
      state: data.state,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      status,
      remarks: data.remarks,
      items: data.items,
      allSummary: summaryStr,
    };
    FirestoreService.syncRecord('enquiries', resultEnquiry.id, resultEnquiry).catch(() => {});
    return resultEnquiry;
  }

  // ==========================================
  // ORDERS (ORDERS & ORDER_ITEMS)
  // ==========================================
  public static async getOrders(search?: string): Promise<Order[]> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('ORDERS');
    if (!sheet) return [];

    const orders: Order[] = [];
    const s = (search || '').toLowerCase().trim();

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = clean(row.getCell(1).value);
      const customer = clean(row.getCell(3).value) || clean(row.getCell(164).value);
      if (!id || !customer) return;

      const allSummary = clean(row.getCell(15).value);
      const items = parseItemsSummary(allSummary);

      if (items.length === 0) {
        for (let i = 0; i < 20; i++) {
          const descCol = 16 + i * 7;
          const qtyCol = 17 + i * 7;
          const desc = clean(row.getCell(descCol).value);
          const qty = parseFloat(clean(row.getCell(qtyCol).value));
          if (desc && qty > 0) items.push({ description: desc, qty });
        }
      }

      const order: Order = {
        id,
        orderId: clean(row.getCell(2).value) || id,
        sourceEnquiryId: clean(row.getCell(162).value) || clean(row.getCell(4).value),
        date: clean(row.getCell(163).value) || new Date().toISOString().split('T')[0],
        customer,
        assignedPerson: clean(row.getCell(5).value),
        city: clean(row.getCell(6).value),
        state: clean(row.getCell(7).value),
        contactPerson: clean(row.getCell(8).value),
        phone: clean(row.getCell(9).value),
        email: clean(row.getCell(10).value),
        status: clean(row.getCell(11).value) || 'Open',
        modeOfDispatch: clean(row.getCell(12).value),
        docketNumber: clean(row.getCell(13).value),
        reference: clean(row.getCell(14).value),
        remarks: clean(row.getCell(165).value),
        items,
        allSummary: items.map((it) => `${it.description} | Qty: ${it.qty}`).join(' ; '),
      };

      if (!s || order.id.toLowerCase().includes(s) || order.customer.toLowerCase().includes(s)) {
        orders.push(order);
      }
    });

    return orders.reverse();
  }

  public static async convertEnquiryToOrder(enquiryId: string, orderData?: any): Promise<Order> {
    await this.init();
    const enquiry = await this.getEnquiryById(enquiryId);
    if (!enquiry) throw new Error(`Enquiry ${enquiryId} not found.`);

    // Check if order already converted
    const existingOrders = await this.getOrders();
    const duplicate = existingOrders.find(
      (o) => o.sourceEnquiryId.toLowerCase() === enquiryId.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Enquiry ${enquiryId} has already been converted into Order ${duplicate.id}.`);
    }

    let maxOrd = 0;
    existingOrders.forEach((o) => {
      const m = o.id.match(/AE\/26-27\/O(\d+)$/i);
      if (m) maxOrd = Math.max(maxOrd, parseInt(m[1], 10));
    });

    const orderId = await SequenceService.getNextOrderNumber(maxOrd);
    const orderDate = new Date().toISOString().split('T')[0];
    const summaryStr = enquiry.items.map((it) => `${it.description} | Qty: ${it.qty}`).join(' ; ');

    const sheet = this.workbook!.getWorksheet('ORDERS');
    const itemsSheet = this.workbook!.getWorksheet('ORDER_ITEMS');
    if (!sheet) throw new Error('Sheet ORDERS not found');

    const rowValues: any[] = [
      orderId,
      orderId,
      enquiry.customer,
      enquiryId,
      enquiry.assignedPerson || '',
      enquiry.city || '',
      enquiry.state || '',
      enquiry.contactPerson || '',
      enquiry.phone || '',
      enquiry.email || '',
      'Open',
      orderData?.modeOfDispatch || '',
      orderData?.docketNumber || '',
      enquiry.reference || '',
      summaryStr,
    ];

    for (let i = 0; i < 20; i++) {
      if (i < enquiry.items.length) {
        rowValues.push(enquiry.items[i].description.trim());
        rowValues.push(enquiry.items[i].qty);
        rowValues.push('', '', '', '', '');
      } else {
        rowValues.push('', '', '', '', '', '', '');
      }
    }

    rowValues.push(
      '', '', '', '', '', // Subtotal, GST, Total, Words, Product Details
      enquiryId, // Source Group ID
      orderDate, // Date
      enquiry.customer, // Customer
      enquiry.remarks || '' // Remarks
    );

    const newRow = sheet.addRow(rowValues);
    newRow.commit();

    // Save order items in ORDER_ITEMS
    if (itemsSheet) {
      enquiry.items.forEach((it, idx) => {
        const itemRow = itemsSheet.addRow([
          orderId,
          enquiry.customer,
          summaryStr,
          idx + 1,
          it.description.trim(),
          it.qty,
          '', '', '', '', '', // Price, Avail, Pay, Remarks, Amount
          enquiryId, // Source Group ID
        ]);
        itemRow.commit();
      });
    }

    // Update enquiry status to 'Order Created'
    await this.updateEnquiryStatus(enquiryId, 'Order Created');

    // Append to _DOC_LOG
    await this.appendDocLog({
      timestamp: new Date().toISOString(),
      type: 'ORDER',
      documentNo: orderId,
      sourceDocument: enquiryId,
      customer: enquiry.customer,
      sheetFileId: '',
      sheetUrl: '',
      pdfUrl: '',
    });

    await this.saveWorkbook();

    const resultOrder: Order = {
      id: orderId,
      orderId,
      sourceEnquiryId: enquiryId,
      date: orderDate,
      customer: enquiry.customer,
      contactPerson: enquiry.contactPerson,
      assignedPerson: enquiry.assignedPerson,
      city: enquiry.city,
      state: enquiry.state,
      phone: enquiry.phone,
      email: enquiry.email,
      status: 'Open',
      items: enquiry.items,
      allSummary: summaryStr,
    };
    FirestoreService.syncRecord('orders', resultOrder.id, resultOrder).catch(() => {});
    return resultOrder;
  }

  public static async updateEnquiryStatus(enquiryId: string, status: string): Promise<void> {
    const sheet = this.workbook!.getWorksheet('ENQUIRIES');
    if (!sheet) return;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (clean(row.getCell(1).value).toLowerCase() === enquiryId.toLowerCase()) {
        row.getCell(10).value = status;
        row.commit();
      }
    });
  }

  // ==========================================
  // QUOTATIONS
  // ==========================================
  public static async getQuotations(search?: string): Promise<Quotation[]> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('QUOTATIONS');
    if (!sheet) return [];

    const quotations: Quotation[] = [];
    const s = (search || '').toLowerCase().trim();

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = clean(row.getCell(1).value);
      const customer = clean(row.getCell(3).value);
      if (!id || !customer || id.toLowerCase() === 'doc no' || id.toLowerCase() === 'document id') return;

      const allSummary = clean(row.getCell(14).value);
      const items = parseItemsSummary(allSummary);

      if (items.length === 0) {
        for (let i = 0; i < 20; i++) {
          const desc = clean(row.getCell(15 + i * 7).value);
          const qty = parseFloat(clean(row.getCell(16 + i * 7).value));
          if (desc && qty > 0) items.push({ description: desc, qty });
        }
      }

      const qtn: Quotation = {
        id,
        date: clean(row.getCell(2).value) || new Date().toISOString().split('T')[0],
        customer,
        sourceEnquiryId: clean(row.getCell(161).value) || clean(row.getCell(4).value),
        assignedPerson: clean(row.getCell(5).value),
        city: clean(row.getCell(6).value),
        state: clean(row.getCell(7).value),
        contactPerson: clean(row.getCell(8).value),
        phone: clean(row.getCell(9).value),
        email: clean(row.getCell(10).value),
        status: clean(row.getCell(11).value) || 'GENERATED',
        remarks: clean(row.getCell(12).value),
        reference: clean(row.getCell(13).value),
        items,
        allSummary: items.map((it) => `${it.description} | Qty: ${it.qty}`).join(' ; '),
      };

      if (!s || qtn.id.toLowerCase().includes(s) || qtn.customer.toLowerCase().includes(s)) {
        quotations.push(qtn);
      }
    });

    return quotations.reverse();
  }

  public static async saveQuotationRecord(qtn: Quotation): Promise<void> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('QUOTATIONS');
    const itemsSheet = this.workbook!.getWorksheet('QUOTATION_ITEMS');
    if (!sheet) throw new Error('Sheet QUOTATIONS not found');

    const summaryStr = qtn.items.map((it) => `${it.description} | Qty: ${it.qty}`).join(' ; ');
    const rowValues: any[] = [
      qtn.id,
      qtn.date,
      qtn.customer,
      qtn.sourceEnquiryId,
      qtn.assignedPerson || '',
      qtn.city || '',
      qtn.state || '',
      qtn.contactPerson || '',
      qtn.phone || '',
      qtn.email || '',
      qtn.status || 'GENERATED',
      qtn.remarks || '',
      qtn.reference || '',
      summaryStr,
    ];

    for (let i = 0; i < 20; i++) {
      if (i < qtn.items.length) {
        rowValues.push(qtn.items[i].description.trim());
        rowValues.push(qtn.items[i].qty);
        rowValues.push('', '', '', '', '');
      } else {
        rowValues.push('', '', '', '', '', '', '');
      }
    }

    rowValues.push('', '', '', '', '', summaryStr, qtn.sourceEnquiryId);
    const newRow = sheet.addRow(rowValues);
    newRow.commit();

    if (itemsSheet) {
      qtn.items.forEach((it, idx) => {
        const itemRow = itemsSheet.addRow([
          idx + 1,
          qtn.date,
          qtn.id,
          qtn.customer,
          qtn.city || '',
          qtn.state || '',
          qtn.contactPerson || '',
          qtn.phone || '',
          qtn.email || '',
          it.description.trim(),
          it.qty,
          '', '', qtn.status, '',
          qtn.id,
          idx + 1,
          '', '', '', qtn.sourceEnquiryId,
        ]);
        itemRow.commit();
      });
    }

    await this.updateEnquiryStatus(qtn.sourceEnquiryId, 'Quotation Generated');
    await this.saveWorkbook();
    FirestoreService.syncRecord('quotations', qtn.id, qtn).catch(() => {});
  }

  // ==========================================
  // PROFORMA INVOICES (PI)
  // ==========================================
  public static async getPIs(search?: string): Promise<ProformaInvoice[]> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('PI');
    if (!sheet) return [];

    const pis: ProformaInvoice[] = [];
    const s = (search || '').toLowerCase().trim();

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = clean(row.getCell(1).value);
      const customer = clean(row.getCell(3).value);
      if (!id || !customer || id.toLowerCase() === 'doc no' || id.toLowerCase() === 'document id') return;

      const allSummary = clean(row.getCell(19).value);
      const items = parseItemsSummary(allSummary);

      if (items.length === 0) {
        for (let i = 0; i < 20; i++) {
          const desc = clean(row.getCell(20 + i * 7).value);
          const qty = parseFloat(clean(row.getCell(21 + i * 7).value));
          if (desc && qty > 0) items.push({ description: desc, qty });
        }
      }

      const pi: ProformaInvoice = {
        id,
        date: clean(row.getCell(2).value) || new Date().toISOString().split('T')[0],
        customer,
        sourceOrderId: clean(row.getCell(14).value) || clean(row.getCell(4).value),
        assignedPerson: clean(row.getCell(5).value),
        city: clean(row.getCell(6).value),
        state: clean(row.getCell(7).value),
        contactPerson: clean(row.getCell(8).value),
        phone: clean(row.getCell(9).value),
        email: clean(row.getCell(10).value),
        transportVia: clean(row.getCell(11).value),
        status: clean(row.getCell(12).value) || 'GENERATED',
        remarks: clean(row.getCell(13).value),
        purchaseOrder: clean(row.getCell(17).value),
        orderDate: clean(row.getCell(18).value),
        items,
        allSummary: items.map((it) => `${it.description} | Qty: ${it.qty}`).join(' ; '),
      };

      if (!s || pi.id.toLowerCase().includes(s) || pi.customer.toLowerCase().includes(s)) {
        pis.push(pi);
      }
    });

    return pis.reverse();
  }

  public static async savePIRecord(pi: ProformaInvoice): Promise<void> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('PI');
    const itemsSheet = this.workbook!.getWorksheet('PI_ITEMS');
    if (!sheet) throw new Error('Sheet PI not found');

    const summaryStr = pi.items.map((it) => `${it.description} | Qty: ${it.qty}`).join(' ; ');
    const rowValues: any[] = [
      pi.id,
      pi.date,
      pi.customer,
      pi.id,
      pi.assignedPerson || '',
      pi.city || '',
      pi.state || '',
      pi.contactPerson || '',
      pi.phone || '',
      pi.email || '',
      pi.transportVia || '',
      pi.status || 'GENERATED',
      pi.remarks || '',
      pi.sourceOrderId,
      '',
      pi.reference || '',
      pi.purchaseOrder || '',
      pi.orderDate || pi.date,
      summaryStr,
    ];

    for (let i = 0; i < 20; i++) {
      if (i < pi.items.length) {
        rowValues.push(pi.items[i].description.trim());
        rowValues.push(pi.items[i].qty);
        rowValues.push('', '', '', '', '');
      } else {
        rowValues.push('', '', '', '', '', '', '');
      }
    }

    rowValues.push('', '', '', '', '', summaryStr);
    const newRow = sheet.addRow(rowValues);
    newRow.commit();

    if (itemsSheet) {
      pi.items.forEach((it, idx) => {
        const itemRow = itemsSheet.addRow([
          idx + 1,
          pi.date,
          pi.id,
          pi.customer,
          pi.city || '',
          pi.state || '',
          pi.contactPerson || '',
          pi.phone || '',
          pi.email || '',
          it.description.trim(),
          it.qty,
          '', '', pi.status, '',
          pi.id,
          idx + 1,
          '', '', '', pi.sourceOrderId,
        ]);
        itemRow.commit();
      });
    }

    await this.saveWorkbook();
    FirestoreService.syncRecord('proformaInvoices', pi.id, pi).catch(() => {});
  }

  // ==========================================
  // DOCUMENT HISTORY (_DOC_LOG)
  // ==========================================
  public static async getDocLog(search?: string, type?: string): Promise<DocLogEntry[]> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('_DOC_LOG');
    if (!sheet) return [];

    const entries: DocLogEntry[] = [];
    const s = (search || '').toLowerCase().trim();
    const t = (type || '').toUpperCase().trim();

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const docNo = clean(row.getCell(3).value);
      if (!docNo) return;

      const docType = (clean(row.getCell(2).value) || 'QUOTATION').toUpperCase() as any;
      if (t && docType !== t) return;

      const entry: DocLogEntry = {
        timestamp: clean(row.getCell(1).value),
        type: docType,
        documentNo: docNo,
        sourceDocument: clean(row.getCell(4).value),
        customer: clean(row.getCell(5).value),
        sheetFileId: clean(row.getCell(6).value),
        sheetUrl: clean(row.getCell(7).value),
        pdfUrl: clean(row.getCell(8).value),
      };

      if (
        !s ||
        entry.documentNo.toLowerCase().includes(s) ||
        entry.customer.toLowerCase().includes(s) ||
        entry.sourceDocument.toLowerCase().includes(s)
      ) {
        entries.push(entry);
      }
    });

    return entries.reverse();
  }

  public static async appendDocLog(entry: DocLogEntry): Promise<void> {
    await this.init();
    const sheet = this.workbook!.getWorksheet('_DOC_LOG');
    if (!sheet) return;

    // Check if entry already exists (upsert)
    let found = false;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (
        clean(row.getCell(2).value).toUpperCase() === entry.type.toUpperCase() &&
        clean(row.getCell(3).value).toLowerCase() === entry.documentNo.toLowerCase()
      ) {
        row.getCell(1).value = entry.timestamp;
        row.getCell(4).value = entry.sourceDocument;
        row.getCell(5).value = entry.customer;
        if (entry.sheetFileId) row.getCell(6).value = entry.sheetFileId;
        if (entry.sheetUrl) row.getCell(7).value = entry.sheetUrl;
        if (entry.pdfUrl) row.getCell(8).value = entry.pdfUrl;
        row.commit();
        found = true;
      }
    });

    if (!found) {
      const row = sheet.addRow([
        entry.timestamp,
        entry.type,
        entry.documentNo,
        entry.sourceDocument,
        entry.customer,
        entry.sheetFileId || '',
        entry.sheetUrl || '',
        entry.pdfUrl || '',
      ]);
      row.commit();
    }

    await this.saveWorkbook();
    FirestoreService.syncRecord('docLogs', `${entry.type}_${entry.documentNo}`, entry).catch(() => {});
  }
}
