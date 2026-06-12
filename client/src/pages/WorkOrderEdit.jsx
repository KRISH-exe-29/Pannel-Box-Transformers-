import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pencil,
  FileText,
  Calendar,
  AlertCircle,
  ClipboardCheck,
  Plus,
  Trash2,
  Lock,
  Loader2,
  Calculator,
  Save
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

function calculateWorkingDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) return 0;
  let count = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1);
  while (current <= end) {
    if (current.getDay() !== 0) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

const DEFAULT_COMPLAINTS = [
  { complaint: 'As-Build Drawing Pending', is_default: true, status: 'open', sort_order: 1, date: '', target_date: '', responsibility: '' },
  { complaint: 'As-Schematic Drawing Not Given', is_default: true, status: 'open', sort_order: 2, date: '', target_date: '', responsibility: '' },
  { complaint: 'Schematic Plate Not Received', is_default: true, status: 'open', sort_order: 3, date: '', target_date: '', responsibility: '' }
];

export default function WorkOrderEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { profile } = useAuth();
  const basePath = profile?.role === 'admin' ? '/admin/work-orders' : '/work-orders';
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const defaultsChecked = useRef(false);

  const [form, setForm] = useState({
    work_order_number: '',
    customer_name: '',
    rating_mva: '',
    inspection_start_date: '',
    received_date: '',
    testing_date: '',
    internal_test_date: '',
    inspection_completion_date: '',
    clearance_for_packing_date: ''
  });

  const [pendingPoints, setPendingPoints] = useState([]);
  const [actionComplaints, setActionComplaints] = useState([]);
  const [showPendingPoints, setShowPendingPoints] = useState(false);
  const [showActionComplaints, setShowActionComplaints] = useState(false);

  useEffect(() => {
    async function fetchWorkOrder() {
      try {
        const data = await api.get(`/api/work-orders/${id}`);
        const wo = data.work_order || data;

        setForm({
          work_order_number: wo.work_order_number || '',
          customer_name: wo.customer_name || '',
          rating_mva: wo.rating_mva?.toString() || '',
          inspection_start_date: wo.inspection_start_date || '',
          received_date: wo.received_date || '',
          testing_date: wo.testing_date || '',
          internal_test_date: wo.internal_test_date || '',
          inspection_completion_date: wo.inspection_completion_date || '',
          clearance_for_packing_date: wo.clearance_for_packing_date || ''
        });

        const pp = wo.pending_points || [];
        setPendingPoints(pp);
        if (wo.received_date || pp.length > 0) {
          setShowPendingPoints(true);
        }

        let ac = (wo.action_complaints || []).map(item => ({
          ...item,
          date: item.action_date || item.date || '',
          target_date: item.target_date || ''
        }));
        // Ensure the 3 defaults are present
        const defaultComplaints = DEFAULT_COMPLAINTS.map((dc) => dc.complaint);
        const existingComplaints = ac.map((a) => a.complaint);
        const missingDefaults = DEFAULT_COMPLAINTS.filter(
          (dc) => !existingComplaints.includes(dc.complaint)
        );
        if (missingDefaults.length > 0) {
          ac = [...missingDefaults, ...ac];
        }
        setActionComplaints(ac);

        if (wo.inspection_completion_date || ac.length > 0) {
          setShowActionComplaints(true);
        }
        defaultsChecked.current = true;
      } catch (err) {
        addToast('error', err.message || 'Failed to load work order');
        navigate(basePath);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkOrder();
  }, [id]);

  useEffect(() => {
    if (form.received_date && !showPendingPoints) {
      setShowPendingPoints(true);
    }
  }, [form.received_date]);

  useEffect(() => {
    if (form.inspection_completion_date && !showActionComplaints) {
      setShowActionComplaints(true);
      if (defaultsChecked.current && actionComplaints.length === 0) {
        setActionComplaints([...DEFAULT_COMPLAINTS]);
      }
    }
  }, [form.inspection_completion_date]);

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addPendingPoint() {
    setPendingPoints((prev) => [
      ...prev,
      { description: '', remarks: '', status: 'open' }
    ]);
  }

  function updatePendingPoint(index, field, value) {
    setPendingPoints((prev) =>
      prev.map((pp, i) => (i === index ? { ...pp, [field]: value } : pp))
    );
  }

  function removePendingPoint(index) {
    setPendingPoints((prev) => prev.filter((_, i) => i !== index));
  }

  function addActionComplaint() {
    setActionComplaints((prev) => [
      ...prev,
      {
        complaint: '',
        is_default: false,
        status: 'open',
        sort_order: prev.length + 1,
        date: '',
        target_date: '',
        responsibility: ''
      }
    ]);
  }

  function updateActionComplaint(index, field, value) {
    setActionComplaints((prev) =>
      prev.map((ac, i) => (i === index ? { ...ac, [field]: value } : ac))
    );
  }

  function removeActionComplaint(index) {
    setActionComplaints((prev) => prev.filter((_, i) => i !== index));
  }

  const totalWorkingDays = calculateWorkingDays(
    form.inspection_completion_date,
    form.clearance_for_packing_date
  );

  const dateFields = [
    { key: 'inspection_start_date', label: 'Inspection Start Date', unlockField: null },
    { key: 'received_date', label: 'RTCC Panel / M.Box Received Date', unlockField: 'inspection_start_date' },
    { key: 'testing_date', label: 'RTCC Panel / M.Box Testing Date', unlockField: 'received_date' },
    { key: 'internal_test_date', label: 'RTCC & MB Internal Test Date', unlockField: 'testing_date' },
    { key: 'inspection_completion_date', label: 'Inspection Completion Date', unlockField: 'internal_test_date' },
    { key: 'clearance_for_packing_date', label: 'Clearance for Packing Date', unlockField: 'inspection_completion_date' }
  ];

  function isFieldEnabled(field) {
    if (!field.unlockField) return true;
    return !!form[field.unlockField];
  }

  async function handleSave() {
    if (!form.work_order_number.trim()) {
      addToast('error', 'Work Order Number is required');
      return;
    }
    if (!form.customer_name.trim()) {
      addToast('error', 'Customer Name is required');
      return;
    }
    if (!form.rating_mva) {
      addToast('error', 'Rating (MVA) is required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        rating_mva: parseFloat(form.rating_mva),
        total_working_days: totalWorkingDays || null,
        pending_points: pendingPoints.filter((pp) => pp.description.trim()),
        action_complaints: actionComplaints.map((ac) => ({
          ...ac,
          action_date: ac.date || null,
          target_date: ac.target_date || null
        }))
      };

      Object.keys(payload).forEach((key) => {
        if (key.includes('date') && payload[key] === '') {
          payload[key] = null;
        }
      });

      await api.put(`/api/work-orders/${id}`, payload);
      addToast('success', 'Work Order updated successfully');
      navigate(`${basePath}/${id}`);
    } catch (err) {
      addToast('error', err.message || 'Failed to update work order');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Pencil className="w-7 h-7 text-[#F59E0B]" />
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Edit Work Order</h1>
      </div>

      <div className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                Work Order Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.work_order_number}
                onChange={(e) => handleFormChange('work_order_number', e.target.value)}
                placeholder="Enter work order number"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                Customer Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => handleFormChange('customer_name', e.target.value)}
                placeholder="Enter customer name"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                Rating (MVA) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={form.rating_mva}
                onChange={(e) => handleFormChange('rating_mva', e.target.value)}
                placeholder="Enter rating"
                className="input-field"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Inspection Details */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Inspection Details</h2>
          </div>

          <div className="space-y-4">
            {dateFields.map((field, idx) => {
              const enabled = isFieldEnabled(field);
              return (
                <div
                  key={field.key}
                  className={`flex items-center gap-4 p-4 rounded-lg border border-[#334155] ${
                    enabled ? 'bg-[#0F172A]' : 'bg-[#0F172A]/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#334155] text-[#94A3B8] text-sm font-semibold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <label className="text-sm font-medium text-[#F8FAFC] flex-1 min-w-[200px]">
                    {field.label}
                  </label>
                  <input
                    type="date"
                    value={form[field.key]}
                    onChange={(e) => handleFormChange(field.key, e.target.value)}
                    disabled={!enabled}
                    className={`input-field max-w-[220px] ${
                      !enabled ? 'cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              );
            })}

            {form.clearance_for_packing_date && form.inspection_completion_date && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 mt-4">
                <Calculator className="w-5 h-5 text-[#F59E0B]" />
                <div>
                  <p className="text-[#F59E0B] font-bold text-lg">
                    Total Working Days: {totalWorkingDays}
                  </p>
                  <p className="text-[#94A3B8] text-xs mt-0.5">
                    Working days from Inspection Completion to Clearance for Packing (Mon-Sat, Sundays excluded)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Pending Points */}
        <div
          className={`transition-all duration-500 ${
            showPendingPoints
              ? 'opacity-100 max-h-[2000px]'
              : 'opacity-0 max-h-0 overflow-hidden'
          }`}
        >
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-lg font-semibold text-[#F8FAFC]">
                Pending Points at Receiving Stage
              </h2>
            </div>

            {pendingPoints.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#334155]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-16">S.No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Remarks</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-36">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPoints.map((pp, idx) => (
                      <tr key={idx} className="border-b border-[#334155]">
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={pp.description}
                            onChange={(e) => updatePendingPoint(idx, 'description', e.target.value)}
                            placeholder="Enter description"
                            className="input-field"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={pp.remarks || ''}
                            onChange={(e) => updatePendingPoint(idx, 'remarks', e.target.value)}
                            placeholder="Enter remarks"
                            className="input-field"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={pp.status}
                            onChange={(e) => updatePendingPoint(idx, 'status', e.target.value)}
                            className="input-field"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removePendingPoint(idx)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={addPendingPoint}
              className="w-full py-3 border-2 border-dashed border-[#334155] text-[#94A3B8] hover:border-[#F59E0B] hover:text-[#F59E0B] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Pending Point
            </button>
          </div>
        </div>

        {/* Section 4: Action Complaints */}
        <div
          className={`transition-all duration-500 ${
            showActionComplaints
              ? 'opacity-100 max-h-[3000px]'
              : 'opacity-0 max-h-0 overflow-hidden'
          }`}
        >
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <ClipboardCheck className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-lg font-semibold text-[#F8FAFC]">Action Complaints</h2>
            </div>

            {actionComplaints.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#334155]">
                       <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-16">S.No</th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Complaint</th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-44">Date</th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-44">Target Date</th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Responsibility</th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-36">Status</th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionComplaints.map((ac, idx) => (
                      <tr key={idx} className="border-b border-[#334155]">
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{idx + 1}</td>
                        <td className="px-4 py-3">
                          {ac.is_default ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[#F8FAFC]">{ac.complaint}</span>
                              <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={ac.complaint}
                              onChange={(e) => updateActionComplaint(idx, 'complaint', e.target.value)}
                              placeholder="Enter complaint"
                              className="input-field"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={ac.date || ''}
                            onChange={(e) => updateActionComplaint(idx, 'date', e.target.value)}
                            className="input-field"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={ac.target_date || ''}
                            onChange={(e) => updateActionComplaint(idx, 'target_date', e.target.value)}
                            className="input-field"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={ac.responsibility || ''}
                            onChange={(e) => updateActionComplaint(idx, 'responsibility', e.target.value)}
                            placeholder="Enter responsibility"
                            className="input-field"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={ac.status}
                            onChange={(e) => updateActionComplaint(idx, 'status', e.target.value)}
                            className="input-field"
                          >
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {ac.is_default ? (
                            <span className="p-2 inline-block text-[#94A3B8]">
                              <Lock className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              onClick={() => removeActionComplaint(idx)}
                              className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={addActionComplaint}
              className="w-full py-3 border-2 border-dashed border-[#334155] text-[#94A3B8] hover:border-[#F59E0B] hover:text-[#F59E0B] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Complaint
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-4 text-lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Update Work Order
            </>
          )}
        </button>
      </div>
    </div>
  );
}
