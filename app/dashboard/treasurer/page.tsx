'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { DollarSign, Package, LogOut, CheckCircle2, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TreasurerDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [pendingCerts, setPendingCerts] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  // Stores manual OR Number per certificate ID
  const [orNumbers, setOrNumbers] = useState<{ [certId: string]: string }>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Inventory Form
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Office Supplies');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: certs } = await supabase
      .from('certificates')
      .select('*, residents(first_name, last_name, households(purok))')
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false });

    const { data: paid } = await supabase
      .from('payments')
      .select('*, certificates(control_number, certificate_type, residents(first_name, last_name))')
      .order('paid_at', { ascending: false })
      .limit(10);

    const { data: inv } = await supabase
      .from('inventory')
      .select('*')
      .order('updated_at', { ascending: false });

    if (certs) setPendingCerts(certs);
    if (paid) setRecentPayments(paid);
    if (inv) setInventory(inv);
  };

  const handleOrChange = (certId: string, value: string) => {
    setOrNumbers((prev) => ({ ...prev, [certId]: value }));
  };

  const handleReceivePayment = async (cert: any) => {
    const enteredOr = (orNumbers[cert.id] || '').trim().toUpperCase();

    if (!enteredOr) {
      alert('Please enter the physical Official Receipt (OR) Number before confirming payment.');
      return;
    }

    setProcessingId(cert.id);

    const { error: payError } = await supabase.from('payments').insert({
      certificate_id: cert.id,
      or_number: enteredOr,
      amount_paid: cert.fee,
    });

    if (payError) {
      setProcessingId(null);
      if (payError.code === '23505') {
        alert(`Error: Official Receipt Number "${enteredOr}" has already been recorded in the system.`);
      } else {
        alert(`Failed to record payment: ${payError.message}`);
      }
      return;
    }

    await supabase.from('certificates').update({ status: 'paid' }).eq('id', cert.id);

    setOrNumbers((prev) => {
      const updated = { ...prev };
      delete updated[cert.id];
      return updated;
    });

    setProcessingId(null);
    loadData();
    alert(`Payment recorded! Official Receipt ${enteredOr} linked to ${cert.control_number}.`);
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('inventory').insert({
      item_name: itemName,
      category,
      quantity: parseInt(quantity),
      unit,
    });
    setItemName('');
    setQuantity('1');
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Barangay Treasurer Portal</h1>
            <p className="text-xs text-slate-500">Official Receipt Collection & Barangay Asset Inventory</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="text-red-600 flex items-center gap-1 text-sm font-medium hover:underline"
          >
            <LogOut size={16} /> Logout
          </button>
        </header>

        {/* Pending Payments with Manual OR Input */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-bold text-lg mb-1 flex items-center gap-2 text-emerald-700">
            <DollarSign size={20} /> Pending Certificate Collections
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Enter the exact serial number from the physical Accountable Form No. 51 (OR) booklet to clear each request.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-2">Control No</th>
                  <th>Payee</th>
                  <th>Document</th>
                  <th>Amount Due</th>
                  <th>Physical OR Number</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingCerts.map((cert) => (
                  <tr key={cert.id} className="border-b">
                    <td className="py-3 font-mono text-xs">{cert.control_number}</td>
                    <td className="font-medium">
                      {cert.residents?.first_name} {cert.residents?.last_name}
                    </td>
                    <td>{cert.certificate_type}</td>
                    <td className="font-bold text-slate-800">₱{cert.fee}</td>
                    <td>
                      <input
                        type="text"
                        placeholder="e.g. OR-8492015"
                        value={orNumbers[cert.id] || ''}
                        onChange={(e) => handleOrChange(cert.id, e.target.value)}
                        className="border border-slate-300 px-2.5 py-1.5 rounded text-xs font-mono uppercase w-36 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => handleReceivePayment(cert)}
                        disabled={processingId === cert.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                      >
                        {processingId === cert.id ? 'Saving...' : 'Confirm & Unlock'}
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingCerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No pending certificate payments at the moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Official Receipts Log */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
            <Receipt size={20} className="text-emerald-600" /> Recent Official Receipts Issued
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-2">OR Number</th>
                  <th>Control No</th>
                  <th>Payee</th>
                  <th>Document</th>
                  <th>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((pay) => (
                  <tr key={pay.id} className="border-b">
                    <td className="py-2.5 font-mono font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={14} /> {pay.or_number}
                    </td>
                    <td className="font-mono text-xs">{pay.certificates?.control_number}</td>
                    <td>
                      {pay.certificates?.residents?.first_name}{' '}
                      {pay.certificates?.residents?.last_name}
                    </td>
                    <td>{pay.certificates?.certificate_type}</td>
                    <td className="font-medium">₱{pay.amount_paid}</td>
                  </tr>
                ))}
                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      No Official Receipts recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Management */}
        <div className="grid md:grid-cols-3 gap-6">
          <form onSubmit={handleAddInventory} className="bg-white p-6 rounded-xl shadow-sm space-y-3">
            <h2 className="font-bold text-lg flex items-center gap-2 text-blue-700">
              <Package size={20} /> Add Inventory Item
            </h2>
            <input
              placeholder="Item Name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full border p-2 rounded text-sm"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            >
              <option>Office Supplies</option>
              <option>Disaster & Rescue Gear</option>
              <option>Medical Supplies</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="border p-2 rounded text-sm"
                required
              />
              <input
                placeholder="Unit (boxes, pcs)"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="border p-2 rounded text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm"
            >
              Record Asset
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm">
            <h2 className="font-bold text-lg mb-4">Barangay Supplies & Equipment Inventory</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-2">Item</th>
                  <th>Category</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 font-medium">{item.item_name}</td>
                    <td>{item.category}</td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
