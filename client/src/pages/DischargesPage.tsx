import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getPatientsApi, approveDischargeApi } from '../services/api';
import {
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  X,
  Loader2,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import type { Patient } from '../types';

export const DischargesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dischargesQueue'],
    queryFn: () => getPatientsApi({ status: 'READY_FOR_DISCHARGE' }),
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: (patientId: string) => approveDischargeApi(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dischargesQueue'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (selectedPatient) {
        setToastMessage(
          `✓ Discharge approved for ${selectedPatient.name}. Bed ${selectedPatient.bedNumber} is now free!`
        );
      }
      setSelectedPatient(null);
      setTimeout(() => setToastMessage(null), 4500);
    },
  });

  const readyPatients = data?.patients || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-4">
        {/* Title Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Discharge Approvals Queue
                </h1>
                <span className="text-xs font-extrabold text-violet-700 bg-violet-100 px-2.5 py-0.5 rounded-full">
                  {readyPatients.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Review and approve patients certified cured by doctors to release beds.
              </p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {/* Queue List */}
        <div className="space-y-3">
          {isError ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-base">Unable to load discharge queue</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                An error occurred while fetching pending discharges from the server.
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Loading discharge queue...</p>
            </div>
          ) : readyPatients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-base">No pending discharges</h3>
              <p className="text-xs text-slate-500 mt-1">
                When attending doctors certify 3-day fever-free patients, they will automatically appear here for approval.
              </p>
            </div>
          ) : (
            readyPatients.map((patient) => {
              const docName =
                typeof patient.dischargeRecommendedBy === 'object' && patient.dischargeRecommendedBy
                  ? patient.dischargeRecommendedBy.name
                  : 'Attending Doctor';
              const recTime = patient.dischargeRecommendedAt
                ? new Date(patient.dischargeRecommendedAt).toLocaleString()
                : 'Today';

              return (
                <div
                  key={patient._id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-800 font-black text-sm flex flex-col items-center justify-center border border-violet-200 shrink-0">
                      <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">BED</span>
                      <span className="text-base font-extrabold leading-none">{patient.bedNumber}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">{patient.name}</h3>
                        <span className="text-xs text-slate-400 font-medium">
                          {patient.age}y · {patient.gender}
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          {patient.feverFreeStreak}d Fever-Free (Cured)
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-violet-900">
                          <User className="w-3.5 h-3.5 text-violet-600" />
                          Recommended by: {docName}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {recTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => navigate(`/patient/${patient._id}`)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      View Chart
                    </button>

                    <button
                      onClick={() => setSelectedPatient(patient)}
                      id={`approve-discharge-btn-${patient.bedNumber}`}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Discharge</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Confirmation Dialog */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Confirm Discharge Approval
                </h3>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Are you sure you want to approve discharge for{' '}
                <strong className="text-slate-900">{selectedPatient.name}</strong>?
              </p>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium space-y-1">
                <div>✓ Patient status will become <strong>DISCHARGED_CURED</strong>.</div>
                <div>
                  ✓ <strong>Bed {selectedPatient.bedNumber}</strong> will immediately be released and available for new admissions.
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-approve-discharge-btn"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(selectedPatient._id)}
                className="flex-[2] py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm & Release Bed</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
