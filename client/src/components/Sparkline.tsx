import React from 'react';
import { useUnit } from '../context/UnitContext';
import type { TemperatureReading } from '../types';

interface SparklineProps {
  readings: TemperatureReading[];
}

export const Sparkline: React.FC<SparklineProps> = ({ readings }) => {
  const { toDisplayValue, isFever, unit } = useUnit();

  // Extract last 5 readings, sorted chronologically (oldest to newest)
  const sorted = [...readings]
    .filter((r) => !r.isCorrection)
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
    .slice(-5);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
        No previous readings on record
      </div>
    );
  }

  // SVG coordinate dimensions
  const width = 320;
  const height = 90;
  const paddingX = 35;
  const paddingY = 20;

  // Temperature scale range in °F
  const minF = Math.min(96, ...sorted.map((r) => r.valueF));
  const maxF = Math.max(104, ...sorted.map((r) => r.valueF));
  const rangeF = maxF - minF || 1;

  // Function to map (index, valueF) to (x, y)
  const getX = (index: number) => {
    if (sorted.length === 1) return width / 2;
    return paddingX + (index / (sorted.length - 1)) * (width - paddingX * 2);
  };

  const getY = (valF: number) => {
    const norm = (valF - minF) / rangeF;
    return height - paddingY - norm * (height - paddingY * 2);
  };

  // Fever threshold line Y (100.4°F)
  const thresholdY = getY(100.4);

  // SVG path line
  const points = sorted.map((r, i) => `${getX(i)},${getY(r.valueF)}`).join(' ');

  return (
    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
        <span>Recent 5 Readings Trend</span>
        <span className="flex items-center gap-1.5 text-[10px] text-rose-600 font-medium">
          <span className="inline-block w-3 h-0.5 bg-rose-400 border-b border-dashed border-rose-500"></span>
          Fever Threshold ({unit === 'F' ? '100.4°F' : '38.0°C'})
        </span>
      </div>

      <div className="relative w-full flex justify-center overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 select-none">
          {/* Threshold guideline */}
          <line
            x1={paddingX - 15}
            y1={thresholdY}
            x2={width - paddingX + 15}
            y2={thresholdY}
            stroke="#f43f5e"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.75"
          />

          {/* Connected Polyline */}
          {sorted.length > 1 && (
            <polyline
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          )}

          {/* Dots and Value Labels */}
          {sorted.map((r, i) => {
            const cx = getX(i);
            const cy = getY(r.valueF);
            const fever = isFever(r.valueF);
            const displayVal = toDisplayValue(r.valueF).toFixed(1);
            // Day label (e.g. "10-22" or "D-2")
            const dayLabel = r.dayKey.slice(5);

            return (
              <g key={r._id || i}>
                {/* Dot outer halo */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  className={fever ? 'fill-rose-100' : 'fill-emerald-100'}
                />
                {/* Center dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  className={fever ? 'fill-rose-600' : 'fill-emerald-600'}
                />

                {/* Value text above */}
                <text
                  x={cx}
                  y={cy - 9}
                  textAnchor="middle"
                  className={`text-[10px] font-bold ${fever ? 'fill-rose-700' : 'fill-emerald-700'}`}
                >
                  {displayVal}°
                </text>

                {/* Day label below */}
                <text
                  x={cx}
                  y={height - 2}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-medium"
                >
                  {dayLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
