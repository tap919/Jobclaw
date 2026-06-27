import React, { useState } from 'react';

interface TruthfulnessAttestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jobTitle: string;
  companyName: string;
}

const TruthfulnessAttestationModal: React.FC<TruthfulnessAttestationModalProps> = ({ isOpen, onClose, onConfirm, jobTitle, companyName }) => {
  const [attestationChecked, setAttestationChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-[#333333] rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-2">Verified Application Attestation</h2>
        <p className="text-sm text-slate-300 mb-4">
          You are about to apply for <span className="font-semibold text-white">{jobTitle}</span> at <span className="font-semibold text-white">{companyName}</span>.
        </p>
        <div className="space-y-3 text-xs text-slate-300 mb-6 bg-[#1A1A1A] p-3 rounded-md border border-[#222222]">
          <p>By proceeding, you attest that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>All information in your resume and profile is true and accurate.</li>
            <li>You have not used AI or automated tools to fabricate experience, skills, or credentials.</li>
            <li>You have the legal right to work in the role and location specified.</li>
            <li>You understand that false attestations may result in permanent removal from Overlay365 and potential legal action.</li>
          </ul>
        </div>
        <label className="flex items-start gap-2 cursor-pointer mb-6 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={attestationChecked}
            onChange={(e) => setAttestationChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-[#1A1A1A]"
          />
          <span>I have read and agree to the truthfulness attestation above.</span>
        </label>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent border border-[#333333] text-slate-300 hover:bg-[#222222] rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!attestationChecked}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Submit Verified Application
          </button>
        </div>
      </div>
    </div>
  );
};

export default TruthfulnessAttestationModal;
