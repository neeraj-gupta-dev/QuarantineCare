import React from 'react';
import { Flame, Check, AlertCircle } from 'lucide-react';

interface StreakIndicatorProps {
  streak: number;
  status: string;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak, status }) => {
  const isCured = streak >= 3;
  const isDeceased = status === 'DECEASED';
  const isDischarged = status === 'DISCHARGED_CURED';

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Flame className={`w-4 h-4 ${isCured ? 'text-emerald-500' : 'text-amber-500'}`} />
              Fever-Free Recovery Streak
            </h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isCured
                  ? 'bg-emerald-100 text-emerald-800'
                  : streak > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {streak} / 3 Days
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Patients require 3 full consecutive calendar days with temperature &lt; 100.4°F (38.0°C) to be certified cured.
          </p>
        </div>

        {isCured && !isDischarged && !isDeceased && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 self-start sm:self-auto shadow-2xs">
            <Check className="w-4 h-4 text-emerald-600" />
            Cure Benchmark Met
          </span>
        )}
      </div>

      {/* 3 Step Circles that fill */}
      <div className="relative flex items-center justify-between max-w-md mx-auto my-2 px-6 sm:px-10">
        {/* Connecting Progress Line */}
        <div className="absolute left-12 right-12 top-1/2 -translate-y-1/2 h-1.5 bg-slate-100 rounded-full z-0 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{
              width: streak >= 3 ? '100%' : streak === 2 ? '66%' : streak === 1 ? '33%' : '0%',
            }}
          />
        </div>

        {/* 3 Circles */}
        {[1, 2, 3].map((dayNum) => {
          const isFilled = streak >= dayNum;
          const isCurrentTarget = streak === dayNum - 1;

          return (
            <div key={dayNum} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 shadow-xs ${
                  isFilled
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 scale-105'
                    : isCurrentTarget
                    ? 'bg-white border-2 border-amber-400 text-amber-700 ring-4 ring-amber-50 animate-pulse'
                    : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}
              >
                {isFilled ? <Check className="w-5 h-5 stroke-[3]" /> : `D${dayNum}`}
              </div>
              <span
                className={`text-[11px] font-bold mt-2 ${
                  isFilled
                    ? 'text-emerald-700'
                    : isCurrentTarget
                    ? 'text-amber-700'
                    : 'text-slate-400'
                }`}
              >
                {dayNum === 3 ? 'Day 3 (Cured)' : `Day ${dayNum}`}
              </span>
            </div>
          );
        })}
      </div>

      {streak === 0 && !isDischarged && !isDeceased && (
        <div className="mt-3 text-center text-xs text-rose-600 font-semibold flex items-center justify-center gap-1.5 bg-rose-50/80 py-1.5 px-3 rounded-lg border border-rose-100">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Active fever or fever recorded today — streak currently reset to 0 days</span>
        </div>
      )}
    </div>
  );
};
