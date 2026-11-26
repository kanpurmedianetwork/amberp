'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Package,
  FileQuestion,
  ShoppingCart,
  FileText,
  Receipt,
  Download,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { apiRequest } from '../lib/api';
import { DashboardStats, DocLogEntry } from '../types';
import { useAuth } from '../lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<DocLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, historyRes] = await Promise.all([
        apiRequest<DashboardStats>('/dashboard'),
        apiRequest<{ documents: DocLogEntry[] }>('/documents/history'),
      ]);
      setStats(statsRes);
      setRecentDocs(historyRes.documents.slice(0, 6));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <Header
        title="Operations Dashboard"
        subtitle={`Welcome back, ${user?.name || 'User'} (${user?.role || 'VIEWER'}) — Ambica Engineers & Lubricants Ltd.`}
        actionText="New Enquiry"
        actionHref="/enquiries/new"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Strict Business Rule Reminder Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Strict Item Entry Directive Active:</span> All line items across Enquiries,
            Quotations, Orders, and Proforma Invoices record <b>Item Description</b> and <b>Quantity ONLY</b>.
            Pricing, Unit Rates, Availability, and Line-level Remarks are omitted from entry and document outputs.
          </div>
        </div>

        {/* Running Numbers Banner */}
        <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm border border-slate-800">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Document Sequence Counters
              </h2>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Status</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/80 p-3 rounded border border-slate-700/60">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Next Enquiry No</div>
              <div className="text-lg font-mono font-bold text-orange-400 mt-1">
                {stats?.nextEnquiryNo || '...'}
              </div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded border border-slate-700/60">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Next Quotation No</div>
              <div className="text-lg font-mono font-bold text-orange-400 mt-1">
                {stats?.nextQuotationNo || '...'}
              </div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded border border-slate-700/60">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Next Order No</div>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                {stats?.nextOrderNo || '...'}
              </div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded border border-slate-700/60">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Next PI No</div>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                {stats?.nextPINo || '...'}
              </div>
            </div>
          </div>
        </div>

        {/* Master Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Link
            href="/customers"
            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-400 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Customers</span>
              <Users className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {stats?.customerCount || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">PARTY_MASTER</div>
          </Link>

          <Link
            href="/products"
            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-400 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Products</span>
              <Package className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {stats?.productCount || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">PRODUCT_MASTER</div>
          </Link>

          <Link
            href="/enquiries"
            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-400 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Enquiries</span>
              <FileQuestion className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {stats?.historicalEnquiries || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">ENQUIRIES Tab</div>
          </Link>

          <Link
            href="/orders"
            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-400 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Orders</span>
              <ShoppingCart className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {stats?.historicalOrders || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">ORDERS Tab</div>
          </Link>

          <Link
            href="/quotations"
            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-400 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Quotations</span>
              <FileText className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {stats?.historicalQuotations || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">QUOTATIONS Tab</div>
          </Link>

          <Link
            href="/pi"
            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-400 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Proforma Invoices</span>
              <Receipt className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {stats?.historicalPIs || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">PI Tab</div>
          </Link>
        </div>

        {/* Workflow Stage Map */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Standard Operating Workflow Pipeline
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full md:w-auto flex-1 p-3 bg-slate-50 border border-slate-200 rounded text-center">
              <div className="font-bold text-slate-900">1. Customer Enquiry</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Enter Description & Qty</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block" />
            <div className="w-full md:w-auto flex-1 p-3 bg-slate-50 border border-slate-200 rounded text-center">
              <div className="font-bold text-slate-900">2. Generate Quotation</div>
              <div className="text-[11px] text-slate-500 mt-0.5">XLSX & PDF Created</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block" />
            <div className="w-full md:w-auto flex-1 p-3 bg-slate-50 border border-slate-200 rounded text-center">
              <div className="font-bold text-slate-900">3. Convert to Order</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Preserve Source Enquiry</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block" />
            <div className="w-full md:w-auto flex-1 p-3 bg-slate-50 border border-slate-200 rounded text-center">
              <div className="font-bold text-slate-900">4. Generate PI</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Bank Details & Terms</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block" />
            <div className="w-full md:w-auto flex-1 p-3 bg-slate-50 border border-slate-200 rounded text-center">
              <div className="font-bold text-slate-900">5. Document Log</div>
              <div className="text-[11px] text-slate-500 mt-0.5">_DOC_LOG Archive</div>
            </div>
          </div>
        </div>

        {/* Recent Generated Documents History */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Generated Documents</h2>
              <p className="text-xs text-slate-500">Live records from _DOC_LOG</p>
            </div>
            <Link
              href="/documents"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Document No</th>
                  <th className="px-4 py-3">Source Ref</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No document history entries found.
                    </td>
                  </tr>
                ) : (
                  recentDocs.map((doc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                            doc.type === 'QUOTATION'
                              ? 'bg-orange-100 text-orange-800'
                              : doc.type === 'PI'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">{doc.documentNo}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{doc.sourceDocument}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{doc.customer}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {doc.sheetUrl && (
                          <a
                            href={doc.sheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                          >
                            <Download className="w-3 h-3 text-emerald-600" />
                            <span>XLSX</span>
                          </a>
                        )}
                        {doc.pdfUrl && (
                          <a
                            href={doc.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                          >
                            <Download className="w-3 h-3 text-red-600" />
                            <span>PDF</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
