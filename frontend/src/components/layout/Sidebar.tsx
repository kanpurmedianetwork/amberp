'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  FileQuestion,
  ShoppingCart,
  FileText,
  Receipt,
  History,
  Settings,
  LogOut,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Enquiries', href: '/enquiries', icon: FileQuestion },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Proforma Invoices', href: '/pi', icon: Receipt },
  { name: 'Document History', href: '/documents', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SALES':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'OPERATIONS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-orange-600 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-md shadow-orange-600/20">
          AE
        </div>
        <div>
          <div className="font-bold text-white text-sm tracking-tight leading-tight">
            AMBICA ENGINEERS
          </div>
          <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
            Sales & Document ERP
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Operations
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Cloud & Firebase Indicator */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 text-[11px] flex items-center justify-between text-slate-400">
        <span className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Cloud Firestore (erp0120)</span>
        </span>
        <span className="font-mono text-[10px] text-emerald-400 font-bold">Active</span>
      </div>

      {/* Authenticated Employee Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 space-y-2.5">
        {/* User Card */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.name || 'Employee'}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase flex-shrink-0 ${getRoleBadgeColor(user?.role)}`}>
            {user?.role || 'VIEWER'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-800/60 text-slate-400 hover:text-red-300 rounded-lg text-xs font-semibold transition-all group"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 transition-colors" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
