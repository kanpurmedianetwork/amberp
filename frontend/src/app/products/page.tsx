'use client';

import React, { useEffect, useState } from 'react';
import { Package, Search, Plus, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { apiRequest } from '../../lib/api';
import { Product } from '../../types';
import { useAuth } from '../../lib/auth-context';

export default function ProductsPage() {
  const { canManageProducts } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (activeOnly) params.append('active', 'true');
      const res = await apiRequest<{ products: Product[] }>(`/products?${params.toString()}`);
      setProducts(res.products);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, activeOnly]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;
    setSubmitLoading(true);
    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({ description: newDesc, notes: newNotes, active: true }),
      });
      setShowAddModal(false);
      setNewDesc('');
      setNewNotes('');
      fetchProducts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Product Master (PRODUCT_MASTER)"
        subtitle="Catalog of industrial components, hydraulic pumps, cushion pads, and press plates"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Compliance Note */}
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs text-slate-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span>
            <b>Notice:</b> In strict compliance with Section 4, rates and prices are omitted from line-item creation.
            Only product description and quantity are populated in sales workflows.
          </span>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Active Only</span>
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Showing <b>{products.length}</b> items
            </span>
            {canManageProducts && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product ID</th>
                  <th className="px-4 py-3">Product / Item Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Loading products from PRODUCT_MASTER...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{p.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 max-w-lg">{p.description}</td>
                      <td className="px-4 py-3">
                        {p.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            <XCircle className="w-3 h-3" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Product Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h2 className="text-sm font-bold text-slate-900">Add New Product</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product / Item Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Cushion Press Pad 2750x1470x2.1mm"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Standard OEM specification"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
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
                    {submitLoading ? 'Saving...' : 'Save Product'}
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
