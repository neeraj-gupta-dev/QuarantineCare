import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface MortalityChartProps {
  data: {
    week: string;
    deceased: number;
    discharged: number;
    total: number;
    mortalityRate: number;
  }[];
}

export const MortalityChart: React.FC<MortalityChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-400 text-xs font-medium">
        No mortality trend data available yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            Mortality Rate Trend Over Time
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Weekly resolved patient mortality rate vs 15% virus benchmark.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold select-none">
          <span className="flex items-center gap-1.5 text-indigo-600">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Facility Rate (%)
          </span>
          <span className="flex items-center gap-1.5 text-rose-600">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-rose-500"></span>
            15% Expected Benchmark
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="week"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={[0, 25]}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(v) => `${v}%`}
            />

            {/* 15% Benchmark Reference Line */}
            <ReferenceLine
              y={15}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '15% Expected Mortality Benchmark',
                position: 'top',
                fill: '#f43f5e',
                fontSize: 10,
                fontWeight: 700,
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 min-w-44">
                      <div className="text-[10px] text-slate-400 font-bold border-b border-slate-700 pb-1 mb-1.5">
                        {d.week}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-300">Mortality Rate:</span>
                        <span
                          className={`font-black text-sm ${
                            d.mortalityRate > 15 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {d.mortalityRate}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1.5 space-y-0.5">
                        <div>Deceased: <strong className="text-white">{d.deceased}</strong></div>
                        <div>Discharged: <strong className="text-white">{d.discharged}</strong></div>
                        <div>Total Resolved: <strong className="text-white">{d.total}</strong></div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Line
              type="monotone"
              dataKey="mortalityRate"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={{ r: 4.5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
