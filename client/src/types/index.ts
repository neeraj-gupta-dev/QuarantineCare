export type Role = 'nurse' | 'doctor' | 'admin';

export type PatientStatus =
  | 'ADMITTED'
  | 'READY_FOR_DISCHARGE'
  | 'DISCHARGED_CURED'
  | 'DECEASED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TemperatureReading {
  _id: string;
  patient: string;
  valueF: number;
  recordedBy: { _id: string; name: string; role: Role } | string;
  recordedAt: string;
  dayKey: string;
  isCorrection: boolean;
  correctionReason?: string;
}

export interface DoctorVisit {
  _id: string;
  patient: string;
  doctor: { _id: string; name: string; role: Role } | string;
  visitedAt: string;
  dayKey: string;
  treatmentNotes?: string;
  medication?: string;
}

export interface AuditLog {
  _id: string;
  actor: { _id: string; name: string; role: Role } | string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface Patient {
  _id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'OTHER';
  bedNumber?: number;
  admittedAt: string;
  status: PatientStatus;
  notes?: string;
  todayTempDone: boolean;
  todayDoctorVisited: boolean;
  lastTemperature: number | null;
  feverFreeStreak: number;
  isFeverNow: boolean | null;
  dischargeRecommendedBy?: { _id: string; name: string; email: string; role: Role } | string;
  dischargeRecommendedAt?: string;
  dischargedAt?: string;
  deceasedAt?: string;
  deathCause?: string;
  readings?: TemperatureReading[];
  visits?: DoctorVisit[];
  auditLogs?: AuditLog[];
}

export interface PatientDetail extends Patient {
  readings: TemperatureReading[];
  visits: DoctorVisit[];
  auditLogs: AuditLog[];
}

export interface DashboardData {
  today: string;
  occupancy: {
    total: number;
    occupied: number;
    available: number;
  };
  compliance: {
    totalActive: number;
    tempsDone: number;
    tempsPending: number;
    visitsDone: number;
    visitsPending: number;
  };
  pendingDischarges: number;
  outcomes: {
    discharged: number;
    deceased: number;
    total: number;
    mortalityRate: number;
    successRate: number;
  };
  mortalityOverTime: {
    week: string;
    deceased: number;
    discharged: number;
    total: number;
    mortalityRate: number;
  }[];
}

export interface NotificationItem {
  _id: string;
  toRole: Role;
  patient?: { _id: string; name: string; bedNumber?: number; status: PatientStatus };
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}
