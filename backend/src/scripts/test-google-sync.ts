import { google } from 'googleapis';
import { config } from '../config';

async function testGoogleSync() {
  console.log('===============================================================');
  console.log(' Ambica Engineers ERP — Google Cloud Service Account Diagnostic');
  console.log('===============================================================');

  const email = config.googleServiceAccountEmail;
  const key = config.googleServiceAccountPrivateKey;

  if (!email || !key) {
    console.log('❌ STATUS: Service Account credentials NOT FOUND.');
    console.log('');
    console.log('To connect your live Google Service Account:');
    console.log('  Option A: Paste credentials in backend/.env:');
    console.log('    GOOGLE_SERVICE_ACCOUNT_EMAIL=ambica-erp-service@your-project.iam.gserviceaccount.com');
    console.log('    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    console.log('');
    console.log('  Option B: Drop your downloaded Google JSON key file directly as:');
    console.log('    backend/service-account.json');
    console.log('===============================================================');
    process.exit(1);
  }

  console.log(`✓ Service Account Email: ${email}`);
  console.log(`✓ Private Key Present: ${key.includes('BEGIN PRIVATE KEY') ? 'Yes (Valid PEM structure)' : 'Warning: Key format unexpected'}`);
  console.log('');

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  try {
    console.log('Testing Google Authentication handshake...');
    await auth.authorize();
    console.log('✅ Google Authentication Handshake: SUCCESSFUL (Token acquired)');
  } catch (err: any) {
    console.error('❌ Google Authentication Handshake FAILED:', err.message);
    process.exit(1);
  }

  // Test Google Drive
  const drive = google.drive({ version: 'v3', auth });
  console.log('\nTesting Google Drive Permissions...');

  const checks = [
    { name: 'Output Folder', id: config.googleDriveOutputFolderId },
    { name: 'Quotation Template', id: config.googleQuoteTemplateId },
    { name: 'PI Template', id: config.googlePiTemplateId },
  ];

  for (const check of checks) {
    try {
      const res = await drive.files.get({ fileId: check.id, fields: 'id, name, mimeType, capabilities' });
      console.log(`  ✓ ${check.name} [${check.id}]: "${res.data.name}" (${res.data.mimeType})`);
    } catch (err: any) {
      console.warn(`  ⚠️ ${check.name} [${check.id}]: Not accessible (${err.message})`);
      console.warn(`     Ensure this file/folder is shared with Editor permission to: ${email}`);
    }
  }

  // Test Google Sheets
  if (config.googleSheetId) {
    console.log('\nTesting Google Sheets Database...');
    const sheets = google.sheets({ version: 'v4', auth });
    try {
      const res = await sheets.spreadsheets.get({ spreadsheetId: config.googleSheetId });
      console.log(`  ✓ Google Sheet [${config.googleSheetId}]: "${res.data.properties?.title}"`);
      const sheetNames = (res.data.sheets || []).map((s) => s.properties?.title);
      console.log(`  ✓ Worksheets detected: ${sheetNames.join(', ')}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Google Sheet [${config.googleSheetId}]: Not accessible (${err.message})`);
      console.warn(`     Ensure the Google Sheet is shared with Editor permission to: ${email}`);
    }
  } else {
    console.log('\nℹ️ GOOGLE_SHEET_ID is not configured in .env yet.');
    console.log('  To connect the live sheet, set GOOGLE_SHEET_ID=<ID from your sheet URL> in backend/.env');
  }

  console.log('\n===============================================================');
  console.log(' Diagnostic Complete.');
  console.log('===============================================================');
}

testGoogleSync().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
