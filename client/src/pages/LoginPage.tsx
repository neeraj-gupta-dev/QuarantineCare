import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, Stethoscope, UserCheck, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      redirectForRole(user.role);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'nurse' | 'doctor' | 'admin') => {
    setActiveDemo(role);
    setError(null);
    try {
      const user = await demoLogin(role);
      redirectForRole(user.role);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to sign in as ${role}`);
    } finally {
      setActiveDemo(null);
    }
  };

  const redirectForRole = (role: string) => {
    if (role === 'nurse') navigate('/nurse');
    else if (role === 'doctor') navigate('/doctor');
    else if (role === 'admin') navigate('/admin');
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background clinical styling accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white shadow-lg shadow-sky-500/25 mb-3">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            QuarantineCare
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
            Virus Quarantine & Treatment Facility · 74 Bed Capacity
          </p>
        </div>

        {/* Card */}
        <div className="mt-7 bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Standard Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nurse@demo.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={isLoading || !!activeDemo}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-98 shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">
                Or Quick Demo Sign-In
              </span>
            </div>
          </div>

          {/* Three Quick-Login Buttons */}
          <div className="space-y-2.5">
            {/* Demo Nurse */}
            <button
              type="button"
              id="demo-nurse-btn"
              disabled={isLoading || !!activeDemo}
              onClick={() => handleQuickLogin('nurse')}
              className="w-full py-2.5 px-3.5 bg-sky-50 hover:bg-sky-100/80 active:bg-sky-100 text-sky-800 rounded-xl border border-sky-200/80 text-xs font-bold flex items-center justify-between transition cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="leading-tight font-extrabold">Demo as Nurse</div>
                  <div className="text-[10px] text-sky-600 font-medium">nurse@demo.com · Daily temp rounds</div>
                </div>
              </div>
              {activeDemo === 'nurse' ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              ) : (
                <ArrowRight className="w-4 h-4 text-sky-500" />
              )}
            </button>

            {/* Demo Doctor */}
            <button
              type="button"
              id="demo-doctor-btn"
              disabled={isLoading || !!activeDemo}
              onClick={() => handleQuickLogin('doctor')}
              className="w-full py-2.5 px-3.5 bg-indigo-50 hover:bg-indigo-100/80 active:bg-indigo-100 text-indigo-800 rounded-xl border border-indigo-200/80 text-xs font-bold flex items-center justify-between transition cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="leading-tight font-extrabold">Demo as Doctor</div>
                  <div className="text-[10px] text-indigo-600 font-medium">doctor@demo.com · Rounds & discharge</div>
                </div>
              </div>
              {activeDemo === 'doctor' ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <ArrowRight className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {/* Demo Admin */}
            <button
              type="button"
              id="demo-admin-btn"
              disabled={isLoading || !!activeDemo}
              onClick={() => handleQuickLogin('admin')}
              className="w-full py-2.5 px-3.5 bg-amber-50 hover:bg-amber-100/80 active:bg-amber-100 text-amber-800 rounded-xl border border-amber-200/80 text-xs font-bold flex items-center justify-between transition cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="leading-tight font-extrabold">Demo as Admin</div>
                  <div className="text-[10px] text-amber-600 font-medium">admin@demo.com · Admissions & dashboard</div>
                </div>
              </div>
              {activeDemo === 'admin' ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              ) : (
                <ArrowRight className="w-4 h-4 text-amber-500" />
              )}
            </button>
          </div>
        </div>

        {/* Footer credentials reminder */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Demo password for all accounts: <strong className="text-slate-600 font-mono">demo123</strong>
        </p>
      </div>
    </div>
  );
};
