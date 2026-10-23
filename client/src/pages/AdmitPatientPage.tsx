import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { getDashboardApi, admitPatientApi } from '../services/api';
import {
  UserPlus,
  Bed,
  AlertCircle,
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react';

export const AdmitPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'M' | 'F' | 'OTHER'>('M');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check occupancy from dashboard
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
  });

  const isFull = dashboard ? dashboard.occupancy.available <= 0 : false;

  const admitMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Patient name is required');
      if (age === '' || Number(age) <= 0) throw new Error('Valid age is required');

      return admitPatientApi({
        name: name.trim(),
        age: Number(age),
        gender,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/patient/${newPatient._id}`);
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || err.message || 'Failed to admit patient'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFull) return;
    admitMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      <Header />

      <main className="max-w-xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          {dashboard && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-500">Current Occupancy:</span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  isFull ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {dashboard.occupancy.occupied} / 74 Beds
              </span>
            </div>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Admit New Patient
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Auto-assigns the lowest available bed (1–74).
              </p>
            </div>
          </div>

          {/* Facility Full Warning Banner */}
          {isFull && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm text-rose-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Facility full — All 74 beds are taken</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Admissions are temporarily disabled until cured patients are discharged. Please visit the Discharges Queue to review and release beds.
              </p>
              <button
                type="button"
                onClick={() => navigate('/admin/discharges')}
                className="mt-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition"
              >
                Open Discharges Queue →
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Patient Name *
              </label>
              <input
                type="text"
                required
                disabled={isFull || admitMutation.isPending}
                id="patient-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Age *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  disabled={isFull || admitMutation.isPending}
                  id="patient-age-input"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 45"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Gender *
                </label>
                <select
                  disabled={isFull || admitMutation.isPending}
                  id="patient-gender-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition font-medium"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Admission Clinical Notes (Optional)</span>
              </label>
              <textarea
                rows={3}
                disabled={isFull || admitMutation.isPending}
                id="patient-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Initial symptoms, onset date, comorbidities, referral source..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="submit-admit-btn"
                disabled={isFull || admitMutation.isPending || !name.trim()}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-extrabold text-white bg-amber-600 hover:bg-amber-700 active:scale-98 shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {admitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Assigning Bed & Admitting...</span>
                  </>
                ) : (
                  <>
                    <Bed className="w-4 h-4" />
                    <span>Admit Patient & Auto-Assign Bed</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
