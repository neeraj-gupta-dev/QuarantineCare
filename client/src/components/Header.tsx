import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUnit } from '../context/UnitContext';
import { NotificationBell } from './NotificationBell';
import { LogOut, Activity, User as UserIcon } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { unit, toggleUnit } = useUnit();
  const location = useLocation();

  if (!user) return null;

  const roleStyles = {
    nurse: {
      bg: 'bg-sky-50 text-sky-700 border-sky-200',
      label: 'NURSE',
    },
    doctor: {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'DOCTOR',
    },
    admin: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'ADMIN',
    },
  }[user.role];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo + Nav Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg leading-none">
                  QuarantineCare
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  74 BEDS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Virus Quarantine & Treatment Facility
              </p>
            </div>
          </Link>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-600">
            {user.role === 'admin' && (
              <>
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg transition ${
                    location.pathname === '/admin'
                      ? 'bg-amber-100 text-amber-900 font-extrabold'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/discharges"
                  className={`px-3 py-1.5 rounded-lg transition ${
                    location.pathname === '/admin/discharges'
                      ? 'bg-amber-100 text-amber-900 font-extrabold'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Discharges
                </Link>
                <Link
                  to="/admin/admit"
                  className={`px-3 py-1.5 rounded-lg transition ${
                    location.pathname === '/admin/admit'
                      ? 'bg-amber-100 text-amber-900 font-extrabold'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Admit Patient
                </Link>
              </>
            )}

            {user.role === 'doctor' && (
              <Link
                to="/doctor"
                className={`px-3 py-1.5 rounded-lg transition ${
                  location.pathname === '/doctor'
                    ? 'bg-indigo-100 text-indigo-900 font-extrabold'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Rounds
              </Link>
            )}

            {user.role === 'nurse' && (
              <Link
                to="/nurse"
                className={`px-3 py-1.5 rounded-lg transition ${
                  location.pathname === '/nurse'
                    ? 'bg-sky-100 text-sky-900 font-extrabold'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Temp Round
              </Link>
            )}

            {/* Shared Directory visible to all roles */}
            <Link
              to="/patients"
              className={`px-3 py-1.5 rounded-lg transition ${
                location.pathname === '/patients'
                  ? 'bg-slate-200 text-slate-900 font-extrabold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              Directory
            </Link>
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Notification Bell */}
          <NotificationBell />

          {/* °F / °C Toggle Pill */}
          <button
            onClick={toggleUnit}
            id="temp-unit-toggle"
            title={`Switch to °${unit === 'F' ? 'C' : 'F'}`}
            className="flex items-center bg-slate-100 hover:bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold transition-colors cursor-pointer select-none"
          >
            <span
              className={`px-2 py-1 rounded-md transition-all ${
                unit === 'F'
                  ? 'bg-white text-sky-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              °F
            </span>
            <span
              className={`px-2 py-1 rounded-md transition-all ${
                unit === 'C'
                  ? 'bg-white text-sky-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              °C
            </span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</div>
              <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-bold border ${roleStyles.bg}`}>
                {roleStyles.label}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            id="logout-button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors ml-1 cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="md:hidden flex items-center justify-around py-1.5 px-2 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-600 overflow-x-auto">
        {user.role === 'admin' && (
          <>
            <Link to="/admin" className={`px-2 py-1 rounded ${location.pathname === '/admin' ? 'text-amber-800 font-extrabold' : ''}`}>
              Dashboard
            </Link>
            <Link to="/admin/discharges" className={`px-2 py-1 rounded ${location.pathname === '/admin/discharges' ? 'text-amber-800 font-extrabold' : ''}`}>
              Discharges
            </Link>
            <Link to="/admin/admit" className={`px-2 py-1 rounded ${location.pathname === '/admin/admit' ? 'text-amber-800 font-extrabold' : ''}`}>
              Admit
            </Link>
          </>
        )}
        {user.role === 'doctor' && (
          <Link to="/doctor" className={`px-2 py-1 rounded ${location.pathname === '/doctor' ? 'text-indigo-800 font-extrabold' : ''}`}>
            Rounds
          </Link>
        )}
        {user.role === 'nurse' && (
          <Link to="/nurse" className={`px-2 py-1 rounded ${location.pathname === '/nurse' ? 'text-sky-800 font-extrabold' : ''}`}>
            Temp Round
          </Link>
        )}
        <Link to="/patients" className={`px-2 py-1 rounded ${location.pathname === '/patients' ? 'text-slate-900 font-extrabold' : ''}`}>
          Directory
        </Link>
      </div>
    </header>
  );
};
