import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { config } from '../config';

export const settingsRouter = Router();

settingsRouter.get('/status', async (req: Request, res: Response) => {
  const email = config.googleServiceAccountEmail;
  const key = config.googleServiceAccountPrivateKey;
  const isSaConfigured = Boolean(email && key);

  let driveAccessible = false;
  let sheetAccessible = false;
  let sheetTitle = '';

  if (isSaConfigured) {
    try {
      const auth = new google.auth.JWT({
        email,
        key,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
        ],
      });
      await auth.authorize();

      // Check Drive
      try {
        const drive = google.drive({ version: 'v3', auth });
        const driveRes = await drive.files.get({ fileId: config.googleDriveOutputFolderId, fields: 'id, name' });
        driveAccessible = Boolean(driveRes.data.id);
      } catch (e) {
        driveAccessible = false;
      }

      // Check Sheet
      if (config.googleSheetId) {
        try {
          const sheets = google.sheets({ version: 'v4', auth });
          const sheetRes = await sheets.spreadsheets.get({ spreadsheetId: config.googleSheetId });
          sheetAccessible = Boolean(sheetRes.data.spreadsheetId);
          sheetTitle = sheetRes.data.properties?.title || '';
        } catch (e) {
          sheetAccessible = false;
        }
      }
    } catch (e) {
      // Auth failed
    }
  }

  res.json({
    serviceAccountConfigured: isSaConfigured,
    serviceAccountEmail: email || null,
    driveAccessible,
    sheetId: config.googleSheetId || null,
    sheetAccessible,
    sheetTitle: sheetTitle || null,
    outputFolderId: config.googleDriveOutputFolderId,
    quoteTemplateId: config.googleQuoteTemplateId,
    piTemplateId: config.googlePiTemplateId,
  });
});
