import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users2, Plus, Info, Landmark, HelpCircle } from 'lucide-react';

const CounterpartiesPage = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  
  const [counterparties, setCounterparties] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'BANK',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCounterparties();
  }, []);

  const fetchCounterparties = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/counterparties');
      setCounterparties(res.data);
    } catch (err) {
      setError('Failed to fetch counterparties.');
      showToast('Error loading counterparty directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({ name: '', type: 'BANK' });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/v1/counterparties', formData);
      showToast('Counterparty registered successfully.', 'success');
      setIsModalOpen(false);
      fetchCounterparties();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to register counterparty.';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const isEditable = user && (user.role === 'ADMIN' || user.role === 'RISK_MANAGER');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1>Counterparty Directory</h1>
          <p>Manage legal entity profiles, segments, and risk counterparties.</p>
        </div>

        {isEditable && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenAdd} 
            className="btn-header"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={14} /> Register Counterparty
          </motion.button>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '24px' }}>{error}</div>}

      {/* Directory Table Grid */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-row" style={{ height: '48px', marginTop: i === 1 ? 0 : '12px' }} />
            ))}
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, marginTop: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Legal Entity Name</th>
                  <th>Segment / Type</th>
                </tr>
              </thead>
              <tbody>
                {counterparties.map((cp) => (
                  <motion.tr 
                    key={cp.id}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
                    transition={{ duration: 0.15 }}
                  >
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>#{cp.id}</td>
                    <td style={{ fontWeight: '700', fontSize: '15px' }}>{cp.name}</td>
                    <td>
                      <span className="user-badge" style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        color: 'var(--text-primary)', 
                        borderColor: 'var(--border-subtle)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Landmark size={12} style={{ color: 'var(--accent-primary)' }} />
                        {cp.type}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {counterparties.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Info size={24} />
                        <span>No counterparties registered.</span>
                      </div>
                    </td>
                  </tr>
                )}
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
              style={{ maxWidth: '460px' }}
            >
              <div className="modal-header">
                <h3>Register New Counterparty</h3>
                <button onClick={() => setIsModalOpen(false)} className="btn-close">
                  &times;
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label htmlFor="cp-name">Legal Entity Name</label>
                  <input
                    id="cp-name"
                    type="text"
                    placeholder="e.g. Citibank N.A."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cp-type">Counterparty Segment</label>
                  <select
                    id="cp-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="BANK">BANK</option>
                    <option value="CORPORATE">CORPORATE</option>
                    <option value="RETAIL">RETAIL</option>
                    <option value="GOVERNMENT">GOVERNMENT</option>
                  </select>
                </div>

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="btn-primary"
                  >
                    Register Entity
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

export default CounterpartiesPage;
