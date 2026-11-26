import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { AppShell } from '../components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Ambica Engineers & Lubricants — Sales & Document ERP',
  description: 'Production web-based ERP for Ambica Engineers & Lubricants Ltd.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
