import React, { useState, useEffect } from 'react';
import { Terminal, RefreshCw, Trash2, Copy, Check } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../components/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminLogs() {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      const data = await api.get('/api/system/logs');
      setLogs(data.logs || 'No server logs recorded yet.');
    } catch (err) {
      addToast('error', 'Failed to fetch system logs');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all server logs?')) return;
    try {
      await api.del('/api/system/logs');
      addToast('success', 'Logs cleared successfully');
      fetchLogs();
    } catch (err) {
      addToast('error', 'Failed to clear logs');
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-8 h-8 text-[#F59E0B]" />
          <h1 className="text-2xl font-bold text-[#F8FAFC]">System Logs</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#334155] text-[#F8FAFC] rounded-lg hover:bg-[#475569] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B]/10 text-[#F59E0B] rounded-lg hover:bg-[#F59E0B]/20 transition-colors border border-[#F59E0B]/20"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden border border-[#334155] flex flex-col h-[calc(100vh-12rem)]">
        <div className="bg-[#0F172A] border-b border-[#334155] p-3 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
          </div>
          <span className="text-xs text-[#94A3B8] font-mono">server-errors.log</span>
        </div>
        
        <div className="p-4 bg-[#0B1120] flex-1 overflow-auto">
          <pre className="font-mono text-xs sm:text-sm text-[#E2E8F0] whitespace-pre-wrap break-words leading-relaxed selection:bg-[#F59E0B]/30">
            {logs}
          </pre>
        </div>
      </div>
    </div>
  );
}
