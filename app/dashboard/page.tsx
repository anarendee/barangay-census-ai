'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const ROLE_ROUTES: Record<string, string> = {
  secretary: '/dashboard/secretary',
  treasurer: '/dashboard/treasurer',
  admin: '/dashboard/admin',
};

export default function DashboardRedirectPage() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const routeUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.replace('/');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const role = String(profile?.role || 'secretary').toLowerCase();
        const target = ROLE_ROUTES[role] || '/dashboard/secretary';
        window.location.replace(target);
      } catch {
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
