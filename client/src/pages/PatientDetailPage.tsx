import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { StreakIndicator } from '../components/StreakIndicator';
import { TemperatureChart } from '../components/TemperatureChart';
import { RecordVisitModal } from '../components/RecordVisitModal';
import { MarkDeceasedModal } from '../components/MarkDeceasedModal';
import { getPatientDetailApi, recommendDischargeApi } from '../services/api';
import { useUnit } from '../context/UnitContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Stethoscope,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  Pill,
  User,
  Calendar,
  Loader2,
  FileCheck,
} from 'lucide-react';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatTemp, isFever } = useUnit();
  const { user } = useAuth();

  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isDeceasedModalOpen, setIsDeceasedModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: patient, isLoading, error, refetch } = useQuery({
    queryKey: ['patientDetail', id],
    queryFn: () => getPatientDetailApi(id!),
    enabled: !!id,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Recommend discharge mutation
  const dischargeMutation = useMutation({
    mutationFn: () => recommendDischargeApi(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast('✓ Discharge recommended! Administration has been automatically notified.');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">Loading patient clinical chart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center max-w-md">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h2 className="text-base font-bold text-slate-900">Patient not found</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Unable to locate patient record or network request failed.
            </p>
            <button
              onClick={() => navigate('/doctor')}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
            >
              Return to Doctor Rounds
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEligibleForDischarge =
    patient.feverFreeStreak >= 3 && patient.status === 'ADMITTED';
  const isDischargePending = patient.status === 'READY_FOR_DISCHARGE';
  const isActive = patient.status === 'ADMITTED' || patient.status === 'READY_FOR_DISCHARGE';

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
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {isActive && (user?.role === 'doctor' || user?.role === 'admin') && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVisitModalOpen(true)}
                id="record-doctor-visit-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition shadow-xs cursor-pointer"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Record Visit</span>
              </button>

              <button
                onClick={() => setIsDeceasedModalOpen(true)}
                id="mark-deceased-btn"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
              >
                <span>Mark Deceased</span>
              </button>
            </div>
          )}
        </div>

        {/* Patient Identity Header Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex flex-col items-center justify-center font-black shadow-sm shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">BED</span>
              <span className="text-xl leading-none font-extrabold">{patient.bedNumber ?? '—'}</span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {patient.name}
                </h1>
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    patient.status === 'ADMITTED'
                      ? 'bg-sky-100 text-sky-800'
                      : patient.status === 'READY_FOR_DISCHARGE'
                      ? 'bg-violet-100 text-violet-800'
                      : patient.status === 'DISCHARGED_CURED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {patient.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                <span>Age: <strong className="text-slate-700">{patient.age}y</strong></span>
                <span>•</span>
                <span>Gender: <strong className="text-slate-700">{patient.gender}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Admitted: {new Date(patient.admittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Today's status indicators */}
          <div className="flex items-center gap-3 sm:border-l sm:border-slate-100 sm:pl-4 self-end sm:self-auto">
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-semibold">Today's Temperature</div>
              <div className="text-base font-black text-slate-900">
                {patient.lastTemperature !== null ? formatTemp(patient.lastTemperature) : '—'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-semibold">Doctor Visited</div>
              <div className="text-xs font-bold mt-0.5">
                {patient.todayDoctorVisited ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Visited
                  </span>
                ) : (
                  <span className="text-amber-600">Pending</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── ELIGIBLE FOR DISCHARGE BANNER ─────────────────────────────────── */}
        {isEligibleForDischarge && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight">
                  Eligible for Discharge!
                </h3>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                  This patient has completed <strong>3 consecutive fever-free calendar days</strong> (Cured). Recommending discharge will automatically notify Administration to approve discharge and free Bed {patient.bedNumber}.
                </p>
              </div>
            </div>

            <button
              onClick={() => dischargeMutation.mutate()}
              disabled={dischargeMutation.isPending}
              id="recommend-discharge-btn"
              className="py-2.5 px-4 rounded-xl text-xs font-extrabold text-emerald-950 bg-white hover:bg-emerald-50 active:scale-98 shadow-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {dischargeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  <span>Notifying Admin...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Recommend Discharge</span>
                </>
              )}
            </button>
          </div>
        )}

        {isDischargePending && (
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-violet-900 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-violet-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Discharge Recommended by Clinical Team.</span> Administration has been automatically notified and can approve discharge to release Bed {patient.bedNumber}.
            </div>
          </div>
        )}

        {/* ─── STREAK INDICATOR (3 Circles) ─────────────────────────────────── */}
        <StreakIndicator streak={patient.feverFreeStreak} status={patient.status} />

        {/* ─── TEMPERATURE RECHARTS VISUALIZATION ──────────────────────────── */}
        <TemperatureChart readings={patient.readings || []} />

        {/* ─── READINGS TABLE ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Temperature History ({patient.readings?.length || 0} Readings)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Newest first</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date / Day</th>
                  <th className="py-3 px-4">Recorded Temp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Nurse</th>
                  <th className="py-3 px-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!patient.readings || patient.readings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No temperature readings on record.
                    </td>
                  </tr>
                ) : (
                  patient.readings.map((r) => {
                    const fever = isFever(r.valueF);
                    const nurseName =
                      typeof r.recordedBy === 'object' && r.recordedBy
                        ? r.recordedBy.name
                        : 'Nurse';

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {r.dayKey}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {new Date(r.recordedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-sm text-slate-900">
                            {formatTemp(r.valueF)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fever
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {fever ? 'Fever (≥100.4°)' : 'Normal (<100.4°)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {nurseName}
                        </td>
                        <td className="py-3 px-4">
                          {r.isCorrection ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                              Correction: {r.correctionReason || 'Updated'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Standard Round
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── PAST DOCTOR VISITS ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-indigo-600" />
              Doctor Visits & Clinical Notes ({patient.visits?.length || 0})
            </h3>
          </div>

          <div className="p-5 space-y-3">
            {!patient.visits || patient.visits.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No clinical visits recorded yet.
              </p>
            ) : (
              patient.visits.map((v) => {
                const docName =
                  typeof v.doctor === 'object' && v.doctor ? v.doctor.name : 'Attending Doctor';

                return (
                  <div
                    key={v._id}
                    className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        {docName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {v.dayKey} · {new Date(v.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 font-medium bg-white p-3 rounded-lg border border-slate-100">
                      <strong className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                        Clinical Treatment Notes
                      </strong>
                      {v.treatmentNotes || 'No notes entered'}
                    </div>

                    {v.medication && (
                      <div className="text-xs text-indigo-900 font-semibold bg-indigo-50/60 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-2">
                        <Pill className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Prescribed: {v.medication}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── AUDIT TRAIL ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              Audit Trail
            </h3>
            <span className="text-xs text-slate-400 font-medium">Compliance log</span>
          </div>

          <div className="p-4 space-y-2">
            {!patient.auditLogs || patient.auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No audit logs available.</p>
            ) : (
              patient.auditLogs.map((log) => {
                const actorName =
                  typeof log.actor === 'object' && log.actor ? log.actor.name : 'System';

                return (
                  <div
                    key={log._id}
                    className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-slate-500">by {actorName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Record Visit Modal */}
      {isVisitModalOpen && (
        <RecordVisitModal
          patient={patient}
          onClose={() => setIsVisitModalOpen(false)}
          onSuccess={() => {
            refetch();
            showToast('✓ Doctor visit and treatment notes recorded successfully');
          }}
        />
      )}

      {/* Mark Deceased Confirmation Modal */}
      {isDeceasedModalOpen && (
        <MarkDeceasedModal
          patient={patient}
          onClose={() => setIsDeceasedModalOpen(false)}
          onSuccess={() => {
            refetch();
            showToast(`Patient Bed ${patient.bedNumber} marked as deceased. Bed freed.`);
            navigate('/doctor');
          }}
        />
      )}
    </div>
  );
};
