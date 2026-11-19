'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ShieldCheck, Lock, Mail, QrCode, Loader2 } from 'lucide-react';

const ROLE_ROUTES: Record<string, string> = {
  secretary: '/dashboard/secretary',
  treasurer: '/dashboard/treasurer',
  admin: '/dashboard/admin',
};

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && isMounted) {
          await redirectByRole(user.id);
        }
      } catch {
        // Ignore session check errors and show login form
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    checkExistingSession();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const redirectByRole = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile?.role) {
      setErrorMsg('Account profile or role is missing. Contact the System Administrator.');
      setCheckingSession(false);
      setLoading(false);
      return;
    }

    const role = String(profile.role).toLowerCase();
    const targetRoute = ROLE_ROUTES[role];

    if (!targetRoute) {
      setErrorMsg(`Unrecognized role "${role}" assigned to this account.`);
      setCheckingSession(false);
      setLoading(false);
      return;
    }

    router.refresh();
    window.location.href = targetRoute;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        setErrorMsg(error?.message || 'Invalid email or password.');
        return;
      }

      await redirectByRole(data.user.id);
    } catch {
      setErrorMsg('Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        Checking active session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-950 text-white p-6 text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-[11px] uppercase tracking-widest text-amber-400 font-semibold">
            City of Tacurong • Sultan Kudarat
          </p>
          <h1 className="text-xl font-extrabold tracking-wide">
            BARANGAY ENRIQUE JC MONTILLA
          </h1>
          <p className="text-xs text-blue-200">
            Integrated Census, Treasury &amp; Governance System
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="official@barangaymontilla.gov.ph"
                className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In to Portal'}
          </button>

          <div className="pt-3 border-t text-center">
            <button
              type="button"
              onClick={() => router.push('/verify/check')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-700"
            >
              <QrCode className="w-4 h-4" /> Verify a Printed Barangay Certificate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
