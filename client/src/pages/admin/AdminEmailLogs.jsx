import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminEmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [filterType]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = filterType === 'all' ? '/api/email-logs' : `/api/email-logs?type=${filterType}`;
      const data = await api.get(url);
      setLogs(data.email_logs || []);
    } catch (err) {
      console.error('Error fetching email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-[#F59E0B]" />
          <h1 className="text-2xl font-bold text-[#F8FAFC]">All Email Logs</h1>
        </div>
        
        <div className="flex bg-[#1E293B] rounded-lg p-1 border border-[#334155]">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filterType === 'all' 
                ? 'bg-[#F59E0B] text-[#0F172A]' 
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setFilterType('reminder')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filterType === 'reminder' 
                ? 'bg-[#F59E0B] text-[#0F172A]' 
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Reminder
          </button>
          <button
            onClick={() => setFilterType('followup')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filterType === 'followup' 
                ? 'bg-[#F59E0B] text-[#0F172A]' 
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Follow-Up
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#334155] text-sm text-[#94A3B8] bg-[#1E293B]">
                  <th className="py-4 px-6 font-medium">Work Order No</th>
                  <th className="py-4 px-6 font-medium">Customer</th>
                  <th className="py-4 px-6 font-medium">Type</th>
                  <th className="py-4 px-6 font-medium">Sent At</th>
                  <th className="py-4 px-6 font-medium">Recipients</th>
                  <th className="py-4 px-6 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr 
                    key={log.id} 
                    className={`border-b border-[#334155]/50 transition-colors
                      ${index % 2 === 0 ? 'bg-[#0F172A]/50' : 'bg-[#1E293B]'}
                    `}
                  >
                    <td className="py-4 px-6 text-[#F8FAFC] whitespace-nowrap">
                      {log.work_order_number || '-'}
                    </td>
                    <td className="py-4 px-6 text-[#94A3B8]">
                      {log.customer_name || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        log.type === 'reminder' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {log.type === 'reminder' ? 'Reminder' : 'Follow-Up'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#94A3B8] whitespace-nowrap">
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-[#94A3B8] max-w-xs truncate" title={log.recipients}>
                      {log.recipients || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={log.status} />
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-[#94A3B8]">
                      No email logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
