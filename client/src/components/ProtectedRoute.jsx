import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole }) {
  const { profile, loading, authError, signOut } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  // Show connection error screen instead of blank page
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

  // Not logged in — redirect to login
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Role guard
  if (requiredRole && profile.role !== requiredRole) {
    if (profile.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // Regular user trying to access admin — send to login, not dashboard
    return <Navigate to="/login" replace />;
  }

  return children;
}
