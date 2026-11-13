'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ShieldCheck, Lock, Mail, Building2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError('Invalid email or password. Please check your credentials.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profile?.role === 'admin') router.push('/dashboard/admin');
    else if (profile?.role === 'secretary') router.push('/dashboard/secretary');
    else if (profile?.role === 'treasurer') router.push('/dashboard/treasurer');
    else {
      setError('No role assigned to this account. Contact the System Administrator.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6 border border-slate-200">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
            <Building2 size={36} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Republic of the Philippines • City of Tacurong
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Barangay Enrique JC Montilla
          </h1>
          <p className="text-sm text-slate-500">
            AI-Assisted Census & Local Governance Information System
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="official@barangay.gov.ph"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />
            {loading ? 'Verifying Credentials...' : 'Sign In to Portal'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] text-center text-slate-400 uppercase font-semibold mb-2">
            Quick Demo Account Fill (For Defense Presentation)
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => { setEmail('admin@barangay.gov.ph'); setPassword('Admin123!'); }}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setEmail('secretary@barangay.gov.ph'); setPassword('Sec123!'); }}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
            >
              Secretary
            </button>
            <button
              type="button"
              onClick={() => { setEmail('treasurer@barangay.gov.ph'); setPassword('Treas123!'); }}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
            >
              Treasurer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
