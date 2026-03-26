'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!code.trim()) {
      setError('Veuillez entrer un code d&apos;accès');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(code);
      // The role is determined by the backend based on the code
      // Redirect based on user's role stored in localStorage after login
      const role = localStorage.getItem('user_role');
      router.push(role === 'student' ? '/session' : '/parent');
    } catch (err) {
      setError('Code d&apos;accès invalide. Veuillez réessayer.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Tagline */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">C</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Clauteur</h1>
          <p className="text-base text-slate-600">Ton espace d&apos;apprentissage</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {/* Code Input */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
              Code d&apos;accès
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleLogin();
                }
              }}
              placeholder="Entre ton code..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connexion...' : 'Entrer'}
          </button>

          {/* Footer Text */}
          <p className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
            Besoin d&apos;aide ? Contacte ton parent ou ton tuteur pour obtenir un code.
          </p>
        </div>
      </div>
    </div>
  );
}
