import React, { useState } from "react";
import { Profile } from "../types";
import { Save, X, Plus, User, AtSign, Phone, MapPin, Globe, Github, Linkedin, Award, BookOpen, Target, DollarSign, ShieldCheck } from "lucide-react";
import VideoVerification from "./VideoVerification";
import EmployerAttestation, { EmployerAttestationRecord } from "./EmployerAttestation";

interface CareerVaultProps {
  profile: Profile;
  onUpdateProfile: (updated: Profile) => void;
  geminiConnected: boolean | null;
}

export default function CareerVaultView({ profile, onUpdateProfile, geminiConnected }: CareerVaultProps) {
  const [form, setForm] = useState<Profile>({ ...profile });
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newSector, setNewSector] = useState("");
  const [attestations, setAttestations] = useState<EmployerAttestationRecord[]>([]);

  const handleVerificationComplete = (videoUrl: string, idPhotoUrl: string) => {
    const updatedProfile: Profile = {
      ...form,
      verificationVideoUrl: videoUrl,
      verificationIdPhotoUrl: idPhotoUrl,
      workerVerificationStatus: 'pending', // Submit pending review
    };
    setForm(updatedProfile);
    onUpdateProfile(updatedProfile);
  };

  const handleAddAttestation = (attestation: EmployerAttestationRecord) => {
    setAttestations(prev => [...prev, attestation]);
  };

  const updateField = (section: string, field: string, value: string | string[]) => {
    setForm(prev => {
      const next = { ...prev };
      if (section === "contact") {
        next.contactInfo = { ...next.contactInfo, [field]: value };
      } else {
        (next as Record<string, unknown>)[field] = value;
      }
      return next;
    });
  };

  const addTag = (field: "skills" | "targetRoles" | "targetSectors", value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (form[field].includes(trimmed)) return;
    setForm(prev => ({ ...prev, [field]: [...prev[field], trimmed] }));
    setInput("");
  };

  const removeTag = (field: "skills" | "targetRoles" | "targetSectors", value: string) => {
    setForm(prev => ({ ...prev, [field]: prev[field].filter(v => v !== value) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateProfile(form);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full";
  const labelClass = "text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400";
  const sectionClass = "bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-3";

  return (
    <div id="career-vault-view" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-400" />
          <span>Career Vault — Profile Editor</span>
        </h2>
        {geminiConnected && (
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            Gemini Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Left column */}
        <div className="space-y-6">

          {/* Contact Info */}
          <div className={sectionClass}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              Contact Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Full Name</label>
                <input className={inputClass} value={form.contactInfo.fullName}
                  onChange={e => updateField("contact", "fullName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={`${labelClass} flex items-center gap-1`}><AtSign className="h-3.5 w-3.5 text-slate-500" />Email</label>
                <input className={inputClass} value={form.contactInfo.email}
                  onChange={e => updateField("contact", "email", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={`${labelClass} flex items-center gap-1`}><Phone className="h-3.5 w-3.5 text-slate-500" />Phone</label>
                <input className={inputClass} value={form.contactInfo.phone}
                  onChange={e => updateField("contact", "phone", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={`${labelClass} flex items-center gap-1`}><MapPin className="h-3.5 w-3.5 text-slate-500" />Location</label>
                <input className={inputClass} value={form.contactInfo.location}
                  onChange={e => updateField("contact", "location", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className={sectionClass}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              Social Links
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={`${labelClass} flex items-center gap-1`}><Linkedin className="h-3.5 w-3.5 text-slate-500" />LinkedIn</label>
                <input className={inputClass} value={form.contactInfo.linkedin}
                  onChange={e => updateField("contact", "linkedin", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={`${labelClass} flex items-center gap-1`}><Github className="h-3.5 w-3.5 text-slate-500" />GitHub</label>
                <input className={inputClass} value={form.contactInfo.github}
                  onChange={e => updateField("contact", "github", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Website</label>
                <input className={inputClass} value={form.contactInfo.website}
                  onChange={e => updateField("contact", "website", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Headline & Summary */}
          <div className={sectionClass}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-400" />
              Headline & Summary
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={labelClass}>Professional Headline</label>
                <input className={inputClass} value={form.headline}
                  onChange={e => updateField("", "headline", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Professional Summary</label>
                <textarea className={`${inputClass} min-h-[100px] resize-y`} value={form.professionalSummary}
                  onChange={e => updateField("", "professionalSummary", e.target.value)} />
              </div>
            </div>
          </div>

        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Skills */}
          <div className={sectionClass}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-400" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {form.skills.map(skill => (
                <span key={skill} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-950/40 border border-blue-500/30 rounded text-[10px] text-blue-300 font-mono">
                  {skill}
                  <button onClick={() => removeTag("skills", skill)} className="hover:text-red-400 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputClass} placeholder="Add skill..."
                value={newSkill} onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag("skills", newSkill, setNewSkill)} />
              <button onClick={() => addTag("skills", newSkill, setNewSkill)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white cursor-pointer shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Target Roles */}
          <div className={sectionClass}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Target Roles
            </h3>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {form.targetRoles.map(role => (
                <span key={role} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded text-[10px] text-emerald-300 font-mono">
                  {role}
                  <button onClick={() => removeTag("targetRoles", role)} className="hover:text-red-400 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputClass} placeholder="Add target role..."
                value={newRole} onChange={e => setNewRole(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag("targetRoles", newRole, setNewRole)} />
              <button onClick={() => addTag("targetRoles", newRole, setNewRole)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white cursor-pointer shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Target Sectors */}
          <div className={sectionClass}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              Target Sectors
            </h3>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {form.targetSectors.map(sector => (
                <span key={sector} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-950/40 border border-purple-500/30 rounded text-[10px] text-purple-300 font-mono">
                  {sector}
                  <button onClick={() => removeTag("targetSectors", sector)} className="hover:text-red-400 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputClass} placeholder="Add target sector..."
                value={newSector} onChange={e => setNewSector(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag("targetSectors", newSector, setNewSector)} />
              <button onClick={() => addTag("targetSectors", newSector, setNewSector)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white cursor-pointer shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Compensation & Work Auth */}
          <div className={sectionClass}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-400" />
              Compensation & Authorization
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Salary Target</label>
                <input className={inputClass} value={form.salaryTarget}
                  onChange={e => updateField("", "salaryTarget", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={`${labelClass} flex items-center gap-1`}><ShieldCheck className="h-3.5 w-3.5 text-slate-500" />Work Authorization</label>
                <input className={inputClass} value={form.workAuthorization}
                  onChange={e => updateField("", "workAuthorization", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Video Verification */}
          <VideoVerification
            currentVerificationStatus={form.workerVerificationStatus || 'pending'}
            onVerificationComplete={handleVerificationComplete}
          />

          {/* Employer-of-Record Attestation */}
          <EmployerAttestation
            attestations={attestations}
            onAddAttestation={handleAddAttestation}
          />

        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "Saving..." : "Save Profile Changes"}</span>
        </button>
      </div>
    </div>
  );
}
