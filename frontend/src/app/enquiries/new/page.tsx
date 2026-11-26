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
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

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
        const qRes = await apiRequest<{ docNo: string; pdfUrl: string; xlsxPath: string }>(
          '/quotations/generate',
          {
            method: 'POST',
            body: JSON.stringify({ enquiryId: newEnqId }),
          }
        );
        setSuccessMsg(`Quotation ${qRes.docNo} generated successfully!`);
        setTimeout(() => {
          router.push(`/quotations`);
        }, 1200);
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
        {/* Strict Compliance Banner */}
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Mandatory Enterprise Rule (Section 4):</span>
            {' '}This form accepts <b>Item Description</b> and <b>Quantity ONLY</b>.
            Fields for Unit Rate, Price, Total Amount, Availability, Payment Terms, and Item Remarks are intentionally omitted.
            Prices will never be auto-filled or transferred from older records.
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

          {/* Strict Item Entry Table */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-orange-600" />
                <span>Line Items (Description & Quantity ONLY)</span>
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
                  <option key={p.id} value={p.description} />
                ))}
              </datalist>

              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="w-7 h-7 rounded bg-orange-100 text-orange-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {idx + 1}
                  </div>

                  <div className="flex-1">
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

                  <div className="w-32">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Quantity (Units) *
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

                  <div className="pt-4">
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
    </div>
  );
}
