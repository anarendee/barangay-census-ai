'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { ShieldAlert, Loader2 } from 'lucide-react';

type BarangayRole = 'secretary' | 'treasurer' | 'admin';

interface RoleGuardProps {
  allowedRole: BarangayRole;
  children: React.ReactNode;
}

const ROLE_HOME: Record<BarangayRole, string> = {
  secretary: '/dashboard/secretary',
  treasurer: '/dashboard/treasurer',
  admin: '/dashboard/admin',
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Auth check timed out')), ms)
    ),
  ]);
}

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');
  const [actualRole, setActualRole] = useState<BarangayRole | null>(null);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const verifyAccess = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await withTimeout(
          supabase.auth.getSession(),
          3000
        );

        const user = sessionData?.session?.user;
        if (!user) {
          window.location.replace('/');
          return;
        }

        const { data: profile, error } = await withTimeout(
          supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle(),
          3000
        );

        if (error || !profile?.role) {
          setActualRole('secretary');
          setStatus(allowedRole === 'secretary' ? 'authorized' : 'unauthorized');
          return;
        }

        const userRole = String(profile.role).toLowerCase() as BarangayRole;
        setActualRole(userRole);
        setStatus(userRole === allowedRole ? 'authorized' : 'unauthorized');
      } catch {
        window.location.replace('/');
      }
    };

    verifyAccess();
  }, [allowedRole]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-700" />
        <p className="text-sm font-medium">Verifying Barangay Official Credentials...</p>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Access Restricted</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your account is registered under the{' '}
            <strong className="uppercase text-slate-900">{actualRole}</strong> role and does not
            have permission to access the <strong className="uppercase">{allowedRole}</strong>{' '}
            portal.
          </p>
          <div className="flex gap-2 pt-2">
            {actualRole && ROLE_HOME[actualRole] && (
              <button
                onClick={() => window.location.replace(ROLE_HOME[actualRole])}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg text-xs font-semibold"
              >
                Go to My Portal
              </button>
            )}
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.replace('/');
              }}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
