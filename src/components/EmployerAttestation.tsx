import React, { useState } from 'react';

export interface EmployerAttestationRecord {
  companyName: string;
  supervisorName: string;
  supervisorEmail: string;
  supervisorPhone: string;
  startDate: string;
  endDate: string;
  attestationText: string;
  status: 'pending' | 'verified' | 'flagged' | 'audited';
}

interface EmployerAttestationProps {
  attestations: EmployerAttestationRecord[];
  onAddAttestation: (attestation: EmployerAttestationRecord) => void;
}

const EmployerAttestation: React.FC<EmployerAttestationProps> = ({ attestations, onAddAttestation }) => {
  const [companyName, setCompanyName] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [supervisorPhone, setSupervisorPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attestationText, setAttestationText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !supervisorName || !supervisorEmail || !attestationText) {
      setError("Company name, supervisor name, supervisor email, and attestation text are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const newAttestation: EmployerAttestationRecord = {
      companyName,
      supervisorName,
      supervisorEmail,
      supervisorPhone,
      startDate,
      endDate,
      attestationText,
      status: 'pending',
    };
    // Simulate API call to Aetherdesk verification
    setTimeout(() => {
      onAddAttestation(newAttestation);
      setSubmitting(false);
      setCompanyName('');
      setSupervisorName('');
      setSupervisorEmail('');
      setSupervisorPhone('');
      setStartDate('');
      setEndDate('');
      setAttestationText('');
    }, 1000);
  };

  const inputClass = "bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full";

  return (
    <div className="p-4 border border-[#222222] rounded-xl bg-[#111111] space-y-3">
      <h3 className="text-xs font-bold text-white flex items-center gap-2">
        Employer-of-Record Attestation
      </h3>
      <p className="text-xs text-slate-400">
        Provide a previous employer to verify your work history. Aetherdesk will contact them to confirm.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Supervisor Name"
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Supervisor Email"
            value={supervisorEmail}
            onChange={(e) => setSupervisorEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="tel"
            placeholder="Supervisor Phone (optional)"
            value={supervisorPhone}
            onChange={(e) => setSupervisorPhone(e.target.value)}
            className={inputClass}
          />
          <input
            type="month"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
          <input
            type="month"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <textarea
          placeholder="Attestation: I confirm I worked at this company from [start] to [end] and my title was..."
          value={attestationText}
          onChange={(e) => setAttestationText(e.target.value)}
          className={`${inputClass} min-h-[60px] resize-y`}
        />
        {error && <div className="text-red-500 text-xs">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer w-full"
        >
          {submitting ? "Submitting..." : "Submit Attestation"}
        </button>
      </form>

      {attestations.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Submitted Attestations</h4>
          {attestations.map((att, index) => (
            <div key={index} className="p-2 bg-[#1A1A1A] rounded-md text-xs flex justify-between items-center">
              <div>
                <span className="font-semibold text-white">{att.companyName}</span>
                <span className="text-slate-500 ml-2">({att.startDate} - {att.endDate || 'Present'})</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                att.status === 'verified' ? 'bg-emerald-900/50 text-emerald-400' :
                att.status === 'flagged' ? 'bg-red-900/50 text-red-400' :
                att.status === 'audited' ? 'bg-purple-900/50 text-purple-400' :
                'bg-yellow-900/50 text-yellow-400'
              }`}>
                {att.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployerAttestation;
