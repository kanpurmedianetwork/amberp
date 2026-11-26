import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { SheetsService } from '../services/sheets.service';

const firebaseConfig = {
  apiKey: 'AIzaSyBZd0FTAP6GJ_eTXNhqMzRd5BDPGslGA6g',
  authDomain: 'erp0120.firebaseapp.com',
  projectId: 'erp0120',
  storageBucket: 'erp0120.firebasestorage.app',
  messagingSenderId: '33361940877',
  appId: '1:33361940877:web:38a704ce72c8e697ba6dc4',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'mohit@ambicaengineers.in';
const DEFAULT_PASSWORD = 'Ambica@Password2026';

function sanitize(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (value === undefined) return null;
      return value;
    })
  );
}

function cleanId(raw: string): string {
  return String(raw || 'doc').replace(/[\/\\]/g, '_').trim();
}

async function main() {
  console.log('===============================================================');
  console.log(' Ambica Engineers ERP — Sync Local Sheets Data to Cloud Firestore');
  console.log(' Target Project: erp0120 (STANDARD / FIRESTORE_NATIVE)');
  console.log('===============================================================');

  // 1. Authenticate with Firebase Auth
  console.log('\n1. Authenticating as admin (mohit@ambicaengineers.in)...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, DEFAULT_PASSWORD);
  console.log(`✓ Authenticated as ${auth.currentUser?.email}`);

  // 2. Load Local Data from Workbook
  console.log('\n2. Reading workbook data...');
  await SheetsService.init();

  const customers = await SheetsService.getCustomers();
  const products = await SheetsService.getProducts();
  const enquiries = await SheetsService.getEnquiries();
  const orders = await SheetsService.getOrders();
  const quotations = await SheetsService.getQuotations();
  const pis = await SheetsService.getPIs();
  const docLogs = await SheetsService.getDocLog();

  console.log(`✓ Loaded ${customers.length} customers (PARTY_MASTER)`);
  console.log(`✓ Loaded ${products.length} products (PRODUCT_MASTER)`);
  console.log(`✓ Loaded ${enquiries.length} enquiries`);
  console.log(`✓ Loaded ${orders.length} orders`);
  console.log(`✓ Loaded ${quotations.length} quotations`);
  console.log(`✓ Loaded ${pis.length} proforma invoices`);
  console.log(`✓ Loaded ${docLogs.length} document history logs`);

  // Helper to commit batches (Firestore batch limit is 500)
  async function batchCommit(collectionName: string, items: any[], getId: (item: any) => string) {
    const BATCH_SIZE = 300;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const slice = items.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const item of slice) {
        const id = cleanId(getId(item));
        const ref = doc(db, collectionName, id);
        batch.set(ref, sanitize(item), { merge: true });
      }
      await batch.commit();
      console.log(`  ✓ Uploaded ${slice.length} items to '${collectionName}' (${Math.min(i + BATCH_SIZE, items.length)}/${items.length})`);
    }
  }

  // 3. Sync to Firestore Collections
  console.log('\n3. Uploading data to Firestore collections in erp0120...');

  // Customers
  console.log('\nSyncing customers...');
  await batchCommit('customers', customers, (c) => c.id || c.name);

  // Products
  console.log('\nSyncing products...');
  await batchCommit('products', products, (p) => p.id || p.description.slice(0, 30));

  // Enquiries
  console.log('\nSyncing enquiries...');
  await batchCommit('enquiries', enquiries, (e) => e.id);

  // Orders
  if (orders.length > 0) {
    console.log('\nSyncing orders...');
    await batchCommit('orders', orders, (o) => o.id);
  }

  // Quotations
  if (quotations.length > 0) {
    console.log('\nSyncing quotations...');
    await batchCommit('quotations', quotations, (q) => q.id);
  }

  // Proforma Invoices
  if (pis.length > 0) {
    console.log('\nSyncing proforma invoices...');
    await batchCommit('proformaInvoices', pis, (pi) => pi.id);
  }

  // Doc Logs
  if (docLogs.length > 0) {
    console.log('\nSyncing document history logs...');
    await batchCommit('docLogs', docLogs, (l) => `${l.type}_${l.documentNo}`);
  }

  console.log('\n===============================================================');
  console.log(' 🎉 Sync Complete! All data is now live in Cloud Firestore (erp0120)');
  console.log('===============================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
