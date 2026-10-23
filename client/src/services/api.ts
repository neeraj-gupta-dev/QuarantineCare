import axios from 'axios';
import type { Patient, PatientDetail, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qc_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-logout if we're already on /login
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('qc_token');
        localStorage.removeItem('qc_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export async function loginApi(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

// Patients endpoints
export interface GetPatientsParams {
  status?: string;
  search?: string;
  todayTemp?: 'pending' | 'done';
  todayVisit?: 'pending' | 'done';
}

export async function getPatientsApi(params?: GetPatientsParams): Promise<{
  today: string;
  count: number;
  patients: Patient[];
}> {
  const res = await api.get('/patients', { params });
  return res.data;
}

export async function getPatientDetailApi(id: string): Promise<PatientDetail> {
  const res = await api.get(`/patients/${id}`);
  return res.data;
}

export async function recordTemperatureApi(
  patientId: string,
  data: { valueF: number; isCorrection?: boolean; correctionReason?: string }
): Promise<any> {
  const res = await api.post(`/patients/${patientId}/temperature`, data);
  return res.data;
}

export async function recordDoctorVisitApi(
  patientId: string,
  data: { treatmentNotes: string; medication?: string }
): Promise<any> {
  const res = await api.post(`/patients/${patientId}/visit`, data);
  return res.data;
}

export async function recommendDischargeApi(patientId: string): Promise<any> {
  const res = await api.post(`/patients/${patientId}/recommend-discharge`);
  return res.data;
}

export async function markDeceasedApi(
  patientId: string,
  data: { cause: string }
): Promise<any> {
  const res = await api.post(`/patients/${patientId}/deceased`, data);
  return res.data;
}

export async function approveDischargeApi(patientId: string): Promise<any> {
  const res = await api.post(`/patients/${patientId}/approve-discharge`);
  return res.data;
}

export async function admitPatientApi(data: {
  name: string;
  age: number;
  gender: string;
  notes?: string;
}): Promise<Patient> {
  const res = await api.post('/patients', data);
  return res.data;
}

// Dashboard endpoint
export async function getDashboardApi(): Promise<import('../types').DashboardData> {
  const res = await api.get('/dashboard');
  return res.data;
}

// Notification endpoints
export async function getNotificationsApi(): Promise<{
  unreadCount: number;
  notifications: import('../types').NotificationItem[];
}> {
  const res = await api.get('/notifications');
  return res.data;
}

export async function markNotificationsReadApi(ids?: string[]): Promise<{ message: string }> {
  const res = await api.patch('/notifications', { ids });
  return res.data;
}

// Demo endpoints
export async function advanceNextDayApi(): Promise<{ message: string; dayOffset: number; today: string }> {
  const res = await api.post('/demo/next-day');
  return res.data;
}

export async function resetDatabaseApi(): Promise<{ message: string }> {
  const res = await api.post('/demo/reset');
  return res.data;
}
