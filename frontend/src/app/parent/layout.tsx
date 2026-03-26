'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function ParentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  // Redirect if not authenticated or wrong role
  if (!isLoading && (!user || user.role !== 'parent')) {
    router.push('/');
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-lg">
                <span className="text-lg font-bold text-white">C</span>
              </div>
              <span className="font-bold text-slate-900">Clauteur</span>
              <span className="text-xs font-medium text-slate-500 ml-2">Parent</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/parent/overview"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive('/parent/overview')
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-slate-700 hover:text-indigo-600'
                }`}
              >
                Vue générale
              </Link>
              <Link
                href="/parent/reports"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive('/parent/reports')
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-slate-700 hover:text-indigo-600'
                }`}
              >
                Rapports
              </Link>
              <Link
                href="/parent/alerts"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive('/parent/alerts')
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-slate-700 hover:text-indigo-600'
                }`}
              >
                Alertes
              </Link>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
