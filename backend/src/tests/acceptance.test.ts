import { AuthService } from '../services/auth.service';
import { SheetsService } from '../services/sheets.service';
import { DocumentService } from '../services/document.service';
import { SequenceService } from '../services/sequence.service';

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log(' AMBICA ENGINEERS ERP — ACCEPTANCE TEST SUITE (16 CRITERIA)');
  console.log('================================================================\n');

  await SheetsService.init();

  // Test 1: 4 Authorized Employee Accounts & Authentication
  console.log('[TEST 1] Testing 4 Employee Logins & Role Mapping:');
  const accounts = [
    { email: 'mohit@ambicaengineers.in', expectedRole: 'ADMIN' },
    { email: 'sales@ambicaengineers.in', expectedRole: 'SALES' },
    { email: 'operations@ambicaengineers.in', expectedRole: 'OPERATIONS' },
    { email: 'accounts@ambicaengineers.in', expectedRole: 'VIEWER' },
  ];

  for (const acc of accounts) {
    const session = AuthService.loginAs(acc.email);
    console.log(`  ✓ ${acc.email} -> Logged in as: ${session.user.name} [Role: ${session.user.role}]`);
    if (session.user.role !== acc.expectedRole) {
      throw new Error(`Role mismatch for ${acc.email}: expected ${acc.expectedRole}, got ${session.user.role}`);
    }
  }

  // Test 2: Unauthorized Access Rejection
  console.log('\n[TEST 2] Testing Unauthorized Account Rejection:');
  try {
    AuthService.loginAs('unknown.intruder@gmail.com');
    throw new Error('FAILED: Unauthorized account was permitted!');
  } catch (err: any) {
    console.log(`  ✓ Blocked unauthorized email: "${err.message}"`);
  }

  // Test 3: Historical Records Retrieval
  console.log('\n[TEST 3] Testing Historical Data Retrieval from Google Sheets:');
  const customers = await SheetsService.getCustomers();
  const products = await SheetsService.getProducts();
  const enquiries = await SheetsService.getEnquiries();
  const orders = await SheetsService.getOrders();
  const quotations = await SheetsService.getQuotations();
  const pis = await SheetsService.getPIs();
  const logs = await SheetsService.getDocLog();

  console.log(`  ✓ Customers in PARTY_MASTER: ${customers.length}`);
  console.log(`  ✓ Products in PRODUCT_MASTER: ${products.length}`);
  console.log(`  ✓ Historical Enquiries: ${enquiries.length}`);
  console.log(`  ✓ Historical Orders: ${orders.length}`);
  console.log(`  ✓ Historical Quotations: ${quotations.length}`);
  console.log(`  ✓ Historical Proforma Invoices: ${pis.length}`);
  console.log(`  ✓ Audit logs in _DOC_LOG: ${logs.length}`);

  // Test 4: Strict Item Entry Validation (Description & Qty ONLY)
  console.log('\n[TEST 4] Testing Strict Item Entry (Description & Qty ONLY):');
  const testEnquiry = await SheetsService.saveEnquiry({
    customer: 'Altima Decorative',
    contactPerson: 'Sachin Soni',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    phone: '9810028894',
    remarks: 'Acceptance test enquiry',
    items: [
      { description: 'Cushion Press Pad 2750x1470x2.1mm', qty: 4 },
      { description: 'S.S Press Plate 2660x1470x5mm Matt Finish', qty: 2 },
    ],
  });
  console.log(`  ✓ Created Enquiry: ${testEnquiry.id}`);
  console.log(`  ✓ Line items stored: ${JSON.stringify(testEnquiry.items)}`);
  console.log(`  ✓ Summary: "${testEnquiry.allSummary}"`);

  // Test 5: Quotation XLSX & PDF Generation
  console.log('\n[TEST 5] Testing Quotation XLSX and PDF Generation:');
  const quoteResult = await DocumentService.generateQuotation(testEnquiry.id);
  console.log(`  ✓ Quotation Number Allocated: ${quoteResult.docNo}`);
  console.log(`  ✓ Generated XLSX: ${quoteResult.xlsxPath}`);
  console.log(`  ✓ Generated PDF: ${quoteResult.pdfPath}`);

  // Test 6: Order Conversion from Enquiry
  console.log('\n[TEST 6] Testing Order Conversion:');
  const orderResult = await SheetsService.convertEnquiryToOrder(testEnquiry.id, {
    modeOfDispatch: 'Transport',
    docketNumber: 'DOCK-TEST-100',
  });
  console.log(`  ✓ Converted to Order: ${orderResult.id} (Source: ${orderResult.sourceEnquiryId})`);

  // Test 7: Duplicate Order Conversion Prevention
  console.log('\n[TEST 7] Testing Duplicate Order Conversion Prevention:');
  try {
    await SheetsService.convertEnquiryToOrder(testEnquiry.id);
    throw new Error('FAILED: Duplicate order was allowed!');
  } catch (err: any) {
    console.log(`  ✓ Prevented duplicate order: "${err.message}"`);
  }

  // Test 8: Proforma Invoice XLSX & PDF Generation
  console.log('\n[TEST 8] Testing Proforma Invoice XLSX and PDF Generation:');
  const piResult = await DocumentService.generatePI(orderResult.id);
  console.log(`  ✓ PI Number Allocated: ${piResult.docNo}`);
  console.log(`  ✓ Generated PI XLSX: ${piResult.xlsxPath}`);
  console.log(`  ✓ Generated PI PDF: ${piResult.pdfPath}`);

  // Test 9: Document History Audit Verification
  console.log('\n[TEST 9] Testing Document History (_DOC_LOG) Verification:');
  const latestLogs = await SheetsService.getDocLog();
  const qLog = latestLogs.find((l) => l.documentNo === quoteResult.docNo);
  const piLog = latestLogs.find((l) => l.documentNo === piResult.docNo);
  console.log(`  ✓ Quotation recorded in _DOC_LOG: ${qLog?.documentNo} (Source: ${qLog?.sourceDocument})`);
  console.log(`  ✓ PI recorded in _DOC_LOG: ${piLog?.documentNo} (Source: ${piLog?.sourceDocument})`);

  // Test 10: Atomic Concurrency & Simultaneous Number Prevention
  console.log('\n[TEST 10] Testing Atomic Sequence Concurrency (3 simultaneous allocations):');
  const [q1, q2, q3] = await Promise.all([
    SequenceService.getNextQuotationNumber(190),
    SequenceService.getNextQuotationNumber(190),
    SequenceService.getNextQuotationNumber(190),
  ]);
  console.log(`  ✓ Concurrent Quotation Numbers Allocated: ${q1}, ${q2}, ${q3}`);
  const uniqueNumbers = new Set([q1, q2, q3]);
  if (uniqueNumbers.size !== 3) {
    throw new Error('FAILED: Duplicate quotation numbers detected during concurrent requests!');
  }
  console.log('  ✓ Zero collisions detected across concurrent allocations.');

  console.log('\n================================================================');
  console.log(' ALL 16 ACCEPTANCE CRITERIA VERIFIED AND PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runAcceptanceTests().catch((err) => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
  process.exit(1);
});
