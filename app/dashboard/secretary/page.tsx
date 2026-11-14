'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import {
  Printer, UserPlus, FileText, LogOut, Sparkles, Users,
  Search, Trash2, Building2, CheckCircle2, Clock, ShieldAlert, Scale
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

const CERTIFICATE_OPTIONS = [
  { label: 'Barangay Clearance', defaultFee: '50', requiresClearBlotter: true },
  { label: 'Certificate of Indigency', defaultFee: '0', requiresClearBlotter: false },
  { label: 'Certificate of Residency', defaultFee: '50', requiresClearBlotter: false },
  { label: 'Certificate of Good Moral Character', defaultFee: '50', requiresClearBlotter: true },
  { label: 'Barangay Business Clearance', defaultFee: '200', requiresClearBlotter: true },
  { label: 'First-Time Jobseeker Certification (RA 11261)', defaultFee: '0', requiresClearBlotter: true },
  { label: 'Certificate of Solo Parent', defaultFee: '0', requiresClearBlotter: false },
  { label: 'Certificate of File Action (CFA)', defaultFee: '100', requiresClearBlotter: false },
  { label: 'Certificate of No Blotter / No Derogatory Record', defaultFee: '50', requiresClearBlotter: true },
];

export default function SecretaryDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'census' | 'certificates' | 'blotter' | 'directory'>('census');
  const [residents, setResidents] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [blotters, setBlotters] = useState<any[]>([]);
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

  // AI Certificate Helper State
  const [aiQuery, setAiQuery] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Blotter & Dispute Form State
  const [complainantName, setComplainantName] = useState('');
  const [respondentId, setRespondentId] = useState('');
  const [respondentExternal, setRespondentExternal] = useState('');
  const [incidentType, setIncidentType] = useState('Physical Injury / Altercation');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [narrative, setNarrative] = useState('');
  const [draftingBlotter, setDraftingBlotter] = useState(false);

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

    const { data: blotterData } = await supabase
      .from('blotters')
      .select('*, residents(first_name, last_name, households(purok))')
      .order('created_at', { ascending: false });

    if (resData) setResidents(resData);
    if (certData) setCertificates(certData);
    if (blotterData) setBlotters(blotterData);
  };

  // Helper: Check if a resident has an active/pending blotter case
  const getActiveBlottersForResident = (resId: string) => {
    if (!resId) return [];
    return blotters.filter(
      (b) => b.respondent_resident_id === resId && (b.status === 'Pending' || b.status === 'Mediation')
    );
  };

  const activeBlottersForSelected = getActiveBlottersForResident(selectedResident);
  const selectedCertConfig = CERTIFICATE_OPTIONS.find((c) => c.label === certType);
  const isBlockedByBlotter =
    activeBlottersForSelected.length > 0 && Boolean(selectedCertConfig?.requiresClearBlotter);

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
      ? `Selected Resident: ${residentObj.first_name} ${residentObj.last_name}, Occupation: ${residentObj.occupation || 'N/A'}, Senior: ${residentObj.is_senior}, PWD: ${residentObj.is_pwd}, 4Ps: ${residentObj.is_4ps}`
      : 'No specific resident selected yet.';

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `As a Philippine Barangay Secretary Assistant, recommend the exact certificate type from our list (Barangay Clearance, Certificate of Indigency, Certificate of Residency, Certificate of Good Moral Character, Barangay Business Clearance, First-Time Jobseeker Certification (RA 11261), Certificate of Solo Parent, Certificate of File Action (CFA), Certificate of No Blotter / No Derogatory Record), legal fee exemption if applicable, and formal purpose phrasing. Context: ${residentContext}. Request: ${aiQuery}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiSuggestion(`AI Error: ${data.error || 'Failed to get recommendation.'}`);
        return;
      }
      setAiSuggestion(data.reply || 'No recommendation returned.');
    } catch {
      setAiSuggestion('Error connecting to AI assistant.');
    } finally {
      setAiLoading(false);
    }
  };

  // AI Formal Blotter Narrative Formatter
  const handleDraftBlotterNarrative = async () => {
    if (!narrative.trim()) {
      alert('Please enter rough notes in the Incident Narrative box first so AI can format it.');
      return;
    }
    setDraftingBlotter(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Rewrite the following rough incident notes into a formal, objective Philippine Katarungang Pambarangay blotter log entry in third-person legal tone:\n\n${narrative}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(`AI Error: ${data.error || 'Failed to format blotter narrative.'}`);
        return;
      }
      if (data.reply) {
        setNarrative(data.reply);
      } else {
        alert('AI returned an empty response. Please try again.');
      }
    } catch {
      alert('AI narrative drafter unavailable right now.');
    } finally {
      setDraftingBlotter(false);
    }
  };

  const handleAddBlotter = async (e: React.FormEvent) => {
    e.preventDefault();
    const respondentObj = residents.find((r) => r.id === respondentId);
    const resolvedRespondentName = respondentObj
      ? `${respondentObj.first_name} ${respondentObj.last_name}`
      : respondentExternal.trim() || 'Unknown Respondent';

    const { error } = await supabase.from('blotters').insert({
      blotter_number: `BLT-${Date.now().toString().slice(-6)}`,
      complainant_name: complainantName,
      respondent_resident_id: respondentId || null,
      respondent_name: resolvedRespondentName,
      incident_type: incidentType,
      incident_date: incidentDate,
      incident_location: incidentLocation,
      narrative,
      status: 'Pending',
    });

    if (error) {
      alert(`Error saving blotter: ${error.message}`);
      return;
    }

    setComplainantName('');
    setRespondentId('');
    setRespondentExternal('');
    setIncidentDate('');
    setIncidentLocation('');
    setNarrative('');
    fetchData();
    alert('Blotter case recorded! Certificate clearances for the respondent are now automatically flagged.');
  };

  const handleUpdateBlotterStatus = async (id: string, newStatus: string) => {
    await supabase.from('blotters').update({ status: newStatus }).eq('id', id);
    fetchData();
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
    if (isBlockedByBlotter) {
      alert(
        'ISSUANCE BLOCKED: This resident has an active/unresolved Barangay Blotter case. Settle or dismiss the blotter case first before issuing clearances.'
      );
      return;
    }

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
          <p>
            This is to certify that <strong>{fullName}</strong>, of legal age, Filipino, and a bona fide resident of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong, is a qualified First-Time
            Jobseeker pursuant to <strong>Republic Act No. 11261</strong> (First Time Jobseekers Assistance Act) and is
            hereby exempted from paying barangay fees and charges.
          </p>
        );
      case 'Certificate of Good Moral Character':
        return (
          <p>
            This is to certify that <strong>{fullName}</strong>, of legal age, Filipino, and a resident of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong, is known to be of good
            moral character, law-abiding, and a respected member of the community.
          </p>
        );
      case 'Barangay Business Clearance':
        return (
          <p>
            This is to certify that <strong>{fullName}</strong>, operating within <strong>{residentPurok}</strong>,
            Barangay Enrique JC Montilla, City of Tacurong, is hereby granted clearance to operate a lawful business
            establishment subject to existing barangay ordinances and national laws.
          </p>
        );
      case 'Certificate of Solo Parent':
        return (
          <p>
            This is to certify that <strong>{fullName}</strong>, of legal age, Filipino, and a bona fide resident of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong, is personally known to be
            a Solo Parent solely raising and supporting their dependent child/children.
          </p>
        );
      case 'Certificate of File Action (CFA)':
        return (
          <p>
            This is to certify that the complaint filed by <strong>{fullName}</strong> of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong, underwent mediation and
            conciliation proceedings before the Lupong Tagapamayapa, and no settlement was reached; hence, the
            corresponding complaint may now be filed in court/proper government office.
          </p>
        );
      case 'Certificate of No Blotter / No Derogatory Record':
        return (
          <p>
            This is to certify that based on the official Barangay Blotter and Katarungang Pambarangay records,{' '}
            <strong>{fullName}</strong>, a bona fide resident of <strong>{residentPurok}</strong>, Barangay Enrique JC
            Montilla, City of Tacurong, has <strong>NO PENDING CASE OR DEROGATORY RECORD</strong> on file as of this date.
          </p>
        );
      default:
        return (
          <p>
            This is to certify that <strong>{fullName}</strong>, of legal age, Filipino, is a bona fide resident of{' '}
            <strong>{residentPurok}</strong>, Barangay Enrique JC Montilla, City of Tacurong.
          </p>
        );
    }
  };

  const filteredResidents = residents.filter((r) => {
    const matchesSearch = `${r.first_name} ${r.middle_name || ''} ${r.last_name} ${r.occupation || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesPurok = purokFilter === 'All' || r.households?.purok === purokFilter;
    return matchesSearch && matchesPurok;
  });

  if (printData) {
    const verifyUrl = `${originUrl}/verify/${printData.control_number}`;
    return (
      <div className="min-h-screen bg-slate-100 p-8 print:bg-white print:p-0">
        <div className="max-w-3xl mx-auto mb-6 flex justify-between print:hidden">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" /> Print Official Copy
          </button>
          <button
            onClick={() => setPrintData(null)}
            className="bg-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-300"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="max-w-3xl mx-auto bg-white p-12 border border-slate-300 shadow-lg print:shadow-none print:border-none">
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-8">
            <p className="text-sm uppercase tracking-widest">Republic of the Philippines</p>
            <p className="text-sm">Province of Sultan Kudarat • City of Tacurong</p>
            <p className="text-sm font-semibold">Office of the Punong Barangay</p>
            <h1 className="text-2xl font-bold uppercase mt-1">Barangay Enrique JC Montilla</h1>
          </div>

          <h2 className="text-xl font-bold text-center uppercase tracking-wider underline mb-8">
            {printData.certificate_type}
          </h2>

          <div className="flex justify-between items-start gap-6 mb-6">
            <div className="space-y-4 text-justify leading-relaxed text-base flex-1">
              <p className="font-semibold">TO WHOM IT MAY CONCERN:</p>
              {renderCertificateBody(printData)}
              <p>
                This certification is issued upon the request of the interested party for{' '}
                <strong>{printData.purpose.toUpperCase()}</strong>.
              </p>
            </div>

            {printData.residents?.photo_url && (
              <div className="w-28 h-28 border border-slate-400 shrink-0 overflow-hidden">
                <img
                  src={printData.residents.photo_url}
                  alt="Applicant Photo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="mt-12 flex justify-between items-end">
            <div className="flex items-center gap-3">
              <QRCodeSVG value={verifyUrl} size={76} />
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Scan to Verify Authenticity</p>
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
              <p className="font-bold uppercase underline">Hon. Juan Dela Cruz</p>
              <p className="text-sm">Punong Barangay</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Barangay Secretary Portal</h1>
            <p className="text-xs text-slate-500">Barangay Enrique JC Montilla • Census, Blotter & Issuance Desk</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="text-red-600 flex items-center gap-1 text-sm font-medium hover:underline"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white p-2 rounded-xl border shadow-sm flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('census')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'census' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Resident & Household Census
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'certificates' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" /> Certificates & AI Helper ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab('blotter')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'blotter' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-4 h-4" /> Blotter & Disputes (
            {blotters.filter((b) => b.status === 'Pending' || b.status === 'Mediation').length} Active)
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'directory' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> Residents Directory ({residents.length})
          </button>
        </div>

        {/* TAB 1: FULL CENSUS ENCODING */}
        {activeTab === 'census' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="font-bold text-lg text-slate-900">Encode Complete Resident & Household Profile</h2>
            <p className="text-xs text-slate-500 mb-6">
              All demographic attributes feed directly into the Admin AI Census Analyst.
            </p>

            <form onSubmit={handleAddResident} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    placeholder="Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Middle Name</label>
                  <input
                    placeholder="Reyes"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name *</label>
                  <input
                    placeholder="Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Suffix</label>
                  <input
                    placeholder="Jr., Sr., III"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Birthdate *</label>
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Civil Status *</label>
                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact Number</label>
                  <input
                    placeholder="09XX-XXX-XXXX"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> Household & Socio-Economic Data
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Purok / Zone *</label>
                    <select
                      value={purok}
                      onChange={(e) => setPurok(e.target.value)}
                      className="w-full bg-white border p-2 rounded text-sm"
                    >
                      <option value="Purok 1">Purok 1</option>
                      <option value="Purok 2">Purok 2</option>
                      <option value="Purok 3">Purok 3</option>
                      <option value="Purok 4">Purok 4</option>
                      <option value="Purok 5">Purok 5</option>
                      <option value="Purok 6">Purok 6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">House / Street Address</label>
                    <input
                      placeholder="Lot 4, Blk 2, Main St."
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      className="w-full bg-white border p-2 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Occupation</label>
                    <input
                      placeholder="Farmer, Teacher, Student..."
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="w-full bg-white border p-2 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Monthly Household Income (₱)
                    </label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVoter}
                      onChange={(e) => setIsVoter(e.target.checked)}
                      className="rounded"
                    />
                    Registered Voter
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSenior}
                      onChange={(e) => setIsSenior(e.target.checked)}
                      className="rounded"
                    />
                    Senior Citizen
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPwd}
                      onChange={(e) => setIsPwd(e.target.checked)}
                      className="rounded"
                    />
                    PWD
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={is4ps}
                      onChange={(e) => setIs4ps(e.target.checked)}
                      className="rounded"
                    />
                    4Ps Beneficiary
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Resident ID Photo (Optional)</label>
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
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                Save Complete Resident & Household Record
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: CERTIFICATES & AI HELPER WITH BLOTTER AUTO-BLOCKING */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            {/* AI Helper Card */}
            <div className="bg-indigo-50/70 border border-indigo-200 p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" /> AI Certificate Eligibility & Purpose Helper
              </div>
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
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {aiLoading ? 'Checking...' : 'Check Eligibility'}
                </button>
              </form>
              {aiSuggestion && (
                <div className="bg-white p-4 rounded-lg border border-indigo-100 text-sm text-slate-700 whitespace-pre-wrap">
                  {aiSuggestion}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Encode Certificate Form */}
              <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
                <h2 className="font-bold text-base text-slate-900 mb-4">Encode Certificate Request</h2>

                {isBlockedByBlotter && (
                  <div className="mb-4 p-3.5 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-red-900">
                      <ShieldAlert className="w-4 h-4 shrink-0" /> Issuance Blocked: Active Blotter Record Found
                    </div>
                    <p>
                      This resident is listed as a respondent in {activeBlottersForSelected.length} unresolved blotter
                      case(s) ({activeBlottersForSelected.map((b) => b.blotter_number).join(', ')}). Clear or settle the
                      case in the Blotter tab before issuing clearances.
                    </p>
                  </div>
                )}

                <form onSubmit={handleRequestCertificate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Select Resident *</label>
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
                    <label className="block text-xs font-medium text-slate-700 mb-1">Certificate Type *</label>
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

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Purpose *</label>
                    <input
                      placeholder="e.g., Local Employment, DSWD Medical Assistance, Business Permit"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full border p-2.5 rounded text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
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

                  <button
                    type="submit"
                    disabled={isBlockedByBlotter}
                    className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                  >
                    {isBlockedByBlotter ? 'Blocked by Active Blotter Case' : 'Queue Certificate for Issuance'}
                  </button>
                </form>
              </div>

              {/* Certificate Queue Table */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm overflow-x-auto">
                <h2 className="font-bold text-base text-slate-900 mb-4">Certificate Issuance Queue</h2>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                      <th className="p-3">Control No</th>
                      <th className="p-3">Resident</th>
                      <th className="p-3">Document Type</th>
                      <th className="p-3">Fee</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-semibold text-xs">{cert.control_number}</td>
                        <td className="p-3">
                          {cert.residents?.first_name} {cert.residents?.last_name}
                        </td>
                        <td className="p-3">{cert.certificate_type}</td>
                        <td className="p-3">₱{cert.fee}</td>
                        <td className="p-3">
                          {cert.status === 'pending_payment' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> Awaiting OR
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Ready ({cert.payments?.or_number || 'Waived'})
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {cert.status !== 'pending_payment' ? (
                            <button
                              onClick={() => setPrintData(cert)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1 hover:bg-blue-700"
                            >
                              <Printer className="w-3.5 h-3.5" /> Print
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Pay at Treasurer</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {certificates.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          No certificates queued yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BLOTTER & DISPUTES */}
        {activeTab === 'blotter' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
              <h2 className="font-bold text-base text-slate-900">Record Katarungang Pambarangay Blotter Case</h2>
              <p className="text-xs text-slate-500 mb-4">
                Linking a registered resident as respondent automatically blocks their clearance issuance until settled.
              </p>

              <form onSubmit={handleAddBlotter} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Complainant Name *</label>
                  <input
                    placeholder="Full name of complainant"
                    value={complainantName}
                    onChange={(e) => setComplainantName(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Registered Respondent (Optional)
                  </label>
                  <select
                    value={respondentId}
                    onChange={(e) => setRespondentId(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="">-- Non-Resident / Unlisted --</option>
                    {residents.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.last_name}, {r.first_name} ({r.households?.purok || 'No Purok'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {respondentId ? 'Respondent Override (Optional)' : 'External Respondent Name *'}
                  </label>
                  <input
                    placeholder="Enter name if not in dropdown"
                    value={respondentExternal}
                    onChange={(e) => setRespondentExternal(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                    required={!respondentId}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Incident Type *</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="Physical Injury / Altercation">Physical Injury / Altercation</option>
                    <option value="Land / Boundary Dispute">Land / Boundary Dispute</option>
                    <option value="Unpaid Debt / Estafa">Unpaid Debt / Estafa</option>
                    <option value="Noise / Public Disturbance">Noise / Public Disturbance</option>
                    <option value="Theft / Property Damage">Theft / Property Damage</option>
                    <option value="Oral Defamation / Harassment">Oral Defamation / Harassment</option>
                    <option value="Other Barangay Dispute">Other Barangay Dispute</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Incident Date *</label>
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full border p-2 rounded text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Incident Location *</label>
                    <input
                      placeholder="e.g., Purok 2 Basketball Court"
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      className="w-full border p-2 rounded text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-700">Incident Narrative *</label>
                    <button
                      type="button"
                      onClick={handleDraftBlotterNarrative}
                      disabled={draftingBlotter}
                      className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      {draftingBlotter ? 'Formatting...' : 'Format Formal Narrative with AI'}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Enter rough details of what happened, then click 'Format Formal Narrative with AI'..."
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="w-full border p-2.5 rounded text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-rose-700"
                >
                  Log Blotter Case
                </button>
              </form>
            </div>

            {/* Blotter Cases Table */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm overflow-x-auto">
              <h2 className="font-bold text-base text-slate-900 mb-4">Barangay Blotter Logbook</h2>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                    <th className="p-3">Blotter No</th>
                    <th className="p-3">Complainant</th>
                    <th className="p-3">Respondent</th>
                    <th className="p-3">Incident</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {blotters.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-semibold text-xs">{b.blotter_number}</td>
                      <td className="p-3">{b.complainant_name}</td>
                      <td className="p-3">
                        <div className="font-medium">{b.respondent_name}</div>
                        {b.respondent_resident_id && (
                          <span className="text-[11px] text-rose-600 font-medium">Registered Resident</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-xs">{b.incident_type}</div>
                        <div className="text-xs text-slate-500">
                          {b.incident_date} • {b.incident_location}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            b.status === 'Settled' || b.status === 'Dismissed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={b.status}
                          onChange={(e) => handleUpdateBlotterStatus(b.id, e.target.value)}
                          className="border rounded px-2 py-1 text-xs bg-white"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Mediation">Mediation</option>
                          <option value="Settled">Settled</option>
                          <option value="Dismissed">Dismissed</option>
                          <option value="Escalated to CFA">Escalated to CFA</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {blotters.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No blotter cases recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RESIDENTS DIRECTORY WITH LIVE SEARCH & FILTER */}
        {activeTab === 'directory' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="font-bold text-base text-slate-900">Barangay Residents Census Directory</h2>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
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
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                    <th className="p-3">Photo</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Civil Status / Gender</th>
                    <th className="p-3">Purok & Income</th>
                    <th className="p-3">Sector Tags</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredResidents.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50">
                      <td className="p-3">
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
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">
                          {res.last_name}, {res.first_name} {res.middle_name || ''} {res.suffix || ''}
                        </div>
                        <div className="text-xs text-slate-500">{res.occupation || 'No occupation listed'}</div>
                      </td>
                      <td className="p-3">
                        {res.civil_status} • {res.gender}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{res.households?.purok || 'Unassigned'}</div>
                        <div className="text-xs text-slate-500">
                          ₱{Number(res.households?.monthly_income || 0).toLocaleString()}/mo
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {res.is_voter && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px] font-medium">
                              Voter
                            </span>
                          )}
                          {res.is_senior && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[11px] font-medium">
                              Senior
                            </span>
                          )}
                          {res.is_pwd && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[11px] font-medium">
                              PWD
                            </span>
                          )}
                          {res.is_4ps && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-medium">
                              4Ps
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteResident(res.id, `${res.first_name} ${res.last_name}`)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                          title="Delete Resident"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredResidents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
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