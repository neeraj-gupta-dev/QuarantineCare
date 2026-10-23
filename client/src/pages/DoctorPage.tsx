import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { getPatientsApi } from '../services/api';
import { useUnit } from '../context/UnitContext';
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const DoctorPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatTemp, isFever } = useUnit();

  const [activeTab, setActiveTab] = useState<'ready' | 'waiting' | 'visited'>('ready');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all patients
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatientsApi(),
    refetchInterval: 15000,
  });

  const activePatients = useMemo(() => {
    if (!data?.patients) return [];
    return data.patients.filter(
      (p) => p.status === 'ADMITTED' || p.status === 'READY_FOR_DISCHARGE'
    );
  }, [data]);

  // Split into the 3 clinical workflow buckets
  // 1. Ready to visit: temperature taken today, but doctor hasn't visited yet
  const readyPatients = useMemo(() => {
    return activePatients.filter((p) => p.todayTempDone && !p.todayDoctorVisited);
  }, [activePatients]);

  // 2. Waiting for temperature: nurse has not yet recorded today's temperature
  const waitingPatients = useMemo(() => {
    return activePatients.filter((p) => !p.todayTempDone && !p.todayDoctorVisited);
  }, [activePatients]);

  // 3. Visited today: doctor visit already recorded today
  const visitedPatients = useMemo(() => {
    return activePatients.filter((p) => p.todayDoctorVisited);
  }, [activePatients]);

  // High-risk sorting for "Ready to visit":
  // - High-risk first: current fever (>=100.4°F)
  // - Higher temperature first
  // - Lower streak first (more acute)
  // - Bed number as tiebreaker
  const sortedReadyPatients = useMemo(() => {
    return [...readyPatients].sort((a, b) => {
      const aFever = a.lastTemperature !== null && isFever(a.lastTemperature);
      const bFever = b.lastTemperature !== null && isFever(b.lastTemperature);

      // Fever takes first priority
      if (aFever && !bFever) return -1;
      if (!aFever && bFever) return 1;

      // Higher temperature comes first
      const tempA = a.lastTemperature ?? 0;
      const tempB = b.lastTemperature ?? 0;
      if (tempA !== tempB) return tempB - tempA;

      // Lower streak (more acute) comes first
      if (a.feverFreeStreak !== b.feverFreeStreak) {
        return a.feverFreeStreak - b.feverFreeStreak;
      }

      return (a.bedNumber ?? 999) - (b.bedNumber ?? 999);
    });
  }, [readyPatients, isFever]);

  // Select list based on active tab
  const currentList = useMemo(() => {
    let list =
      activeTab === 'ready'
        ? sortedReadyPatients
        : activeTab === 'waiting'
        ? waitingPatients
        : visitedPatients;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.bedNumber !== undefined && p.bedNumber.toString().includes(q))
      );
    }

    return list;
  }, [activeTab, sortedReadyPatients, waitingPatients, visitedPatients, searchQuery]);

  // 6 PM End of day check
  const isPast6PM = new Date().getHours() >= 18;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <Header />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-4">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Today's Doctor Rounds
              </h1>
              {data?.today && (
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                  {data.today}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Clinical evaluations, notes, and discharge certifications.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            title="Refresh rounds"
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* 6 PM End-of-Day Alert Banner */}
        {isPast6PM && (readyPatients.length > 0 || waitingPatients.length > 0) && (
          <div
            id="end-of-day-doctor-banner"
            className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xs flex items-start gap-3 animate-in fade-in duration-200"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-amber-900">
                  End-of-Day Clinical Rounds Alert (Past 6:00 PM)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Evening clinical turnover: <strong>{readyPatients.length} patients</strong> remain unvisited by doctors, and <strong>{waitingPatients.length} patients</strong> are awaiting nurse temperature readings. All rounds must be concluded.
              </p>
            </div>
          </div>
        )}

        {/* 3 Tabs Header */}
        <div className="grid grid-cols-3 gap-2 bg-slate-200/60 p-1.5 rounded-2xl select-none">
          {/* Tab 1: Ready to visit */}
          <button
            onClick={() => setActiveTab('ready')}
            id="doctor-tab-ready"
            className={`py-3 px-2 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ready'
                ? 'bg-white text-indigo-700 shadow-sm shadow-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4 shrink-0 text-indigo-600" />
            <span className="text-center sm:text-left">Ready to visit</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'ready'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {readyPatients.length}
            </span>
          </button>

          {/* Tab 2: Waiting for temperature */}
          <button
            onClick={() => setActiveTab('waiting')}
            id="doctor-tab-waiting"
            className={`py-3 px-2 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'waiting'
                ? 'bg-white text-slate-800 shadow-sm shadow-slate-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="text-center sm:text-left">Waiting for temp</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'waiting'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {waitingPatients.length}
            </span>
          </button>

          {/* Tab 3: Visited today */}
          <button
            onClick={() => setActiveTab('visited')}
            id="doctor-tab-visited"
            className={`py-3 px-2 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'visited'
                ? 'bg-white text-emerald-700 shadow-sm shadow-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="text-center sm:text-left">Visited today</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'visited'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {visitedPatients.length}
            </span>
          </button>
        </div>

        {/* Tab Description Banner */}
        <div className="text-xs px-1 text-slate-500 flex items-center justify-between">
          {activeTab === 'ready' && (
            <span className="text-indigo-700 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Sorted high-risk first (patients with active fevers appear at top). Tap card to review chart and record visit.
            </span>
          )}
          {activeTab === 'waiting' && (
            <span className="text-slate-500 font-medium">
              These patients are awaiting morning temperature measurement by nurses. Cards are greyed out until temperature is recorded.
            </span>
          )}
          {activeTab === 'visited' && (
            <span className="text-emerald-700 font-medium">
              Completed rounds for today. Tap to review patient chart, historical readings, or add progress notes.
            </span>
          )}
        </div>

        {/* Search Toolbar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="doctor-patient-search"
            placeholder="Search rounds by patient name or bed #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-2xs"
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

        {/* Patient List */}
        <div className="space-y-2.5">
          {isLoading ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Stethoscope className="w-8 h-8 text-indigo-500 animate-pulse mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Loading clinical rounds...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-base">No patients in this list</h3>
              <p className="text-xs text-slate-500 mt-1">
                {activeTab === 'ready'
                  ? "All measured patients have been visited for today!"
                  : activeTab === 'waiting'
                  ? "All active patients have their temperatures taken today!"
                  : "No visits completed yet today."}
              </p>
            </div>
          ) : (
            currentList.map((patient) => {
              const isWaiting = activeTab === 'waiting';
              const hasFever = patient.lastTemperature !== null && isFever(patient.lastTemperature);
              const streakText = `${Math.min(patient.feverFreeStreak, 3)}/3 days fever-free`;

              return (
                <div
                  key={patient._id}
                  onClick={() => {
                    if (!isWaiting) {
                      navigate(`/patient/${patient._id}`);
                    }
                  }}
                  className={`rounded-2xl p-4 border transition-all flex items-center justify-between gap-3 select-none ${
                    isWaiting
                      ? 'bg-slate-100/70 border-slate-200 opacity-65 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-50 active:bg-slate-100 border-slate-200/90 shadow-2xs hover:shadow-xs cursor-pointer'
                  }`}
                >
                  {/* Left: Bed Badge + Patient info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl font-black text-sm flex flex-col items-center justify-center border shrink-0 transition-colors ${
                        isWaiting
                          ? 'bg-slate-200/60 text-slate-500 border-slate-300/50'
                          : hasFever
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                        BED
                      </span>
                      <span className="leading-tight text-base font-extrabold">
                        {patient.bedNumber ?? '—'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-bold text-sm sm:text-base truncate ${
                            isWaiting ? 'text-slate-600' : 'text-slate-900 group-hover:text-indigo-600'
                          }`}
                        >
                          {patient.name}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium shrink-0">
                          {patient.age}y · {patient.gender}
                        </span>
                      </div>

                      {/* Streak / High Risk badge */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            patient.feverFreeStreak >= 3
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : hasFever
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Flame
                            className={`w-3 h-3 ${
                              patient.feverFreeStreak >= 3
                                ? 'text-emerald-600'
                                : hasFever
                                ? 'text-rose-600'
                                : 'text-amber-500'
                            }`}
                          />
                          <span>{streakText}</span>
                        </span>

                        {hasFever && (
                          <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded uppercase">
                            High Risk · Active Fever
                          </span>
                        )}

                        {patient.status === 'READY_FOR_DISCHARGE' && (
                          <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                            Discharge Recommended
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Today's Temperature & Status */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {patient.lastTemperature !== null && patient.todayTempDone ? (
                        <div
                          className={`inline-flex items-center gap-1 font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl border ${
                            hasFever
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span>{formatTemp(patient.lastTemperature)}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Waiting for nurse's reading</span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {patient.todayDoctorVisited ? (
                          <span className="text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Visited
                          </span>
                        ) : patient.todayTempDone ? (
                          <span className="text-indigo-600 font-bold">Ready for Visit</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Waiting for nurse's reading</span>
                        )}
                      </div>
                    </div>

                    {!isWaiting && (
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
