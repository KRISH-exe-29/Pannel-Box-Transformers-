import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import { useToast } from './ToastContext';

export default function ApprovalBanner() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const { addToast } = useToast();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  async function fetchPendingApprovals() {
    try {
      const data = await api.get('/api/work-orders/pending-approval');
      setPendingOrders(Array.isArray(data) ? data : data.work_orders || []);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproval(workOrderId, approved) {
    setActionLoading((prev) => ({ ...prev, [workOrderId]: true }));
    try {
      await api.put(`/api/work-orders/${workOrderId}/approve-pending`, { approved });
      if (approved) {
        addToast('success', 'Pending points marked as approved');
      } else {
        addToast('info', 'Reminder sent to all departments');
      }
      setPendingOrders((prev) => prev.filter((wo) => wo.id !== workOrderId));
    } catch (err) {
      addToast('error', err.message || 'Failed to process approval');
    } finally {
      setActionLoading((prev) => ({ ...prev, [workOrderId]: false }));
    }
  }

  if (loading || pendingOrders.length === 0) return null;

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden border-l-4 border-l-[#F59E0B] mb-6">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
          <h3 className="text-lg font-semibold text-[#F8FAFC]">
            Pending Points Confirmation Required
          </h3>
        </div>

        <div className="space-y-3">
          {pendingOrders.map((wo) => {
            const openCount = wo.open_pending_count || wo.pending_points?.filter(
              (pp) => pp.status === 'open'
            ).length || 0;

            return (
              <div
                key={wo.id}
                className="flex items-center justify-between p-4 bg-[#0F172A] rounded-lg border border-[#334155]"
              >
                <div className="flex flex-col">
                  <span className="text-[#F8FAFC] font-medium">
                    {wo.work_order_number}
                    <span className="text-[#94A3B8] font-normal ml-2">
                      {wo.customer_name}
                    </span>
                  </span>
                  <span className="text-sm text-red-400 mt-0.5">
                    {openCount} open pending point{openCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleApproval(wo.id, true)}
                    disabled={actionLoading[wo.id]}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500 text-green-400 hover:bg-green-500/10 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Approved
                  </button>
                  <button
                    onClick={() => handleApproval(wo.id, false)}
                    disabled={actionLoading[wo.id]}
                    className="btn-danger text-sm py-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Not Approved - Send Alert
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
