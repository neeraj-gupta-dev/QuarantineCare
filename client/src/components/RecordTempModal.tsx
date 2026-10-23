import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Patient } from '../types';
import { getPatientDetailApi, recordTemperatureApi } from '../services/api';
import { useUnit } from '../context/UnitContext';
import { Sparkline } from './Sparkline';
import { X, Thermometer, Clock, AlertTriangle, CheckCircle2, Flame, Loader2 } from 'lucide-react';

interface RecordTempModalProps {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordTempModal: React.FC<RecordTempModalProps> = ({ patient, onClose, onSuccess }) => {
  const { unit, fromDisplayValue, isFever } = useUnit();
  const queryClient = useQueryClient();

  // Fetch full patient detail (including all historical readings)
  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['patientDetail', patient._id],
    queryFn: () => getPatientDetailApi(patient._id),
  });

  // Default input value
  const defaultVal = unit === 'F' ? '98.6' : '37.0';
  const [inputValue, setInputValue] = useState<string>(defaultVal);
  const isCorrection = patient.todayTempDone;
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current formatted timestamp
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setCurrentTimestamp(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, []);

  // Parse numeric value in current display unit and in °F
  const numericVal = parseFloat(inputValue);
  const isValidNumber = !isNaN(numericVal) && numericVal > 0;
  const valueInF = isValidNumber ? fromDisplayValue(numericVal) : 98.6;
  const willBeFever = isValidNumber && isFever(valueInF);

  // Mutation to record temperature
  const recordMutation = useMutation({
    mutationFn: async () => {
      if (!isValidNumber) {
        throw new Error('Please enter a valid numeric temperature');
      }
      return recordTemperatureApi(patient._id, {
        valueF: Math.round(valueInF * 10) / 10,
        isCorrection: isCorrection,
        correctionReason: isCorrection ? correctionReason || 'Bedside correction' : undefined,
      });
    },
    onSuccess: () => {
      // Invalidate patients queries to immediately update parent list & progress bar
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientDetail', patient._id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to record temperature'
      );
    },
  });

  const handleQuickAdjust = (delta: number) => {
    const cur = parseFloat(inputValue) || (unit === 'F' ? 98.6 : 37.0);
    const updated = Math.round((cur + delta) * 10) / 10;
    setInputValue(updated.toFixed(1));
  };

  const handlePreset = (val: number) => {
    setInputValue(val.toFixed(1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-sky-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {patient.bedNumber ? `B${patient.bedNumber}` : '—'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base leading-tight">{patient.name}</h3>
                <span className="text-xs text-slate-500 font-medium">
                  {patient.age}y · {patient.gender}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Flame className="w-3 h-3 text-amber-500" />
                  {patient.feverFreeStreak}d fever-free
                </span>
                {patient.todayTempDone && (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Done today
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Timestamp and Nurse Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Timestamp: <strong className="text-slate-700">{currentTimestamp}</strong></span>
            </div>
            <span className="text-[11px] text-slate-400">Bedside Round</span>
          </div>

          {/* Large Numeric Input Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Body Temperature (°{unit})
            </label>

            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400">
                <Thermometer className={`w-6 h-6 ${willBeFever ? 'text-rose-500' : 'text-sky-500'}`} />
              </div>
              <input
                type="number"
                step="0.1"
                min={unit === 'F' ? 90 : 32}
                max={unit === 'F' ? 110 : 43}
                id="temperature-input"
                autoFocus
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setErrorMessage(null);
                }}
                className={`w-full pl-14 pr-16 py-3.5 text-3xl font-extrabold rounded-xl border text-center transition-all focus:outline-hidden ${
                  willBeFever
                    ? 'border-rose-400 bg-rose-50/30 text-rose-700 focus:ring-3 focus:ring-rose-200'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-sky-500 focus:ring-3 focus:ring-sky-200'
                }`}
                placeholder={unit === 'F' ? '98.6' : '37.0'}
              />
              <span className="absolute right-4 text-lg font-bold text-slate-400 select-none">
                °{unit}
              </span>
            </div>

            {/* Quick Adjustment Controls (Mobile-friendly) */}
            <div className="flex items-center justify-between mt-2 gap-2">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickAdjust(-0.2)}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                >
                  -0.2°
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdjust(-0.1)}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                >
                  -0.1°
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdjust(0.1)}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                >
                  +0.1°
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdjust(0.2)}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                >
                  +0.2°
                </button>
              </div>

              {/* Presets */}
              <div className="flex gap-1.5">
                {unit === 'F' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePreset(98.6)}
                      className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 transition cursor-pointer"
                    >
                      98.6° (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreset(100.4)}
                      className="px-2 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition cursor-pointer"
                    >
                      100.4° (Fever)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePreset(37.0)}
                      className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 transition cursor-pointer"
                    >
                      37.0° (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreset(38.0)}
                      className="px-2 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-200 transition cursor-pointer"
                    >
                      38.0° (Fever)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Fever / Normal Live Status Banner */}
          {isValidNumber && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 text-xs font-medium border ${
                willBeFever
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {willBeFever ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Fever threshold reached (≥ {unit === 'F' ? '100.4°F' : '38.0°C'}).</span>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Fever-free streak will reset to 0 days. Doctor will be alerted.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Normal reading (&lt; {unit === 'F' ? '100.4°F' : '38.0°C'}).</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Counts toward 3-day recovery streak (streak will advance).
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Historical Trend Line (Sparkline) */}
          <div>
            {isLoadingDetail ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading temperature history...</div>
            ) : (
              <Sparkline readings={detail?.readings || []} />
            )}
          </div>

          {/* Correction Section if already recorded today */}
          {patient.todayTempDone && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Temperature already recorded today
                </span>
                <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                  Correction Mode
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                Saving will record this as an audited correction reading for today.
              </p>
              <input
                type="text"
                placeholder="Reason for correction (e.g. re-test with digital thermometer)"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Modal Footer / Save Action */}
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
            id="save-temperature-btn"
            disabled={recordMutation.isPending || !isValidNumber}
            onClick={() => recordMutation.mutate()}
            className="flex-[2] py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-98 shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {recordMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <Thermometer className="w-4 h-4" />
                <span>Save Reading ({inputValue}°{unit})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
