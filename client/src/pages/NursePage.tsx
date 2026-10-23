import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { RecordTempModal } from '../components/RecordTempModal';
import { getPatientsApi, advanceNextDayApi } from '../services/api';
import { useUnit } from '../context/UnitContext';
import type { Patient } from '../types';
import {
  Thermometer,
  Search,
  CheckCircle2,
  Clock,
  Flame,
  ChevronRight,
  RefreshCw,
  FastForward,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export const NursePage: React.FC = () => {
  const { formatTemp, isFever } = useUnit();
  const queryClient = useQueryClient();

  // 6 PM End of day check
  const isPast6PM = new Date().getHours() >= 18;

  // Selected patient for the Record Temperature modal
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'pending' | 'done' | 'all'>('pending');

  // Success toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Query: fetch all currently active patients (ADMITTED + READY_FOR_DISCHARGE)
  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatientsApi(),
    refetchInterval: 15000, // Background poll every 15s
  });

  // Advance day simulation mutation
  const nextDayMutation = useMutation({
    mutationFn: advanceNextDayApi,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast(`📅 Simulated advancement to next day (${res.today})`);
    },
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Only consider active patients (ADMITTED or READY_FOR_DISCHARGE) for rounds
  const activePatients = useMemo(() => {
    if (!data?.patients) return [];
    return data.patients.filter((p) => p.status === 'ADMITTED' || p.status === 'READY_FOR_DISCHARGE');
  }, [data]);

  // Summary counts
  const totalActive = activePatients.length;
  const measuredToday = activePatients.filter((p) => p.todayTempDone).length;
  const pendingToday = totalActive - measuredToday;
  const progressPercent = totalActive > 0 ? Math.round((measuredToday / totalActive) * 100) : 0;

  // Filter & Sort patients
  const displayedPatients = useMemo(() => {
    let list = [...activePatients];

    // Filter by tab
    if (filterTab === 'pending') {
      list = list.filter((p) => !p.todayTempDone);
    } else if (filterTab === 'done') {
      list = list.filter((p) => p.todayTempDone);
    }

    // Filter by search query (name or bed number)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.bedNumber !== undefined && p.bedNumber.toString().includes(q))
      );
    }

    // Default sorting: PENDING first, then by bed number ascending
    return list.sort((a, b) => {
      // If one is pending and other is done, pending comes first
      if (a.todayTempDone !== b.todayTempDone) {
        return a.todayTempDone ? 1 : -1;
      }
      // Then sort by bed number ascending
      const bedA = a.bedNumber ?? 999;
      const bedB = b.bedNumber ?? 999;
      return bedA - bedB;
    });
  }, [activePatients, filterTab, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-4">
        {/* Title Bar & Day Simulation Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Today's Temperature Round
              </h1>
              {data?.today && (
                <span className="text-xs font-bold text-sky-700 bg-sky-100/80 px-2.5 py-0.5 rounded-full">
                  {data.today}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Record daily temperatures for all 74 beds before doctor visits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              title="Refresh list"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-sky-600' : ''}`} />
            </button>

            {/* Advance day simulation */}
            <button
              onClick={() => nextDayMutation.mutate()}
              disabled={nextDayMutation.isPending}
              id="advance-day-btn"
              title="Simulate advance to next day"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <FastForward className="w-3.5 h-3.5 text-sky-600" />
              <span>Next Day Demo</span>
            </button>
          </div>
        </div>

        {/* Onboarding Tip */}
        <div className="bg-sky-50 border border-sky-200/80 px-4 py-2.5 rounded-xl text-xs text-sky-900 flex items-center gap-2 shadow-2xs">
          <span className="font-bold shrink-0">💡 Nurse Workflow:</span>
          <span>Record each patient's temperature once per day before doctor rounds. Patients with 3 consecutive fever-free days (&lt;100.4°F) qualify for doctor discharge recommendation.</span>
        </div>

        {/* 6 PM End-of-Day Alert Banner */}
        {isPast6PM && pendingToday > 0 && (
          <div
            id="end-of-day-nurse-banner"
            className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xs flex items-start gap-3 animate-in fade-in duration-200"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-amber-900">
                  End-of-Day Round Alert (Past 6:00 PM)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Shift change approaching: <strong>{pendingToday} patients</strong> remain unmeasured for today's temperature round. Please record all patient temperatures before the evening shift turnover.
              </p>
            </div>
          </div>
        )}

        {/* Round Progress Summary Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                  progressPercent === 100
                    ? 'bg-emerald-500 text-white'
                    : 'bg-sky-600 text-white'
                }`}
              >
                <Thermometer className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {measuredToday}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    of {totalActive} measured
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {pendingToday > 0 ? (
                    <span className="text-amber-600 font-semibold">
                      {pendingToday} patients pending temperature reading
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All active patients measured today!
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right sm:text-right flex items-center sm:flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium sm:block">Completion</span>
              <span
                className={`text-xl font-extrabold ${
                  progressPercent === 100 ? 'text-emerald-600' : 'text-sky-600'
                }`}
              >
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-sky-500 to-teal-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search by name or bed */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="nurse-patient-search"
              placeholder="Search by patient name or bed #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs gap-1 select-none">
            <button
              onClick={() => setFilterTab('pending')}
              id="filter-pending-btn"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {pendingToday}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('done')}
              id="filter-done-btn"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'done'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === 'done' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {measuredToday}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('all')}
              id="filter-all-btn"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {totalActive}
              </span>
            </button>
          </div>
        </div>

        {/* Patient Cards List */}
        <div className="space-y-2.5">
          {isError ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-base">Unable to load patient rounds</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                An error occurred while fetching bedside round data from the server.
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl hover:bg-sky-700 transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Thermometer className="w-8 h-8 text-sky-500 animate-pulse mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Loading bedside round list...</p>
            </div>
          ) : displayedPatients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-base">No patients match this filter</h3>
              <p className="text-xs text-slate-500 mt-1">
                {filterTab === 'pending'
                  ? "All pending temperature readings for today have been completed!"
                  : "Try clearing your search query or switching tabs."}
              </p>
            </div>
          ) : (
            displayedPatients.map((patient) => {
              const hasFever = patient.lastTemperature !== null && isFever(patient.lastTemperature);

              return (
                <div
                  key={patient._id}
                  onClick={() => setSelectedPatient(patient)}
                  className="group bg-white hover:bg-slate-50/80 active:bg-slate-100 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 select-none"
                >
                  {/* Left: Bed badge + Patient info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Bed Badge */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-sky-50 text-slate-800 group-hover:text-sky-700 font-black text-sm flex flex-col items-center justify-center border border-slate-200/80 transition-colors shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-sky-600">
                        BED
                      </span>
                      <span className="leading-tight text-base font-extrabold">
                        {patient.bedNumber ?? '—'}
                      </span>
                    </div>

                    {/* Patient Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate group-hover:text-sky-700 transition-colors">
                          {patient.name}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium shrink-0">
                          {patient.age}y · {patient.gender}
                        </span>
                      </div>

                      {/* Fever-free streak + Readiness */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                            patient.feverFreeStreak >= 3
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <Flame
                            className={`w-3 h-3 ${
                              patient.feverFreeStreak >= 3 ? 'text-emerald-600' : 'text-amber-500'
                            }`}
                          />
                          <span>
                            {patient.feverFreeStreak}d streak
                            {patient.feverFreeStreak >= 3 && ' (Cured)'}
                          </span>
                        </span>

                        {patient.status === 'READY_FOR_DISCHARGE' && (
                          <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                            Discharge Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Last Reading + Status Chip */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Last Temperature Chip */}
                    <div className="text-right">
                      {patient.lastTemperature !== null ? (
                        <div
                          className={`inline-flex items-center gap-1 font-extrabold text-xs sm:text-sm px-2.5 py-1 rounded-xl border ${
                            hasFever
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <Thermometer className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatTemp(patient.lastTemperature)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">No readings</span>
                      )}
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {patient.lastTemperature !== null
                          ? hasFever
                            ? 'Fever'
                            : 'Normal'
                          : 'Awaiting round'}
                      </div>
                    </div>

                    {/* Today's Round Status Chip */}
                    <div>
                      {patient.todayTempDone ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500 text-white shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Done today</span>
                          <span className="sm:hidden">Done</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span className="hidden sm:inline">Pending</span>
                          <span className="sm:hidden">Pending</span>
                        </span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Record Temperature Bedside Modal */}
      {selectedPatient && (
        <RecordTempModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onSuccess={() => {
            showToast(`✓ Temperature recorded for Bed ${selectedPatient.bedNumber || selectedPatient.name}`);
          }}
        />
      )}
    </div>
  );
};
