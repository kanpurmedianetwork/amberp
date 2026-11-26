'use client';

import React from 'react';
import { useAuth } from '../../lib/auth-context';
import { Sidebar } from './Sidebar';
import { LoginPage } from '../auth/LoginPage';
import { Loader2 } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-xl tracking-wider mb-4 shadow-lg shadow-orange-600/30">
          AE
        </div>
        <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold tracking-wider uppercase">
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          <span>Loading Ambica ERP...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
