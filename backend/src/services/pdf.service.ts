import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

export function renderHtmlToPdf(htmlPath: string, pdfPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/libreoffice',
    ];

    let browserExe = chromePaths.find((p) => fs.existsSync(p));
    if (!browserExe) {
      return reject(new Error('No headless browser found for PDF generation'));
    }

    const args = [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--run-all-compositor-stages-before-draw',
      '--no-pdf-header-footer',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${pdfPath}`,
      htmlPath,
    ];

    execFile(browserExe, args, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
