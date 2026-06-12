import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  AlertCircle,
  ClipboardCheck,
  Mail,
  ArrowLeft,
  Pencil,
  Bell,
  BellRing,
  Calculator,
  Loader2
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ToastContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

export default function WorkOrderView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { profile } = useAuth();
  const basePath = profile?.role === 'admin' ? '/admin/work-orders' : '/work-orders';
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reminderModal, setReminderModal] = useState(false);
  const [followUpModal, setFollowUpModal] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);

  useEffect(() => {
    async function fetchWorkOrder() {
      try {
        const data = await api.get(`/api/work-orders/${id}`);
        setWorkOrder(data.work_order || data);
      } catch (err) {
        addToast('error', err.message || 'Failed to load work order');
        navigate('/work-orders');
      } finally {
        setLoading(false);
      }
    }
    fetchWorkOrder();
  }, [id]);

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

  async function handleSendReminder() {
    setSendingReminder(true);
    try {
      await api.post(`/api/work-orders/${id}/send-reminder`);
      addToast('success', 'Reminder sent successfully');
      setReminderModal(false);
      // Refresh to get updated email logs
      const data = await api.get(`/api/work-orders/${id}`);
      setWorkOrder(data.work_order || data);
    } catch (err) {
      addToast('error', err.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  }

  async function handleSendFollowUp() {
    setSendingFollowUp(true);
    try {
      await api.post(`/api/work-orders/${id}/send-followup`);
      addToast('success', 'Follow-up sent successfully');
      setFollowUpModal(false);
      const data = await api.get(`/api/work-orders/${id}`);
      setWorkOrder(data.work_order || data);
    } catch (err) {
      addToast('error', err.message || 'Failed to send follow-up');
    } finally {
      setSendingFollowUp(false);
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  if (!workOrder) return null;

  const pendingPoints = workOrder.pending_points || [];
  const actionComplaints = (workOrder.action_complaints || []).map(item => ({
    ...item,
    date: item.action_date || item.date || '',
    target_date: item.target_date || ''
  }));
  const emailLogs = workOrder.email_logs || [];
  const openPendingCount = pendingPoints.filter((pp) => pp.status === 'open').length;

  const dateFields = [
    { label: 'Inspection Start Date', value: workOrder.inspection_start_date },
    { label: 'RTCC Panel / M.Box Received Date', value: workOrder.received_date },
    { label: 'RTCC Panel / M.Box Testing Date', value: workOrder.testing_date },
    { label: 'RTCC & MB Internal Test Date', value: workOrder.internal_test_date },
    { label: 'Inspection Completion Date', value: workOrder.inspection_completion_date },
    { label: 'Clearance for Packing Date', value: workOrder.clearance_for_packing_date }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(basePath)}
            className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors rounded-lg hover:bg-white/5"
            title="Back to List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">
            {workOrder.work_order_number}
          </h1>
          {openPendingCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
              {openPendingCount} open pending
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(`${basePath}/${id}/edit`)}
          className="btn-secondary"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1">
                Work Order Number
              </p>
              <p className="text-[#F8FAFC] font-medium">{workOrder.work_order_number}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1">
                Customer Name
              </p>
              <p className="text-[#F8FAFC] font-medium">{workOrder.customer_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1">
                Rating (MVA)
              </p>
              <p className="text-[#F8FAFC] font-medium">{workOrder.rating_mva}</p>
            </div>
          </div>
        </div>

        {/* Inspection Details */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Inspection Details</h2>
          </div>
          <div className="space-y-3">
            {dateFields.map((field, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg bg-[#0F172A] border border-[#334155]"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#334155] text-[#94A3B8] text-sm font-semibold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm text-[#94A3B8] flex-1">{field.label}</span>
                <span className="text-sm text-[#F8FAFC] font-medium">
                  {formatDate(field.value)}
                </span>
              </div>
            ))}

            {workOrder.total_working_days > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 mt-4">
                <Calculator className="w-5 h-5 text-[#F59E0B]" />
                <div>
                  <p className="text-[#F59E0B] font-bold text-lg">
                    Total Working Days: {workOrder.total_working_days}
                  </p>
                  <p className="text-[#94A3B8] text-xs mt-0.5">
                    Working days from Inspection Completion to Clearance for Packing (Mon-Sat, Sundays excluded)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pending Points */}
        {pendingPoints.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-lg font-semibold text-[#F8FAFC]">
                Pending Points at Receiving Stage
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#334155]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-16">
                      S.No
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Remarks
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-32">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPoints.map((pp, idx) => (
                    <tr key={pp.id || idx} className="border-b border-[#334155]">
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-[#F8FAFC]">
                        {pp.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {pp.remarks || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={pp.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Complaints */}
        {actionComplaints.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <ClipboardCheck className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-lg font-semibold text-[#F8FAFC]">Action Complaints</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#334155]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-16">
                      S.No
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Complaint
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-36">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-36">
                      Target Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Responsibility
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-32">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {actionComplaints.map((ac, idx) => (
                    <tr key={ac.id || idx} className="border-b border-[#334155]">
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-[#F8FAFC]">
                        {ac.complaint}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {formatDate(ac.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {formatDate(ac.target_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {ac.responsibility || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ac.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Email History */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Email History</h2>
          </div>

          {emailLogs.length > 0 ? (
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#334155]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Subject
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Sent At
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Recipients
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="border-b border-[#334155]">
                      <td className="px-4 py-3">
                        <StatusBadge status={log.type || log.email_type} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#F8FAFC]">
                        {log.subject}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {formatDateTime(log.sent_at || log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {Array.isArray(log.recipients)
                          ? log.recipients.join(', ')
                          : log.recipients || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[#94A3B8] text-sm mb-6">No emails sent yet</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setReminderModal(true)}
              className="btn-secondary"
            >
              <Bell className="w-4 h-4" />
              Send Reminder Now
            </button>
            <button
              onClick={() => setFollowUpModal(true)}
              className="btn-secondary"
            >
              <BellRing className="w-4 h-4" />
              Send Follow-Up Now
            </button>
          </div>
        </div>
      </div>

      {/* Reminder Confirmation Modal */}
      <Modal
        isOpen={reminderModal}
        onClose={() => setReminderModal(false)}
        title="Send Reminder"
        confirmText={sendingReminder ? 'Sending...' : 'Send Reminder'}
        onConfirm={handleSendReminder}
        confirmColor="amber"
      >
        <p className="text-[#94A3B8]">
          Are you sure you want to send a reminder email for work order{' '}
          <span className="text-[#F8FAFC] font-medium">
            {workOrder.work_order_number}
          </span>
          ? This will notify all configured recipients about pending points.
        </p>
      </Modal>

      {/* Follow-Up Confirmation Modal */}
      <Modal
        isOpen={followUpModal}
        onClose={() => setFollowUpModal(false)}
        title="Send Follow-Up"
        confirmText={sendingFollowUp ? 'Sending...' : 'Send Follow-Up'}
        onConfirm={handleSendFollowUp}
        confirmColor="amber"
      >
        <p className="text-[#94A3B8]">
          Are you sure you want to send a follow-up email for work order{' '}
          <span className="text-[#F8FAFC] font-medium">
            {workOrder.work_order_number}
          </span>
          ? This will send an escalation to all configured recipients.
        </p>
      </Modal>
    </div>
  );
}
