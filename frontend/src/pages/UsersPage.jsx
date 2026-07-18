import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Plus, Edit3, Trash2, Mail, Shield, ShieldCheck, Info } from 'lucide-react';

const UsersPage = () => {
  const { showToast } = useToast();
  
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/users');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to fetch platform users.');
      showToast('Error loading user directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', password: '', role: 'VIEWER' });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (usr) => {
    setEditingId(usr.id);
    setFormData({
      name: usr.name,
      email: usr.email,
      password: '', // blank by default (only updated if field filled)
      role: usr.role,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/api/v1/users/${editingId}`, formData);
        showToast('User profile updated successfully.', 'success');
      } else {
        await api.post('/api/v1/users', formData);
        showToast('New user enrolled.', 'success');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Error occurred while saving user data.';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? All user sessions and refresh tokens will be revoked.')) return;
    try {
      await api.delete(`/api/v1/users/${id}`);
      showToast('User profile removed successfully.', 'success');
      fetchUsers();
    } catch (err) {
      showToast('Failed to delete user.', 'error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1>User Operations</h1>
          <p>Provision users, manage profiles, and allocate access roles.</p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenAdd} 
          className="btn-header"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={14} /> Enroll User
        </motion.button>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '24px' }}>{error}</div>}

      {/* Directory list container */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-row" style={{ height: '48px', marginTop: i === 1 ? 0 : '12px' }} />
            ))}
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, marginTop: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((usr) => (
                  <motion.tr 
                    key={usr.id}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
                    transition={{ duration: 0.15 }}
                  >
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>#{usr.id}</td>
                    <td style={{ fontWeight: '700', fontSize: '15px' }}>{usr.name}</td>
                    <td style={{ fontWeight: '500' }}>{usr.email}</td>
                    <td>
                      <span className="user-badge" style={{
                        background: usr.role === 'ADMIN' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(0, 212, 255, 0.08)',
                        color: usr.role === 'ADMIN' ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                        borderColor: usr.role === 'ADMIN' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(0, 212, 255, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {usr.role === 'ADMIN' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                        {usr.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleOpenEdit(usr)} 
                          className="btn-action" 
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit3 size={12} /> Edit
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(usr.id)} 
                          className="btn-logout" 
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={12} /> Remove
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-backdrop">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel modal-content" 
              style={{ maxWidth: '480px' }}
            >
              <div className="modal-header">
                <h3>{editingId ? 'Modify User Profile' : 'Enroll New User'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="btn-close">
                  &times;
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label htmlFor="usr-name">Full Name</label>
                  <input
                    id="usr-name"
                    type="text"
                    placeholder="e.g. Alice Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="usr-email">Email Address</label>
                  <input
                    id="usr-email"
                    type="email"
                    placeholder="alice@risklens.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="usr-password">Password {editingId && '(Leave blank if unchanged)'}</label>
                  <input
                    id="usr-password"
                    type="password"
                    placeholder={editingId ? '••••••••' : 'Password (min 6 characters)'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingId}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="usr-role">Security Role Privilege</label>
                  <select
                    id="usr-role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="VIEWER">VIEWER (Read-Only)</option>
                    <option value="RISK_MANAGER">RISK_MANAGER (Create/Edit)</option>
                    <option value="ADMIN">ADMIN (Full Access)</option>
                  </select>
                </div>

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="btn-primary"
                  >
                    {editingId ? 'Save Changes' : 'Enroll Profile'}
                  </motion.button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-logout" style={{ background: 'transparent' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UsersPage;
