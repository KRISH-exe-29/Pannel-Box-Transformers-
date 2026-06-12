import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, AlertCircle, CheckCircle, Calendar, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import SummaryCard from '../../components/SummaryCard';
import StatusBadge from '../../components/StatusBadge';
import ApprovalBanner from '../../components/ApprovalBanner';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryData, recentData] = await Promise.all([
        api.get('/api/work-orders/summary'),
        api.get('/api/work-orders?limit=5')
      ]);
      setStats(summaryData);
      const orders = Array.isArray(recentData) ? recentData : recentData.work_orders || [];
      setRecentWorkOrders(orders.slice(0, 5));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-[#F59E0B]" />
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Admin Overview</h1>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] bg-[#1E293B] border border-[#334155] rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
          title="Refresh Dashboard"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium hidden sm:inline">Refresh</span>
        </button>
      </div>

      <ApprovalBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <SummaryCard 
          title="Total Work Orders" 
          value={stats?.summary?.total_work_orders || 0} 
          icon={FileText} 
        />
        <SummaryCard 
          title="Open Pending Points" 
          value={stats?.summary?.open_pending_points || 0} 
          icon={AlertCircle} 
          color={stats?.summary?.open_pending_points > 0 ? 'red' : 'amber'}
        />
        <SummaryCard 
          title="Resolved This Month" 
          value={stats?.summary?.resolved_this_month || 0} 
          icon={CheckCircle} 
          color="green"
        />
        <SummaryCard 
          title="Work Orders This Month" 
          value={stats?.summary?.work_orders_this_month || 0} 
          icon={Calendar} 
        />
        <SummaryCard 
          title="Total Active Users" 
          value={stats?.summary?.total_active_users || 0} 
          icon={Users} 
        />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Recent Work Orders (All Users)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#334155] text-sm text-[#94A3B8]">
                <th className="pb-3 pr-4 font-medium">Work Order No</th>
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Rating (MVA)</th>
                <th className="pb-3 pr-4 font-medium">Received Date</th>
                <th className="pb-3 pr-4 font-medium">Created By</th>
                <th className="pb-3 pr-4 font-medium">Pending Points</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentWorkOrders.map((wo, index) => {
                const pendingPointsCount = wo.open_pending_points_count || wo.open_pending_points || 0;
                return (
                  <tr 
                    key={wo.id} 
                    className={`border-b border-[#334155]/50 transition-colors
                      ${index % 2 === 0 ? 'bg-[#0F172A]/50' : 'bg-[#1E293B]'}
                      ${pendingPointsCount > 0 ? 'border-l-4 border-l-red-500' : ''}
                    `}
                  >
                    <td className="py-3 pr-4 text-[#F8FAFC]">{wo.work_order_number}</td>
                    <td className="py-3 pr-4 text-[#F8FAFC]">{wo.customer_name}</td>
                    <td className="py-3 pr-4 text-[#94A3B8]">{wo.rating_mva}</td>
                    <td className="py-3 pr-4 text-[#94A3B8]">{wo.received_date ? new Date(wo.received_date).toLocaleDateString() : '-'}</td>
                    <td className="py-3 pr-4 text-[#94A3B8]">{wo.profiles?.name || '-'}</td>
                    <td className="py-3 pr-4">
                      {pendingPointsCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                          {pendingPointsCount} Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                          All Closed
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={pendingPointsCount > 0 ? 'open' : 'closed'} />
                    </td>
                    <td className="py-3 text-right">
                      <Link 
                        to={`/admin/work-orders/${wo.id}`}
                        className="inline-flex items-center justify-center p-2 text-[#94A3B8] hover:text-[#F59E0B] transition-colors rounded-lg hover:bg-[#F59E0B]/10"
                        title="View Work Order"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {recentWorkOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-[#94A3B8]">
                    No work orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
