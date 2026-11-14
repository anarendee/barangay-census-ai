'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const ROLE_ROUTES: Record<string, string> = {
  secretary: '/dashboard/secretary',
  treasurer: '/dashboard/treasurer',
  admin: '/dashboard/admin',
};

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Session check timed out')), ms)
    ),
  ]);
}

export default function DashboardRedirectPage() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const routeUser = async () => {
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

        const { data: profile } = await withTimeout(
          supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle(),
          3000
        );

        const role = String(profile?.role || 'secretary').toLowerCase();
        window.location.replace(ROLE_ROUTES[role] || '/dashboard/secretary');
      } catch (err) {
        console.error('Redirect error:', err);
        window.location.replace('/');
      }
    };

    routeUser();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-blue-700" />
      <p className="text-sm font-medium">Redirecting to your Barangay Portal...</p>
    </div>
  );
}
