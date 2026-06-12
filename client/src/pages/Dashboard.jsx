import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  Eye,
  RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import ApprovalBanner from '../components/ApprovalBanner';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const [summary, setSummary] = useState({
    total_work_orders: 0,
    open_pending_points: 0,
    resolved_this_month: 0,
    work_orders_this_month: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function fetchData() {
    setLoading(true);
    try {
      const [summaryData, ordersData] = await Promise.all([
        api.get('/api/work-orders/summary').catch(() => ({})),
        api.get('/api/work-orders?limit=5').catch(() => [])
      ]);
      setSummary({
        total_work_orders: summaryData.summary?.total_work_orders || 0,
        open_pending_points: summaryData.summary?.open_pending_points || 0,
        resolved_this_month: summaryData.summary?.resolved_this_month || 0,
        work_orders_this_month: summaryData.summary?.work_orders_this_month || 0
      });
      const orders = Array.isArray(ordersData) ? ordersData : ordersData.work_orders || [];
      setRecentOrders(orders.slice(0, 5));
    } catch (err) {
      console.error('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function getOpenPendingCount(order) {
    if (order.open_pending_count !== undefined) return order.open_pending_count;
    if (order.pending_points) {
      return order.pending_points.filter((pp) => pp.status === 'open').length;
    }
    return 0;
  }

  if (loading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-[#F59E0B]" />
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Dashboard</h1>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] bg-[#1E293B] border border-[#334155] rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
          title="Refresh Dashboard"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium hidden sm:inline">Refresh</span>
        </button>
      </div>

      <ApprovalBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Work Orders"
          value={summary.total_work_orders}
          icon={FileText}
          color="amber"
        />
        <SummaryCard
          title="Open Pending Points"
          value={summary.open_pending_points}
          icon={AlertCircle}
          color={summary.open_pending_points > 0 ? 'red' : 'green'}
        />
        <SummaryCard
          title="Resolved This Month"
          value={summary.resolved_this_month}
          icon={CheckCircle}
          color="green"
        />
        <SummaryCard
          title="Work Orders This Month"
          value={summary.work_orders_this_month}
          icon={Calendar}
          color="blue"
        />
      </div>

      <div className="bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden">
        <div className="p-6 border-b border-[#334155]">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Recent Work Orders</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Work Order No
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Rating MVA
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Received Date
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Pending Points
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#94A3B8]">
                    No work orders found
                  </td>
                </tr>
              ) : (
                recentOrders.map((order, idx) => {
                  const openCount = getOpenPendingCount(order);
                  const hasOpenPending = openCount > 0;

                  return (
                    <tr
                      key={order.id}
                      className={`border-b border-[#334155] hover:bg-white/5 transition-colors ${
                        hasOpenPending ? 'border-l-4 border-l-red-500' : ''
                      } ${idx % 2 === 0 ? 'bg-[#0F172A]' : 'bg-[#1E293B]'}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-[#F8FAFC]">
                        {order.work_order_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {order.rating_mva}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {formatDate(order.received_date)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            hasOpenPending
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {openCount} open
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status || (hasOpenPending ? 'open' : 'closed')} />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/work-orders/${order.id}`)}
                          className="p-2 text-[#94A3B8] hover:text-[#F59E0B] transition-colors rounded-lg hover:bg-white/5"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
