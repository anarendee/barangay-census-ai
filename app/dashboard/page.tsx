'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2, ShieldAlert, ArrowRight } from 'lucide-react';

const ROLE_ROUTES: Record<string, string> = {
  secretary: '/dashboard/secretary',
  treasurer: '/dashboard/treasurer',
  admin: '/dashboard/admin',
};

export default function DashboardRedirectPage() {
  const [statusMsg, setStatusMsg] = useState('Checking your Barangay Official session...');
  const [timedOut, setTimedOut] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Hard safety timer: never spin forever past 3.5 seconds
    const safetyTimer = setTimeout(() => {
      setTimedOut(true);
      setStatusMsg('Session check took too long. Choose your portal below or sign in again.');
    }, 3500);

    const routeUser = async () => {
      try {
        const supabase = createClient();

        // Try getSession() first, fallback to getUser()
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        let user = sessionData?.session?.user;

        if (!user && !sessionErr) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user ?? undefined;
        }

        if (!user) {
          clearTimeout(safetyTimer);
          setStatusMsg('No active session found. Redirecting to login...');
          window.location.href = '/';
          return;
        }

        setStatusMsg('Loading your assigned role...');
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        clearTimeout(safetyTimer);
        const role = String(profile?.role || 'secretary').toLowerCase();
        const target = ROLE_ROUTES[role] || '/dashboard/secretary';
        setStatusMsg(`Opening ${role.toUpperCase()} Portal...`);
        window.location.href = target;
      } catch (err: any) {
        clearTimeout(safetyTimer);
        setTimedOut(true);
        setStatusMsg(`Unable to verify session: ${err?.message || 'Unknown error'}`);
      }
    };

    routeUser();

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border rounded-2xl shadow-sm p-6 text-center space-y-4">
        {!timedOut ? (
          <Loader2 className="w-8 h-8 animate-spin text-blue-700 mx-auto" />
        ) : (
          <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
        )}

        <h1 className="text-base font-bold text-slate-900">Barangay Enrique JC Montilla</h1>
        <p className="text-xs text-slate-600">{statusMsg}</p>

        {timedOut && (
          <div className="pt-3 border-t space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">
              Direct Portal Access
            </p>
            <div className="grid grid-cols-1 gap-2">
              <a
                href="/dashboard/secretary"
                className="flex items-center justify-between px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold"
              >
                <span>Barangay Secretary Portal</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/dashboard/treasurer"
                className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold"
              >
                <span>Barangay Treasurer Portal</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/dashboard/admin"
                className="flex items-center justify-between px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                <span>Punong Barangay (Admin) Portal</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/"
                className="text-xs text-slate-500 hover:text-slate-800 pt-2 inline-block"
              >
                Back to Sign In Page
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
