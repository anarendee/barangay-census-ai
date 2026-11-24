'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ShieldCheck, Lock, Mail, Loader2, QrCode, KeyRound } from 'lucide-react';

const ROLE_ROUTES: Record<string, string> = {
  admin: '/dashboard/admin',
  secretary: '/dashboard/secretary',
  treasurer: '/dashboard/treasurer',
};

const QUICK_ACCOUNTS = [
  {
    label: 'Admin',
    sublabel: 'Punong Barangay',
    email: 'admin@barangay.gov.ph',
    password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'Admin123!',
    btnClass: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100',
  },
  {
    label: 'Secretary',
    sublabel: 'Census & Desk',
    email: 'secretary@barangay.gov.ph',
    password: process.env.NEXT_PUBLIC_SECRETARY_PASSWORD || 'Sec123!',
    btnClass: 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100',
  },
  {
    label: 'Treasurer',
    sublabel: 'OR & Collections',
    email: 'treasurer@barangay.gov.ph',
    password: process.env.NEXT_PUBLIC_TREASURER_PASSWORD || 'Treas123!',
    btnClass: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100',
  },
];

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const routeByUserId = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setErrorMsg(`Could not load user profile: ${error.message}`);
      setCheckingSession(false);
      setLoading(false);
      return false;
    }

    const normalizedRole = String(profile?.role || '').trim().toLowerCase();
    const targetRoute = ROLE_ROUTES[normalizedRole];

    if (!targetRoute) {
      setErrorMsg(
        `No valid portal route is assigned to role "${profile?.role || 'none'}". Contact your system administrator.`
      );
      setCheckingSession(false);
      setLoading(false);
      return false;
    }

    router.replace(targetRoute);
    return true;
  };

  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (user) {
        await routeByUserId(user.id);
      } else {
        setCheckingSession(false);
      }
    };

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickFill = (accountEmail: string, accountPassword: string) => {
    setErrorMsg('');
    setEmail(accountEmail);
    setPassword(accountPassword);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 0);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg(error.message || 'Invalid email or password.');
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMsg('Login succeeded, but no user session was returned.');
      setLoading(false);
      return;
    }

    await routeByUserId(data.user.id);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b14] text-slate-300 gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
        Checking active session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Navy Header */}
        <div className="bg-[#11224e] text-white px-7 py-8 text-center space-y-2">
          <div className="w-11 h-11 rounded-full bg-white/10 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
            City of Tacurong • Sultan Kudarat
          </p>
          <h1 className="text-xl font-extrabold uppercase leading-snug tracking-wide">
            Barangay Enrique JC Montilla
          </h1>
          <p className="text-xs text-slate-300">
            Integrated Census, Treasury &amp; Governance System
          </p>
        </div>

        {/* Form & Shortcuts */}
        <div className="p-7 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="official@barangaymontilla.gov.ph"
                  className="w-full border border-slate-300 pl-9 pr-3 py-2.5 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  className="w-full border border-slate-300 pl-9 pr-3 py-2.5 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </>
              ) : (
                'Sign In to Portal'
              )}
            </button>
          </form>

          {/* Bottom Role Shortcut Buttons */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <KeyRound className="w-3.5 h-3.5" /> Quick Fill Role Shortcuts
            </div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickFill(acc.email, acc.password)}
                  className={`border rounded-lg px-2 py-2 text-center transition ${acc.btnClass}`}
                >
                  <div className="text-xs font-bold">{acc.label}</div>
                  <div className="text-[10px] opacity-80 truncate">{acc.sublabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Verify Certificate Link */}
          <div className="pt-3 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => router.push('/verify')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              <QrCode className="w-3.5 h-3.5" /> Verify a Printed Barangay Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}