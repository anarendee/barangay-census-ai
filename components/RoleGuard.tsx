'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized' | 'error'>('checking');
  const [actualRole, setActualRole] = useState<BarangayRole | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setStatus('error');
        return;
      }

      if (!profile?.role) {
        setActualRole(null);
        setStatus('unauthorized');
        return;
      }

      const userRole = String(profile.role).toLowerCase() as BarangayRole;
      setActualRole(userRole);

      if (userRole === allowedRole) {
        setStatus('authorized');
      } else {
        setStatus('unauthorized');
      }
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [allowedRole, router, supabase]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-700" />
        <p className="text-sm font-medium">Verifying Barangay Official Credentials...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 shadow-sm p-6 text-center space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Connection Error</h1>
          <p className="text-xs text-slate-600">
            Unable to verify your official role right now. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg text-xs font-semibold"
          >
            Retry Verification
          </button>
        </div>
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
            {actualRole ? (
              <>
                Your account is registered under the{' '}
                <strong className="uppercase text-slate-900">{actualRole}</strong> role and does not
                have permission to access the <strong className="uppercase">{allowedRole}</strong>{' '}
                portal.
              </>
            ) : (
              'No official barangay role is assigned to your account. Contact the System Administrator.'
            )}
          </p>
          <div className="flex gap-2 pt-2">
            {actualRole && ROLE_HOME[actualRole] && (
              <button
                onClick={() => router.replace(ROLE_HOME[actualRole])}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg text-xs font-semibold"
              >
                Go to My Portal
              </button>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/');
              }}
              className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
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
