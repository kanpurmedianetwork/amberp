'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, Plus, Phone, Mail, MapPin, Building, AlertCircle, Check } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { apiRequest } from '../../lib/api';
import { Customer } from '../../types';
import { useAuth } from '../../lib/auth-context';

export default function CustomersPage() {
  const { canManageCustomers } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({
    name: '',
    contactPerson: '',
    designation: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    notes: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCustomers = async (q?: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<{ customers: Customer[] }>(q ? `/customers?q=${encodeURIComponent(q)}` : '/customers');
      setCustomers(res.customers);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search);
  }, [search]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim()) return;
    setSubmitLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiRequest<{ customer: Customer; message: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify(newCust),
      });
      setSuccessMsg(`Customer ${res.customer.name} created successfully.`);
      setShowAddModal(false);
      setNewCust({
        name: '',
        contactPerson: '',
        designation: '',
        phone: '',
        email: '',
        city: '',
        state: '',
        notes: '',
      });
      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating customer.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Customer Master (PARTY_MASTER)"
        subtitle="Manage customer relationships, contact persons, and location details"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, city, contact person..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Showing <b>{customers.length}</b> parties
            </span>
            {canManageCustomers && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Customer</span>
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
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Customer Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Customer ID</th>
                  <th className="px-4 py-3">Company / Customer Name</th>
                  <th className="px-4 py-3">Contact Person</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Loading customers from PARTY_MASTER...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No matching customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{c.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.contactPerson ? (
                          <div>
                            <div>{c.contactPerson}</div>
                            {c.designation && <div className="text-[10px] text-slate-400">{c.designation}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.city || c.state ? `${c.city ? c.city + ', ' : ''}${c.state || ''}` : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{c.phone || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-xs">{c.email || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Customer Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h2 className="text-sm font-bold text-slate-900">Add New Customer</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCust.name}
                    onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                    placeholder="e.g. Usha Aluminium Pvt Ltd"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={newCust.contactPerson}
                      onChange={(e) => setNewCust({ ...newCust, contactPerson: e.target.value })}
                      placeholder="e.g. Mr. Shashank"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={newCust.designation}
                      onChange={(e) => setNewCust({ ...newCust, designation: e.target.value })}
                      placeholder="e.g. Purchase Manager"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={newCust.phone}
                      onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                      placeholder="e.g. 9810028894"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newCust.email}
                      onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                      placeholder="e.g. info@company.com"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={newCust.city}
                      onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                      placeholder="e.g. Ghaziabad"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={newCust.state}
                      onChange={(e) => setNewCust({ ...newCust, state: e.target.value })}
                      placeholder="e.g. Uttar Pradesh"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold transition-colors disabled:opacity-50"
                  >
                    {submitLoading ? 'Saving...' : 'Save to PARTY_MASTER'}
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
