import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../components/ToastContext';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get('/api/auth/users');
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async () => {
    setSaving(true);
    try {
      await api.post('/api/auth/create-user', formData);
      addToast('success', 'User created successfully');
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      addToast('error', err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    setSaving(true);
    try {
      await api.put(`/api/auth/users/${selectedUser.id}`, {
        name: formData.name,
        role: formData.role
      });
      addToast('success', 'User updated successfully');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      addToast('error', err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/api/auth/users/${user.id}`, {
        is_active: !user.is_active
      });
      addToast('success', `User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err) {
      addToast('error', err.message || 'Failed to toggle user status');
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-[#F59E0B]" />
          <h1 className="text-2xl font-bold text-[#F8FAFC]">User Management</h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#334155] text-sm text-[#94A3B8] bg-[#1E293B]">
                <th className="py-4 px-6 font-medium">Name</th>
                <th className="py-4 px-6 font-medium">Email</th>
                <th className="py-4 px-6 font-medium">Role</th>
                <th className="py-4 px-6 font-medium">Status</th>
                <th className="py-4 px-6 font-medium">Created At</th>
                <th className="py-4 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr 
                  key={user.id} 
                  className={`border-b border-[#334155]/50 transition-colors
                    ${index % 2 === 0 ? 'bg-[#0F172A]/50' : 'bg-[#1E293B]'}
                  `}
                >
                  <td className="py-4 px-6 text-[#F8FAFC]">{user.name}</td>
                  <td className="py-4 px-6 text-[#94A3B8]">{user.email}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[#94A3B8]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setFormData({ name: user.name, role: user.role, email: user.email });
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-[#94A3B8] hover:text-[#F59E0B] transition-colors rounded-lg hover:bg-[#F59E0B]/10"
                        title="Edit User"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => handleToggleActive(user)}
                          className={`px-3 py-1 text-xs font-medium rounded border ${
                            user.is_active 
                              ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' 
                              : 'border-green-500/50 text-green-400 hover:bg-green-500/10'
                          } transition-colors`}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-[#94A3B8]">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
        onConfirm={handleAddSubmit}
        confirmText={saving ? 'Creating...' : 'Create User'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Full Name</label>
            <input 
              type="text" 
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Shakthi Vel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Email</label>
            <input 
              type="email" 
              className="input-field"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="e.g. user@indotech.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Password</label>
            <input 
              type="password" 
              className="input-field"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Role</label>
            <select 
              className="input-field"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
        onConfirm={handleEditSubmit}
        confirmText={saving ? 'Saving...' : 'Save Changes'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Full Name</label>
            <input 
              type="text" 
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Email (Read Only)</label>
            <input 
              type="email" 
              className="input-field opacity-50 cursor-not-allowed"
              value={formData.email}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1">Role</label>
            <select 
              className="input-field"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
