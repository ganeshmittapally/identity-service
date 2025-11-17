import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { ErrorBoundary } from '@components/ErrorBoundary';
import Layout from '@components/Layout/Layout';
import { LoginPage, RegisterPage, DashboardPage, ClientsPage, ProfilePage, AdminPage, AuditLogPage, PasswordResetPage, DeviceManagementPage } from '@pages/index';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />

          {/* Protected Routes */}
          <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/devices" element={<DeviceManagementPage />} />
            <Route path="/audit-logs" element={<AuditLogPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
