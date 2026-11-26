import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { UserRole } from '../types';

dotenv.config();

export interface AuthorizedUserConfig {
  email: string;
  name: string;
  role: UserRole;
}

const defaultAuthorizedUsers: AuthorizedUserConfig[] = [
  {
    email: 'mohit@ambicaengineers.in',
    name: 'Mohit AbhayRaj Chhajer',
    role: 'ADMIN',
  },
  {
    email: 'sales@ambicaengineers.in',
    name: 'Harpreet Singh (Sales)',
    role: 'SALES',
  },
  {
    email: 'operations@ambicaengineers.in',
    name: 'Saurabh Agnihotri (Operations)',
    role: 'OPERATIONS',
  },
  {
    email: 'accounts@ambicaengineers.in',
    name: 'Accounts Executive',
    role: 'VIEWER',
  },
];

let parsedUsers: AuthorizedUserConfig[] = defaultAuthorizedUsers;
if (process.env.AUTHORIZED_USERS_JSON) {
  try {
    parsedUsers = JSON.parse(process.env.AUTHORIZED_USERS_JSON);
  } catch (err) {
    console.error('Failed to parse AUTHORIZED_USERS_JSON:', err);
  }
}

// Auto-detect service-account.json or credentials.json if present
let detectedSaEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
let detectedSaKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!detectedSaEmail || !detectedSaKey) {
  const candidateKeyPaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(__dirname, '../../service-account.json'),
    path.resolve(__dirname, '../../google-credentials.json'),
    path.resolve(__dirname, '../../credentials.json'),
    path.resolve(__dirname, '../../../service-account.json'),
  ].filter(Boolean) as string[];

  for (const candidatePath of candidateKeyPaths) {
    if (fs.existsSync(candidatePath)) {
      try {
        const rawJson = fs.readFileSync(candidatePath, 'utf8');
        const parsed = JSON.parse(rawJson);
        if (parsed.client_email && parsed.private_key) {
          detectedSaEmail = detectedSaEmail || parsed.client_email;
          detectedSaKey = detectedSaKey || parsed.private_key;
          console.log(`[Config] Loaded Google Service Account credentials from: ${candidatePath} (${parsed.client_email})`);
          break;
        }
      } catch (e) {
        console.warn(`[Config] Failed reading service account key from ${candidatePath}:`, e);
      }
    }
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'ambica-engineers-production-secret-key-2026',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleServiceAccountEmail: detectedSaEmail,
  googleServiceAccountPrivateKey: detectedSaKey,
  
  googleSheetId: process.env.GOOGLE_SHEET_ID || '',
  googleDriveOutputFolderId: process.env.GOOGLE_DRIVE_OUTPUT_FOLDER_ID || '1cYj1YtJ0XoZV9omI09H-BiP7XajGHKz0',
  googleQuoteTemplateId: process.env.GOOGLE_QUOTE_TEMPLATE_ID || '1gqy9ayxgQXSs7S28vMegrA7QCNE6Eks7',
  googlePiTemplateId: process.env.GOOGLE_PI_TEMPLATE_ID || '14wE8Y4asvGfqsIJpBneMIeOWInoENamH',
  
  // Cloudflare R2 Object Storage (10 GB Free Tier, $0 Egress)
  r2AccountId: process.env.R2_ACCOUNT_ID || '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  r2BucketName: process.env.R2_BUCKET_NAME || 'ambica-erp-docs',
  r2PublicUrl: process.env.R2_PUBLIC_URL || '',

  localWorkbookPath: path.resolve(__dirname, '../../data/Ambica_Engineers_ERP_2026-2027_fixed.xlsx'),
  quotationTemplatePath: path.resolve(__dirname, '../../templates/quotation_template.xlsx'),
  piTemplatePath: path.resolve(__dirname, '../../templates/pi_template.xlsx'),
  logoPath: path.resolve(__dirname, '../../assets/logo.png'),
  
  corsOrigin: process.env.CORS_ORIGIN || '*',
  authorizedUsers: parsedUsers,
  
  prefixes: {
    enquiry: 'ENR-',
    quotation: 'AELPL/26-27/',
    order: 'AE/26-27/O',
    pi: 'AELPL/26-27/',
  },
};
