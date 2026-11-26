'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, ExternalLink, Database, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  actionHref?: string;
}

export function Header({ title, subtitle, actionText, actionHref }: HeaderProps) {
  const { canCreateEnquiry } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Workbook Indicator Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 font-mono">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ambica_Engineers_ERP_2026-2027_fixed</span>
        </div>

        {actionText && actionHref && canCreateEnquiry && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{actionText}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
