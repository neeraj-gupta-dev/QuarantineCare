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
import { useUnit } from '../context/UnitContext';
import type { TemperatureReading } from '../types';

interface TemperatureChartProps {
  readings: TemperatureReading[];
}

export const TemperatureChart: React.FC<TemperatureChartProps> = ({ readings }) => {
  const { unit, toDisplayValue, isFever } = useUnit();

  // Sort readings chronologically: oldest to newest
  const sorted = [...readings].sort((a, b) => {
    const dComp = a.dayKey.localeCompare(b.dayKey);
    if (dComp !== 0) return dComp;
    return new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
  });

  const chartData = sorted.map((r, index) => {
    const displayTemp = toDisplayValue(r.valueF);
    const hasFever = isFever(r.valueF);
    const dateObj = new Date(r.recordedAt);
    const timeLabel = isNaN(dateObj.getTime())
      ? ''
      : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      index,
      dayKey: r.dayKey,
      label: `${r.dayKey.slice(5)} ${r.isCorrection ? '(Corr)' : ''}`,
      fullDate: r.dayKey,
      time: timeLabel,
      temp: displayTemp,
      valueF: r.valueF,
      hasFever,
      isCorrection: r.isCorrection,
      correctionReason: r.correctionReason,
      recordedBy: typeof r.recordedBy === 'object' && r.recordedBy ? r.recordedBy.name : 'Nurse',
    };
  });

  const thresholdVal = unit === 'F' ? 100.4 : 38.0;
  const yDomain = unit === 'F' ? [95, 105] : [35, 41];

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-400 text-xs font-medium">
        No temperature readings recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            Temperature Trend Curve
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Daily temperature readings with fever threshold line ({thresholdVal}°{unit}).
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Normal (&lt; {thresholdVal}°)
          </span>
          <span className="flex items-center gap-1.5 text-rose-600">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            Fever (≥ {thresholdVal}°)
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={yDomain}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(v) => `${v}°`}
            />

            {/* Fever Threshold Dashed Reference Line */}
            <ReferenceLine
              y={thresholdVal}
              stroke="#f43f5e"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `Fever Line (${thresholdVal}°${unit})`,
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
                      <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold border-b border-slate-700 pb-1 mb-1.5">
                        <span>{d.fullDate}</span>
                        <span>{d.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-base">
                          {d.temp}°{unit}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            d.hasFever ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {d.hasFever ? 'FEVER' : 'NORMAL'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Recorded by: <strong className="text-slate-200">{d.recordedBy}</strong>
                      </div>
                      {d.isCorrection && (
                        <div className="text-[10px] text-amber-300 mt-1 pt-1 border-t border-slate-700">
                          Correction: {d.correctionReason || 'Revised reading'}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Line
              type="monotone"
              dataKey="temp"
              stroke="#0284c7"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isFev = payload.hasFever;
                return (
                  <circle
                    key={`dot-${payload.index}`}
                    cx={cx}
                    cy={cy}
                    r={payload.isCorrection ? 5.5 : 4.5}
                    fill={isFev ? '#f43f5e' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="shadow-xs"
                  />
                );
              }}
              activeDot={{ r: 6.5, stroke: '#0284c7', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
