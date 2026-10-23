export { default as User } from './User';
export { default as Patient } from './Patient';
export { default as TemperatureReading } from './TemperatureReading';
export { default as DoctorVisit } from './DoctorVisit';
export { default as Notification } from './Notification';
export { default as AuditLog } from './AuditLog';
export { default as Setting } from './Setting';

// Re-export types
export type { IUser, UserRole } from './User';
export type { IPatient, PatientStatus, Gender } from './Patient';
export type { ITemperatureReading } from './TemperatureReading';
export type { IDoctorVisit } from './DoctorVisit';
export type { INotification } from './Notification';
export type { IAuditLog } from './AuditLog';
export type { ISetting } from './Setting';
