'use client';

import { useState, useEffect, useMemo } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase';
import {
  Users,
  Home,
  DollarSign,
  Scale,
  Sparkles,
  LogOut,
  FileText,
  ShieldCheck,
  BarChart3,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6'];

interface HouseholdInfo {
  purok?: string;
  monthly_income?: number;
}

interface Resident {
  id: string;
  is_senior?: boolean;
  is_pwd?: boolean;
  is_4ps?: boolean;
  households?: HouseholdInfo | HouseholdInfo[] | null;
}

interface Household {
  id: string;
  purok?: string;
  monthly_income?: number;
}

interface Certificate {
  id: string;
  status?: string;
}

interface Payment {
  id: string;
  amount_paid?: number | string;
}

interface Blotter {
  id: string;
  status?: string;
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [blotters, setBlotters] = useState<Blotter[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Executive AI Analyst State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchExecutiveData();
  }, []);

  const fetchExecutiveData = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const [
        resResult,
        hhResult,
        certResult,
        payResult,
        blotterResult,
      ] = await Promise.all([
        supabase.from('residents').select('*, households(purok, monthly_income)'),
        supabase.from('households').select('*'),
        supabase.from('certificates').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('blotters').select('*'),
      ]);

      const firstError =
        resResult.error ||
        hhResult.error ||
        certResult.error ||
        payResult.error ||
        blotterResult.error;

      if (firstError) {
        setErrorMsg(`Database error: ${firstError.message}`);
        return;
      }

      setResidents(resResult.data || []);
      setHouseholds(hhResult.data || []);
      setCertificates(certResult.data || []);
      setPayments(payResult.data || []);
      setBlotters(blotterResult.data || []);
    } catch {
      setErrorMsg('Failed to connect to the barangay database.');
    } finally {
      setLoading(false);
    }
  };

  // --- ANALYTICS CALCULATIONS ---
  const totalPopulation = residents.length;
  const totalHouseholds = households.length;
  const seniorCount = residents.filter((r) => r.is_senior).length;
  const pwdCount = residents.filter((r) => r.is_pwd).length;
  const fourPsCount = residents.filter((r) => r.is_4ps).length;

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const pendingCerts = certificates.filter((c) => c.status === 'Pending').length;
  const releasedCerts = certificates.filter((c) => c.status === 'Released').length;

  const activeBlotters = blotters.filter(
    (b) => b.status === 'Pending' || b.status === 'Mediation'
  ).length;
  const settledBlotters = blotters.filter((b) => b.status === 'Settled').length;

  // Group stats by Purok for the Executive Table
  const purokStats = PUROKS.map((purokName) => {
    const pHouseholds = households.filter((h) => h.purok === purokName);
    const pResidents = residents.filter((r) => {
      const hh = Array.isArray(r.households) ? r.households[0] : r.households;
      return hh?.purok === purokName;
    });
    const pSeniors = pResidents.filter((r) => r.is_senior).length;
    const p4Ps = pResidents.filter((r) => r.is_4ps).length;

    return {
      name: purokName,
      households: pHouseholds.length,
      population: pResidents.length,
      seniors: pSeniors,
      fourPs: p4Ps,
    };
  });

  // --- EXECUTIVE AI ANALYST ---
  const askExecutiveAI = async (customQuery?: string) => {
    const query = customQuery || aiPrompt;
    if (!query.trim()) return;

    setAiLoading(true);
    setAiResponse('');

    const censusSummary = `
      Barangay Enrique JC Montilla Executive Data:
      - Total Population: ${totalPopulation} across ${totalHouseholds} Households.
      - Vulnerable Sectors: ${seniorCount} Senior Citizens, ${pwdCount} PWDs, ${fourPsCount} 4Ps Beneficiaries.
      - Purok Breakdown: ${purokStats
        .map(
          (p) =>
            `${p.name}: ${p.population} residents (${p.households} HH, ${p.seniors} Seniors, ${p.fourPs} 4Ps)`
        )
        .join(' | ')}.
      - Treasury & Revenue: ₱${totalRevenue.toLocaleString()} total collected from ${payments.length} official receipts.
      - Documents: ${releasedCerts} certificates released, ${pendingCerts} pending.
      - Peace & Order (Blotters): ${activeBlotters} active/mediation cases, ${settledBlotters} settled cases.
    `;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are the Executive AI Census & Policy Analyst for the Punong Barangay (Captain) of Barangay Enrique JC Montilla, Tacurong City. Answer the Captain's question concisely using the live barangay database metrics below, and provide 1-2 actionable governance recommendations.
          
          LIVE BARANGAY DATA:
          ${censusSummary}
          
          CAPTAIN'S QUESTION: ${query}`,
        }),
      });

      const data = await res.json();
      setAiResponse(data.text || 'No response generated.');
    } catch {
      setAiResponse('Error connecting to Executive AI Analyst.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <RoleGuard allowedRole="admin">
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {/* Top Navigation */}
        <header className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-md">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Punong Barangay Executive Command
              </h1>
              <p className="text-xs text-slate-400">
                Barangay Enrique JC Montilla • City of Tacurong
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          {/* Database Error Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-medium">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={fetchExecutiveData}
                className="text-xs font-bold underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Population
                </p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">
                  {loading ? '...' : totalPopulation}
                </p>
                <p className="text-xs text-blue-600 font-medium mt-1">
                  Across {totalHouseholds} Households
                </p>
              </div>
              <div className="bg-blue-50 p-3.5 rounded-xl text-blue-600">
                <Users size={28} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Treasury Revenue
                </p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                  ₱{loading ? '...' : totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {payments.length} Official Receipts
                </p>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl text-emerald-600">
                <DollarSign size={28} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Clearances & Certs
                </p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">
                  {loading ? '...' : releasedCerts}
                </p>
                <p className="text-xs text-amber-600 font-medium mt-1">
                  {pendingCerts} Pending Approval
                </p>
              </div>
              <div className="bg-amber-50 p-3.5 rounded-xl text-amber-600">
                <FileText size={28} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Blotters
                </p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">
                  {loading ? '...' : activeBlotters}
                </p>
                <p className="text-xs text-purple-600 font-medium mt-1">
                  {settledBlotters} Cases Settled
                </p>
              </div>
              <div className="bg-purple-50 p-3.5 rounded-xl text-purple-600">
                <Scale size={28} />
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Purok Demographics & Vulnerable Sectors */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vulnerable Sectors Breakdown */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Home size={20} className="text-blue-600" />
                  <h2 className="text-base font-bold text-slate-800">
                    Vulnerable & Priority Sectors
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-2xl font-extrabold text-slate-800">
                      {loading ? '...' : seniorCount}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Senior Citizens
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-2xl font-extrabold text-slate-800">
                      {loading ? '...' : pwdCount}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      PWD Residents
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-2xl font-extrabold text-slate-800">
                      {loading ? '...' : fourPsCount}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      4Ps Beneficiaries
                    </p>
                  </div>
                </div>
              </div>

              {/* Purok Population Matrix */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 size={20} className="text-blue-600" />
                    <h2 className="text-base font-bold text-slate-800">
                      Census Breakdown by Purok
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Live RBIM Sync
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Purok Zone</th>
                        <th className="py-3 px-4">Households</th>
                        <th className="py-3 px-4">Population</th>
                        <th className="py-3 px-4">Seniors</th>
                        <th className="py-3 px-4">4Ps</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {purokStats.map((p) => (
                        <tr key={p.name} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                          <td className="py-3 px-4 text-slate-600">{p.households}</td>
                          <td className="py-3 px-4 text-slate-600">{p.population}</td>
                          <td className="py-3 px-4 text-slate-600">{p.seniors}</td>
                          <td className="py-3 px-4 text-slate-600">{p.fourPs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Executive AI Policy & Census Analyst */}
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div>
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2.5 py-1 rounded-full">
                    <Sparkles size={13} />
                    <span>Executive Decision Support</span>
                  </span>
                  <h2 className="text-lg font-bold mt-3">
                    AI Census & Policy Analyst
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Ask questions about live demographics, budget allocation, or purok priorities.
                  </p>
                </div>

                {/* Quick Prompt Chips */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      askExecutiveAI('Which Purok needs the most senior citizen & 4Ps support?')
                    }
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 text-left transition-colors"
                  >
                    📊 Purok Aid Priority
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      askExecutiveAI('Summarize our current revenue and peace & order status.')
                    }
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 text-left transition-colors"
                  >
                    💰 Financial & Blotter Brief
                  </button>
                </div>

                {/* AI Output Box */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 min-h-[180px] text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                  {aiLoading ? (
                    <span className="text-slate-400 animate-pulse">
                      Analyzing live barangay records...
                    </span>
                  ) : aiResponse ? (
                    aiResponse
                  ) : (
                    <span className="text-slate-400 text-xs">
                      Select a quick brief above or ask a custom executive question below...
                    </span>
                  )}
                </div>
              </div>

              {/* Custom Question Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  askExecutiveAI();
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  placeholder="Ask AI about barangay data..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 p-2 rounded-lg text-white transition-colors"
                  aria-label="Send prompt"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}