'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  allowedRole: 'admin' | 'secretary' | 'treasurer';
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const supabase = createClient();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const currentRole = String(profile?.role || '').trim().toLowerCase();

      if (currentRole !== allowedRole.toLowerCase()) {
        router.replace('/');
        return;
      }

      if (isMounted) {
        setAuthorized(true);
      }
    };

    verifyRole();

    return () => {
      isMounted = false;
    };
  }, [allowedRole, router, supabase]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        Verifying portal access...
      </div>
    );
  }

  return <>{children}</>;
}