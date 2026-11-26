'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Receipt, Search, Plus, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { apiRequest } from '../../lib/api';
import { ProformaInvoice, Order } from '../../types';
import { useAuth } from '../../lib/auth-context';

function PIContent() {
  const searchParams = useSearchParams();
  const orderParam = searchParams.get('order');
  const { canGeneratePI } = useAuth();

  const [pis, setPis] = useState<ProformaInvoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Generate Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPIs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ pis: ProformaInvoice[] }>(`/pi${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setPis(res.pis);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Proforma Invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPIs();
    apiRequest<{ orders: Order[] }>('/orders')
      .then((res) => setOrders(res.orders))
      .catch(() => {});
  }, [search]);

  useEffect(() => {
    if (orderParam) {
      setSelectedOrderId(orderParam);
      setShowModal(true);
    }
  }, [orderParam]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiRequest<{ docNo: string; pdfUrl: string; xlsxPath: string }>('/pi/generate', {
        method: 'POST',
        body: JSON.stringify({ orderId: selectedOrderId }),
      });
      setSuccessMsg(`Proforma Invoice ${res.docNo} generated successfully!`);
      setShowModal(false);
      fetchPIs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate Proforma Invoice.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <Header
        title="Proforma Invoice Generator (PI)"
        subtitle="Produce genuine editable XLSX and pixel-perfect PDF Proforma Invoices with standard bank & terms"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search PI No, Customer, Source Order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Showing <b>{pis.length}</b> Proforma Invoices
            </span>
            {canGeneratePI && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Proforma Invoice</span>
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* PI Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">PI Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Source Order</th>
                  <th className="px-4 py-3">Items Summary</th>
                  <th className="px-4 py-3 text-right">Document Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Loading Proforma Invoices...
                    </td>
                  </tr>
                ) : pis.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No matching Proforma Invoices found.
                    </td>
                  </tr>
                ) : (
                  pis.map((pi) => (
                    <tr key={pi.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700">{pi.id}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{pi.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{pi.customer}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {pi.sourceOrderId ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {pi.sourceOrderId}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={pi.allSummary}>
                        {pi.allSummary || `${pi.items?.length || 0} item(s)`}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {pi.sheetUrl && (
                          <a
                            href={pi.sheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition-colors"
                          >
                            <Download className="w-3 h-3 text-emerald-600" />
                            <span>XLSX</span>
                          </a>
                        )}
                        {pi.pdfUrl && (
                          <a
                            href={pi.pdfUrl}
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

        {/* Generate Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h2 className="text-sm font-bold text-slate-900">Generate Proforma Invoice</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleGenerate} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Confirmed Order *</label>
                  <select
                    required
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 bg-white"
                  >
                    <option value="">-- Choose an Order --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} — {o.customer} ({o.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 space-y-1">
                  <div>* Loads original template <code>pi_template.xlsx</code>.</div>
                  <div>* Populates strictly Item Description and Quantity.</div>
                  <div>* Leaves rates, totals, and GST blank.</div>
                  <div>* Injects HDFC Bank account details and standard delivery terms.</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition-colors disabled:opacity-50"
                  >
                    {generating ? 'Generating PI Documents...' : 'Generate Proforma Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PIPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading Proforma Invoices...</div>}>
      <PIContent />
    </Suspense>
  );
}
