'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileQuestion, Search, Plus, FileText, ShoppingCart, CheckCircle2, Clock } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { apiRequest } from '../../lib/api';
import { Enquiry } from '../../types';
import { useAuth } from '../../lib/auth-context';

export default function EnquiriesPage() {
  const { canCreateEnquiry, canGenerateQuotation, canConvertOrder } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await apiRequest<{ enquiries: Enquiry[] }>(`/enquiries?${params.toString()}`);
      setEnquiries(res.enquiries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [search, statusFilter]);

  return (
    <div>
      <Header
        title="Enquiry Management (ENQUIRIES)"
        subtitle="Track customer requirements, manage item quantities, and initiate quotations"
        actionText="New Enquiry"
        actionHref="/enquiries/new"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, customer name, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Quotation Generated">Quotation Generated</option>
              <option value="Order Created">Order Created</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Showing <b>{enquiries.length}</b> enquiries
            </span>
            {canCreateEnquiry && (
              <Link
                href="/enquiries/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Enquiry</span>
              </Link>
            )}
          </div>
        </div>

        {/* Enquiries Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Enquiry ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Location / Contact</th>
                  <th className="px-4 py-3">Items Summary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Loading enquiries from Google Sheets...
                    </td>
                  </tr>
                ) : enquiries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No matching enquiries found.
                    </td>
                  </tr>
                ) : (
                  enquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-orange-600">{enq.id}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{enq.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{enq.customer}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{enq.city ? `${enq.city}, ${enq.state}` : '-'}</div>
                        {enq.contactPerson && (
                          <div className="text-[10px] text-slate-400">Attn: {enq.contactPerson}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={enq.allSummary}>
                        {enq.allSummary || `${enq.items?.length || 0} item(s)`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase inline-block ${
                            enq.status === 'Open'
                              ? 'bg-blue-100 text-blue-800'
                              : enq.status === 'Quotation Generated'
                              ? 'bg-orange-100 text-orange-800'
                              : enq.status === 'Order Created'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {enq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {canGenerateQuotation && (
                          <Link
                            href={`/quotations?enquiry=${enq.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded text-[11px] font-medium transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Quote</span>
                          </Link>
                        )}
                        {canConvertOrder && (
                          <Link
                            href={`/orders?convert=${enq.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium transition-colors"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>Order</span>
                          </Link>
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
