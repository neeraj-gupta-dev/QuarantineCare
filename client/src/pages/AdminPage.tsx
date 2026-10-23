import React from 'react';
import { Header } from '../components/Header';
import { ShieldCheck } from 'lucide-react';

export const AdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto w-full px-4 py-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Admin Portal</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Facility occupancy, admissions, discharge approvals, and mortality compliance.
        </p>
      </main>
    </div>
  );
};
