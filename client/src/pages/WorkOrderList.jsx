import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Search, Plus, Eye, Pencil } from 'lucide-react';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

export default function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const basePath = profile?.role === 'admin' ? '/admin/work-orders' : '/work-orders';

  useEffect(() => {
    async function fetchWorkOrders() {
      try {
        const data = await api.get('/api/work-orders');
        const orders = Array.isArray(data) ? data : data.work_orders || [];
        setWorkOrders(orders);
      } catch (err) {
        console.error('Failed to fetch work orders:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkOrders();
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
    if (order.open_pending_points_count !== undefined) return order.open_pending_points_count;
    if (order.open_pending_count !== undefined) return order.open_pending_count;
    if (order.pending_points) {
      return order.pending_points.filter((pp) => pp.status === 'open').length;
    }
    return 0;
  }

  const filteredOrders = workOrders.filter((order) => {
    const matchesSearch =
      !searchTerm ||
      order.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'open_pending') {
      return getOpenPendingCount(order) > 0;
    }
    if (activeFilter === 'completed') {
      return getOpenPendingCount(order) === 0;
    }
    return true;
  });

  if (loading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <List className="w-7 h-7 text-[#F59E0B]" />
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Work Orders</h1>
        </div>
        {profile?.role !== 'admin' && (
          <button
            onClick={() => navigate(`${basePath}/new`)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by work order number or customer..."
            className="input-field pl-11"
          />
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'open_pending', label: 'Open Pending' },
            { key: 'completed', label: 'Completed' }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? 'bg-[#F59E0B] text-[#0F172A]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 border border-[#334155]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden">
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
                  Inspection Start
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Received Date
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Internal Test
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Clearance Date
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Total Days
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Pending Points
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-[#94A3B8]">
                    No work orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
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
                        {formatDate(order.inspection_start_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {formatDate(order.received_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {formatDate(order.internal_test_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {formatDate(order.clearance_for_packing_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {order.total_working_days || '-'}
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`${basePath}/${order.id}`)}
                            className="p-2 text-[#94A3B8] hover:text-[#F59E0B] transition-colors rounded-lg hover:bg-white/5"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`${basePath}/${order.id}/edit`)}
                            className="p-2 text-[#94A3B8] hover:text-[#F59E0B] transition-colors rounded-lg hover:bg-white/5"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
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
