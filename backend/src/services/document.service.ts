import fs from 'fs';
import path from 'path';
import os from 'os';
import ExcelJS from 'exceljs';
import { google, drive_v3 } from 'googleapis';
import { config } from '../config';
import { Quotation, ProformaInvoice, DocumentItem, DocLogEntry } from '../types';
import { SheetsService } from './sheets.service';
import { SequenceService } from './sequence.service';
import { renderHtmlToPdf } from './pdf.service';
import { R2Service } from './r2.service';

const outputBaseDir = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? path.join(os.tmpdir(), 'ambica-output')
  : path.resolve(__dirname, '../../output');

export class DocumentService {
  private static driveApi: drive_v3.Drive | null = null;
  private static isDriveInitialized = false;

  private static initDrive(): drive_v3.Drive | null {
    if (this.isDriveInitialized) return this.driveApi;
    if (config.googleServiceAccountEmail && config.googleServiceAccountPrivateKey) {
      try {
        const auth = new google.auth.JWT({
          email: config.googleServiceAccountEmail,
          key: config.googleServiceAccountPrivateKey,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
        this.driveApi = google.drive({ version: 'v3', auth });
        console.log('Connected to Google Drive API.');
      } catch (err) {
        console.warn('Google Drive API auth failed:', err);
      }
    }
    this.isDriveInitialized = true;
    return this.driveApi;
  }

  private static getLogoBase64(): string {
    if (fs.existsSync(config.logoPath)) {
      const bitmap = fs.readFileSync(config.logoPath);
      return `data:image/png;base64,${bitmap.toString('base64')}`;
    }
    return '';
  }

  public static numberToIndianWords(num: number): string {
    const a = [
      '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
      'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
      'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
    ];
    const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

    const inWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' LAKH' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + ' CRORE' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
    };

    const rounded = Math.round(num);
    if (rounded === 0) return 'INR ZERO ONLY';
    return `INR- ${inWords(rounded).trim().replace(/\s+/g, ' ')} ONLY`;
  }

  public static getSuggestedHsn(desc: string): string {
    const d = (desc || '').toLowerCase();

    // 1. Stainless Steel Press Plates / Moulds
    if (
      d.includes('press plate') ||
      d.includes('ss plate') ||
      d.includes('s.s plate') ||
      d.includes('s.s press plate') ||
      d.includes('stainless steel press plate') ||
      d.includes('mould') ||
      d.includes('texture plate')
    ) {
      return '73269099'; // Articles of stainless steel / press plates
    }

    // 2. Cushion Press Pads / Press Pads
    if (d.includes('cushion') || d.includes('press pad') || d.includes('cushion pad')) {
      return '84799090'; // Parts of press machinery / industrial pads
    }

    // 3. Hydraulic Pumps & Pump Components (SCY, YCY, A4VSO, PV2R, Vane, Cartridge, Gear pump, Vickers, Danfoss, etc.)
    if (
      d.includes('pump') ||
      d.includes('scy') ||
      d.includes('ycy') ||
      d.includes('mcy') ||
      d.includes('pv2r') ||
      d.includes('a4vso') ||
      d.includes('a10vso') ||
      d.includes('a2fo') ||
      d.includes('a7v') ||
      d.includes('a4vg') ||
      d.includes('danfoss') ||
      d.includes('vane') ||
      d.includes('cartridge kit') ||
      d.includes('gpa1') ||
      d.includes('gpa2') ||
      d.includes('cbn') ||
      d.includes('hy125') ||
      d.includes('hy80') ||
      d.includes('hy63') ||
      d.includes('hc80') ||
      d.includes('plunger') ||
      d.includes('cylinder block for') ||
      d.includes('pistons for') ||
      d.includes('retainer plate for') ||
      d.includes('valve plate for') ||
      d.includes('denison') ||
      d.includes('veljan') ||
      d.includes('eckerle') ||
      d.includes('etny')
    ) {
      return '84139190'; // Pumps & components
    }

    // 4. Valves (Solenoid, Check, Directional, Poppet, Relief, Prefill, Cartridge valves)
    if (
      d.includes('valve') ||
      d.includes('poppet') ||
      d.includes('cock') ||
      d.includes('solenoid') ||
      d.includes('4we') ||
      d.includes('23qdf') ||
      d.includes('dg4v') ||
      d.includes('z2fs') ||
      d.includes('m3sed') ||
      d.includes('prefill') ||
      d.includes('relief') ||
      d.includes('cvi') ||
      d.includes('cvu') ||
      d.includes('lsv6') ||
      d.includes('logic cartridge') ||
      d.includes('throttle') ||
      d.includes('unloader') ||
      d.includes('check') ||
      d.includes('11rce')
    ) {
      return '84818090'; // Valves & taps for hydraulics/pipes
    }

    // 5. Gearboxes, Motors, Drives, Speed Reducers
    if (
      d.includes('gear box') ||
      d.includes('gearbox') ||
      d.includes('motor') ||
      d.includes('zlyj') ||
      d.includes('racker roller') ||
      d.includes('pinion') ||
      d.includes('reducer')
    ) {
      return '84834000'; // Gears, gearboxes, and speed changers
    }

    // 6. Manometers, Pressure Gauges, Pressure Switches, Sensors
    if (
      d.includes('manometer') ||
      d.includes('gauge') ||
      d.includes('sensor') ||
      d.includes('transducer') ||
      d.includes('transmitter') ||
      d.includes('pressure switch') ||
      d.includes('jcs') ||
      d.includes('acs')
    ) {
      return '90262000'; // Instruments for measuring/checking pressure
    }

    // 7. Hydraulic Cylinders & Actuators
    if (d.includes('cylinder') || d.includes('actuator') || d.includes('hydro') || d.includes('ram')) {
      return '84122100'; // Hydraulic cylinders and linear actuators
    }

    // 8. Filters & Purifying Elements
    if (
      d.includes('filter') ||
      d.includes('element') ||
      d.includes('strainer') ||
      d.includes('hydac') ||
      d.includes('internormen')
    ) {
      return '84212900'; // Filtering machinery and liquid filters
    }

    // 9. Asbestos & Insulation Mill Boards
    if (d.includes('asbestos') || d.includes('mill board') || d.includes('insulation')) {
      return '68129990'; // Fabricated asbestos fibres / insulation boards
    }

    // 10. Rubber Parts, Vacuum Cups, Seals, O-Rings
    if (
      d.includes('seal') ||
      d.includes('o-ring') ||
      d.includes('oring') ||
      d.includes('gasket') ||
      d.includes('vaccum cup') ||
      d.includes('vacuum cup')
    ) {
      return '40169320'; // Gaskets, washers, rubber articles
    }

    // 11. Lubricants & Oils
    if (d.includes('oil') || d.includes('lubricant') || d.includes('grease')) {
      return '27101990'; // Petroleum oils / lubricating oils
    }

    // 12. Complete Press Machines & Powerpacks
    if (d.includes('press machine') || d.includes('powerpack') || d.includes('powepack') || d.includes('plant') || d.includes('machine')) {
      return '84798999'; // Industrial machinery having individual functions
    }

    return '84799090'; // General machinery parts & accessories
  }

  public static resolveHsn(hsn?: string, desc?: string): string {
    const suggested = DocumentService.getSuggestedHsn(desc || '');
    const h = (hsn || '').trim();
    if (!h || h.length < 6 || h === '8479' || (h === '84799090' && suggested !== '84799090')) {
      return suggested;
    }
    return h;
  }

  public static async enrichItemsWithCalculations(items: DocumentItem[]): Promise<{
    items: DocumentItem[];
    totals: {
      subTotal: number;
      packingForwarding: number;
      gstAmount: number;
      roundOff: number;
      totalAmount: number;
      totalInWords: string;
    };
  }> {
    const products = await SheetsService.getProducts();
    const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const enriched: DocumentItem[] = (items || []).map((it) => {
      let unitPrice = it.unitPrice || 0;
      const hsn = DocumentService.resolveHsn(it.hsn, it.description);

      if (!unitPrice || unitPrice === 0) {
        const itemClean = cleanStr(it.description);
        if (itemClean) {
          // 1. Exact match
          let matched = products.find((p) => cleanStr(p.description) === itemClean);
          // 2. Substring match
          if (!matched) {
            matched = products.find((p) => {
              const pClean = cleanStr(p.description);
              return pClean.includes(itemClean) || itemClean.includes(pClean);
            });
          }
          if (matched) {
            unitPrice = matched.defaultPrice || matched.oldPrice || 0;
          }
        }
      }

      const qty = typeof it.qty === 'number' && it.qty > 0 ? it.qty : 1;
      const amount = unitPrice * qty;

      return {
        ...it,
        qty,
        unitPrice,
        amount,
        hsn,
      };
    });

    const subTotal = enriched.reduce((sum, it) => sum + (it.amount || 0), 0);
    const packingForwarding = 0;
    const gstAmount = Math.round(subTotal * 0.18 * 100) / 100;
    const rawTotal = subTotal + packingForwarding + gstAmount;
    const totalAmount = Math.round(rawTotal);
    const roundOff = Math.round((totalAmount - rawTotal) * 100) / 100;
    const totalInWords = this.numberToIndianWords(totalAmount);

    return {
      items: enriched,
      totals: {
        subTotal,
        packingForwarding,
        gstAmount,
        roundOff,
        totalAmount,
        totalInWords,
      },
    };
  }

  // ==========================================
  // QUOTATION GENERATOR
  // ==========================================
  public static async generateQuotation(enquiryId: string): Promise<{
    docNo: string;
    xlsxPath: string;
    pdfPath: string;
    sheetUrl: string;
    pdfUrl: string;
  }> {
    await SheetsService.init();
    const enquiry = await SheetsService.getEnquiryById(enquiryId);
    if (!enquiry) throw new Error(`Enquiry ${enquiryId} not found.`);

    // Check if quotation already exists for this enquiry in _DOC_LOG
    const docLogs = await SheetsService.getDocLog();
    const existingLog = docLogs.find(
      (l) => l.type === 'QUOTATION' && l.sourceDocument.toLowerCase() === enquiryId.toLowerCase()
    );

    let docNo = existingLog ? existingLog.documentNo : '';
    if (!docNo) {
      const quotations = await SheetsService.getQuotations();
      let maxQuo = 0;
      quotations.forEach((q) => {
        const m = q.id.match(/AELPL\/26-27\/(\d+)$/i);
        if (m) maxQuo = Math.max(maxQuo, parseInt(m[1], 10));
      });
      docLogs.forEach((l) => {
        const m = l.documentNo.match(/AELPL\/26-27\/(\d+)$/i);
        if (m) maxQuo = Math.max(maxQuo, parseInt(m[1], 10));
      });
      docNo = await SequenceService.getNextQuotationNumber(maxQuo);
    }

    const safeDocName = docNo.replace(/[\/\\:]/g, '_');
    const safeCustName = enquiry.customer.replace(/[\/\\:?*"<>|]/g, '-').trim();
    const docDir = path.join(outputBaseDir, 'Quotations', safeDocName);
    fs.mkdirSync(docDir, { recursive: true });

    const xlsxFileName = `Quotation - ${safeDocName} - ${safeCustName}.xlsx`;
    const pdfFileName = `Quotation - ${safeDocName} - ${safeCustName}.pdf`;
    const htmlFileName = `Quotation - ${safeDocName} - ${safeCustName}.html`;

    const xlsxPath = path.join(docDir, xlsxFileName);
    const pdfPath = path.join(docDir, pdfFileName);
    const htmlPath = path.join(docDir, htmlFileName);

    // 1. Populate XLSX with ExcelJS
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(config.quotationTemplatePath);
    const sh = wb.getWorksheet('Quotation') || wb.worksheets[0];

    const todayDateStr = new Date().toLocaleDateString('en-GB');

    sh.getCell('I2').value = docNo;
    sh.getCell('I3').value = todayDateStr;

    // Seller details (Ambica Engineers)
    sh.getCell('A5').value = 'AMBICA ENGINEERS & LUBRICANTS LTD.';
    sh.getCell('A6').value = '5th Floor, Sovereign Corporate Tower, Plot No.: A-143';
    sh.getCell('A7').value = 'Sector - 136, Noida - 201304';
    sh.getCell('A8').value = 'Uttar Pradesh, India';
    sh.getCell('B9').value = '09AAUCA6324J1Z6';
    sh.getCell('B10').value = 'Mohit AbhayRaj Chhajer';
    sh.getCell('E10').value = '91 76000 25020';
    sh.getCell('B11').value = 'info@ambicaengineers.in';

    // Buyer details
    sh.getCell('F5').value = enquiry.customer;
    sh.getCell('F6').value = '';
    sh.getCell('F7').value = enquiry.city || '';
    sh.getCell('F8').value = enquiry.state || '';
    sh.getCell('G9').value = '';
    sh.getCell('G10').value = enquiry.contactPerson || '';
    sh.getCell('I10').value = enquiry.phone || '';
    sh.getCell('G11').value = enquiry.email || '';

    // Clear item table & totals
    for (let r = 14; r <= 20; r++) {
      sh.getCell('A' + r).value = '';
      sh.getCell('G' + r).value = '';
      sh.getCell('H' + r).value = '';
      sh.getCell('I' + r).value = '';
    }
    for (let r = 22; r <= 26; r++) {
      sh.getCell('I' + r).value = '';
    }
    sh.getCell('G28').value = '';

    // Calculate items, prices, amounts, GST, and totals
    const calc = await this.enrichItemsWithCalculations(enquiry.items);

    calc.items.slice(0, 7).forEach((item, idx) => {
      const row = 14 + idx;
      sh.getCell('A' + row).value = `${idx + 1}. ${item.description}`;
      sh.getCell('G' + row).value = item.qty;
      sh.getCell('H' + row).value = item.unitPrice || 0;
      sh.getCell('I' + row).value = item.amount || 0;
    });

    sh.getCell('I22').value = calc.totals.subTotal;
    sh.getCell('I23').value = calc.totals.packingForwarding;
    sh.getCell('I24').value = calc.totals.gstAmount;
    sh.getCell('I25').value = calc.totals.roundOff;
    sh.getCell('I26').value = calc.totals.totalAmount;
    sh.getCell('G28').value = calc.totals.totalInWords;

    await wb.xlsx.writeFile(xlsxPath);

    // 2. Generate High-Fidelity PDF
    const logoDataUrl = this.getLogoBase64();
    const htmlContent = this.generateQuotationHtml({
      docNo,
      date: todayDateStr,
      customer: enquiry.customer,
      city: enquiry.city || '',
      state: enquiry.state || '',
      contactPerson: enquiry.contactPerson || '',
      phone: enquiry.phone || '',
      email: enquiry.email || '',
      items: calc.items,
      totals: calc.totals,
      logoDataUrl,
    });

    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    try {
      await renderHtmlToPdf(htmlPath, pdfPath);
    } catch (pdfErr: any) {
      console.warn('[DocumentService] PDF generation notice (serverless fallback to HTML/XLSX):', pdfErr.message);
    }

    // 3. Upload to Cloudflare R2 if configured (or fallback to dynamic view/download link)
    const dynamicViewUrl = `/api/documents/view?type=quotation&id=${encodeURIComponent(docNo)}`;
    const dynamicExcelUrl = `/api/documents/excel?type=quotation&id=${encodeURIComponent(docNo)}`;
    let sheetUrl = dynamicExcelUrl;
    let pdfUrl = dynamicViewUrl;
    let fileId = '';

    if (R2Service.isConfigured()) {
      if (fs.existsSync(pdfPath)) {
        const r2PdfKey = `quotations/${safeDocName}/${pdfFileName}`;
        const r2PdfUrl = await R2Service.uploadFile(pdfPath, r2PdfKey, 'application/pdf');
        if (r2PdfUrl) {
          pdfUrl = r2PdfUrl;
          fileId = r2PdfKey;
        }
      }
      const r2XlsxKey = `quotations/${safeDocName}/${xlsxFileName}`;
      const r2XlsxUrl = await R2Service.uploadFile(xlsxPath, r2XlsxKey, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (r2XlsxUrl) {
        sheetUrl = r2XlsxUrl;
      }
    } else {
      const drive = this.initDrive();
      if (drive) {
        try {
          const uploadedPdf = await drive.files.create({
            requestBody: {
              name: pdfFileName,
              parents: [config.googleDriveOutputFolderId],
            },
            media: {
              mimeType: 'application/pdf',
              body: fs.createReadStream(pdfPath),
            },
            fields: 'id, webViewLink',
          });
          if (uploadedPdf.data.id) {
            fileId = uploadedPdf.data.id;
            pdfUrl = uploadedPdf.data.webViewLink || pdfUrl;
          }
        } catch (err) {
          console.warn('Could not upload to Google Drive:', err);
        }
      }
    }

    // 4. Update QUOTATIONS worksheet and _DOC_LOG
    const qtnRecord: Quotation = {
      id: docNo,
      date: todayDateStr,
      customer: enquiry.customer,
      sourceEnquiryId: enquiryId,
      assignedPerson: enquiry.assignedPerson,
      city: enquiry.city,
      state: enquiry.state,
      contactPerson: enquiry.contactPerson,
      phone: enquiry.phone,
      email: enquiry.email,
      status: 'GENERATED',
      remarks: enquiry.remarks,
      items: calc.items,
      sheetFileId: fileId,
      sheetUrl,
      pdfUrl,
    };

    await SheetsService.saveQuotationRecord(qtnRecord);
    await SheetsService.appendDocLog({
      timestamp: new Date().toISOString(),
      type: 'QUOTATION',
      documentNo: docNo,
      sourceDocument: enquiryId,
      customer: enquiry.customer,
      sheetFileId: fileId,
      sheetUrl,
      pdfUrl,
    });

    return {
      docNo,
      xlsxPath,
      pdfPath,
      sheetUrl,
      pdfUrl,
    };
  }

  // ==========================================
  // PROFORMA INVOICE (PI) GENERATOR
  // ==========================================
  public static async generatePI(orderId: string): Promise<{
    docNo: string;
    xlsxPath: string;
    pdfPath: string;
    sheetUrl: string;
    pdfUrl: string;
  }> {
    await SheetsService.init();
    const orders = await SheetsService.getOrders();
    const order = orders.find((o) => o.id.toLowerCase() === orderId.toLowerCase());
    if (!order) throw new Error(`Order ${orderId} not found.`);

    // Check if PI already exists for this order in _DOC_LOG
    const docLogs = await SheetsService.getDocLog();
    const existingLog = docLogs.find(
      (l) => l.type === 'PI' && l.sourceDocument.toLowerCase() === orderId.toLowerCase()
    );

    let docNo = existingLog ? existingLog.documentNo : '';
    if (!docNo) {
      const pis = await SheetsService.getPIs();
      let maxPI = 0;
      pis.forEach((p) => {
        const m = p.id.match(/AELPL\/26-27\/(\d+)$/i);
        if (m) maxPI = Math.max(maxPI, parseInt(m[1], 10));
      });
      docLogs.forEach((l) => {
        const m = l.documentNo.match(/AELPL\/26-27\/(\d+)$/i);
        if (m) maxPI = Math.max(maxPI, parseInt(m[1], 10));
      });
      docNo = await SequenceService.getNextPINumber(maxPI);
    }

    const safeDocName = docNo.replace(/[\/\\:]/g, '_');
    const safeCustName = order.customer.replace(/[\/\\:?*"<>|]/g, '-').trim();
    const docDir = path.join(outputBaseDir, 'PI', safeDocName);
    fs.mkdirSync(docDir, { recursive: true });

    const xlsxFileName = `PI - ${safeDocName} - ${safeCustName}.xlsx`;
    const pdfFileName = `PI - ${safeDocName} - ${safeCustName}.pdf`;
    const htmlFileName = `PI - ${safeDocName} - ${safeCustName}.html`;

    const xlsxPath = path.join(docDir, xlsxFileName);
    const pdfPath = path.join(docDir, pdfFileName);
    const htmlPath = path.join(docDir, htmlFileName);

    // 1. Populate XLSX with ExcelJS
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(config.piTemplatePath);
    const sh = wb.getWorksheet('Sheet1') || wb.worksheets[0];

    const todayDateStr = new Date().toLocaleDateString('en-GB');

    sh.getCell('I2').value = docNo;
    sh.getCell('I3').value = todayDateStr;
    sh.getCell('I4').value = order.reference || 'Verbal';
    sh.getCell('I5').value = order.date || todayDateStr;

    // Seller details
    sh.getCell('A7').value = 'AMBICA ENGINEERS & LUBRICANTS LTD.';
    sh.getCell('A8').value = '5th Floor, Sovereign Corporate Tower, Plot No.: A-143';
    sh.getCell('A9').value = 'Sector - 136, Noida - 201304';
    sh.getCell('A10').value = 'Uttar Pradesh, India';
    sh.getCell('B11').value = '09AAUCA6324J1Z6';
    sh.getCell('B12').value = 'Mohit AbhayRaj Chhajer';
    sh.getCell('E12').value = '91 76000 25020';
    sh.getCell('B13').value = 'info@ambicaengineers.in';

    // Buyer details
    sh.getCell('F7').value = order.customer;
    sh.getCell('F8').value = '';
    sh.getCell('F9').value = order.city || '';
    sh.getCell('F10').value = order.state || '';
    sh.getCell('G11').value = '';
    sh.getCell('G12').value = order.contactPerson || '';
    sh.getCell('I12').value = order.phone || '';
    sh.getCell('G13').value = order.email || '';

    // Clear item table & totals
    for (let r = 16; r <= 25; r++) {
      sh.getCell('A' + r).value = '';
      sh.getCell('F' + r).value = '';
      sh.getCell('G' + r).value = '';
      sh.getCell('H' + r).value = '';
      sh.getCell('I' + r).value = '';
    }
    for (let r = 26; r <= 30; r++) {
      sh.getCell('I' + r).value = '';
    }
    sh.getCell('G32').value = '';

    // Standard PI terms & Bank details
    sh.getCell('A27').value = '1. 100% Advance along with Purchase Order';
    sh.getCell('A28').value = '2. Delivery: Ready Stock';
    sh.getCell('A29').value = '3. Guarantee / Warranty: Any manufacturing defects.';
    sh.getCell('A30').value = '4. Freight: To Pay Basis';

    sh.getCell('B33').value = 'HDFC Bank Ltd';
    sh.getCell('B34').value = '50200066235641';
    sh.getCell('B35').value = 'HDFC0004456';
    sh.getCell('B36').value = 'Bahubali Enclave, Delhi';

    // Calculate items, prices, amounts, GST, and totals
    const calc = await this.enrichItemsWithCalculations(order.items);

    const itemRows = [16, 18, 20, 22, 24];
    calc.items.slice(0, itemRows.length).forEach((item, idx) => {
      const r = itemRows[idx];
      sh.getCell('A' + r).value = `${idx + 1}. ${item.description}`;
      sh.getCell('F' + r).value = DocumentService.resolveHsn(item.hsn, item.description);
      sh.getCell('G' + r).value = item.qty;
      sh.getCell('H' + r).value = item.unitPrice || 0;
      sh.getCell('I' + r).value = item.amount || 0;
    });

    sh.getCell('I26').value = calc.totals.subTotal;
    sh.getCell('I27').value = calc.totals.packingForwarding;
    sh.getCell('I28').value = calc.totals.gstAmount;
    sh.getCell('I29').value = calc.totals.roundOff;
    sh.getCell('I30').value = calc.totals.totalAmount;
    sh.getCell('G32').value = calc.totals.totalInWords;

    await wb.xlsx.writeFile(xlsxPath);

    // 2. Generate High-Fidelity PDF
    const logoDataUrl = this.getLogoBase64();
    const htmlContent = this.generatePIHtml({
      docNo,
      date: todayDateStr,
      purchaseOrder: order.reference || 'Verbal',
      orderDate: order.date || todayDateStr,
      customer: order.customer,
      city: order.city || '',
      state: order.state || '',
      contactPerson: order.contactPerson || '',
      phone: order.phone || '',
      email: order.email || '',
      items: calc.items,
      totals: calc.totals,
      logoDataUrl,
    });

    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    try {
      await renderHtmlToPdf(htmlPath, pdfPath);
    } catch (pdfErr: any) {
      console.warn('[DocumentService] PDF generation notice (serverless fallback to HTML/XLSX):', pdfErr.message);
    }

    // 3. Upload to Cloudflare R2 if configured (or fallback to dynamic view/download link)
    const dynamicViewUrl = `/api/documents/view?type=pi&id=${encodeURIComponent(docNo)}`;
    const dynamicExcelUrl = `/api/documents/excel?type=pi&id=${encodeURIComponent(docNo)}`;
    let sheetUrl = dynamicExcelUrl;
    let pdfUrl = dynamicViewUrl;
    let fileId = '';

    if (R2Service.isConfigured()) {
      if (fs.existsSync(pdfPath)) {
        const r2PdfKey = `pi/${safeDocName}/${pdfFileName}`;
        const r2PdfUrl = await R2Service.uploadFile(pdfPath, r2PdfKey, 'application/pdf');
        if (r2PdfUrl) {
          pdfUrl = r2PdfUrl;
          fileId = r2PdfKey;
        }
      }
      const r2XlsxKey = `pi/${safeDocName}/${xlsxFileName}`;
      const r2XlsxUrl = await R2Service.uploadFile(xlsxPath, r2XlsxKey, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (r2XlsxUrl) {
        sheetUrl = r2XlsxUrl;
      }
    } else {
      const drive = this.initDrive();
      if (drive) {
        try {
          const uploadedPdf = await drive.files.create({
            requestBody: {
              name: pdfFileName,
              parents: [config.googleDriveOutputFolderId],
            },
            media: {
              mimeType: 'application/pdf',
              body: fs.createReadStream(pdfPath),
            },
            fields: 'id, webViewLink',
          });
          if (uploadedPdf.data.id) {
            fileId = uploadedPdf.data.id;
            pdfUrl = uploadedPdf.data.webViewLink || pdfUrl;
          }
        } catch (err) {
          console.warn('Could not upload to Google Drive:', err);
        }
      }
    }

    // 4. Update PI worksheet and _DOC_LOG
    const piRecord: ProformaInvoice = {
      id: docNo,
      date: todayDateStr,
      customer: order.customer,
      sourceOrderId: orderId,
      assignedPerson: order.assignedPerson,
      city: order.city,
      state: order.state,
      contactPerson: order.contactPerson,
      phone: order.phone,
      email: order.email,
      status: 'GENERATED',
      purchaseOrder: order.reference || 'Verbal',
      orderDate: order.date || todayDateStr,
      remarks: order.remarks,
      items: calc.items,
      sheetFileId: fileId,
      sheetUrl,
      pdfUrl,
    };

    await SheetsService.savePIRecord(piRecord);
    await SheetsService.appendDocLog({
      timestamp: new Date().toISOString(),
      type: 'PI',
      documentNo: docNo,
      sourceDocument: orderId,
      customer: order.customer,
      sheetFileId: fileId,
      sheetUrl,
      pdfUrl,
    });

    return {
      docNo,
      xlsxPath,
      pdfPath,
      sheetUrl,
      pdfUrl,
    };
  }

  // ==========================================
  // IN-MEMORY DYNAMIC EXCEL & HTML STREAMERS
  // ==========================================
  public static async generateQuotationExcelBuffer(docNo: string): Promise<Buffer | null> {
    await SheetsService.init();
    const quotations = await SheetsService.getQuotations();
    const qtn = quotations.find((q) => q.id.toLowerCase() === docNo.toLowerCase());
    if (!qtn) return null;

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(config.quotationTemplatePath);
    const sh = wb.getWorksheet('Quotation') || wb.worksheets[0];

    sh.getCell('I2').value = qtn.id;
    sh.getCell('I3').value = qtn.date;

    // Seller
    sh.getCell('A5').value = 'AMBICA ENGINEERS & LUBRICANTS LTD.';
    sh.getCell('A6').value = '5th Floor, Sovereign Corporate Tower, Plot No.: A-143';
    sh.getCell('A7').value = 'Sector - 136, Noida - 201304';
    sh.getCell('A8').value = 'Uttar Pradesh, India';
    sh.getCell('B9').value = '09AAUCA6324J1Z6';
    sh.getCell('B10').value = qtn.assignedPerson || 'Mohit AbhayRaj Chhajer';
    sh.getCell('E10').value = '91 76000 25020';
    sh.getCell('B11').value = 'info@ambicaengineers.in';

    // Buyer
    sh.getCell('F5').value = qtn.customer;
    sh.getCell('F7').value = qtn.city || '';
    sh.getCell('F8').value = qtn.state || '';
    sh.getCell('G10').value = qtn.contactPerson || '';
    sh.getCell('I10').value = qtn.phone || '';
    sh.getCell('G11').value = qtn.email || '';

    // Clear items table & populate description, qty, price, amount
    for (let r = 14; r <= 20; r++) {
      sh.getCell('A' + r).value = '';
      sh.getCell('G' + r).value = '';
      sh.getCell('H' + r).value = '';
      sh.getCell('I' + r).value = '';
    }
    for (let r = 22; r <= 26; r++) sh.getCell('I' + r).value = '';
    sh.getCell('G28').value = '';

    const calc = await this.enrichItemsWithCalculations(qtn.items || []);

    calc.items.slice(0, 7).forEach((item, idx) => {
      const row = 14 + idx;
      sh.getCell('A' + row).value = `${idx + 1}. ${item.description}`;
      sh.getCell('G' + row).value = item.qty;
      sh.getCell('H' + row).value = item.unitPrice || 0;
      sh.getCell('I' + row).value = item.amount || 0;
    });

    sh.getCell('I22').value = calc.totals.subTotal;
    sh.getCell('I23').value = calc.totals.packingForwarding;
    sh.getCell('I24').value = calc.totals.gstAmount;
    sh.getCell('I25').value = calc.totals.roundOff;
    sh.getCell('I26').value = calc.totals.totalAmount;
    sh.getCell('G28').value = calc.totals.totalInWords;

    const uint8Array = await wb.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  public static async generatePIExcelBuffer(docNo: string): Promise<Buffer | null> {
    await SheetsService.init();
    const pis = await SheetsService.getPIs();
    const pi = pis.find((p) => p.id.toLowerCase() === docNo.toLowerCase());
    if (!pi) return null;

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(config.piTemplatePath);
    const sh = wb.getWorksheet('PI') || wb.getWorksheet('Sheet1') || wb.worksheets[0];

    sh.getCell('I2').value = pi.id;
    sh.getCell('I3').value = pi.date;

    // Buyer
    sh.getCell('F7').value = pi.customer;
    sh.getCell('F9').value = pi.city || '';
    sh.getCell('F10').value = pi.state || '';
    sh.getCell('G12').value = pi.contactPerson || '';
    sh.getCell('I12').value = pi.phone || '';
    sh.getCell('G13').value = pi.email || '';

    // Clear items & populate
    for (let r = 16; r <= 25; r++) {
      sh.getCell('A' + r).value = '';
      sh.getCell('F' + r).value = '';
      sh.getCell('G' + r).value = '';
      sh.getCell('H' + r).value = '';
      sh.getCell('I' + r).value = '';
    }
    for (let r = 26; r <= 30; r++) {
      sh.getCell('I' + r).value = '';
    }
    sh.getCell('G32').value = '';

    const calc = await this.enrichItemsWithCalculations(pi.items || []);
    const itemRows = [16, 18, 20, 22, 24];

    calc.items.slice(0, itemRows.length).forEach((item, idx) => {
      const row = itemRows[idx];
      sh.getCell('A' + row).value = `${idx + 1}. ${item.description}`;
      sh.getCell('F' + row).value = DocumentService.resolveHsn(item.hsn, item.description);
      sh.getCell('G' + row).value = item.qty;
      sh.getCell('H' + row).value = item.unitPrice || 0;
      sh.getCell('I' + row).value = item.amount || 0;
    });

    sh.getCell('I26').value = calc.totals.subTotal;
    sh.getCell('I27').value = calc.totals.packingForwarding;
    sh.getCell('I28').value = calc.totals.gstAmount;
    sh.getCell('I29').value = calc.totals.roundOff;
    sh.getCell('I30').value = calc.totals.totalAmount;
    sh.getCell('G32').value = calc.totals.totalInWords;

    const uint8Array = await wb.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  public static async getQuotationHtmlById(docNo: string): Promise<string | null> {
    await SheetsService.init();
    const quotations = await SheetsService.getQuotations();
    const qtn = quotations.find((q) => q.id.toLowerCase() === docNo.toLowerCase());
    if (!qtn) return null;

    const calc = await this.enrichItemsWithCalculations(qtn.items || []);
    const logoDataUrl = this.getLogoBase64();
    return this.generateQuotationHtml({
      docNo: qtn.id,
      date: qtn.date,
      customer: qtn.customer,
      city: qtn.city || '',
      state: qtn.state || '',
      contactPerson: qtn.contactPerson || '',
      phone: qtn.phone || '',
      email: qtn.email || '',
      items: calc.items,
      totals: calc.totals,
      logoDataUrl,
    });
  }

  public static async getPIHtmlById(docNo: string): Promise<string | null> {
    await SheetsService.init();
    const pis = await SheetsService.getPIs();
    const pi = pis.find((p) => p.id.toLowerCase() === docNo.toLowerCase());
    if (!pi) return null;

    const calc = await this.enrichItemsWithCalculations(pi.items || []);
    const logoDataUrl = this.getLogoBase64();
    return this.generatePIHtml({
      docNo: pi.id,
      date: pi.date,
      purchaseOrder: pi.purchaseOrder || 'Verbal',
      orderDate: pi.orderDate || pi.date,
      customer: pi.customer,
      city: pi.city || '',
      state: pi.state || '',
      contactPerson: pi.contactPerson || '',
      phone: pi.phone || '',
      email: pi.email || '',
      items: calc.items,
      totals: calc.totals,
      logoDataUrl,
    });
  }

  // ==========================================
  // HTML TEMPLATE RENDERERS
  // ==========================================
  private static generateQuotationHtml(data: {
    docNo: string;
    date: string;
    customer: string;
    city: string;
    state: string;
    contactPerson: string;
    phone: string;
    email: string;
    items: DocumentItem[];
    totals?: {
      subTotal: number;
      packingForwarding: number;
      gstAmount: number;
      roundOff: number;
      totalAmount: number;
      totalInWords: string;
    };
    logoDataUrl: string;
  }): string {
    const subTotal = data.totals ? data.totals.subTotal : data.items.reduce((s, it) => s + (it.amount || ((it.qty || 1) * (it.unitPrice || 0))), 0);
    const packingForwarding = data.totals ? data.totals.packingForwarding : 0;
    const gstAmount = data.totals ? data.totals.gstAmount : Math.round(subTotal * 0.18 * 100) / 100;
    const totalAmount = data.totals ? data.totals.totalAmount : Math.round(subTotal + packingForwarding + gstAmount);
    const roundOff = data.totals ? data.totals.roundOff : Math.round((totalAmount - (subTotal + packingForwarding + gstAmount)) * 100) / 100;
    const totalInWords = data.totals ? data.totals.totalInWords : this.numberToIndianWords(totalAmount);

    const rowsHtml = data.items
      .slice(0, 7)
      .map(
        (it, idx) => `
        <tr style="height: 28px; background-color: ${idx % 2 === 0 ? '#fff5eb' : '#ffffff'};">
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; font-weight: 500;">${idx + 1}. ${it.description}</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; text-align: center; font-family: monospace; font-size: 10px; font-weight: 600;">${DocumentService.resolveHsn(it.hsn, it.description)}</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; text-align: center; font-weight: 600;">${it.qty} Pcs</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; text-align: right; font-weight: 600; font-family: monospace;">${it.unitPrice ? '₹ ' + it.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">${it.amount ? '₹ ' + it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
        </tr>
      `
      )
      .join('');

    // Fill remaining empty rows up to 7
    let emptyRowsHtml = '';
    for (let i = data.items.length; i < 7; i++) {
      emptyRowsHtml += `
        <tr style="height: 28px; background-color: ${i % 2 === 0 ? '#fff5eb' : '#ffffff'};">
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
        </tr>
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quotation - ${data.docNo}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; background: #fff; }
    table { width: 100%; border-collapse: collapse; }
    .header-logo { width: 190px; height: auto; }
    .title { font-size: 16px; font-weight: 800; text-align: center; letter-spacing: 1px; text-decoration: underline; margin-bottom: 12px; }
    .section-title { font-weight: 700; color: #ea580c; font-size: 11px; margin-bottom: 4px; }
    .label { color: #64748b; font-size: 10px; }
    .val { font-weight: 600; color: #0f172a; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <!-- Print / Download Floating Action Bar -->
  <div class="no-print" style="position:fixed;top:16px;right:24px;display:flex;gap:10px;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,0.15);border-radius:8px;padding:8px 12px;background:rgba(255,255,255,0.96);border:1px solid #fed7aa;">
    <button onclick="window.print()" style="background:#ea580c;color:#ffffff;border:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
      🖨️ Print / Save as PDF
    </button>
    <a href="/api/documents/excel?type=quotation&id=${encodeURIComponent(data.docNo)}" style="background:#0f766e;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;">
      📥 Download Excel
    </a>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
    <div>
      ${data.logoDataUrl ? `<img src="${data.logoDataUrl}" class="header-logo" alt="Ambica Engineers">` : `<div style="font-size: 20px; font-weight: 900; color: #ea580c;">AMBICA ENGINEERS</div>`}
    </div>
    <div style="text-align: right;">
      <table style="width: auto; margin-left: auto;">
        <tr><td class="label" style="text-align: right; padding-right: 12px;">Quotation</td><td class="val">${data.docNo}</td></tr>
        <tr><td class="label" style="text-align: right; padding-right: 12px;">Quotation Date</td><td class="val">${data.date}</td></tr>
      </table>
    </div>
  </div>

  <div class="title">QUOTATION</div>

  <!-- Buyer and Seller Block -->
  <table style="margin-bottom: 16px;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding-right: 15px;">
        <div class="section-title">Seller</div>
        <div style="font-weight: 700; font-size: 11px;">AMBICA ENGINEERS & LUBRICANTS LTD.</div>
        <div>5th Floor, Sovereign Corporate Tower, Plot No.: A-143</div>
        <div>Sector - 136, Noida - 201304, Uttar Pradesh, India</div>
        <div style="margin-top: 4px;"><span class="label">GSTIN:</span> <span class="val">09AAUCA6324J1Z6</span></div>
        <div><span class="label">Contact Person:</span> <span class="val">Mohit AbhayRaj Chhajer</span> &nbsp;|&nbsp; <span class="label">Mob:</span> <span class="val">91 76000 25020</span></div>
        <div><span class="label">Email:</span> <span class="val">info@ambicaengineers.in</span></div>
      </td>
      <td style="width: 50%; vertical-align: top; padding-left: 15px;">
        <div class="section-title">Buyer</div>
        <div style="font-weight: 700; font-size: 12px; color: #0f172a;">${data.customer}</div>
        <div>${data.city ? data.city + ', ' : ''}${data.state || ''}</div>
        <div style="margin-top: 4px;"><span class="label">Kind Attn:</span> <span class="val">${data.contactPerson || '-'}</span> &nbsp;|&nbsp; <span class="label">Mob:</span> <span class="val">${data.phone || '-'}</span></div>
        <div><span class="label">Email:</span> <span class="val">${data.email || '-'}</span></div>
      </td>
    </tr>
  </table>

  <!-- Item Table -->
  <table style="margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #ea580c; color: #ffffff; text-align: left; height: 30px;">
        <th style="padding: 6px 12px; width: 44%; font-size: 11px;">Item description</th>
        <th style="padding: 6px 12px; width: 14%; text-align: center; font-size: 11px;">HSN Code</th>
        <th style="padding: 6px 12px; width: 12%; text-align: center; font-size: 11px;">Quantity</th>
        <th style="padding: 6px 12px; width: 15%; text-align: right; font-size: 11px;">Price (₹)</th>
        <th style="padding: 6px 12px; width: 15%; text-align: right; font-size: 11px;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      ${emptyRowsHtml}
    </tbody>
  </table>

  <!-- Terms and Totals -->
  <table style="margin-bottom: 20px;">
    <tr>
      <td style="width: 55%; vertical-align: top; padding-right: 20px;">
        <div style="font-weight: 700; color: #ea580c; margin-bottom: 4px;">Terms and Conditions</div>
        <div style="font-size: 10px; color: #475569; margin-bottom: 8px;">
          1. Please quote invoice number when remitting funds.<br>
          2. Guarantee / Warranty: Any manufacturing defects.
        </div>
        <div style="font-weight: 700; color: #ea580c; margin-bottom: 4px;">Additional Notes</div>
        <table style="font-size: 10px; width: 100%;">
          <tr><td style="width: 25%; color: #64748b;">Payment</td><td>100% Advance along with Purchase Order</td></tr>
          <tr><td style="color: #64748b;">Delivery</td><td>Ready Stock - Subject to prior sale</td></tr>
          <tr><td style="color: #64748b;">GST</td><td>18% Extra</td></tr>
          <tr><td style="color: #64748b;">Freight</td><td>To Pay Basis</td></tr>
          <tr><td style="color: #64748b;">Insurance</td><td>Extra (On your scope)</td></tr>
        </table>
      </td>
      <td style="width: 45%; vertical-align: top; text-align: right;">
        <table style="font-size: 11px; width: 100%;">
          <tr>
            <td style="text-align: right; padding: 4px 8px; color: #64748b;">Sub Total</td>
            <td style="text-align: right; width: 120px; font-weight: 600; color: #0f172a; font-family: monospace;">₹ ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 4px 8px; color: #64748b;">Packing & Forwarding</td>
            <td style="text-align: right; color: #0f172a; font-family: monospace;">${packingForwarding > 0 ? '₹ ' + packingForwarding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Nil'}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 4px 8px; color: #64748b;">GST @ 18%</td>
            <td style="text-align: right; font-weight: 600; color: #0f172a; font-family: monospace;">₹ ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 4px 8px; color: #64748b;">Round off</td>
            <td style="text-align: right; color: #64748b; font-family: monospace;">${roundOff >= 0 ? '+' : ''}${roundOff.toFixed(2)}</td>
          </tr>
          <tr style="border-top: 2px solid #ea580c; border-bottom: 2px solid #ea580c; font-weight: 800; font-size: 12px; color: #ea580c;">
            <td style="text-align: right; padding: 6px 8px;">Total</td>
            <td style="text-align: right; font-family: monospace;">₹ ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </table>
        <div style="margin-top: 8px; font-size: 9px; font-weight: 700; color: #ea580c; background: #fff7ed; padding: 6px 10px; border-radius: 4px; border: 1px solid #fed7aa; text-align: right;">
          ${totalInWords}
        </div>
      </td>
    </tr>
  </table>

  <!-- Signature Block -->
  <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div style="font-size: 10px; color: #64748b;">
      For any enquiries, email us at <b style="color: #0f172a;">info@ambicaengineers.in</b><br>
      Call us at <b style="color: #0f172a;">+91 120 3611801 / +91 76000 25020</b>
    </div>
    <div style="text-align: center; width: 260px;">
      <div style="font-size: 10px; font-weight: 700; margin-bottom: 30px;">For, AMBICA ENGINEERS & LUBRICANTS PVT. LTD.</div>
      <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 20px; color: #1e293b;">Mohit AbhayRaj Chhajer</div>
      <div style="border-top: 1px solid #94a3b8; font-size: 10px; margin-top: 4px; padding-top: 2px;">Authorised Signatory</div>
    </div>
  </div>
</body>
</html>`;
  }

  private static generatePIHtml(data: {
    docNo: string;
    date: string;
    purchaseOrder: string;
    orderDate: string;
    customer: string;
    city: string;
    state: string;
    contactPerson: string;
    phone: string;
    email: string;
    items: DocumentItem[];
    totals?: {
      subTotal: number;
      packingForwarding: number;
      gstAmount: number;
      roundOff: number;
      totalAmount: number;
      totalInWords: string;
    };
    logoDataUrl: string;
  }): string {
    const subTotal = data.totals ? data.totals.subTotal : data.items.reduce((s, it) => s + (it.amount || ((it.qty || 1) * (it.unitPrice || 0))), 0);
    const packingForwarding = data.totals ? data.totals.packingForwarding : 0;
    const gstAmount = data.totals ? data.totals.gstAmount : Math.round(subTotal * 0.18 * 100) / 100;
    const totalAmount = data.totals ? data.totals.totalAmount : Math.round(subTotal + packingForwarding + gstAmount);
    const roundOff = data.totals ? data.totals.roundOff : Math.round((totalAmount - (subTotal + packingForwarding + gstAmount)) * 100) / 100;
    const totalInWords = data.totals ? data.totals.totalInWords : this.numberToIndianWords(totalAmount);

    const rowsHtml = data.items
      .slice(0, 5)
      .map(
        (it, idx) => `
        <tr style="height: 32px; background-color: ${idx % 2 === 0 ? '#fff5eb' : '#ffffff'};">
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; font-weight: 500;">${idx + 1}. ${it.description}</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; text-align: center; font-family: monospace; font-size: 10px; font-weight: 600;">${DocumentService.resolveHsn(it.hsn, it.description)}</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; text-align: center; font-weight: 600;">${it.qty} Pcs</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; text-align: right; font-weight: 600; font-family: monospace;">${it.unitPrice ? '₹ ' + it.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">${it.amount ? '₹ ' + it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
        </tr>
      `
      )
      .join('');

    let emptyRowsHtml = '';
    for (let i = data.items.length; i < 5; i++) {
      emptyRowsHtml += `
        <tr style="height: 32px; background-color: ${i % 2 === 0 ? '#fff5eb' : '#ffffff'};">
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
          <td style="padding: 6px 12px; border: 1px solid #fed7aa;">&nbsp;</td>
        </tr>
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Proforma Invoice - ${data.docNo}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; background: #fff; }
    table { width: 100%; border-collapse: collapse; }
    .header-logo { width: 190px; height: auto; }
    .title { font-size: 16px; font-weight: 800; text-align: center; letter-spacing: 1px; text-decoration: underline; margin-bottom: 12px; }
    .section-title { font-weight: 700; color: #ea580c; font-size: 11px; margin-bottom: 4px; }
    .label { color: #64748b; font-size: 10px; }
    .val { font-weight: 600; color: #0f172a; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <!-- Print / Download Floating Action Bar -->
  <div class="no-print" style="position:fixed;top:16px;right:24px;display:flex;gap:10px;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,0.15);border-radius:8px;padding:8px 12px;background:rgba(255,255,255,0.96);border:1px solid #fed7aa;">
    <button onclick="window.print()" style="background:#ea580c;color:#ffffff;border:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
      🖨️ Print / Save as PDF
    </button>
    <a href="/api/documents/excel?type=pi&id=${encodeURIComponent(data.docNo)}" style="background:#0f766e;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;">
      📥 Download Excel
    </a>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
    <div>
      ${data.logoDataUrl ? `<img src="${data.logoDataUrl}" class="header-logo" alt="Ambica Engineers">` : `<div style="font-size: 20px; font-weight: 900; color: #ea580c;">AMBICA ENGINEERS</div>`}
    </div>
    <div style="text-align: right;">
      <table style="width: auto; margin-left: auto;">
        <tr><td class="label" style="text-align: right; padding-right: 12px;">Proforma Invoice</td><td class="val">${data.docNo}</td></tr>
        <tr><td class="label" style="text-align: right; padding-right: 12px;">Proforma Date</td><td class="val">${data.date}</td></tr>
        <tr><td class="label" style="text-align: right; padding-right: 12px;">Purchase Order</td><td class="val">${data.purchaseOrder}</td></tr>
        <tr><td class="label" style="text-align: right; padding-right: 12px;">Order Date</td><td class="val">${data.orderDate}</td></tr>
      </table>
    </div>
  </div>

  <div class="title">PROFORMA INVOICE</div>

  <!-- Buyer and Seller Block -->
  <table style="margin-bottom: 16px;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding-right: 15px;">
        <div class="section-title">Seller</div>
        <div style="font-weight: 700; font-size: 11px;">AMBICA ENGINEERS & LUBRICANTS LTD.</div>
        <div>5th Floor, Sovereign Corporate Tower, Plot No.: A-143</div>
        <div>Sector - 136, Noida - 201304, Uttar Pradesh, India</div>
        <div style="margin-top: 4px;"><span class="label">GSTIN:</span> <span class="val">09AAUCA6324J1Z6</span></div>
        <div><span class="label">Contact Person:</span> <span class="val">Mohit AbhayRaj Chhajer</span> &nbsp;|&nbsp; <span class="label">Mob:</span> <span class="val">91 76000 25020</span></div>
        <div><span class="label">Email:</span> <span class="val">info@ambicaengineers.in</span></div>
      </td>
      <td style="width: 50%; vertical-align: top; padding-left: 15px;">
        <div class="section-title">Buyer</div>
        <div style="font-weight: 700; font-size: 12px; color: #0f172a;">${data.customer}</div>
        <div>${data.city ? data.city + ', ' : ''}${data.state || ''}</div>
        <div style="margin-top: 4px;"><span class="label">Kind Attn:</span> <span class="val">${data.contactPerson || '-'}</span> &nbsp;|&nbsp; <span class="label">Mob:</span> <span class="val">${data.phone || '-'}</span></div>
        <div><span class="label">Email:</span> <span class="val">${data.email || '-'}</span></div>
      </td>
    </tr>
  </table>

  <!-- Item Table -->
  <table style="margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #ea580c; color: #ffffff; text-align: left; height: 30px;">
        <th style="padding: 6px 12px; width: 46%; font-size: 11px;">ITEM DESCRIPTION</th>
        <th style="padding: 6px 12px; width: 14%; text-align: center; font-size: 11px;">HSN CODE</th>
        <th style="padding: 6px 12px; width: 12%; text-align: center; font-size: 11px;">QTY</th>
        <th style="padding: 6px 12px; width: 14%; text-align: right; font-size: 11px;">PRICE</th>
        <th style="padding: 6px 12px; width: 14%; text-align: right; font-size: 11px;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      ${emptyRowsHtml}
    </tbody>
  </table>

  <!-- Terms and Totals -->
  <table style="margin-bottom: 20px;">
    <tr>
      <td style="width: 55%; vertical-align: top; padding-right: 20px;">
        <div style="font-weight: 700; color: #ea580c; margin-bottom: 4px;">Terms and Conditions</div>
        <div style="font-size: 10px; color: #475569; margin-bottom: 12px;">
          1. 100% Advance along with Purchase Order<br>
          2. Delivery: Ready Stock<br>
          3. Guarantee / Warranty: Any manufacturing defects.<br>
          4. Freight: To Pay Basis
        </div>
        <div style="font-weight: 700; color: #ea580c; margin-bottom: 4px;">Bank Details</div>
        <table style="font-size: 10px; width: 100%;">
          <tr><td style="width: 28%; color: #64748b;">Bank</td><td style="font-weight: 600;">HDFC Bank Ltd</td></tr>
          <tr><td style="color: #64748b;">Account No</td><td style="font-weight: 600;">50200066235641</td></tr>
          <tr><td style="color: #64748b;">IFSC Code</td><td style="font-weight: 600;">HDFC0004456</td></tr>
          <tr><td style="color: #64748b;">Branch</td><td style="font-weight: 600;">Bahubali Enclave, Delhi</td></tr>
        </table>
      </td>
      <td style="width: 45%; vertical-align: top; text-align: right;">
        <table style="font-size: 11px; width: 100%;">
          <tr>
            <td style="text-align: right; padding: 4px 8px; color: #64748b;">Sub Total</td>
            <td style="text-align: right; width: 120px; font-weight: 600; color: #0f172a; font-family: monospace;">₹ ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 4px 8px; color: #64748b;">Packing & Forwarding</td>
            <td style="text-align: right; color: #0f172a; font-family: monospace;">${packingForwarding > 0 ? '₹ ' + packingForwarding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Nil'}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 4px 8px; color: #64748b;">GST @ 18%</td>
            <td style="text-align: right; font-weight: 600; color: #0f172a; font-family: monospace;">₹ ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 4px 8px; color: #64748b;">Round Off</td>
            <td style="text-align: right; color: #64748b; font-family: monospace;">${roundOff >= 0 ? '+' : ''}${roundOff.toFixed(2)}</td>
          </tr>
          <tr style="border-top: 2px solid #ea580c; border-bottom: 2px solid #ea580c; font-weight: 800; font-size: 12px; color: #ea580c;">
            <td style="text-align: right; padding: 6px 8px;">Total</td>
            <td style="text-align: right; font-family: monospace;">₹ ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </table>
        <div style="margin-top: 8px; font-size: 9px; font-weight: 700; color: #ea580c; background: #fff7ed; padding: 6px 10px; border-radius: 4px; border: 1px solid #fed7aa; text-align: right;">
          ${totalInWords}
        </div>
      </td>
    </tr>
  </table>

  <!-- Signature Block -->
  <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div style="font-size: 10px; color: #64748b;">
      For any enquiries, email us at <b style="color: #0f172a;">info@ambicaengineers.in</b><br>
      Call us at <b style="color: #0f172a;">+91 120 3611801 / +91 76000 25020</b>
    </div>
    <div style="text-align: center; width: 260px;">
      <div style="font-size: 10px; font-weight: 700; margin-bottom: 25px;">For, AMBICA ENGINEERS & LUBRICANTS PVT. LTD.</div>
      <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 20px; color: #1e293b;">Mohit AbhayRaj Chhajer</div>
      <div style="border-top: 1px solid #94a3b8; font-size: 10px; margin-top: 4px; padding-top: 2px;">Authorised Signatory</div>
    </div>
  </div>
</body>
</html>`;
  }
}
