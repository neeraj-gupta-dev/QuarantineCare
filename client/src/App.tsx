import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UnitProvider } from './context/UnitContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { NursePage } from './pages/NursePage';
import { DoctorPage } from './pages/DoctorPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { DischargesPage } from './pages/DischargesPage';
import { AdmitPatientPage } from './pages/AdmitPatientPage';
import { PatientsDirectoryPage } from './pages/PatientsDirectoryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
      retry: 1,
    },
  },
});

// Root redirect based on auth status and role
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'nurse') return <Navigate to="/nurse" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;

  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UnitProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Nurse Home */}
              <Route
                path="/nurse"
                element={
                  <ProtectedRoute allowedRoles={['nurse']}>
                    <NursePage />
                  </ProtectedRoute>
                }
              />

              {/* Doctor Home */}
              <Route
                path="/doctor"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorPage />
                  </ProtectedRoute>
                }
              />

              {/* Patient Chart Detail (Nurses have read-only view) */}
              <Route
                path="/patient/:id"
                element={
                  <ProtectedRoute allowedRoles={['nurse', 'doctor', 'admin']}>
                    <PatientDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Portal Pages */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/discharges"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DischargesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/admit"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdmitPatientPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Patient Directory (visible to all roles) */}
              <Route
                path="/patients"
                element={
                  <ProtectedRoute allowedRoles={['nurse', 'doctor', 'admin']}>
                    <PatientsDirectoryPage />
                  </ProtectedRoute>
                }
              />

              {/* Default root & fallback */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </UnitProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
