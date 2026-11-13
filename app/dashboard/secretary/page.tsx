'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Printer, UserPlus, FileText, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SecretaryDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [residents, setResidents] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [printData, setPrintData] = useState<any | null>(null);

  // Resident Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('Male');
  const [purok, setPurok] = useState('Purok 1');
  const [occupation, setOccupation] = useState('');
  const [isSenior, setIsSenior] = useState(false);
  const [isPwd, setIsPwd] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Certificate Request Form State
  const [selectedResident, setSelectedResident] = useState('');
  const [certType, setCertType] = useState('Barangay Clearance');
  const [purpose, setPurpose] = useState('');
  const [fee, setFee] = useState('50');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: resData } = await supabase.from('residents').select('*, households(purok)').order('created_at', { ascending: false });
    const { data: certData } = await supabase.from('certificates').select('*, residents(first_name, last_name, households(purok)), payments(or_number)').order('created_at', { ascending: false });
    if (resData) setResidents(resData);
    if (certData) setCertificates(certData);
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    let photoUrl = '';

    // 1. Upload Photo to Supabase Storage
    if (photoFile) {
      const fileName = `${Date.now()}-${photoFile.name}`;
      const { data: uploadData } = await supabase.storage.from('resident-photos').upload(fileName, photoFile);
      if (uploadData) {
        const { data: publicUrl } = supabase.storage.from('resident-photos').getPublicUrl(fileName);
        photoUrl = publicUrl.publicUrl;
      }
    }

    // 2. Create Household Entry
    const { data: hhData } = await supabase
      .from('households')
      .insert({ household_number: `HH-${Date.now().toString().slice(-5)}`, purok, address_line: `${purok}, Barangay Proper` })
      .select()
      .single();

    // 3. Insert Resident
    await supabase.from('residents').insert({
      household_id: hhData?.id,
      first_name: firstName,
      last_name: lastName,
      birthdate,
      gender,
      civil_status: 'Single',
      occupation,
      is_senior: isSenior,
      is_pwd: isPwd,
      photo_url: photoUrl,
    });

    setFirstName(''); setLastName(''); setOccupation(''); setPhotoFile(null);
    fetchData();
    alert('Resident registered successfully!');
  };

  const handleRequestCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericFee = parseFloat(fee);
    await supabase.from('certificates').insert({
      control_number: `BRGY-${Date.now().toString().slice(-6)}`,
      resident_id: selectedResident,
      certificate_type: certType,
      purpose,
      fee: numericFee,
      status: numericFee === 0 ? 'waived' : 'pending_payment',
    });
    setPurpose('');
    fetchData();
    alert('Certificate queued!');
  };

  // Printable Certificate View
  if (printData) {
    return (
      <div className="p-8 bg-white min-h-screen">
        <div className="mb-6 flex gap-4 print:hidden">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Printer size={18} /> Print Now
          </button>
          <button onClick={() => setPrintData(null)} className="bg-slate-200 px-4 py-2 rounded-lg">
            Back to Dashboard
          </button>
        </div>

        <div className="w-[210mm] mx-auto border-2 border-black p-12 font-serif">
          <div className="text-center border-b-2 border-black pb-4 mb-8">
            <p className="text-sm">Republic of the Philippines</p>
            <p className="text-sm">Province of Sultan Kudarat • City of Tacurong</p>
            <h2 className="text-xl font-bold uppercase mt-1">Office of the Punong Barangay</h2>
          </div>
          <h1 className="text-2xl font-bold text-center underline uppercase my-8">{printData.certificate_type}</h1>
          <p className="mb-6 leading-relaxed indent-8 text-justify">
            This is to certify that <strong>{printData.residents?.first_name} {printData.residents?.last_name}</strong>, 
            of legal age, Filipino, is a bona fide resident of <strong>{printData.residents?.households?.purok}</strong>, 
            Barangay Enrique JC Montilla, City of Tacurong.
          </p>
          <p className="mb-12 leading-relaxed indent-8 text-justify">
            This certification is issued upon the request of the interested party for <strong>{printData.purpose.toUpperCase()}</strong>.
          </p>
          <div className="mt-24 flex justify-between items-end">
            <div className="text-xs space-y-1">
              <p>Control No: <strong>{printData.control_number}</strong></p>
              <p>OR No: <strong>{printData.payments?.or_number || 'WAIVED / FREE'}</strong></p>
              <p>Date Issued: <strong>{new Date().toLocaleDateString()}</strong></p>
            </div>
            <div className="text-center">
              <p className="font-bold underline uppercase">Hon. Juan Dela Cruz</p>
              <p className="text-sm">Punong Barangay</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">Barangay Secretary Portal</h1>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-red-600 flex items-center gap-1 text-sm font-medium">
            <LogOut size={16} /> Logout
          </button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Resident Encoding Form */}
          <form onSubmit={handleAddResident} className="bg-white p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-blue-700"><UserPlus size={20} /> Encode Resident & Photo</h2>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="border p-2 rounded" required />
              <input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="border p-2 rounded" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className="border p-2 rounded" required />
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="border p-2 rounded">
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={purok} onChange={(e) => setPurok(e.target.value)} className="border p-2 rounded">
                <option>Purok 1</option><option>Purok 2</option><option>Purok 3</option><option>Purok 4</option>
              </select>
              <input placeholder="Occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="border p-2 rounded" />
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1"><input type="checkbox" checked={isSenior} onChange={(e) => setIsSenior(e.target.checked)} /> Senior Citizen</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={isPwd} onChange={(e) => setIsPwd(e.target.checked)} /> PWD</label>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Resident Photo</label>
              <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="text-sm" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium">Save Resident Record</button>
          </form>

          {/* Certificate Request Form */}
          <form onSubmit={handleRequestCertificate} className="bg-white p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-emerald-700"><FileText size={20} /> Encode Certificate Request</h2>
            <select value={selectedResident} onChange={(e) => setSelectedResident(e.target.value)} className="w-full border p-2 rounded" required>
              <option value="">-- Select Resident --</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>{r.last_name}, {r.first_name}</option>
              ))}
            </select>
            <select value={certType} onChange={(e) => setCertType(e.target.value)} className="w-full border p-2 rounded">
              <option>Barangay Clearance</option>
              <option>Certificate of Indigency</option>
              <option>Certificate of Residency</option>
            </select>
            <input placeholder="Purpose (e.g., Employment, Scholarship)" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full border p-2 rounded" required />
            <div>
