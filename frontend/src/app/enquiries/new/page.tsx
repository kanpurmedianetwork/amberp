'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileQuestion,
  Plus,
  Trash2,
  Save,
  FileText,
  AlertCircle,
  Building,
  User,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  Printer,
  Download,
} from 'lucide-react';
import { Header } from '../../../components/layout/Header';
import { apiRequest } from '../../../lib/api';
import { Customer, Product, DocumentItem, DashboardStats } from '../../../types';
import { useAuth } from '../../../lib/auth-context';

export default function NewEnquiryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [nextId, setNextId] = useState('...');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Form Fields
  const [customer, setCustomer] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [assignedPerson, setAssignedPerson] = useState(user?.name || '');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');

  // Strict Item Entry: Description and Quantity ONLY
  const [items, setItems] = useState<DocumentItem[]>([
    { description: '', qty: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [generatedQuote, setGeneratedQuote] = useState<{ docNo: string; viewUrl: string; excelUrl: string } | null>(null);

  useEffect(() => {
    // Load customers, active products, and next enquiry number
    Promise.all([
      apiRequest<{ customers: Customer[] }>('/customers'),
      apiRequest<{ products: Product[] }>('/products?active=true'),
      apiRequest<DashboardStats>('/dashboard'),
    ])
      .then(([cRes, pRes, dRes]) => {
        setCustomers(cRes.customers);
        setProducts(pRes.products);
        setNextId(dRes.nextEnquiryNo);
      })
      .catch((err) => console.error('Failed to load initial data:', err));
  }, []);

  // Customer Selection Auto-fill
  const handleCustomerChange = (custName: string) => {
    setCustomer(custName);
    const matched = customers.find((c) => c.name.toLowerCase() === custName.toLowerCase());
    if (matched) {
      setContactPerson(matched.contactPerson || '');
      setCity(matched.city || '');
      setState(matched.state || '');
      setPhone(matched.phone || '');
      setEmail(matched.email || '');
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', qty: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof DocumentItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    if (field === 'description') {
      const desc = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (desc) {
        const matched = products.find((p) => {
          const pClean = p.description.toLowerCase().replace(/[^a-z0-9]/g, '');
          return pClean === desc || pClean.includes(desc) || desc.includes(pClean);
        });
        if (matched) {
          const price = matched.defaultPrice || matched.oldPrice || 0;
          current.unitPrice = price;
          current.amount = (current.qty || 1) * price;
        }
      }
    } else if (field === 'qty') {
      const q = typeof value === 'number' ? value : parseInt(value, 10) || 1;
      current.qty = q;
      current.amount = q * (current.unitPrice || 0);
    } else if (field === 'unitPrice') {
      const p = typeof value === 'number' ? value : parseFloat(value) || 0;
      current.unitPrice = p;
      current.amount = (current.qty || 1) * p;
    }

    updated[index] = current;
    setItems(updated);
  };

  const subTotal = items.reduce((sum, it) => sum + (it.amount || ((it.qty || 1) * (it.unitPrice || 0))), 0);
  const gstAmount = Math.round(subTotal * 0.18 * 100) / 100;
  const grandTotal = Math.round(subTotal + gstAmount);

  const validateAndSubmit = async (andGenerateQuote = false) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!customer.trim()) {
      setErrorMsg('Please select or enter a Customer name.');
      return;
    }

    const cleanItems = items.filter((it) => it.description.trim() !== '');
    if (cleanItems.length === 0) {
      setErrorMsg('Please enter at least one item description and positive quantity.');
      return;
    }

    for (const it of cleanItems) {
      if (!it.qty || it.qty <= 0) {
        setErrorMsg(`Item "${it.description}" has invalid quantity. Must be greater than 0.`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await apiRequest<{ enquiry: any; message: string }>('/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          customer,
          contactPerson,
          assignedPerson: assignedPerson || user?.name,
          city,
          state,
          phone,
          email,
          reference,
          status: 'Open',
          remarks,
          items: cleanItems,
        }),
      });

      const newEnqId = res.enquiry.id;
      setSuccessMsg(`Enquiry ${newEnqId} successfully recorded in Google Sheets.`);

      if (andGenerateQuote) {
        setSuccessMsg(`Enquiry ${newEnqId} created. Generating Quotation...`);
        const qRes = await apiRequest<{ docNo: string; pdfUrl: string; sheetUrl: string }>(
          '/quotations/generate',
          {
            method: 'POST',
            body: JSON.stringify({ enquiryId: newEnqId }),
          }
        );
        setSuccessMsg(`Quotation ${qRes.docNo} generated successfully!`);
        setGeneratedQuote({
          docNo: qRes.docNo,
          viewUrl: qRes.pdfUrl || `/api/documents/view?type=quotation&id=${encodeURIComponent(qRes.docNo)}`,
          excelUrl: qRes.sheetUrl || `/api/documents/excel?type=quotation&id=${encodeURIComponent(qRes.docNo)}`,
        });
      } else {
        setTimeout(() => {
          router.push('/enquiries');
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save enquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Create New Enquiry"
        subtitle={`Sequential Allocation: ${nextId} — Ambica Engineers 2026-2027`}
      />

      <main className="p-6 max-w-5xl space-y-6">
        {/* Modern Enterprise Notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3.5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-950 leading-relaxed">
            <span className="font-bold">Enterprise Quotation Builder:</span>
            {' '}Product descriptions automatically autocomplete with live catalog prices. Unit rates, amounts, and 18% GST are calculated in real time and can be customized per line item.
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

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Customer Information Block */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-orange-600" />
              <span>Customer Master Selection</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Company Name *
                </label>
                <input
                  list="customer-list"
                  type="text"
                  required
                  placeholder="Select from PARTY_MASTER or type name..."
                  value={customer}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                />
                <datalist id="customer-list">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.city ? `${c.city}, ${c.state}` : ''}
                    </option>
                  ))}
                </datalist>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selecting an existing customer automatically populates contact & address.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Shashank"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Moradabad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  placeholder="e.g. Uttar Pradesh"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9810028894"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. contact@client.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / Requirement</label>
                <input
                  type="text"
                  placeholder="e.g. WhatsApp RFQ / Email enquiry"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Sales Executive</label>
                <input
                  type="text"
                  value={assignedPerson}
                  onChange={(e) => setAssignedPerson(e.target.value)}
                  placeholder="e.g. Mohit AbhayRaj Chhajer"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Line Items & Calculations Table */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-orange-600" />
                <span>Line Items & Pricing (Auto-Calculated with GST)</span>
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              <datalist id="product-list">
                {products.map((p) => (
                  <option key={p.id} value={p.description}>
                    {p.defaultPrice ? `₹ ${p.defaultPrice.toLocaleString('en-IN')}` : ''}
                  </option>
                ))}
              </datalist>

              {items.map((it, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="w-7 h-7 rounded bg-orange-100 text-orange-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {idx + 1}
                  </div>

                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Item Description (Autocomplete from PRODUCT_MASTER) *
                    </label>
                    <input
                      list="product-list"
                      type="text"
                      required
                      placeholder="e.g. Cushion Press Pad 2750x1470x2.1mm"
                      value={it.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 bg-white"
                    />
                  </div>

                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Qty *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="Qty"
                      value={it.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-orange-500 bg-white font-bold"
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Rate / Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0.00"
                      value={it.unitPrice || ''}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono text-right focus:ring-1 focus:ring-orange-500 bg-white font-semibold"
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 text-right">
                      Amount (₹)
                    </label>
                    <div className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-right font-bold text-slate-800">
                      ₹ {((it.amount !== undefined ? it.amount : (it.qty || 1) * (it.unitPrice || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="pt-0 sm:pt-4 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Summary Box */}
            <div className="mt-4 p-4 bg-orange-50/60 border border-orange-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-slate-600 text-[11px]">
                <span className="font-semibold text-orange-900">Standard Terms:</span> 18% GST auto-applied. Final rounded amount will be reflected on generated Quotation & PI documents.
              </div>
              <div className="flex items-center gap-6 divide-x divide-orange-200 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Subtotal</span>
                  <span className="font-bold text-slate-800">₹ {subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-6">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">GST (18%)</span>
                  <span className="font-semibold text-orange-700">₹ {gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-6">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Grand Total</span>
                  <span className="font-extrabold text-orange-900 text-sm">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer-Level Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Dispatched by V-Trans / Client requested delivery next week"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 text-xs"
            />
          </div>

          {/* Submission Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled={loading}
              onClick={() => validateAndSubmit(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Enquiry Only</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => validateAndSubmit(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Save + Generate Quotation'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Quotation Generated Success Modal */}
      {generatedQuote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-6 text-center space-y-5">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Quotation Generated!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Quotation <span className="font-mono font-bold text-orange-600">{generatedQuote.docNo}</span> has been generated and is ready for viewing, printing, and delivery.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <a
                href={generatedQuote.viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Open, View & Print Quotation</span>
              </a>
              <a
                href={generatedQuote.excelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Download Excel Sheet (.xlsx)</span>
              </a>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => router.push('/quotations')}
                className="text-slate-500 hover:text-slate-800 font-medium"
              >
                Go to Quotations List &rarr;
              </button>
              <button
                onClick={() => {
                  setGeneratedQuote(null);
                  router.push('/enquiries');
                }}
                className="text-orange-600 hover:text-orange-700 font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
