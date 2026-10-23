import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordDoctorVisitApi } from '../services/api';
import { Stethoscope, X, Loader2, Pill, FileText, CheckCircle2 } from 'lucide-react';
import type { Patient } from '../types';

interface RecordVisitModalProps {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordVisitModal: React.FC<RecordVisitModalProps> = ({ patient, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [medication, setMedication] = useState('');
  const [error, setError] = useState<string | null>(null);

  const visitMutation = useMutation({
    mutationFn: async () => {
      if (!treatmentNotes.trim()) {
        throw new Error('Treatment notes are required to complete doctor visit');
      }
      return recordDoctorVisitApi(patient._id, {
        treatmentNotes: treatmentNotes.trim(),
        medication: medication.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientDetail', patient._id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to record doctor visit');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  Record Doctor Visit
                </h3>
                <span className="text-xs font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                  Bed {patient.bedNumber ?? '—'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {patient.name} · {patient.age}y · {patient.gender}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Treatment Notes (Required) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Clinical Treatment Notes * (Required)</span>
            </label>
            <textarea
              required
              rows={4}
              id="treatment-notes-input"
              value={treatmentNotes}
              onChange={(e) => {
                setTreatmentNotes(e.target.value);
                setError(null);
              }}
              placeholder="e.g., Lungs clear on auscultation, fever subsided, patient hydrated and alert. Continue current supportive therapy."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Medication (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-indigo-600" />
              <span>Prescribed Medication (Optional)</span>
            </label>
            <input
              type="text"
              id="medication-input"
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              placeholder="e.g., Paracetamol 500mg TDS, Azithromycin 500mg OD"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Specify dosages and schedule. Leave blank if no change in medication.
            </p>
          </div>

          {/* Note on workflow */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Rounds Compliance:</span> Recording this visit completes today's doctor round for Bed {patient.bedNumber}.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="submit-doctor-visit-btn"
            disabled={visitMutation.isPending || !treatmentNotes.trim()}
            onClick={() => visitMutation.mutate()}
            className="flex-[2] py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {visitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Visit...</span>
              </>
            ) : (
              <>
                <Stethoscope className="w-4 h-4" />
                <span>Complete Doctor Visit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
