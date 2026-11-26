'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Folder,
  FileSpreadsheet,
  Users,
  Shield,
  Server,
  CheckCircle2,
  AlertCircle,
  Key,
  Cloud,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { PRECONFIGURED_EMPLOYEES, useAuth } from '../../lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface GoogleStatus {
  serviceAccountConfigured: boolean;
  serviceAccountEmail: string | null;
  driveAccessible: boolean;
  sheetId: string | null;
  sheetAccessible: boolean;
  sheetTitle: string | null;
  outputFolderId: string;
  quoteTemplateId: string;
  piTemplateId: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.warn('Failed to load Google status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div>
      <Header
        title="System Configuration & Access Control"
        subtitle="Google Workspace integrations, Drive storage IDs, and employee role directory"
      />

      <main className="p-6 space-y-6 max-w-5xl">
        {/* Live Google Cloud Service Account Integration Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Google Cloud Service Account Connection</h2>
            </div>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Service Account Status */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Service Account Status</span>
                {status?.serviceAccountConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5" /> Pending Credentials
                  </span>
                )}
              </div>
              <div className="text-slate-600 text-[11px]">
                {status?.serviceAccountEmail ? (
                  <div>
                    <span className="text-slate-500">Service Account: </span>
                    <span className="font-mono font-medium text-slate-900 break-all">{status.serviceAccountEmail}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No service account email configured in backend/.env yet.</span>
                )}
              </div>
            </div>

            {/* Google Drive Status */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Google Drive Real-time Sync</span>
                {status?.driveAccessible ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Drive Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Local Storage Active
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-600">
                Documents are archived locally in <span className="font-mono text-slate-800">backend/output/</span> and synchronized to Google Drive when credentials are active.
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          {!status?.serviceAccountConfigured && (
            <div className="mt-4 p-4 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs space-y-2">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-700" />
                <span>How to connect your Live Google Service Account:</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Choose either of the two methods below to activate real-time synchronization with Google Drive and Google Sheets:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white rounded border border-amber-200">
                  <div className="font-bold text-slate-800 mb-1">Option 1: Drop JSON Key File</div>
                  <p className="text-slate-600 text-[11px]">
                    Place your downloaded Google Cloud JSON key directly into:
                    <br />
                    <code className="font-mono bg-slate-100 px-1 py-0.5 text-slate-900 rounded text-[10px]">
                      backend/service-account.json
                    </code>
                    <br />
                    The system will automatically detect and load it on next start.
                  </p>
                </div>
                <div className="p-3 bg-white rounded border border-amber-200">
                  <div className="font-bold text-slate-800 mb-1">Option 2: Configure backend/.env</div>
                  <p className="text-slate-600 text-[11px]">
                    Open <code className="font-mono bg-slate-100 px-1 py-0.5 text-slate-900 rounded text-[10px]">backend/.env</code> and set:
                    <br />
                    <code className="font-mono text-[10px] text-indigo-700">GOOGLE_SERVICE_ACCOUNT_EMAIL=...</code>
                    <br />
                    <code className="font-mono text-[10px] text-indigo-700">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="..."</code>
                  </p>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-amber-900 font-medium">
                💡 <strong>Important:</strong> Grant your service account email <strong>Editor</strong> permission on Google Drive folder <code className="font-mono">1cYj1YtJ0XoZV9omI09H-BiP7XajGHKz0</code> and your live Google Sheet.
              </div>
            </div>
          )}
        </div>

        {/* Google Workspace Resource IDs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Configured Google Workspace Resources</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500 font-semibold mb-1">Primary Business Database</div>
              <div className="font-mono font-bold text-slate-900">Ambica_Engineers_ERP_2026-2027_fixed</div>
              <div className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Single Source of Truth Active</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500 font-semibold mb-1">Google Drive Output Folder</div>
              <div className="font-mono font-bold text-slate-900">1cYj1YtJ0XoZV9omI09H-BiP7XajGHKz0</div>
              <div className="text-[10px] text-slate-500 mt-1">Ambica ERP Output / 2026-2027</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500 font-semibold mb-1">Original Quotation Template ID</div>
              <div className="font-mono font-bold text-slate-900">1gqy9ayxgQXSs7S28vMegrA7QCNE6Eks7</div>
              <div className="text-[10px] text-slate-500 mt-1">quotaion format.xlsx (Original untouched)</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500 font-semibold mb-1">Original PI Template ID</div>
              <div className="font-mono font-bold text-slate-900">14wE8Y4asvGfqsIJpBneMIeOWInoENamH</div>
              <div className="text-[10px] text-slate-500 mt-1">Pi format.xls / pi_template.xlsx (Original untouched)</div>
            </div>
          </div>
        </div>

        {/* 4 Employee Directory */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="w-5 h-5 text-orange-600" />
            <h2 className="text-sm font-bold text-slate-900">Authorized Employee Allowlist (4 Accounts)</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Employee Name</th>
                  <th className="px-4 py-2.5">Google Email</th>
                  <th className="px-4 py-2.5">System Role</th>
                  <th className="px-4 py-2.5">Permissions & Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PRECONFIGURED_EMPLOYEES.map((emp) => (
                  <tr key={emp.email} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{emp.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{emp.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${
                          emp.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : emp.role === 'SALES'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : emp.role === 'OPERATIONS'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
