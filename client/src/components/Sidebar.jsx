import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  LayoutDashboard,
  FilePlus,
  List,
  Mail,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', hasBadge: true },
  { to: '/work-orders/new', icon: FilePlus, label: 'New Work Order' },
  { to: '/work-orders', icon: List, label: 'All Work Orders' },
  { to: '/email-logs', icon: Mail, label: 'Email Logs' }
];

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const { profile, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const data = await api.get('/api/work-orders/pending-approval');
        const items = Array.isArray(data) ? data : data.work_orders || [];
        setPendingCount(items.length);
      } catch (err) {
        console.error('Failed to fetch pending count:', err.message);
      }
    }
    fetchPendingCount();
  }, []);

  function handleSignOut() {
    signOut();
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-[#334155]">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-[#F59E0B]" />
          <div className="xl:block hidden lg:hidden">
            <h1 className="text-lg font-bold text-[#F59E0B]">RTCC Tracking</h1>
          </div>
          <div className="block xl:hidden lg:hidden">
            <h1 className="text-lg font-bold text-[#F59E0B]">RTCC Tracking</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onCloseMobile}
            end={item.to === '/work-orders'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-l-2 border-[#F59E0B]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="xl:inline hidden lg:hidden">{item.label}</span>
            <span className="inline xl:hidden lg:hidden">{item.label}</span>
            {item.hasBadge && pendingCount > 0 && (
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#334155]">
        <div className="flex items-center justify-between">
          <div className="xl:block hidden lg:hidden">
            <p className="text-sm text-[#F8FAFC] font-medium truncate">
              {profile?.name || 'User'}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B] mt-1">
              User
            </span>
          </div>
          <div className="block xl:hidden lg:hidden">
            <p className="text-sm text-[#F8FAFC] font-medium truncate">
              {profile?.name || 'User'}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B] mt-1">
              User
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-[#94A3B8] hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-[#1E293B] border-r border-[#334155] z-40 w-16 xl:w-60 transition-all duration-300">
        <div className="flex flex-col h-full">
          <div className="p-4 xl:p-6 border-b border-[#334155]">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-[#F59E0B] flex-shrink-0" />
              <h1 className="text-lg font-bold text-[#F59E0B] hidden xl:block">
                RTCC Tracking
              </h1>
            </div>
          </div>

          <nav className="flex-1 p-2 xl:p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/work-orders'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 xl:px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-l-2 border-[#F59E0B]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
                  }`
                }
                title={item.label}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
                {item.hasBadge && pendingCount > 0 && (
                  <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-2 xl:p-4 border-t border-[#334155]">
            <div className="flex items-center justify-between">
              <div className="hidden xl:block">
                <p className="text-sm text-[#F8FAFC] font-medium truncate">
                  {profile?.name || 'User'}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B] mt-1">
                  User
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-[#94A3B8] hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-[#1E293B] border-r border-[#334155] shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#334155]">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-[#F59E0B]" />
                <h1 className="text-lg font-bold text-[#F59E0B]">RTCC Tracking</h1>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  end={item.to === '/work-orders'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-l-2 border-[#F59E0B]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {item.hasBadge && pendingCount > 0 && (
                    <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#334155]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#F8FAFC] font-medium truncate">
                    {profile?.name || 'User'}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B] mt-1">
                    User
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-[#94A3B8] hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
