'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Globe,
  Clock,
  ArrowRight,
  Lock,
  User,
  Users,
  CheckCircle,
  Eye,
  Activity,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { useAuth } from '../../lib/auth-context';
import { ExportLogEntry, LoginLogEntry, EditLogEntry, AuditStats } from '../../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AdminAuditPage() {
  const { user, token, isLoading } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'export' | 'exportHistory' | 'logins' | 'edits'>('export');
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [exportLogs, setExportLogs] = useState<ExportLogEntry[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);
  const [editLogs, setEditLogs] = useState<EditLogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [editSearch, setEditSearch] = useState('');
  const [editEntityFilter, setEditEntityFilter] = useState('ALL');
  const [ipChangeOnly, setIpChangeOnly] = useState(false);

  const fetchAuditData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ambica_token') : null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const [statsRes, exportsRes, loginsRes, editsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/audit/stats`, { headers }),
        fetch(`${API_BASE}/admin/audit/exports`, { headers }),
        fetch(`${API_BASE}/admin/audit/logins`, { headers }),
        fetch(`${API_BASE}/admin/audit/edits`, { headers }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (exportsRes.ok) {
        const data = await exportsRes.json();
        setExportLogs(data.logs || []);
      }
      if (loginsRes.ok) {
        const data = await loginsRes.json();
        setLoginLogs(data.logs || []);
      }
      if (editsRes.ok) {
        const data = await editsRes.json();
        setEditLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Failed to load audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAuditData();
    }
  }, [isAdmin, token]);

  const handleDownload = async (url: string, filename: string, typeKey: string) => {
    setDownloading(typeKey);
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ambica_token') : null);
      const headers: Record<string, string> = {};
      let fetchUrl = url;
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
        const separator = fetchUrl.includes('?') ? '&' : '?';
        fetchUrl = `${fetchUrl}${separator}token=${encodeURIComponent(activeToken)}`;
      }
      const res = await fetch(fetchUrl, { headers });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      // Refresh audit logs to reflect new export event
      setTimeout(() => fetchAuditData(), 600);
    } catch (err: any) {
      alert(`Export Error: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title="Security & Audit Hub" subtitle="Verifying administrator credentials..." />
        <main className="p-12 max-w-xl mx-auto mt-12 bg-white rounded-lg border border-slate-200 shadow-sm text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
          <h2 className="text-sm font-semibold text-slate-800">Authenticating Session</h2>
          <p className="text-xs text-slate-500">
            Validating employee credentials and administrative RBAC authorizations...
          </p>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <Header title="Access Restricted" subtitle="Security & Audit Hub requires Administrator credentials" />
        <main className="p-8 max-w-xl mx-auto mt-12 bg-white rounded-lg border border-red-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-600">
            This module contains confidential system audit trails, IP change records, and master database export
            privileges reserved strictly for Administrator accounts.
          </p>
          <div className="pt-2">
            <span className="text-[11px] font-mono bg-slate-100 px-3 py-1.5 rounded text-slate-700">
              Current User: {user?.name} ({user?.email}) â€” Role: {user?.role || 'VIEWER'}
            </span>
          </div>
        </main>
      </div>
    );
  }

  const filteredLoginLogs = ipChangeOnly ? loginLogs.filter((l) => l.ipChanged) : loginLogs;

  const filteredEditLogs = editLogs.filter((l) => {
    if (editEntityFilter !== 'ALL' && l.entityType.toUpperCase() !== editEntityFilter.toUpperCase()) {
      return false;
    }
    if (editSearch.trim()) {
      const q = editSearch.toLowerCase().trim();
      return (
        l.entityId.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.userEmail.toLowerCase().includes(q) ||
        l.ipAddress.includes(q) ||
        l.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <Header
        title="Admin Security, Audit & Master Export Center"
        subtitle="Download entire ERP database, review export history, monitor login IP changes, and audit all data edits"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Master Exports</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats?.totalExports ?? exportLogs.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">XLSX, JSON & CSV Dumps</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Logins</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats?.totalLogins ?? loginLogs.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Tracked with Client IP</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">IP Change Alerts</div>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {stats?.ipChangesCount ?? loginLogs.filter((l) => l.ipChanged).length}
              </div>
              <div className="text-[10px] text-amber-600 font-medium mt-0.5">Logins from New IPs</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">System Edits</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats?.totalEdits ?? editLogs.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Logged with User IP & Time</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 pt-2 rounded-t-lg shadow-sm">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'export'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download All Data</span>
          </button>

          <button
            onClick={() => setActiveTab('exportHistory')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'exportHistory'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Export History ({exportLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logins')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'logins'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Login IP Tracking ({loginLogs.length})</span>
            {stats && stats.ipChangesCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {stats.ipChangesCount} Alerts
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('edits')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'edits'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Edits via IP Audit ({editLogs.length})</span>
          </button>

          <div className="ml-auto pb-2">
            <button
              onClick={fetchAuditData}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DOWNLOAD ALL DATA (MASTER EXPORT) */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Excel Master Workbook Card */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Master Excel Workbook (.xlsx)</h3>
                    <p className="text-[11px] text-slate-500">Live 18-sheet multi-year operational database</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Includes All Sheets: ENQUIRIES, QUOTATIONS, ORDERS, PI, CUSTOMERS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Full historical sequences, pricing catalog, and _DOC_LOG archive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Logged to Export History with admin user, timestamp & IP address</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleDownload(
                      `${API_BASE}/admin/export/all-excel`,
                      `Ambica_Engineers_ERP_MASTER_${new Date().toISOString().split('T')[0]}.xlsx`,
                      'master-excel'
                    )
                  }
                  disabled={downloading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {downloading === 'master-excel' ? 'Preparing Master Workbook...' : 'Download Master Workbook (.xlsx)'}
                  </span>
                </button>
              </div>

              {/* Full JSON Database Dump Card */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <FileJson className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Complete JSON Database Dump</h3>
                    <p className="text-[11px] text-slate-500">Structured data backup & cloud migration package</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    <span>Complete JSON schema of all entities, line items & financial totals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    <span>Full export history, login security events & IP audit records</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    <span>Formatted & indented JSON ready for disaster recovery or offline backup</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleDownload(
                      `${API_BASE}/admin/export/all-json`,
                      `Ambica_ERP_FULL_DATABASE_${new Date().toISOString().split('T')[0]}.json`,
                      'master-json'
                    )
                  }
                  disabled={downloading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {downloading === 'master-json' ? 'Generating JSON Package...' : 'Download Full JSON Dump (.json)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Individual Module CSV Exports */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Individual Module CSV Exports</h3>
                <p className="text-[11px] text-slate-500">Export granular tables for analysis or accounting import</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: 'customers', label: 'Customers', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                  { key: 'products', label: 'Product Master', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
                  { key: 'enquiries', label: 'Enquiries', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
                  { key: 'orders', label: 'Orders', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                  { key: 'quotations', label: 'Quotations', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
                  { key: 'pi', label: 'Proforma Invoices', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' },
                ].map((mod) => (
                  <button
                    key={mod.key}
                    onClick={() =>
                      handleDownload(
                        `${API_BASE}/admin/export/csv/${mod.key}`,
                        `Ambica_${mod.key.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`,
                        mod.key
                      )
                    }
                    disabled={downloading !== null}
                    className={`flex flex-col items-center justify-center p-3 rounded border text-xs font-bold transition-all shadow-sm ${mod.color}`}
                  >
                    <Download className="w-4 h-4 mb-1" />
                    <span>{mod.label}</span>
                    <span className="text-[9px] font-normal opacity-80 mt-0.5">
                      {downloading === mod.key ? 'Exporting...' : 'CSV'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPORT HISTORY */}
        {activeTab === 'exportHistory' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Export Activity Trail</h3>
                <p className="text-[11px] text-slate-500">Record of all administrator database downloads and file transfers</p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">{exportLogs.length} total export event(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User / Admin</th>
                    <th className="px-4 py-3">Export Dataset</th>
                    <th className="px-4 py-3 text-center">Format</th>
                    <th className="px-4 py-3 text-center">File Size</th>
                    <th className="px-4 py-3">Client IP Address</th>
                    <th className="px-4 py-3">Device / User Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exportLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No export operations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    exportLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.userName}</div>
                          <div className="text-[10px] text-slate-500">{log.userEmail}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                          {log.exportType.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.format}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-slate-600 font-medium">
                          {log.fileSize}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {log.ipAddress}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-[11px] text-slate-500" title={log.userAgent}>
                          {log.userAgent}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LOGIN IP TRACKING */}
        {activeTab === 'logins' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Login Audit & IP Change Alerts
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tracks employee login sessions and highlights anomalies whenever an account authenticates from a new IP
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIpChangeOnly(!ipChangeOnly)}
                  className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors border ${
                    ipChangeOnly
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{ipChangeOnly ? 'Showing IP Changes Only' : 'Filter: IP Changes Only'}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-center">Role</th>
                    <th className="px-4 py-3">Login IP Address</th>
                    <th className="px-4 py-3">IP Security Status</th>
                    <th className="px-4 py-3">Device / Browser</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLoginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No login events found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLoginLogs.map((log) => (
                      <tr
                        key={log.id}
                        className={`transition-colors ${
                          log.ipChanged ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.userName}</div>
                          <div className="text-[10px] text-slate-500">{log.userEmail}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              log.userRole === 'ADMIN'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : log.userRole === 'SALES'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {log.userRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {log.ipAddress}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.ipChanged ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                              <span>IP Changed</span>
                              {log.previousIp && (
                                <span className="font-normal opacity-90 text-[10px]">
                                  (from {log.previousIp})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span>Verified IP</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-[11px] text-slate-500" title={log.userAgent}>
                          {log.userAgent}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: EDITS VIA IP AUDIT */}
        {activeTab === 'edits' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  System Mutations & Activity Audit Trail
                </h3>
                <p className="text-[11px] text-slate-500">
                  Granular audit log of all document generations, customer records, and enquiry edits with client IP
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by ID, user, IP, or details..."
                    value={editSearch}
                    onChange={(e) => setEditSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <select
                  value={editEntityFilter}
                  onChange={(e) => setEditEntityFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-700 font-medium"
                >
                  <option value="ALL">All Entity Types</option>
                  <option value="ENQUIRY">Enquiries</option>
                  <option value="QUOTATION">Quotations</option>
                  <option value="PI">Proforma Invoices</option>
                  <option value="CUSTOMER">Customers</option>
                  <option value="PRODUCT">Products</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User / Executive</th>
                    <th className="px-4 py-3 text-center">Action</th>
                    <th className="px-4 py-3">Entity Type & ID</th>
                    <th className="px-4 py-3">Client IP Address</th>
                    <th className="px-4 py-3">Mutation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No system edits found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.userName}</div>
                          <div className="text-[10px] text-slate-500">
                            {log.userEmail} ({log.userRole})
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'CREATE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.action === 'UPDATE'
                                ? 'bg-blue-100 text-blue-800'
                                : log.action === 'GENERATE'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{log.entityType}: </span>
                          <span className="font-mono text-orange-600 font-bold">{log.entityId}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {log.ipAddress}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-md truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
