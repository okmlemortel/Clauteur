'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function StudentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  // Redirect if not authenticated or wrong role
  if (!isLoading && (!user || user.role !== 'student')) {
    router.push('/');
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-lg">
                <span className="text-lg font-bold text-white">C</span>
              </div>
              <span className="font-bold text-slate-900">Clauteur</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:flex items-center gap-6">
              <Link
                href="/student/session"
                className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition"
              >
                Session
              </Link>
              <div className="relative group cursor-help">
                <span className="text-sm font-medium text-slate-400">
                  Ma progression
                </span>
                <div className="absolute hidden group-hover:block bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap -top-8 left-0">
                  Bientôt !
                </div>
              </div>
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
