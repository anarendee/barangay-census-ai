'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CheckCircle2, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function VerifyCertificatePage() {
  const params = useParams();
  const controlNumber = params?.controlNumber as string;
  const supabase = createClient();

  const [cert, setCert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!controlNumber) return;

    const verifyControlNumber = async () => {
      const { data } = await supabase
        .from('certificates')
        .select('*, residents(first_name, middle_name, last_name, suffix, households(purok)), payments(or_number)')
        .eq('control_number', decodeURIComponent(controlNumber))
        .single();

      setCert(data || null);
      setLoading(false);
    };

    verifyControlNumber();
  }, [controlNumber]);

  const fullName = cert?.residents
    ? [
        cert.residents.first_name,
        cert.residents.middle_name,
        cert.residents.last_name,
        cert.residents.suffix,
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border shadow-sm p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Barangay Enrique JC Montilla • City of Tacurong
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Document Authenticity Verification
          </h1>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            Verifying control number...
          </div>
        ) : cert ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-left space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              AUTHENTIC BARANGAY DOCUMENT
            </div>

            <div className="text-xs text-slate-700 space-y-1.5 border-t border-emerald-200 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Control No:</span>
                <span className="font-mono font-bold">{cert.control_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issued To:</span>
                <span className="font-semibold uppercase">{fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Purok:</span>
                <span>{cert.residents?.households?.purok || 'Barangay Proper'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Document:</span>
                <span className="font-medium">{cert.certificate_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Purpose:</span>
                <span>{cert.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment / OR:</span>
                <span className="font-mono font-semibold">
                  {cert.status === 'pending_payment'
                    ? 'UNPAID / PENDING'
                    : cert.payments?.or_number || 'WAIVED / FREE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date Recorded:</span>
                <span>{new Date(cert.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-center gap-2 text-red-800 font-bold text-sm">
              <XCircle className="w-5 h-5 text-red-600" />
              INVALID OR UNRECOGNIZED DOCUMENT
            </div>
            <p className="text-xs text-red-700">
              No official record matches Control Number{' '}
              <span className="font-mono font-semibold">{controlNumber}</span>.
            </p>
          </div>
        )}

        <div className="pt-2">
          <Link href="/" className="text-xs text-blue-600 hover:underline font-medium">
            ← Return to Barangay Portal
          </Link>
        </div>
      </div>
    </div>
  );
}