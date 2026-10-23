import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markDeceasedApi } from '../services/api';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import type { Patient } from '../types';

interface MarkDeceasedModalProps {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}

export const MarkDeceasedModal: React.FC<MarkDeceasedModalProps> = ({ patient, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [cause, setCause] = useState('');
  const [error, setError] = useState<string | null>(null);

  const deceasedMutation = useMutation({
    mutationFn: async () => {
      if (!cause.trim()) {
        throw new Error('Cause of death is required to mark patient as deceased');
      }
      return markDeceasedApi(patient._id, { cause: cause.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientDetail', patient._id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to record death');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-rose-950 text-base leading-tight">
                Mark Patient Deceased
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                Bed {patient.bedNumber ?? '—'} · {patient.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-rose-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl space-y-1">
            <p className="font-bold">⚠️ Irreversible Clinical Action</p>
            <p className="text-[11px] text-rose-700">
              This will record the patient's passing in the facility audit logs, alert Administration, and automatically release <strong>Bed {patient.bedNumber}</strong>.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Cause of Death * (Required)
            </label>
            <textarea
              required
              rows={3}
              id="death-cause-input"
              value={cause}
              onChange={(e) => {
                setCause(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Acute respiratory failure secondary to viral pneumonia"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-deceased-btn"
            disabled={deceasedMutation.isPending || !cause.trim()}
            onClick={() => deceasedMutation.mutate()}
            className="flex-[2] py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {deceasedMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording...</span>
              </>
            ) : (
              <span>Confirm Patient Deceased</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
