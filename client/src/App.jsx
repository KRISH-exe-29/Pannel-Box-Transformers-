import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { WifiOff, RefreshCw } from 'lucide-react';

// Layouts
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import WorkOrderList from './pages/WorkOrderList';
import WorkOrderNew from './pages/WorkOrderNew';
import WorkOrderView from './pages/WorkOrderView';
import WorkOrderEdit from './pages/WorkOrderEdit';
import EmailLogs from './pages/EmailLogs';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AdminEmailLogs from './pages/admin/AdminEmailLogs';
import AdminSettings from './pages/admin/AdminSettings';
import AdminLogs from './pages/admin/AdminLogs';

export default function App() {
  const { profile, loading, authError, signOut } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  // Show global connection error screen if auth completely fails to initialize
  if (authError && !profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">Connection Failed</h2>
          <p className="text-[#94A3B8] text-sm leading-relaxed">
            {authError}
          </p>
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#F59E0B] text-[#0F172A] font-semibold hover:bg-[#D97706] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
            <button
              onClick={signOut}
              className="text-sm text-[#94A3B8] hover:text-[#F8FAFC] underline transition-colors"
            >
              Sign Out and Log In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Redirect root to dashboard based on role */}
      <Route 
        path="/" 
        element={
          profile?.role === 'admin' 
            ? <Navigate to="/admin/dashboard" replace /> 
            : <Navigate to="/dashboard" replace />
        } 
      />

      {/* User Routes */}
      <Route element={<ProtectedRoute requiredRole="user"><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/work-orders" element={<WorkOrderList />} />
        <Route path="/work-orders/new" element={<WorkOrderNew />} />
        <Route path="/work-orders/:id" element={<WorkOrderView />} />
        <Route path="/work-orders/:id/edit" element={<WorkOrderEdit />} />
        <Route path="/email-logs" element={<EmailLogs />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute requiredRole="admin"><Layout /></ProtectedRoute>}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/work-orders" element={<WorkOrderList />} />
        <Route path="/admin/work-orders/:id" element={<WorkOrderView />} />
        <Route path="/admin/work-orders/:id/edit" element={<WorkOrderEdit />} />
        <Route path="/admin/email-logs" element={<AdminEmailLogs />} />
        <Route path="/admin/system-logs" element={<AdminLogs />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
