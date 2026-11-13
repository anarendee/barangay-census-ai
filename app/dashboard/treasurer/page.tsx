'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { DollarSign, Package, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TreasurerDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [pendingCerts, setPendingCerts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

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
      .select('*, residents(first_name, last_name)')
      .eq('status', 'pending_payment');

    const { data: inv } = await supabase
      .from('inventory')
      .select('*')
      .order('updated_at', { ascending: false });

    if (certs) setPendingCerts(certs);
    if (inv) setInventory(inv);
  };

  const handleReceivePayment = async (cert: any) => {
    const orNumber = `OR-${Math.floor(100000 + Math.random() * 900000)}`;
    await supabase.from('payments').insert({
      certificate_id: cert.id,
      or_number: orNumber,
      amount_paid: cert.fee,
    });
    await supabase.from('certificates').update({ status: 'paid' }).eq('id', cert.id);
    loadData();
    alert(`Payment recorded! Official Receipt: ${orNumber}`);
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
          <h1 className="text-xl font-bold text-slate-800">Barangay Treasurer Portal</h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="text-red-600 flex items-center gap-1 text-sm font-medium"
          >
            <LogOut size={16} /> Logout
          </button>
        </header>

        {/* Pending Payments */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-emerald-700">
            <DollarSign size={20} /> Pending Certificate Collections
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Control No</th>
                <th>Payee</th>
                <th>Document</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingCerts.map((cert) => (
                <tr key={cert.id} className="border-b">
                  <td className="py-3 font-mono">{cert.control_number}</td>
                  <td>
                    {cert.residents?.first_name} {cert.residents?.last_name}
                  </td>
                  <td>{cert.certificate_type}</td>
                  <td className="font-bold">₱{cert.fee}</td>
                  <td>
                    <button
                      onClick={() => handleReceivePayment(cert)}
                      className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-medium"
                    >
                      Confirm Payment & Issue OR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              className="w-full border p-2 rounded"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border p-2 rounded"
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
                className="border p-2 rounded"
                required
              />
              <input
                placeholder="Unit (boxes, pcs)"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="border p-2 rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium"
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
