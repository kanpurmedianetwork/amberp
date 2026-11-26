'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Search, Plus, Receipt, AlertCircle, CheckCircle, Truck } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { apiRequest } from '../../lib/api';
import { Order, Enquiry } from '../../types';
import { useAuth } from '../../lib/auth-context';

function OrdersContent() {
  const searchParams = useSearchParams();
  const convertEnquiryId = searchParams.get('convert');
  const { canConvertOrder, canGeneratePI } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Conversion Modal State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
  const [modeOfDispatch, setModeOfDispatch] = useState('Transport');
  const [docketNumber, setDocketNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ orders: Order[] }>(`/orders${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setOrders(res.orders);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Load open enquiries for conversion selector
    apiRequest<{ enquiries: Enquiry[] }>('/enquiries')
      .then((res) => setEnquiries(res.enquiries))
      .catch(() => {});
  }, [search]);

  useEffect(() => {
    if (convertEnquiryId) {
      setSelectedEnquiryId(convertEnquiryId);
      setShowConvertModal(true);
    }
  }, [convertEnquiryId]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiryId) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiRequest<{ order: Order; message: string }>('/orders/convert', {
        method: 'POST',
        body: JSON.stringify({
          enquiryId: selectedEnquiryId,
          modeOfDispatch,
          docketNumber,
        }),
      });
      setSuccessMsg(`Enquiry ${selectedEnquiryId} converted into Order ${res.order.id}.`);
      setShowConvertModal(false);
      fetchOrders();
    } catch (err: any) {
      setErrorMsg(err.message || 'Conversion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEnq = enquiries.find((e) => e.id.toLowerCase() === selectedEnquiryId.toLowerCase());

  return (
    <div>
      <Header
        title="Order Management (ORDERS)"
        subtitle="Track sales orders, maintain source enquiry relationships, and generate Proforma Invoices"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer, Source Ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Showing <b>{orders.length}</b> orders
            </span>
            {canConvertOrder && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Convert Enquiry to Order</span>
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

        {/* Orders Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Source Enquiry</th>
                  <th className="px-4 py-3">Dispatch Info</th>
                  <th className="px-4 py-3">Items Summary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Loading orders from ORDERS worksheet...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No matching orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700">{ord.id}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{ord.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{ord.customer}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {ord.sourceEnquiryId ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {ord.sourceEnquiryId}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {ord.modeOfDispatch ? (
                          <div>
                            <span>{ord.modeOfDispatch}</span>
                            {ord.docketNumber && <span className="font-mono text-[10px] text-slate-400 block">Dk: {ord.docketNumber}</span>}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={ord.allSummary}>
                        {ord.allSummary || `${ord.items?.length || 0} item(s)`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] uppercase bg-emerald-100 text-emerald-800">
                          {ord.status || 'Open'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canGeneratePI && (
                          <Link
                            href={`/pi?order=${ord.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium transition-colors"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Generate PI</span>
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

        {/* Convert Modal */}
        {showConvertModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h2 className="text-sm font-bold text-slate-900">Convert Enquiry to Order</h2>
                <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleConvert} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Source Enquiry *</label>
                  <select
                    required
                    value={selectedEnquiryId}
                    onChange={(e) => setSelectedEnquiryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 bg-white"
                  >
                    <option value="">-- Choose an Enquiry --</option>
                    {enquiries.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.id} — {e.customer} ({e.status})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEnq && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1 text-slate-700">
                    <div><b>Customer:</b> {selectedEnq.customer}</div>
                    <div><b>Location:</b> {selectedEnq.city}, {selectedEnq.state}</div>
                    <div><b>Items to transfer:</b> {selectedEnq.allSummary}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mode of Dispatch</label>
                    <input
                      type="text"
                      value={modeOfDispatch}
                      onChange={(e) => setModeOfDispatch(e.target.value)}
                      placeholder="e.g. Transport / Porter / Courier"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Docket / Bilty Number</label>
                    <input
                      type="text"
                      value={docketNumber}
                      onChange={(e) => setDocketNumber(e.target.value)}
                      placeholder="e.g. TR-998811"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Converting...' : 'Confirm Order Conversion'}
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

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading Orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
