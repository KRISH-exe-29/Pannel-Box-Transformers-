import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [activeFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const typeParam = activeFilter !== 'all' ? `?type=${activeFilter}` : '';
      const data = await api.get(`/api/email-logs${typeParam}`);
      const items = Array.isArray(data) ? data : data.email_logs || [];
      setLogs(items);
    } catch (err) {
      console.error('Failed to fetch email logs:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Mail className="w-7 h-7 text-[#F59E0B]" />
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Email Logs</h1>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'reminder', label: 'Reminder' },
          { key: 'follow_up', label: 'Follow-Up' }
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

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
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
                    Type
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Sent At
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Recipients
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#94A3B8]">
                      No email logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr
                      key={log.id || idx}
                      className={`border-b border-[#334155] hover:bg-white/5 transition-colors ${
                        idx % 2 === 0 ? 'bg-[#0F172A]' : 'bg-[#1E293B]'
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-[#F8FAFC]">
                        {log.work_order_number || log.work_order?.work_order_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {log.customer_name || log.work_order?.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.type || log.email_type} />
                      </td>
                      <td className="px-6 py-4 text-sm text-[#F8FAFC]">
                        {log.subject}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8]">
                        {formatDateTime(log.sent_at || log.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94A3B8] max-w-[200px] truncate">
                        {Array.isArray(log.recipients)
                          ? log.recipients.join(', ')
                          : log.recipients || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
