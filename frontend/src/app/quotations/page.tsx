'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Search, Plus, Download, AlertCircle, CheckCircle, ExternalLink, Printer } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { apiRequest } from '../../lib/api';
import { Quotation, Enquiry } from '../../types';
import { useAuth } from '../../lib/auth-context';

function QuotationsContent() {
  const searchParams = useSearchParams();
  const enqParam = searchParams.get('enquiry');
  const { canGenerateQuotation } = useAuth();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Generate Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ quotations: Quotation[] }>(`/quotations${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setQuotations(res.quotations);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
    apiRequest<{ enquiries: Enquiry[] }>('/enquiries')
      .then((res) => setEnquiries(res.enquiries))
      .catch(() => {});
  }, [search]);

  useEffect(() => {
    if (enqParam) {
      setSelectedEnquiryId(enqParam);
      setShowModal(true);
    }
  }, [enqParam]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiryId) return;
    setGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiRequest<{ docNo: string; pdfUrl: string; xlsxPath: string }>('/quotations/generate', {
        method: 'POST',
        body: JSON.stringify({ enquiryId: selectedEnquiryId }),
      });
      setSuccessMsg(`Quotation ${res.docNo} generated successfully!`);
      setShowModal(false);
      fetchQuotations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate quotation.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <Header
        title="Quotation Generator (QUOTATIONS)"
        subtitle="Produce genuine editable XLSX and pixel-perfect PDF quotations using Ambica template mappings"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Quotation No, Customer, Source ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Showing <b>{quotations.length}</b> quotations
            </span>
            {canGenerateQuotation && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Quotation</span>
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

        {/* Quotations Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Quotation No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Source Enquiry</th>
                  <th className="px-4 py-3">Items Summary</th>
                  <th className="px-4 py-3 text-right">Document Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No matching quotations found.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-orange-600">{q.id}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{q.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{q.customer}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {q.sourceEnquiryId ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {q.sourceEnquiryId}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={q.allSummary}>
                        {q.allSummary || `${q.items?.length || 0} item(s)`}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <a
                          href={q.pdfUrl || `/api/documents/view?type=quotation&id=${encodeURIComponent(q.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded text-xs font-semibold shadow-sm transition-colors"
                          title="Open, print, or save as PDF"
                        >
                          <Printer className="w-3.5 h-3.5 text-orange-600" />
                          <span>View & Print</span>
                        </a>
                        <a
                          href={q.sheetUrl || `/api/documents/excel?type=quotation&id=${encodeURIComponent(q.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-medium transition-colors"
                          title="Download Excel Worksheet"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>XLSX</span>
                        </a>
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
                <h2 className="text-sm font-bold text-slate-900">Generate Quotation</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleGenerate} className="p-6 space-y-4 text-xs">
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

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 space-y-1">
                  <div>* Loads original template <code>quotaion format.xlsx</code>.</div>
                  <div>* Populates strictly Item Description and Quantity.</div>
                  <div>* Leaves rates, totals, and GST blank.</div>
                  <div>* Produces editable XLSX and high-resolution PDF.</div>
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
                    className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold transition-colors disabled:opacity-50"
                  >
                    {generating ? 'Generating Documents...' : 'Generate Quotation'}
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

export default function QuotationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading Quotations...</div>}>
      <QuotationsContent />
    </Suspense>
  );
}
