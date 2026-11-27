import fs from 'fs';
import path from 'path';
import os from 'os';
import { Request } from 'express';
import { ExportLogEntry, LoginLogEntry, EditLogEntry, AuditStats, UserProfile } from '../types';
import { FirestoreService } from './firestore.service';

export class AuditService {
  private static exportLogs: ExportLogEntry[] = [];
  private static loginLogs: LoginLogEntry[] = [];
  private static editLogs: EditLogEntry[] = [];
  private static isInitialized = false;

  private static getStoragePath(): string {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return path.join(os.tmpdir(), 'ambica_audit_logs.json');
    }
    const localDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDir)) {
      try {
        fs.mkdirSync(localDir, { recursive: true });
      } catch {}
    }
    return path.join(localDir, 'audit_logs.json');
  }

  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.exportLogs = parsed.exportLogs || [];
        this.loginLogs = parsed.loginLogs || [];
        this.editLogs = parsed.editLogs || [];
      } else {
        this.exportLogs = [];
        this.loginLogs = [];
        this.editLogs = [];
        this.saveToDisk();
      }
    } catch (e: any) {
      console.warn('[AuditService] Storage load error (using memory cache):', e.message);
      this.exportLogs = [];
      this.loginLogs = [];
      this.editLogs = [];
    }

    this.isInitialized = true;
  }

  private static saveToDisk(): void {
    try {
      const filePath = this.getStoragePath();
      const payload = {
        exportLogs: this.exportLogs.slice(0, 500),
        loginLogs: this.loginLogs.slice(0, 500),
        editLogs: this.editLogs.slice(0, 500),
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e: any) {
      console.warn('[AuditService] Non-fatal: local disk save skipped:', e.message);
    }
  }

  public static getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      return realIp.trim();
    }
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
      return cfIp.trim();
    }
    return req.socket.remoteAddress || req.ip || '127.0.0.1';
  }

  public static async recordLogin(data: {
    user: UserProfile;
    ip: string;
    userAgent: string;
    status?: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  }): Promise<LoginLogEntry> {
    await this.init();

    // Check last recorded IP for this user
    const previous = this.loginLogs.find((l) => l.userEmail.toLowerCase() === data.user.email.toLowerCase());
    const previousIp = previous ? previous.ipAddress : '';
    const ipChanged = Boolean(previousIp && previousIp !== data.ip);

    const entry: LoginLogEntry = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userEmail: data.user.email,
      userName: data.user.name,
      userRole: data.user.role,
      ipAddress: data.ip || '127.0.0.1',
      previousIp,
      ipChanged,
      userAgent: data.userAgent || 'Unknown Device',
      status: data.status || 'SUCCESS',
    };

    this.loginLogs.unshift(entry);
    this.saveToDisk();

    FirestoreService.syncRecord('audit_logins', entry.id, entry).catch(() => {});
    return entry;
  }

  public static async recordExport(data: {
    user: UserProfile;
    ip: string;
    exportType: string;
    format: 'XLSX' | 'JSON' | 'CSV';
    recordsCount: number;
    fileSize: string;
    userAgent: string;
  }): Promise<ExportLogEntry> {
    await this.init();

    const entry: ExportLogEntry = {
      id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userEmail: data.user.email,
      userName: data.user.name,
      userRole: data.user.role,
      ipAddress: data.ip || '127.0.0.1',
      exportType: data.exportType,
      format: data.format,
      recordsCount: data.recordsCount,
      fileSize: data.fileSize,
      userAgent: data.userAgent || 'Unknown Device',
    };

    this.exportLogs.unshift(entry);
    this.saveToDisk();

    FirestoreService.syncRecord('audit_exports', entry.id, entry).catch(() => {});
    return entry;
  }

  public static async recordEdit(data: {
    user: UserProfile;
    ip: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'GENERATE' | 'STATUS_CHANGE';
    entityType: 'ENQUIRY' | 'CUSTOMER' | 'PRODUCT' | 'QUOTATION' | 'PI' | 'ORDER';
    entityId: string;
    details: string;
    userAgent: string;
  }): Promise<EditLogEntry> {
    await this.init();

    const entry: EditLogEntry = {
      id: `EDT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userEmail: data.user.email,
      userName: data.user.name,
      userRole: data.user.role,
      ipAddress: data.ip || '127.0.0.1',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details,
      userAgent: data.userAgent || 'Unknown Device',
    };

    this.editLogs.unshift(entry);
    this.saveToDisk();

    FirestoreService.syncRecord('audit_edits', entry.id, entry).catch(() => {});
    return entry;
  }

  public static async getExportLogs(): Promise<ExportLogEntry[]> {
    await this.init();
    return this.exportLogs;
  }

  public static async getLoginLogs(): Promise<LoginLogEntry[]> {
    await this.init();
    return this.loginLogs;
  }

  public static async getEditLogs(search?: string, entityType?: string): Promise<EditLogEntry[]> {
    await this.init();
    let logs = this.editLogs;
    if (entityType && entityType !== 'ALL') {
      logs = logs.filter((l) => l.entityType.toUpperCase() === entityType.toUpperCase());
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      logs = logs.filter(
        (l) =>
          l.entityId.toLowerCase().includes(q) ||
          l.userEmail.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.ipAddress.includes(q) ||
          l.details.toLowerCase().includes(q)
      );
    }
    return logs;
  }

  public static async getAuditStats(): Promise<AuditStats> {
    await this.init();
    const uniqueIps = new Set<string>();
    this.loginLogs.forEach((l) => uniqueIps.add(l.ipAddress));
    this.editLogs.forEach((e) => uniqueIps.add(e.ipAddress));
    this.exportLogs.forEach((x) => uniqueIps.add(x.ipAddress));

    const ipChangesCount = this.loginLogs.filter((l) => l.ipChanged).length;

    return {
      totalExports: this.exportLogs.length,
      totalLogins: this.loginLogs.length,
      ipChangesCount,
      totalEdits: this.editLogs.length,
      uniqueIps: uniqueIps.size,
    };
  }
}
