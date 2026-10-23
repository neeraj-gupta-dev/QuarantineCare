import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnit } from '../context/UnitContext';
import type { Patient } from '../types';

interface BedMapProps {
  patients: Patient[];
}

export const BedMap: React.FC<BedMapProps> = ({ patients }) => {
  const navigate = useNavigate();
  const { formatTemp, isFever } = useUnit();

  // Create a fast map from bedNumber (1..74) -> Patient
  const bedMap = new Map<number, Patient>();
  for (const p of patients) {
    if (p.bedNumber && (p.status === 'ADMITTED' || p.status === 'READY_FOR_DISCHARGE')) {
      bedMap.set(p.bedNumber, p);
    }
  }

  // Bed status determination:
  // - Grey = empty
  // - Red = febrile (current fever >= 100.4°F)
  // - Green = streak 3+ (cured)
  // - Yellow = recovering (streak 1 or 2, without active fever)
  const getBedStatus = (patient?: Patient) => {
    if (!patient) {
      return {
        color: 'bg-slate-200 hover:bg-slate-300 text-slate-500 border-slate-300',
        label: 'Empty',
        category: 'empty',
      };
    }

    const hasFever = patient.lastTemperature !== null && isFever(patient.lastTemperature);

    if (hasFever) {
      return {
        color: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-xs ring-1 ring-rose-300',
        label: 'Febrile',
        category: 'febrile',
      };
    }

    if (patient.feverFreeStreak >= 3) {
      return {
        color: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-300',
        label: 'Streak 3+ (Cured)',
        category: 'cured',
      };
    }

    return {
      color: 'bg-amber-400 hover:bg-amber-500 text-slate-900 border-amber-500 shadow-xs ring-1 ring-amber-200',
      label: 'Recovering (Streak 1-2)',
      category: 'recovering',
    };
  };

  const beds = Array.from({ length: 74 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            74-Bed Live Facility Map
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Interactive bedside status overview. Click any occupied bed to open patient chart.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-bold flex-wrap select-none">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600"></span>
            Streak 3+ (Cured)
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500"></span>
            Recovering (1-2d)
          </span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600"></span>
            Febrile (Fever)
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300"></span>
            Empty Bed
          </span>
        </div>
      </div>

      {/* 74 Grid Squares */}
      <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 gap-1.5 sm:gap-2">
        {beds.map((bedNum) => {
          const patient = bedMap.get(bedNum);
          const { color, label } = getBedStatus(patient);

          return (
            <div
              key={bedNum}
              onClick={() => {
                if (patient) {
                  navigate(`/patient/${patient._id}`);
                }
              }}
              title={
                patient
                  ? `Bed ${bedNum}: ${patient.name}\nStatus: ${label}\nLast Temp: ${
                      patient.lastTemperature !== null ? formatTemp(patient.lastTemperature) : '—'
                    }\nStreak: ${patient.feverFreeStreak} days`
                  : `Bed ${bedNum}: Empty`
              }
              className={`h-9 sm:h-11 rounded-lg border font-black text-xs flex flex-col items-center justify-center transition-all select-none ${color} ${
                patient ? 'cursor-pointer active:scale-95' : 'cursor-default'
              }`}
            >
              <span className="text-[10px] sm:text-xs leading-none font-black">{bedNum}</span>
              {patient && (
                <span className="text-[8px] font-bold opacity-90 leading-none mt-0.5">
                  {patient.feverFreeStreak}d
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
