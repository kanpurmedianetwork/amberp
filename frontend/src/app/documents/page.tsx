'use client';

import React, { useEffect, useState } from 'react';
import { History, Search, Download, ExternalLink, Filter } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { apiRequest } from '../../lib/api';
import { DocLogEntry } from '../../types';

export default function DocumentHistoryPage() {
  const [documents, setDocuments] = useState<DocLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      const res = await apiRequest<{ documents: DocLogEntry[] }>(`/documents/history?${params.toString()}`);
      setDocuments(res.documents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search, typeFilter]);

  return (
    <div>
      <Header
        title="Central Document Ledger (_DOC_LOG)"
        subtitle="Complete audit history of generated quotations, sales orders, and Proforma Invoices"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search document no, customer, source..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
            >
              <option value="">All Document Types</option>
              <option value="QUOTATION">Quotations</option>
              <option value="PI">Proforma Invoices</option>
              <option value="ORDER">Orders</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <b>{documents.length}</b> generated logs
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Document Number</th>
                  <th className="px-4 py-3">Source Ref</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Loading audit logs from _DOC_LOG...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No matching document records found.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {doc.timestamp}
                      </td>
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
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{doc.documentNo}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {doc.sourceDocument ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {doc.sourceDocument}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{doc.customer}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {doc.sheetUrl && (
                          <a
                            href={doc.sheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition-colors"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition-colors"
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
