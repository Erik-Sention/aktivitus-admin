'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Kontrollera om användaren redan är inloggad
    const checkAuth = async () => {
      const { getCurrentUser } = await import('@/lib/auth');
      if (getCurrentUser()) {
        router.push('/');
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      if (result) {
        // Vänta lite för att säkerställa att auth-state uppdateras
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 100);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || err.code || 'Inloggning misslyckades';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Vänster sida - Bild (Gyllene snitt ~61.8%) */}
      <div className="hidden lg:block lg:w-[61.8%] relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <Image
            src="/Aktivitus_Channel_OmAktivitus.png"
            alt="Aktivitus"
            fill
            className="object-cover"
            priority
            sizes="61.8vw"
          />
        </div>
        {/* Overlay för bättre läsbarhet */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
      </div>

      {/* Höger sida - Inloggningsformulär (Gyllene snitt ~38.2%) */}
      <div className="w-full lg:w-[38.2%] flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          {/* Logo/Titel */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Aktivitus
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              Ekonomiverktyg
            </p>
            <div className="mt-4 h-1 w-16 bg-[#0C3B5C] mx-auto rounded-full" />
          </div>

          {/* Inloggningsformulär */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                E-postadress
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ange din e-postadress"
                required
                autoComplete="email"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0C3B5C] focus:border-[#0C3B5C] outline-none transition-all text-gray-900 bg-white placeholder:text-gray-400"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                Lösenord
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ange ditt lösenord"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0C3B5C] focus:border-[#0C3B5C] outline-none transition-all text-gray-900 bg-white placeholder:text-gray-400"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors"
                  aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0C3B5C] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1E5A7D] focus:outline-none focus:ring-2 focus:ring-[#0C3B5C] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

