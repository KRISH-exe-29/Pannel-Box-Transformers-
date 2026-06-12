import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import AdminSidebar from './AdminSidebar';

export default function Layout() {
  const { profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {isAdmin ? (
        <AdminSidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      ) : (
        <Sidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile header with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#1E293B] border-b border-[#334155] px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-white/5"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Main content */}
      <main className="md:ml-16 xl:ml-60 transition-all duration-300 min-h-screen">
        <div className="p-4 md:p-8 pt-16 md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
