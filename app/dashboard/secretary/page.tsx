'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import {
  Printer, UserPlus, FileText, LogOut, Sparkles, Users,
  Search, Trash2, Building2, CheckCircle2, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

const CERTIFICATE_OPTIONS = [
  { label: 'Barangay Clearance', defaultFee: '50' },
  { label: 'Certificate of Indigency', defaultFee: '0' },
  { label: 'Certificate of Residency', defaultFee: '50' },
  { label: 'Certificate of Good Moral Character', defaultFee: '50' },
  { label: 'Barangay Business Clearance', defaultFee: '200' },
  { label: 'First-Time Jobseeker Certification (RA 11261)', defaultFee: '0' },
  { label: 'Certificate of Solo Parent', defaultFee: '0' },
  { label: 'Certificate of File Action (CFA)', defaultFee: '100' },
  { label: 'Certificate of No Blotter / No Derogatory Record', defaultFee: '50' },
];

export default function SecretaryDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'census' | 'certificates' | 'directory'>('census');
  const [residents, setResidents] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [printData, setPrintData] = useState<any | null>(null);
  const [originUrl, setOriginUrl] = useState('');

  // Directory Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [purokFilter, setPurokFilter] = useState('All');

  // Full Census Resident & Household Form State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('Male');
  const [civilStatus, setCivilStatus] = useState('Single');
  const [contactNumber, setContactNumber] = useState('');
  const [purok, setPurok] = useState('Purok 1');
  const [addressLine, setAddressLine] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [occupation, setOccupation] = useState('');
  const [isVoter, setIsVoter] = useState(false);
  const [isSenior, setIsSenior] = useState(false);
  const [isPwd, setIsPwd] = useState(false);
  const [is4ps, setIs4ps] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Certificate Request Form State
  const [selectedResident, setSelectedResident] = useState('');
  const [certType, setCertType] = useState(CERTIFICATE_OPTIONS[0].label);
  const [purpose, setPurpose] = useState('');
  const [fee, setFee] = useState(CERTIFICATE_OPTIONS[0].defaultFee);

  // AI Helper State
  const [aiQuery, setAiQuery] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setOriginUrl(window.location.origin);
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: resData } = await supabase
      .from('residents')
      .select('*, households(purok, address_line, monthly_income, household_number)')
      .order('created_at', { ascending: false });

    const { data: certData } = await supabase
      .from('certificates')
      .select('*, residents(first_name, middle_name, last_name, suffix, photo_url, households(purok)), payments(or_number)')
      .order('created_at', { ascending: false });

    if (resData) setResidents(resData);
    if (certData) setCertificates(certData);
  };

  const handleCertTypeChange = (selectedType: string) => {
    setCertType(selectedType);
    const matched = CERTIFICATE_OPTIONS.find((item) => item.label === selectedType);
    if (matched) setFee(matched.defaultFee);
  };

  const handleAiAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiSuggestion('');

    const residentObj = residents.find((r) => r.id === selectedResident);
    const residentContext = residentObj
      ? `Selected Resident: ${residentObj.first_name} ${residentObj.last_name}, Occupation: ${residentObj.occupation || 'None'}, Senior: ${residentObj.is_senior}, PWD: ${residentObj.is_pwd}, 4Ps: ${residentObj.is_4ps}, Monthly Income: ₱${residentObj.households?.monthly_income || 0}.`
      : 'No specific resident selected yet.';

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `As a Philippine Barangay Secretary Assistant, recommend the exact certificate type from our list (Barangay Clearance, Certificate of Indigency, Certificate of Residency, Certificate of Good Moral Character, Barangay Business Clearance, First-Time Jobseeker Certification (RA 11261), Certificate of Solo Parent, Certificate of File Action (CFA), Certificate of No Blotter / No Derogatory Record), state whether the fee should be waived (e.g., RA 11261, Indigency, 4Ps, Senior/PWD), and provide a 1-sentence formal purpose phrase. ${residentContext} Scenario: ${aiQuery}`,
        }),
      });
      const data = await res.json();
      setAiSuggestion(data.reply || data.error || 'Unable to generate recommendation.');
    } catch {
      setAiSuggestion('Error connecting to AI assistant.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    let photoUrl = '';

    if (photoFile) {
      const fileName = `${Date.now()}-${photoFile.name}`;
      const { data: uploadData } = await supabase.storage
        .from('resident-photos')
        .upload(fileName, photoFile);

      if (uploadData) {
        const { data: publicUrl } = supabase.storage
          .from('resident-photos')
          .getPublicUrl(fileName);
        photoUrl = publicUrl.publicUrl;
      }
    }

    const { data: hhData } = await supabase
      .from('households')
      .insert({
        household_number: `HH-${Date.now().toString().slice(-5)}`,
        purok,
        address_line: addressLine.trim() || `${purok}, Barangay Enrique JC Montilla`,
        monthly_income: parseFloat(monthlyIncome) || 0,
      })
      .select()
      .single();

    await supabase.from('residents').insert({
      household_id: hhData?.id,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      suffix: suffix || null,
      birthdate,
      gender,
      civil_status: civilStatus,
      contact_number: contactNumber || null,
      occupation: occupation || null,
      is_voter: isVoter,
      is_senior: isSenior,
      is_pwd: isPwd,
      is_4ps: is4ps,
      photo_url: photoUrl,
    });

    // Reset form
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setSuffix('');
    setBirthdate('');
    setContactNumber('');
    setAddressLine('');
    setMonthlyIncome('');
    setOccupation('');
    setIsVoter(false);
    setIsSenior(false);
    setIsPwd(false);
    setIs4ps(false);
    setPhotoFile(null);

    fetchData();
    alert('Resident and Household census record saved!');
  };

  const handleDeleteResident = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the census record for ${name}?`)) return;
    await supabase.from('residents').delete().eq('id', id);
    fetchData();
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

  const formatFullName = (res: any) => {
    if (!res) return '';
    return [res.first_name, res.middle_name, res.last_name, res.suffix]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();
  };

  const renderCertificateBody = (cert: any) => {
    const fullName = formatFullName(cert.residents);
    const residentPurok = cert.residents?.households?.purok || 'Barangay Proper';

    switch (cert.certificate_type) {
      case 'First-Time Jobseeker Certification (RA 11261)':
        return (
          <p className="mb-6 leading-relaxed indent-8 text-justify">
            This is to certify that <strong>{fullName}</strong>, of legal age, Filipino, and a bona fide resident of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong, is a qualified
            First-Time Jobseeker pursuant to <strong>Republic Act No. 11261</strong> (First Time Jobseekers
            Assistance Act) and is hereby exempted from paying barangay fees and charges.
          </p>
        );
      case 'Certificate of Good Moral Character':
        return (
          <p className="mb-6 leading-relaxed indent-8 text-justify">
            This is to certify that <strong>{fullName}</strong>, of legal age, Filipino, and a resident of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong, is known to be of
            good moral character, law-abiding, and a respected member of the community.
          </p>
        );
      case 'Barangay Business Clearance':
        return (
          <p className="mb-6 leading-relaxed indent-8 text-justify">
            This is to certify that <strong>{fullName}</strong>, operating within <strong>{residentPurok}</strong>,
            Barangay Enrique JC Montilla, City of Tacurong, is hereby granted clearance to operate a lawful business
            establishment subject to existing barangay ordinances and national laws.
          </p>
        );
      case 'Certificate of Solo Parent':
        return (
          <p className="mb-6 leading-relaxed indent-8 text-justify">
            This is to certify that <strong>{fullName}</strong>, of legal age, Filipino, and a bona fide resident of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong, is personally known
            to be a Solo Parent solely raising and supporting their dependent child/children.
          </p>
        );
      case 'Certificate of File Action (CFA)':
        return (
          <p className="mb-6 leading-relaxed indent-8 text-justify">
            This is to certify that the complaint filed by <strong>{fullName}</strong> of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong, underwent mediation
            and conciliation proceedings before the Lupong Tagapamayapa, and no settlement was reached; hence, the
            corresponding complaint may now be filed in court/proper government office.
          </p>
        );
      case 'Certificate of No Blotter / No Derogatory Record':
        return (
          <p className="mb-6 leading-relaxed indent-8 text-justify">
            This is to certify that based on the official Barangay Blotter and Katarungang Pambarangay records,{' '}
            <strong>{fullName}</strong>, a bona fide resident of <strong>{residentPurok}</strong>, Barangay Enrique
            JC Montilla, City of Tacurong, has <strong>NO PENDING CASE OR DEROGATORY RECORD</strong> on file as of
            this date.
          </p>
        );
      default:
        return (
          <p className="mb-6 leading-relaxed indent-8 text-justify">
            This is to certify that <strong>{fullName}</strong>, of legal age, Filipino, is a bona fide resident of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong.
          </p>
        );
    }
  };

  // Filtered Residents for Directory
  const filteredResidents = residents.filter((r) => {
    const matchesSearch =
      `${r.first_name} ${r.middle_name || ''} ${r.last_name} ${r.occupation || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesPurok = purokFilter === 'All' || r.households?.purok === purokFilter;
    return matchesSearch && matchesPurok;
  });

  // Printable Certificate View
  if (printData) {
    const verifyUrl = `${originUrl}/verify/${printData.control_number}`;

    return (
      <div className="p-8 bg-white min-h-screen text-black">
        <div className="mb-6 flex gap-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
          >
            <Printer size={18} /> Print Official Copy
          </button>
          <button
            onClick={() => setPrintData(null)}
            className="bg-slate-200 px-4 py-2 rounded-lg font-medium"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="w-[210mm] mx-auto border-2 border-black p-12 font-serif relative">
          <div className="text-center border-b-2 border-black pb-4 mb-8">
            <p className="text-sm">Republic of the Philippines</p>
            <p className="text-sm">Province of Sultan Kudarat • City of Tacurong</p>
            <h2 className="text-xl font-bold uppercase mt-1">Office of the Punong Barangay</h2>
            <p className="text-xs uppercase tracking-wider mt-1">Barangay Enrique JC Montilla</p>
          </div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold underline uppercase">
                {printData.certificate_type}
              </h1>
              <p className="mt-6 font-bold">TO WHOM IT MAY CONCERN:</p>
            </div>

            {printData.residents?.photo_url && (
              <div className="border border-black p-1 text-center shrink-0">
                <img
                  src={printData.residents.photo_url}
                  alt="Resident ID"
                  className="w-24 h-24 object-cover"
                />
                <p className="text-[9px] uppercase mt-1 font-sans">Applicant Photo</p>
              </div>
            )}
          </div>

          {renderCertificateBody(printData)}

          <p className="mb-12 leading-relaxed indent-8 text-justify">
            This certification is issued upon the request of the interested party for{' '}
            <strong>{printData.purpose.toUpperCase()}</strong>.
          </p>

          <div className="mt-16 flex justify-between items-end">
            <div className="flex items-center gap-4">
              <div className="border border-black p-1.5 bg-white">
                <QRCodeSVG value={verifyUrl} size={76} />
              </div>
              <div className="text-xs space-y-1 font-sans">
                <p className="font-bold uppercase text-[10px] text-slate-600">Scan to Verify Authenticity</p>
                <p>
                  Control No: <strong>{printData.control_number}</strong>
                </p>
                <p>
                  OR No: <strong>{printData.payments?.or_number || 'WAIVED / FREE'}</strong>
                </p>
                <p>
                  Date Issued: <strong>{new Date().toLocaleDateString()}</strong>
                </p>
              </div>
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Barangay Secretary Portal</h1>
            <p className="text-xs text-slate-500">Barangay Enrique JC Montilla • Census & Issuance Desk</p>
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

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('census')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'census'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserPlus size={16} /> Resident & Household Census
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'certificates'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={16} /> Certificates & AI Helper ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'directory'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={16} /> Residents Directory ({residents.length})
          </button>
        </div>

        {/* TAB 1: FULL CENSUS ENCODING */}
        {activeTab === 'census' && (
          <form onSubmit={handleAddResident} className="bg-white p-6 rounded-xl shadow-sm space-y-6">
            <div className="border-b pb-3">
              <h2 className="font-bold text-lg flex items-center gap-2 text-blue-700">
                <UserPlus size={20} /> Encode Complete Resident & Household Profile
              </h2>
              <p className="text-xs text-slate-500">All demographic attributes feed directly into the Admin AI Census Analyst.</p>
            </div>

            {/* Personal Identity */}
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">First Name *</label>
                <input
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Middle Name</label>
                <input
                  placeholder="Reyes"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Last Name *</label>
                <input
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Suffix</label>
                <input
                  placeholder="Jr., Sr., III"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
            </div>

            {/* Demographics */}
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Birthdate *</label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Civil Status *</label>
                <select
                  value={civilStatus}
                  onChange={(e) => setCivilStatus(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                >
                  <option>Single</option>
                  <option>Married</option>
                  <option>Widowed</option>
                  <option>Separated</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Contact Number</label>
                <input
                  placeholder="09XX-XXX-XXXX"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
            </div>

            {/* Household & Economic Info */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1">
                <Building2 size={14} /> Household & Socio-Economic Data
              </h3>
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Purok / Zone *</label>
                  <select
                    value={purok}
                    onChange={(e) => setPurok(e.target.value)}
                    className="w-full bg-white border p-2 rounded text-sm"
                  >
                    <option>Purok 1</option>
                    <option>Purok 2</option>
                    <option>Purok 3</option>
                    <option>Purok 4</option>
                    <option>Purok 5</option>
                    <option>Purok 6</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">House / Street Address</label>
                  <input
                    placeholder="Lot 4, Blk 2, Main St."
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    className="w-full bg-white border p-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Occupation</label>
                  <input
                    placeholder="Farmer, Teacher, Student..."
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full bg-white border p-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Monthly Household Income (₱)</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full bg-white border p-2 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Sector Classifications & Photo */}
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div className="flex flex-wrap gap-4 text-sm bg-slate-50 p-3 rounded-lg border">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVoter}
                    onChange={(e) => setIsVoter(e.target.checked)}
                  />
                  Registered Voter
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSenior}
                    onChange={(e) => setIsSenior(e.target.checked)}
                  />
                  Senior Citizen
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPwd}
                    onChange={(e) => setIsPwd(e.target.checked)}
                  />
                  PWD
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={is4ps}
                    onChange={(e) => setIs4ps(e.target.checked)}
                  />
                  4Ps Beneficiary
                </label>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Resident ID Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="text-sm w-full border p-1.5 rounded bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition"
            >
              Save Complete Resident & Household Record
            </button>
          </form>
        )}

        {/* TAB 2: CERTIFICATES & AI HELPER */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            {/* AI Eligibility & Purpose Assistant */}
            <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-indigo-900 flex items-center gap-2 text-base">
                <Sparkles size={18} className="text-indigo-600" /> AI Certificate Eligibility & Purpose Helper
              </h2>
              <form onSubmit={handleAiAssist} className="flex flex-col sm:flex-row gap-2">
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Describe request (e.g., 'Fresh graduate applying for first job' or '4Ps indigent applying for medical aid')"
                  className="flex-1 bg-white border border-indigo-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {aiLoading ? 'Checking...' : 'Check Eligibility'}
                </button>
              </form>
              {aiSuggestion && (
                <div className="bg-white p-3.5 rounded-lg border border-indigo-100 text-sm text-slate-700 whitespace-pre-wrap">
                  {aiSuggestion}
                </div>
              )}
            </div>

            {/* Request Form */}
            <form
              onSubmit={handleRequestCertificate}
              className="bg-white p-6 rounded-xl shadow-sm space-y-4"
            >
              <h2 className="font-bold text-lg flex items-center gap-2 text-emerald-700">
                <FileText size={20} /> Encode Certificate Request
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Select Resident *</label>
                  <select
                    value={selectedResident}
                    onChange={(e) => setSelectedResident(e.target.value)}
                    className="w-full border p-2.5 rounded text-sm"
                    required
                  >
                    <option value="">-- Choose Registered Resident --</option>
                    {residents.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.last_name}, {r.first_name} {r.suffix || ''} ({r.households?.purok || 'No Purok'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Certificate Type *</label>
                  <select
                    value={certType}
                    onChange={(e) => handleCertTypeChange(e.target.value)}
                    className="w-full border p-2.5 rounded text-sm"
                  >
                    {CERTIFICATE_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Purpose *</label>
                  <input
                    placeholder="e.g., Local Employment, DSWD Medical Assistance, Business Permit"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full border p-2.5 rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Fee (PHP) — 0 = Waived/Free
                  </label>
                  <input
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    className="w-full border p-2.5 rounded text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium transition"
              >
                Queue Certificate for Issuance
              </button>
            </form>

            {/* Certificate Queue Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="font-bold text-lg mb-4">Certificate Issuance Queue</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-2">Control No</th>
                      <th>Resident</th>
                      <th>Document Type</th>
                      <th>Fee</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="border-b">
                        <td className="py-3 font-mono text-xs">{cert.control_number}</td>
                        <td className="font-medium">
                          {cert.residents?.first_name} {cert.residents?.last_name}
                        </td>
                        <td>{cert.certificate_type}</td>
                        <td>₱{cert.fee}</td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              cert.status === 'pending_payment'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {cert.status === 'pending_payment' ? (
                              <Clock size={12} />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            {cert.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {cert.status !== 'pending_payment' ? (
                            <button
                              onClick={() => setPrintData(cert)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"
                            >
                              <Printer size={14} /> Print with QR
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Awaiting Treasurer</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RESIDENTS DIRECTORY WITH LIVE SEARCH & FILTER */}
        {activeTab === 'directory' && (
          <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                <Users size={20} className="text-blue-600" /> Barangay Residents Census Directory
              </h2>

              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or occupation..."
                    className="border pl-9 pr-3 py-1.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={purokFilter}
                  onChange={(e) => setPurokFilter(e.target.value)}
                  className="border px-3 py-1.5 rounded-lg text-sm"
                >
                  <option value="All">All Puroks</option>
                  <option value="Purok 1">Purok 1</option>
                  <option value="Purok 2">Purok 2</option>
                  <option value="Purok 3">Purok 3</option>
                  <option value="Purok 4">Purok 4</option>
                  <option value="Purok 5">Purok 5</option>
                  <option value="Purok 6">Purok 6</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-2">Photo</th>
                    <th>Full Name</th>
                    <th>Civil Status / Gender</th>
                    <th>Purok & Income</th>
                    <th>Sector Tags</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResidents.map((res) => (
                    <tr key={res.id} className="border-b hover:bg-slate-50">
                      <td className="py-2.5">
                        {res.photo_url ? (
                          <img
                            src={res.photo_url}
                            alt={res.first_name}
                            className="w-10 h-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                            {res.first_name?.[0]}
                            {res.last_name?.[0]}
                          </div>
                        )}
                      </td>
                      <td>
                        <p className="font-medium text-slate-800">
                          {res.last_name}, {res.first_name} {res.middle_name || ''} {res.suffix || ''}
                        </p>
                        <p className="text-xs text-slate-500">{res.occupation || 'No occupation listed'}</p>
                      </td>
                      <td className="text-xs">
                        {res.civil_status} • {res.gender}
                      </td>
                      <td className="text-xs">
                        <p className="font-medium">{res.households?.purok || 'N/A'}</p>
                        <p className="text-slate-500">₱{res.households?.monthly_income || 0}/mo</p>
                      </td>
                      <td className="space-x-1">
                        {res.is_voter && (
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded">
                            Voter
                          </span>
                        )}
                        {res.is_senior && (
                          <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded">
                            Senior
                          </span>
                        )}
                        {res.is_pwd && (
                          <span className="bg-purple-100 text-purple-800 text-[11px] px-2 py-0.5 rounded">
                            PWD
                          </span>
                        )}
                        {res.is_4ps && (
                          <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded">
                            4Ps
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            handleDeleteResident(res.id, `${res.first_name} ${res.last_name}`)
                          }
                          className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50"
                          title="Delete Resident Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredResidents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No residents match your current search or Purok filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
