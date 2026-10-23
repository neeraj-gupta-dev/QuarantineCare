import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { advanceNextDayApi, resetDatabaseApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  X,
  FastForward,
  RotateCcw,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react';

export const DemoDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user, demoLogin } = useAuth();
  const navigate = useNavigate();

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const nextDayMutation = useMutation({
    mutationFn: advanceNextDayApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dischargesQueue'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showStatus(`📅 Advanced calendar day to ${data.today} (+1 day)`);
    },
    onError: (err: any) => {
      showStatus(`❌ Advance day failed: ${err.message}`);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetDatabaseApi,
    onSuccess: () => {
      queryClient.invalidateQueries();
      setConfirmReset(false);
      showStatus('🌱 Database reset to initial 74-bed state successfully!');
    },
    onError: (err: any) => {
      setConfirmReset(false);
      showStatus(`❌ Reset failed: ${err.message}`);
    },
  });

  const quickSwitchRole = async (role: 'nurse' | 'doctor' | 'admin') => {
    try {
      await demoLogin(role);
      navigate(role === 'nurse' ? '/nurse' : role === 'doctor' ? '/doctor' : '/admin');
      setIsOpen(false);
      showStatus(`Switched to ${role.toUpperCase()} persona!`);
    } catch (err: any) {
      showStatus(`Failed to switch: ${err.message}`);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(true)}
          id="open-demo-drawer-btn"
          className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full shadow-lg hover:shadow-xl border border-slate-700/80 backdrop-blur-md text-xs font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          title="Open Demo Controls & Simulation"
        >
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>Demo Controls</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          {/* Drawer Content Panel */}
          <div
            className="w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div>
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base leading-tight">Demo Controls</h2>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Fast-forward days and manage demo state
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Alert */}
              {statusMsg && (
                <div className="m-4 p-3 bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              {/* Drawer Body */}
              <div className="p-5 space-y-6">
                {/* Simulation Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FastForward className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Time & Day Simulation</span>
                  </h3>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Simulate the passing of a calendar day. This increments facility time, resets daily temperature and doctor visit compliance statuses, and advances patients' fever-free streak evaluations.
                    </p>

                    <button
                      onClick={() => nextDayMutation.mutate()}
                      disabled={nextDayMutation.isPending}
                      id="drawer-advance-day-btn"
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {nextDayMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Advancing day...</span>
                        </>
                      ) : (
                        <>
                          <FastForward className="w-4 h-4" />
                          <span>Simulate Next Day (+1 Day)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Role Switcher */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    <span>Quick Switch Persona</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => quickSwitchRole('nurse')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex flex-col gap-1 cursor-pointer ${
                        user.role === 'nurse'
                          ? 'bg-sky-50 border-sky-300 text-sky-900 ring-2 ring-sky-200'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-black tracking-wider text-sky-600">
                        Nurse
                      </span>
                      <span className="font-extrabold truncate">Priya (Nurse)</span>
                      {user.role === 'nurse' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 mt-1" />
                      )}
                    </button>

                    <button
                      onClick={() => quickSwitchRole('doctor')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex flex-col gap-1 cursor-pointer ${
                        user.role === 'doctor'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-200'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-black tracking-wider text-indigo-600">
                        Doctor
                      </span>
                      <span className="font-extrabold truncate">Dr. Patel</span>
                      {user.role === 'doctor' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-1" />
                      )}
                    </button>

                    <button
                      onClick={() => quickSwitchRole('admin')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex flex-col gap-1 cursor-pointer ${
                        user.role === 'admin'
                          ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-200'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-black tracking-wider text-amber-600">
                        Admin
                      </span>
                      <span className="font-extrabold truncate">Meera (Admin)</span>
                      {user.role === 'admin' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 mt-1" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Reset Data Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                    <span>Database Reset</span>
                  </h3>

                  <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-3">
                    <p className="text-xs text-rose-900/80 leading-relaxed font-medium">
                      Reset database to full initial benchmark state: 74 full beds, 7–10 days of historical data, initial compliance, and default day 0.
                    </p>

                    {!confirmReset ? (
                      <button
                        onClick={() => setConfirmReset(true)}
                        id="drawer-reset-data-btn"
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-700 bg-white hover:bg-rose-100/60 border border-rose-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        <span>Reset All Demo Data</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Are you sure? All modifications will be erased.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConfirmReset(false)}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => resetMutation.mutate()}
                            disabled={resetMutation.isPending}
                            id="confirm-reset-btn"
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-extrabold bg-rose-600 text-white hover:bg-rose-700 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {resetMutation.isPending ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Resetting...</span>
                              </>
                            ) : (
                              <span>Confirm Reset</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 font-medium text-center">
              QuarantineCare v1.0 · Clinical Demo Environment
            </div>
          </div>
        </div>
      )}
    </>
  );
};
