import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Mail, Plus, Pencil, Trash2, Info } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../components/ToastContext';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminSettings() {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [emailConfig, setEmailConfig] = useState({ email: '', password: '' });
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);

  const [formData, setFormData] = useState({
    department: '',
    contact_name: '',
    email: '',
    receives_reminder: true,
    receives_followup: false,
    is_active: true
  });

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      const data = await api.get('/api/settings/recipients');
      setRecipients(data.recipients || []);
    } catch (err) {
      console.error('Error fetching recipients:', err);
      addToast('error', 'Failed to load email recipients');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const data = await api.get('/api/settings/email-config');
      setEmailConfig({ ...emailConfig, email: data.email });
    } catch (err) {
      console.error('Error fetching email config:', err);
    }
  };

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const handleSaveEmailConfig = async () => {
    setSavingEmailConfig(true);
    try {
      await api.put('/api/settings/email-config', emailConfig);
      addToast('success', 'Email configuration updated successfully!');
      setEmailConfig({ ...emailConfig, password: '' }); // Clear password field for security
    } catch (err) {
      addToast('error', err.message || 'Failed to save email config');
    } finally {
      setSavingEmailConfig(false);
    }
  };

  const handleOpenModal = (recipient = null) => {
    if (recipient) {
      setSelectedRecipient(recipient);
      setFormData({
        department: recipient.department,
        contact_name: recipient.contact_name,
        email: recipient.email,
        receives_reminder: recipient.receives_reminder,
        receives_followup: recipient.receives_followup,
        is_active: recipient.is_active
      });
    } else {
      setSelectedRecipient(null);
      setFormData({
        department: '',
        contact_name: '',
        email: '',
        receives_reminder: true,
        receives_followup: false,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (selectedRecipient) {
        await api.put(`/api/settings/recipients/${selectedRecipient.id}`, formData);
        addToast('success', 'Recipient updated successfully');
      } else {
        await api.post('/api/settings/recipients', formData);
        addToast('success', 'Recipient added successfully');
      }
      setIsModalOpen(false);
      fetchRecipients();
    } catch (err) {
      addToast('error', err.message || 'Failed to save recipient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.del(`/api/settings/recipients/${selectedRecipient.id}`);
      addToast('success', 'Recipient deleted successfully');
      setIsDeleteModalOpen(false);
      fetchRecipients();
    } catch (err) {
      addToast('error', err.message || 'Failed to delete recipient');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-[#F59E0B]" />
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Settings</h1>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-[#F8FAFC] border-b border-[#334155] pb-4">
          <Mail className="w-5 h-5 text-[#94A3B8]" />
          <h2>Email Recipients</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#334155] text-sm text-[#94A3B8]">
                <th className="pb-3 pr-4 font-medium">Department</th>
                <th className="pb-3 pr-4 font-medium">Contact Name</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Receives Reminder</th>
                <th className="pb-3 pr-4 font-medium">Receives Follow-Up</th>
                <th className="pb-3 pr-4 font-medium">Active</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((rec) => (
                <tr key={rec.id} className="border-b border-[#334155]/50">
                  <td className="py-3 pr-4 text-[#F8FAFC]">{rec.department}</td>
                  <td className="py-3 pr-4 text-[#F8FAFC]">{rec.contact_name}</td>
                  <td className="py-3 pr-4 text-[#94A3B8]">{rec.email}</td>
                  <td className="py-3 pr-4">
                    {rec.receives_reminder ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-[#94A3B8]">No</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {rec.receives_followup ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-[#94A3B8]">No</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {rec.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#334155] text-[#94A3B8]">Inactive</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(rec)}
                        className="p-1.5 text-[#94A3B8] hover:text-[#F59E0B] transition-colors rounded-lg hover:bg-[#F59E0B]/10"
                        title="Edit Recipient"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setSelectedRecipient(rec); setIsDeleteModalOpen(true); }}
                        className="p-1.5 text-[#94A3B8] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                        title="Delete Recipient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {recipients.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-[#94A3B8]">
                    No email recipients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button 
          onClick={() => handleOpenModal()}
          className="w-full flex justify-center items-center gap-2 py-3 border-2 border-dashed border-[#334155] text-[#94A3B8] hover:text-[#F59E0B] hover:border-[#F59E0B] rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Recipient</span>
        </button>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-[#F8FAFC] border-b border-[#334155] pb-4">
          <SettingsIcon className="w-5 h-5 text-[#94A3B8]" />
          <h2>System Email Configuration</h2>
        </div>
        
        <div className="space-y-4 max-w-2xl">
          <div className="p-4 bg-[#0F172A] rounded-lg border border-[#334155]">
            <p className="text-sm text-[#94A3B8] mb-4">
              Configure the Gmail account used by the system to send automated reminder and follow-up emails.
              You must use a Google App Password, not your regular account password.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Sender Gmail Address</label>
                <input 
                  type="email" 
                  className="input-field"
                  value={emailConfig.email}
                  onChange={(e) => setEmailConfig({...emailConfig, email: e.target.value})}
                  placeholder="e.g. your_system_email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Google App Password</label>
                <input 
                  type="password" 
                  className="input-field"
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig({...emailConfig, password: e.target.value})}
                  placeholder="Enter new app password to update (hidden for security)"
                />
              </div>
              <div className="pt-2">
                <button 
                  onClick={handleSaveEmailConfig}
                  disabled={savingEmailConfig || !emailConfig.email || !emailConfig.password}
                  className="btn-primary w-auto inline-flex"
                >
                  {savingEmailConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#0F172A] rounded-lg border border-[#334155] mt-6">
            <Info className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#F8FAFC]">Automation Triggers</p>
              <ul className="text-sm text-[#94A3B8] list-disc ml-4 mt-1 space-y-1">
                <li><strong>Reminder:</strong> Manually triggered upon admin rejection/approval.</li>
                <li><strong>Follow-Up:</strong> Sent automatically 48h after received date if points remain open.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRecipient ? "Edit Recipient" : "Add Recipient"}
        onConfirm={handleSubmit}
        confirmText={saving ? 'Saving...' : 'Save'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Department</label>
            <input 
              type="text" 
              className="input-field"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              placeholder="e.g. Quality"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Contact Name</label>
            <input 
              type="text" 
              className="input-field"
              value={formData.contact_name}
              onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
              placeholder="e.g. Santana"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Email Address</label>
            <input 
              type="email" 
              className="input-field"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="e.g. name@indotech.com"
            />
          </div>
          
          <div className="pt-2 border-t border-[#334155] space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-[#334155] bg-[#0F172A] text-[#F59E0B] focus:ring-[#F59E0B]"
                checked={formData.receives_reminder}
                onChange={(e) => setFormData({...formData, receives_reminder: e.target.checked})}
              />
              <span className="text-[#F8FAFC]">Receives Reminder Email</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-[#334155] bg-[#0F172A] text-[#F59E0B] focus:ring-[#F59E0B]"
                checked={formData.receives_followup}
                onChange={(e) => setFormData({...formData, receives_followup: e.target.checked})}
              />
              <span className="text-[#F8FAFC]">Receives Follow-Up Email (48h)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-[#334155] bg-[#0F172A] text-[#F59E0B] focus:ring-[#F59E0B]"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              />
              <span className="text-[#F8FAFC]">Active</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete"
        onConfirm={handleDelete}
        confirmText={saving ? 'Deleting...' : 'Delete Recipient'}
        confirmColor="danger"
      >
        <p className="text-[#F8FAFC]">
          Are you sure you want to delete <span className="font-semibold text-white">{selectedRecipient?.contact_name}</span> from the email recipients list?
        </p>
        <p className="text-sm text-[#94A3B8] mt-2">
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
