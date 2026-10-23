import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { getPatientsApi } from '../services/api';
import { useUnit } from '../context/UnitContext';
import {
  Search,
  Flame,
  Thermometer,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export const PatientsDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatTemp, isFever } = useUnit();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['patientsDirectory'],
    queryFn: () => getPatientsApi(),
    refetchInterval: 15000,
  });

  const allPatients = data?.patients || [];

  const filteredPatients = useMemo(() => {
    let list = [...allPatients];

    if (statusFilter !== 'ALL') {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.bedNumber !== undefined && p.bedNumber.toString().includes(q))
      );
    }

    return list.sort((a, b) => {
      // Admitted first, then by bed number
      const statusOrder: Record<string, number> = {
        ADMITTED: 1,
        READY_FOR_DISCHARGE: 2,
        DISCHARGED_CURED: 3,
        DECEASED: 4,
      };
      const diff = (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9);
      if (diff !== 0) return diff;
      return (a.bedNumber ?? 999) - (b.bedNumber ?? 999);
    });
  }, [allPatients, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      <Header />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-4">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Facility Patient Directory
              </h1>
              <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full">
                {allPatients.length} Total Patients
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Complete facility records across admitted, cured, and resolved cases.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-sky-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Toolbar: Search & Status Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="directory-search-input"
              placeholder="Search by patient name or bed #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition shadow-2xs"
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

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto bg-white p-1 rounded-xl border border-slate-200 shadow-2xs select-none">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ADMITTED', label: 'Admitted' },
              { id: 'READY_FOR_DISCHARGE', label: 'Ready for Discharge' },
              { id: 'DISCHARGED_CURED', label: 'Cured (Discharged)' },
              { id: 'DECEASED', label: 'Deceased' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Directory List / Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Bed / Status</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Age · Gender</th>
                  <th className="py-3 px-4">Admitted</th>
                  <th className="py-3 px-4">Last Temp</th>
                  <th className="py-3 px-4">Streak</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isError ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-800">Failed to load directory</p>
                      <button
                        onClick={() => refetch()}
                        className="mt-3 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700 transition cursor-pointer"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                      Loading patient directory...
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No patients match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p) => {
                    const fever = p.lastTemperature !== null && isFever(p.lastTemperature);

                    return (
                      <tr
                        key={p._id}
                        onClick={() => navigate(`/patient/${p._id}`)}
                        className="hover:bg-slate-50/70 transition cursor-pointer select-none"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {p.bedNumber ? (
                              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center border border-slate-200">
                                B{p.bedNumber}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
                                No Bed
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.status === 'ADMITTED'
                                  ? 'bg-sky-100 text-sky-800'
                                  : p.status === 'READY_FOR_DISCHARGE'
                                  ? 'bg-violet-100 text-violet-800'
                                  : p.status === 'DISCHARGED_CURED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {p.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          {p.name}
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {p.age}y · {p.gender}
                        </td>

                        <td className="py-3 px-4 text-slate-500">
                          {new Date(p.admittedAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4">
                          {p.lastTemperature !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-lg text-xs ${
                                fever
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              <Thermometer className="w-3 h-3" />
                              {formatTemp(p.lastTemperature)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-bold text-xs ${
                              p.feverFreeStreak >= 3 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            <Flame className="w-3.5 h-3.5" />
                            {p.feverFreeStreak}d
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="text-xs font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1">
                            <span>Chart</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
