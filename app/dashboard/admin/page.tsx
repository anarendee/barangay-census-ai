'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Bot, Users, Send, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, seniors: 0, pwd: 0 });
  const [prompt, setPrompt] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from('residents').select('is_senior, is_pwd');
      if (data) {
        setStats({
          total: data.length,
          seniors: data.filter((r) => r.is_senior).length,
          pwd: data.filter((r) => r.is_pwd).length,
        });
      }
    };
    fetchStats();
  }, []);

  const askAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoadingAi(true);
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    setAiReply(data.reply || data.error);
    setLoadingAi(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm gap-4">
          <h1 className="text-xl font-bold text-slate-800">Admin Executive & AI Portal</h1>
          <div className="flex gap-4 items-center text-sm">
            <Link href="/dashboard/secretary" className="text-blue-600 font-medium hover:underline">Secretary Module</Link>
            <Link href="/dashboard/treasurer" className="text-emerald-600 font-medium hover:underline">Treasurer Module</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-red-600 flex items-center gap-1 font-medium">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* Census KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <p className="text-sm text-slate-500 flex items-center gap-1"><Users size={16} /> Total Residents</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <p className="text-sm text-slate-500">Senior Citizens</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.seniors}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <p className="text-sm text-slate-500">PWD Residents</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.pwd}</p>
          </div>
        </div>

        {/* AI Governance Assistant */}
        <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2 text-indigo-700">
            <Bot size={22} /> AI Census & Governance Analyst
          </h2>
          <p className="text-xs text-slate-500">
            Ask questions about your live census data (e.g., "Summarize senior citizens per purok" or "Draft a barangay resolution for disaster preparedness based on our PWD count").
          </p>
          <form onSubmit={askAi} className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask the AI assistant..."
              className="flex-1 border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="submit" disabled={loadingAi} className="bg-indigo-600 text-white px-5 py-3 rounded-lg font-medium flex items-center gap-2">
              <Send size={18} /> {loadingAi ? 'Analyzing...' : 'Ask AI'}
            </button>
          </form>

          {aiReply && (
            <div className="p-4 bg-slate-50 border rounded-lg whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
              {aiReply}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
