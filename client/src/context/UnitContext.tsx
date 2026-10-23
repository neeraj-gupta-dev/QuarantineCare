import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type TempUnit = 'F' | 'C';

interface UnitContextType {
  unit: TempUnit;
  toggleUnit: () => void;
  setUnit: (unit: TempUnit) => void;
  formatTemp: (valueF: number | null | undefined, includeUnit?: boolean) => string;
  toDisplayValue: (valueF: number) => number;
  fromDisplayValue: (displayVal: number) => number;
  isFever: (valueF: number | null | undefined) => boolean;
  thresholdDisplay: string;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export const UnitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [unit, setUnitState] = useState<TempUnit>(() => {
    const saved = localStorage.getItem('qc_temp_unit');
    return saved === 'C' ? 'C' : 'F';
  });

  const setUnit = (newUnit: TempUnit) => {
    setUnitState(newUnit);
    localStorage.setItem('qc_temp_unit', newUnit);
  };

  const toggleUnit = () => {
    setUnit(unit === 'F' ? 'C' : 'F');
  };

  // Convert F to C with 1 decimal precision
  const toDisplayValue = (valueF: number): number => {
    if (unit === 'F') return Math.round(valueF * 10) / 10;
    const c = ((valueF - 32) * 5) / 9;
    return Math.round(c * 10) / 10;
  };

  // Convert input in current display unit back to F
  const fromDisplayValue = (displayVal: number): number => {
    if (unit === 'F') return displayVal;
    const f = (displayVal * 9) / 5 + 32;
    return Math.round(f * 10) / 10;
  };

  const isFever = (valueF: number | null | undefined): boolean => {
    if (valueF === null || valueF === undefined) return false;
    return valueF >= 100.4;
  };

  const formatTemp = (valueF: number | null | undefined, includeUnit: boolean = true): string => {
    if (valueF === null || valueF === undefined) return '—';
    const num = toDisplayValue(valueF).toFixed(1);
    return includeUnit ? `${num}°${unit}` : num;
  };

  const thresholdDisplay = unit === 'F' ? '100.4°F' : '38.0°C';

  return (
    <UnitContext.Provider
      value={{
        unit,
        toggleUnit,
        setUnit,
        formatTemp,
        toDisplayValue,
        fromDisplayValue,
        isFever,
        thresholdDisplay,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = (): UnitContextType => {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
};
