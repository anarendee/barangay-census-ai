'use client';

import { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase';
import RoleGuard from '@/components/RoleGuard';
import {
  Receipt,
  Clock,
  LogOut,
  Search,
  FileCheck2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/RoleGuard';

export default function TreasurerDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [pendingCerts, setPendingCerts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedCert, setSelectedCert] = useState<any | null>(null);

  // Payment Form State
  const [orNumber, setOrNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [payerName, setPayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search Ledger
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTreasuryData();
  }, []);

  const fetchTreasuryData = async () => {
    // 1. Fetch certificates awaiting payment
    const { data: pendingData, error: pendingErr } = await supabase
      .from('certificates')
      .select('*, residents(first_name, middle_name, last_name, suffix, households(purok))')
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false });

    if (pendingErr) console.error('Pending certs error:', pendingErr.message);
    if (pendingData) setPendingCerts(pendingData);

    // 2. Fetch completed payments ledger (with fallback if join fails)
    const { data: paymentData, error: paymentErr } = await supabase
      .from('payments')
      .select('*, certificates(control_number, certificate_type, purpose, residents(first_name, last_name))')
      .order('created_at', { ascending: false });

    if (paymentErr) {
      console.error('Payments join error:', paymentErr.message);
      const { data: fallbackPayments } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (fallbackPayments) setPayments(fallbackPayments);
    } else if (paymentData) {
      setPayments(paymentData);
    }
  };

  const handleSelectCert = (cert: any) => {
    setSelectedCert(cert);
    const fullName = `${cert.residents?.first_name || ''} ${cert.residents?.last_name || ''}`.trim();
    setPayerName(fullName);
    setOrNumber(`OR-${Date.now().toString().slice(-6)}`);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCert || !orNumber.trim()) return;
    setSubmitting(true);

    // 1. Insert payment record
    const { error: payError } = await supabase.from('payments').insert({
      certificate_id: selectedCert.id,
      or_number: orNumber.trim(),
      amount_paid: parseFloat(selectedCert.fee) || 0,
      payment_method: paymentMethod,
      payer_name: payerName.trim(),
    });

    if (payError) {
      alert(`Error recording payment: ${payError.message}`);
      setSubmitting(false);
      return;
    }

    // 2. Update certificate status to 'paid' so Secretary can print
    const { error: certError } = await supabase
      .from('certificates')
      .update({ status: 'paid' })
      .eq('id', selectedCert.id);

    if (certError) {
      alert(`Payment saved, but certificate status update failed: ${certError.message}`);
    } else {
      alert(`Official Receipt ${orNumber} recorded! Certificate is now unlocked for printing.`);
    }

    setSelectedCert(null);
    setOrNumber('');
    setPayerName('');
    setSubmitting(false);
    fetchTreasuryData();
  };

  const totalCollections = payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);

  const todayStr = new Date().toDateString();
  const todayCollections = payments
    .filter((p) => p.created_at && new Date(p.created_at).toDateString() === todayStr)
    .reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const query = searchQuery.toLowerCase();
    const fallbackResident = `${p.certificates?.residents?.first_name || ''} ${p.certificates?.residents?.last_name || ''}`.trim();
    const displayPayor = (p.payer_name || fallbackResident).toLowerCase();

    return (
      (p.or_number || '').toLowerCase().includes(query) ||
      displayPayor.includes(query) ||
      (p.certificates?.control_number || '').toLowerCase().includes(query) ||
      (p.certificates?.certificate_type || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Barangay Treasurer Portal</h1>
            <p className="text-xs text-slate-500">
              Barangay Enrique JC Montilla • Official Receipt (OR) &amp; Revenue Collection
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="text-red-600 flex items-center gap-1 text-sm font-medium hover:text-red-700"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Awaiting Payment</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCerts.length}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Today&apos;s Collections</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                ₱{todayCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {/* Philippine Peso Badge replacing DollarSign */}
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-2xl">
              ₱
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Recorded Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ₱{totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Main Workspace: Pending Queue + Payment Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Payment Queue */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm overflow-x-auto">
            <h2 className="font-bold text-base text-slate-900 mb-4">Certificates Awaiting Payment</h2>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                  <th className="p-3">Control No</th>
                  <th className="p-3">Applicant</th>
                  <th className="p-3">Certificate</th>
                  <th className="p-3">Fee</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingCerts.map((cert) => (
                  <tr
                    key={cert.id}
                    className={`hover:bg-slate-50 ${
                      selectedCert?.id === cert.id ? 'bg-emerald-50/60' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-semibold text-xs">{cert.control_number}</td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">
                        {cert.residents?.first_name} {cert.residents?.last_name}
                      </div>
                      <div className="text-xs text-slate-500">{cert.residents?.households?.purok}</div>
                    </td>
                    <td className="p-3">
                      <div>{cert.certificate_type}</div>
                      <div className="text-xs text-slate-500">{cert.purpose}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      ₱{Number(cert.fee || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleSelectCert(cert)}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-emerald-700"
                      >
                        Process OR
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingCerts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No pending certificate payments in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Issue Official Receipt Form */}
          <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
            <h2 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" /> Issue Official Receipt
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Select a pending request from the table to issue an OR and unlock printing.
            </p>

            {selectedCert ? (
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Control No:</span>
                    <span className="font-mono font-semibold">{selectedCert.control_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Document:</span>
                    <span className="font-medium">{selectedCert.certificate_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Due:</span>
                    <span className="font-bold text-emerald-600">
                      ₱{Number(selectedCert.fee || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Official Receipt (OR) Number
                  </label>
                  <input
                    value={orNumber}
                    onChange={(e) => setOrNumber(e.target.value)}
                    placeholder="OR-123456"
                    className="w-full border p-2.5 rounded text-sm font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payor Name
                  </label>
                  <input
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full border p-2.5 rounded text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border p-2.5 rounded text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="GCash / E-Wallet">GCash / E-Wallet</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Confirm Payment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCert(null)}
                    className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 text-center border border-dashed rounded-lg text-xs text-slate-400">
                Click <strong>Process OR</strong> next to any pending certificate on the left to begin.
              </div>
            )}
          </div>
        </div>

        {/* Completed Payments Ledger */}
        <div className="bg-white p-6 rounded-xl border shadow-sm overflow-x-auto">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h2 className="font-bold text-base text-slate-900">Official Receipt Collection Ledger</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search OR #, payor, control #..."
                className="border pl-9 pr-3 py-1.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                <th className="p-3">OR Number</th>
                <th className="p-3">Control No</th>
                <th className="p-3">Payor</th>
                <th className="p-3">Document Paid</th>
                <th className="p-3">Method</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.map((pay) => {
                const fallbackResident = `${pay.certificates?.residents?.first_name || ''} ${pay.certificates?.residents?.last_name || ''}`.trim();
                return (
    <RoleGuard allowedRole="treasurer">
                  <tr key={pay.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold text-emerald-700">{pay.or_number}</td>
                    <td className="p-3 font-mono text-xs">
                      {pay.certificates?.control_number || '—'}
                    </td>
                    <td className="p-3 font-medium text-slate-900">
                      {pay.payer_name || fallbackResident || '—'}
                    </td>
                    <td className="p-3">{pay.certificates?.certificate_type || '—'}</td>
                    <td className="p-3 text-xs">{pay.payment_method}</td>
                    <td className="p-3 font-semibold">₱{Number(pay.amount_paid || 0).toFixed(2)}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {pay.created_at ? new Date(pay.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No Official Receipts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  
    </RoleGuard>
  );
}
