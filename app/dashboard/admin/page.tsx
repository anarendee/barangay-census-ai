'use client';

import { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase';
import {
  Users, Home, DollarSign, Scale, Sparkles, LogOut,
  FileText, ShieldCheck, BarChart3, Send
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6'];

export default function AdminDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [residents, setResidents] = useState<any[]>([]);
  const [households, setHouseholds] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [blotters, setBlotters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Census Analyst State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchExecutiveData();
  }, []);

  const fetchExecutiveData = async () => {
    setLoading(true);
    const [
      { data: resData },
      { data: hhData },
      { data: certData },
      { data: payData },
      { data: blotterData },
    ] = await Promise.all([
      supabase.from('residents').select('*, households(purok, monthly_income)'),
      supabase.from('households').select('*'),
      supabase.from('certificates').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('blotters').select('*'),
    ]);

    if (resData) setResidents(resData);
    if (hhData) setHouseholds(hhData);
    if (certData) setCertificates(certData);
    if (payData) setPayments(payData);
    if (blotterData) setBlotters(blotterData);
    setLoading(false);
  };

  // --- Executive Metrics Calculations ---
  const totalPopulation = residents.length;
  const totalHouseholds = households.length;
  const registeredVoters = residents.filter((r) => r.is_voter).length;
  const seniorCitizens = residents.filter((r) => r.is_senior).length;
  const pwdCount = residents.filter((r) => r.is_pwd).length;
  const fourPsCount = residents.filter((r) => r.is_4ps).length;

  const maleCount = residents.filter((r) => r.gender === 'Male').length;
  const femaleCount = residents.filter((r) => r.gender === 'Female').length;

  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);
  const totalCertsIssued = certificates.length;
  const waivedCertsCount = certificates.filter((c) => c.status === 'waived' || Number(c.fee) === 0).length;
  const activeBlotters = blotters.filter((b) => b.status === 'Pending' || b.status === 'Mediation').length;
  const settledBlotters = blotters.filter((b) => b.status === 'Settled' || b.status === 'Dismissed').length;

  // --- Purok-by-Purok Breakdown ---
  const purokBreakdown = PUROKS.map((purokName) => {
    const purokResidents = residents.filter((r) => r.households?.purok === purokName);
    const purokHouseholds = households.filter((h) => h.purok === purokName);
    const avgIncome =
      purokHouseholds.length > 0
        ? purokHouseholds.reduce((sum, h) => sum + (Number(h.monthly_income) || 0), 0) / purokHouseholds.length
        : 0;

    return {
      purok: purokName,
      population: purokResidents.length,
      households: purokHouseholds.length,
      voters: purokResidents.filter((r) => r.is_voter).length,
      seniors: purokResidents.filter((r) => r.is_senior).length,
      pwds: purokResidents.filter((r) => r.is_pwd).length,
      fourPs: purokResidents.filter((r) => r.is_4ps).length,
      avgIncome,
    };
  });

  // --- AI Census Analyst Handler ---
  const handleAskAnalyst = async (e?: React.FormEvent, presetQuestion?: string) => {
    if (e) e.preventDefault();
    const query = presetQuestion || aiPrompt;
    if (!query.trim()) return;

    if (presetQuestion) setAiPrompt(presetQuestion);
    setAiLoading(true);
    setAiResponse('');

    const censusSummary = {
      barangay: 'Barangay Enrique JC Montilla, City of Tacurong, Sultan Kudarat',
      totalPopulation,
      totalHouseholds,
      genderSplit: { male: maleCount, female: femaleCount },
      sectors: {
        registeredVoters,
        seniorCitizens,
        pwd: pwdCount,
        fourPsBeneficiaries: fourPsCount,
      },
      purokDistribution: purokBreakdown,
      treasuryAndServices: {
        totalRevenuePHP: totalRevenue,
        totalCertificatesProcessed: totalCertsIssued,
        freeOrWaivedCertificates: waivedCertsCount,
      },
      peaceAndOrder: {
        totalBlotterCases: blotters.length,
        activeOrInMediation: activeBlotters,
        settledOrDismissed: settledBlotters,
      },
    };

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are the Executive AI Census & Policy Analyst for the Punong Barangay of Barangay Enrique JC Montilla, City of Tacurong. Analyze the live barangay database summary below and provide clear, actionable governance insights, budget/program recommendations, or demographic answers.\n\nLIVE BARANGAY DATA:\n${JSON.stringify(
            censusSummary,
            null,
            2
          )}\n\nPUNONG BARANGAY QUESTION:\n${query}`,
        }),
      });
      const data = await res.json();
      setAiResponse(data.reply || data.error || 'No analysis returned.');
    } catch {
      setAiResponse('Unable to reach the AI Census Analyst endpoint.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <RoleGuard allowedRole="admin">
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Executive Header */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-sm flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" /> Office of the Punong Barangay
            </div>
            <h1 className="text-2xl font-bold">Executive Governance & Census Dashboard</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Barangay Enrique JC Montilla â€¢ City of Tacurong, Province of Sultan Kudarat
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-red-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Total Population</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : totalPopulation}</p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {maleCount} Male â€¢ {femaleCount} Female
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Registered Households</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : totalHouseholds}</p>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Home className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Across {PUROKS.length} Purok Zones</p>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Treasury Collections</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  â‚±{loading ? '...' : totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {totalCertsIssued} Certs ({waivedCertsCount} Fee-Waived)
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Active Blotter Cases</p>
                <p className="text-3xl font-bold text-rose-600 mt-1">{loading ? '...' : activeBlotters}</p>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">{settledBlotters} Settled / Dismissed</p>
          </div>
        </div>

        {/* Vulnerable & Special Sectors Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl">
            <p className="text-xs font-semibold text-blue-800">Registered Voters</p>
            <p className="text-2xl font-bold text-blue-950 mt-1">{registeredVoters}</p>
            <p className="text-[11px] text-blue-700 mt-0.5">
              {totalPopulation > 0 ? Math.round((registeredVoters / totalPopulation) * 100) : 0}% of population
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl">
            <p className="text-xs font-semibold text-amber-800">Senior Citizens</p>
            <p className="text-2xl font-bold text-amber-950 mt-1">{seniorCitizens}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">OSCA / Social Pension Priority</p>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-xl">
            <p className="text-xs font-semibold text-purple-800">Persons with Disability (PWD)</p>
            <p className="text-2xl font-bold text-purple-950 mt-1">{pwdCount}</p>
            <p className="text-[11px] text-purple-700 mt-0.5">Accessibility & Aid Allocation</p>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
            <p className="text-xs font-semibold text-emerald-800">4Ps Beneficiaries</p>
            <p className="text-2xl font-bold text-emerald-950 mt-1">{fourPsCount}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">DSWD Pantawid Pamilya</p>
          </div>
        </div>

        {/* AI Census Analyst & Purok Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* AI Census Analyst Panel */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-base">
                <Sparkles className="w-5 h-5" /> AI Census & Governance Analyst
              </div>
              <p className="text-xs text-slate-500">
                Ask strategic questions about Purok demographics, social welfare targeting, or barangay revenue.
              </p>

              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleAskAnalyst(
                      undefined,
                      'Which Purok needs the highest priority for social welfare and 4Ps/Senior medical assistance based on income and demographics?'
                    )
                  }
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-2.5 py-1.5 rounded-lg border border-indigo-200 text-left transition"
                >
                  Prioritize Purok social aid
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAskAnalyst(
                      undefined,
                      'Summarize our current barangay demographic profile and peace-and-order status for a Barangay Assembly report.'
                    )
                  }
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-2.5 py-1.5 rounded-lg border border-indigo-200 text-left transition"
                >
                  Draft Barangay Assembly summary
                </button>
              </div>

              <form onSubmit={(e) => handleAskAnalyst(e)} className="space-y-2 pt-2">
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., How should we allocate our Senior Citizen and PWD budget across Puroks 1 to 6?"
                  className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {aiLoading ? 'Analyzing Live Census Data...' : 'Run AI Census Analysis'}
                </button>
              </form>
            </div>

            {aiResponse && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                {aiResponse}
              </div>
            )}
          </div>

          {/* Purok Demographic & Socio-Economic Table */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border shadow-sm overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Purok Demographic & Socio-Economic Breakdown
                </h2>
                <p className="text-xs text-slate-500">Live aggregation across all encoded households and residents</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {PUROKS.length} Zones
              </span>
            </div>

            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                  <th className="p-3">Purok</th>
                  <th className="p-3">Pop.</th>
                  <th className="p-3">Households</th>
                  <th className="p-3">Voters</th>
                  <th className="p-3">Seniors</th>
                  <th className="p-3">PWD</th>
                  <th className="p-3">4Ps</th>
                  <th className="p-3">Avg. Income</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purokBreakdown.map((row) => (
                  <tr key={row.purok} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{row.purok}</td>
                    <td className="p-3 font-bold text-blue-700">{row.population}</td>
                    <td className="p-3">{row.households}</td>
                    <td className="p-3">{row.voters}</td>
                    <td className="p-3">{row.seniors}</td>
                    <td className="p-3">{row.pwds}</td>
                    <td className="p-3">{row.fourPs}</td>
                    <td className="p-3 font-mono text-xs text-slate-700">
                      â‚±{Math.round(row.avgIncome).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  
    </RoleGuard>
  );
}
