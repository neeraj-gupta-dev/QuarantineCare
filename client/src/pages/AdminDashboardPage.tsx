import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { BedMap } from '../components/BedMap';
import { MortalityChart } from '../components/MortalityChart';
import { getDashboardApi, getPatientsApi } from '../services/api';
import {
  Bed,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  FileCheck,
  UserPlus,
  RefreshCw,
  Loader2,
  Activity,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {

  const {
    data: dashboard,
    isLoading: isLoadingDash,
    isRefetching,
    isError: isErrorDash,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
    refetchInterval: 15000,
  });

  const { data: patientsData, refetch: refetchPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatientsApi(),
    refetchInterval: 15000,
  });

  const refetchAll = () => {
    refetchDash();
    refetchPatients();
  };

  if (isErrorDash) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center max-w-md shadow-xs">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h2 className="text-base font-bold text-slate-900">Failed to load dashboard metrics</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Unable to reach the server to fetch current facility statistics.
            </p>
            <button
              onClick={refetchAll}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingDash || !dashboard) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">Loading facility operational metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  const { occupancy, compliance, pendingDischarges, outcomes, mortalityOverTime, today } = dashboard;

  const isMortalityExceeded = outcomes.mortalityRate > 15;
  const tempCompliancePct =
    compliance.totalActive > 0
      ? Math.round((compliance.tempsDone / compliance.totalActive) * 100)
      : 0;
  const visitCompliancePct =
    compliance.totalActive > 0
      ? Math.round((compliance.visitsDone / compliance.totalActive) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      <Header />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-5">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Facility Executive Dashboard
              </h1>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                {today}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live capacity tracking, clinical compliance, mortality analysis, and discharge approvals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refetchAll}
              disabled={isRefetching}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            <Link
              to="/admin/admit"
              id="admin-admit-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 active:scale-98 transition shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Admit Patient</span>
            </Link>
          </div>
        </div>

        {/* Onboarding Tip */}
        <div className="bg-amber-50 border border-amber-200/80 px-4 py-2.5 rounded-xl text-xs text-amber-950 flex items-center gap-2 shadow-2xs">
          <span className="font-bold shrink-0">💡 Admin Workflow:</span>
          <span>Supervise the 74-bed capacity, monitor clinical compliance benchmarks, and approve certified discharges from the queue to release beds for incoming patient admissions.</span>
        </div>

        {/* ─── CRITICAL METRICS CARDS GRID ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Occupancy Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Facility Occupancy</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {occupancy.occupied}
                </span>
                <span className="text-sm font-bold text-slate-400">/ 74 Beds</span>
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                {occupancy.available === 0 ? (
                  <span className="text-rose-600 font-bold">Facility Full · 0 beds free</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">{occupancy.available} beds currently available</span>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full ${
                  occupancy.occupied >= 74 ? 'bg-rose-500' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, (occupancy.occupied / 74) * 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Mortality Rate vs 15% Benchmark Card */}
          <div
            className={`rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${
              isMortalityExceeded
                ? 'bg-rose-50 border-2 border-rose-500 text-rose-950 ring-4 ring-rose-100'
                : 'bg-white border border-slate-200/90 text-slate-900'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mortality Rate
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isMortalityExceeded ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-black ${
                    isMortalityExceeded ? 'text-rose-700' : 'text-slate-900'
                  }`}
                >
                  {outcomes.mortalityRate}%
                </span>
                <span className="text-xs font-bold text-slate-400">vs 15% bench</span>
              </div>
            </div>

            <div className="mt-2.5">
              {isMortalityExceeded ? (
                <div className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Mortality above 15% benchmark</span>
                </div>
              ) : (
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Below 15% benchmark (Clinical target achieved)</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Success Rate vs 85% Target Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Cure Success Rate</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {outcomes.successRate}%
                </span>
                <span className="text-xs font-bold text-slate-400">vs 85% target</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {outcomes.discharged} cured discharges / {outcomes.total} total resolved
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, outcomes.successRate)}%` }}
              />
            </div>
          </div>

          {/* 4. Pending Discharges Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Discharges Queue</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {pendingDischarges}
                </span>
                <span className="text-xs font-bold text-slate-400">awaiting approval</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Patients certified cured by doctors
              </p>
            </div>
            <Link
              to="/admin/discharges"
              id="view-discharges-queue-btn"
              className="mt-3 text-xs font-extrabold text-violet-700 hover:text-violet-900 flex items-center justify-between bg-violet-50 hover:bg-violet-100/70 py-1.5 px-3 rounded-lg transition"
            >
              <span>Review Discharges</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* ─── TODAY'S CLINICAL COMPLIANCE CARD ───────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-600" />
                Today's Round Compliance
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Mandatory daily workflow: (1) Nurse temperature reading, followed by (2) Doctor visit.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {compliance.totalActive} Active Admitted Patients
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Temperatures */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-800">1. Nurse Temperature Readings</span>
                <span className="font-black text-sky-700">{tempCompliancePct}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${tempCompliancePct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Done: <strong className="text-slate-800">{compliance.tempsDone}</strong></span>
                <span>Pending: <strong className="text-amber-600">{compliance.tempsPending}</strong></span>
              </div>
            </div>

            {/* Doctor Visits */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-800">2. Attending Doctor Visits</span>
                <span className="font-black text-indigo-700">{visitCompliancePct}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${visitCompliancePct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Done: <strong className="text-slate-800">{compliance.visitsDone}</strong></span>
                <span>Pending: <strong className="text-amber-600">{compliance.visitsPending}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 74-SQUARE BED MAP ───────────────────────────────────────────── */}
        <BedMap patients={patientsData?.patients || []} />

        {/* ─── MORTALITY OVER TIME TRENDLINE ───────────────────────────────── */}
        <MortalityChart data={mortalityOverTime} />
      </main>
    </div>
  );
};
