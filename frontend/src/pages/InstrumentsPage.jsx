import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';

const InstrumentsPage = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  
  const [instruments, setInstruments] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  
  // Filtering & Pagination state
  const [typeFilter, setTypeFilter] = useState('');
  const [counterpartyFilter, setCounterpartyFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modals / forms state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    instrumentType: 'ASSET',
    productType: 'LOAN',
    counterpartyId: '',
    principalAmount: '',
    currency: 'INR',
    interestRate: '',
    originationDate: '',
    maturityDate: '',
    cashFlowFrequency: 'MONTHLY',
    isFloatingRate: false,
  });

  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCounterparties();
  }, []);

  useEffect(() => {
    fetchInstruments();
  }, [typeFilter, counterpartyFilter, page]);

  const fetchCounterparties = async () => {
    try {
      const res = await api.get('/api/v1/counterparties');
      setCounterparties(res.data);
      if (res.data.length > 0 && !formData.counterpartyId) {
        setFormData((prev) => ({ ...prev, counterpartyId: res.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInstruments = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/instruments?page=${page}&size=10&sort=id,desc`;
      if (typeFilter) url += `&type=${typeFilter}`;
      if (counterpartyFilter) url += `&counterpartyId=${counterpartyFilter}`;
      
      const res = await api.get(url);
      setInstruments(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      setError('Failed to fetch instruments.');
      showToast('Error loading instrument registry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      instrumentType: 'ASSET',
      productType: 'LOAN',
      counterpartyId: counterparties[0]?.id || '',
      principalAmount: '',
      currency: 'INR',
      interestRate: '',
      originationDate: '',
      maturityDate: '',
      cashFlowFrequency: 'MONTHLY',
      isFloatingRate: false,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inst) => {
    setEditingId(inst.id);
    setFormData({
      instrumentType: inst.instrumentType,
      productType: inst.productType,
      counterpartyId: inst.counterpartyId,
      principalAmount: inst.principalAmount,
      currency: inst.currency,
      interestRate: inst.interestRate,
      originationDate: inst.originationDate,
      maturityDate: inst.maturityDate,
      cashFlowFrequency: inst.cashFlowFrequency,
      isFloatingRate: inst.isFloatingRate,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/api/v1/instruments/${editingId}`, formData);
        showToast('Instrument successfully updated.', 'success');
      } else {
        await api.post('/api/v1/instruments', formData);
        showToast('New instrument registered.', 'success');
      }
      setIsModalOpen(false);
      fetchInstruments();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save instrument details.';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this instrument? This will also remove all its projected cash flows.')) return;
    try {
      await api.delete(`/api/v1/instruments/${id}`);
      showToast('Instrument deleted successfully.', 'success');
      fetchInstruments();
    } catch (err) {
      showToast('Failed to delete instrument.', 'error');
    }
  };

  const handleUploadPdf = async (e) => {
    e.preventDefault();
    if (!pdfFile) {
      setError('Please choose a PDF file first.');
      return;
    }
    setError('');
    setLoading(true);
    const uploadData = new FormData();
    uploadData.append('file', pdfFile);

    try {
      const res = await api.post('/api/v1/instruments/upload', uploadData);
      showToast(res.data.message || 'PDF imported successfully!', 'success');
      setIsUploadOpen(false);
      fetchInstruments();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'PDF upload failed.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isEditable = user && (user.role === 'ADMIN' || user.role === 'RISK_MANAGER');

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
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
          <h1>Instrument Registry</h1>
          <p>Manage financial contracts, assets, liabilities, and funding vehicles.</p>
        </div>

        {isEditable && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsUploadOpen(true)} 
              className="btn-action"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={14} /> Bulk Import PDF
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenAdd} 
              className="btn-header"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={14} /> Add Instrument
            </motion.button>
          </div>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '24px' }}>{error}</div>}

      {/* Filter toolbar */}
      <div className="glass-panel filter-row" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginRight: '16px' }}>
          <SlidersHorizontal size={16} />
          <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</span>
        </div>

        <div className="filter-item">
          <label htmlFor="type-filter">Asset/Liability Type</label>
          <select id="type-filter" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}>
            <option value="">All Contracts</option>
            <option value="ASSET">Assets Only</option>
            <option value="LIABILITY">Liabilities Only</option>
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="cp-filter">Counterparty Profile</label>
          <select id="cp-filter" value={counterpartyFilter} onChange={(e) => { setCounterpartyFilter(e.target.value); setPage(0); }}>
            <option value="">All Counterparties</option>
            {counterparties.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton skeleton-row" style={{ height: '48px', marginTop: i === 1 ? 0 : '12px' }} />
            ))}
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none', borderRadius: 0, marginTop: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Counterparty</th>
                    <th style={{ textAlign: 'right' }}>Principal</th>
                    <th style={{ textAlign: 'right' }}>Annual Rate</th>
                    <th>Origination</th>
                    <th>Maturity</th>
                    <th>Frequency</th>
                    <th>Rate Type</th>
                    {isEditable && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {instruments.map((inst) => (
                    <motion.tr 
                      key={inst.id}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.015)' }}
                      transition={{ duration: 0.15 }}
                    >
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>#{inst.id}</td>
                      <td>
                        <span className={`badge badge-${inst.instrumentType.toLowerCase()}`}>
                          {inst.instrumentType}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700' }}>{inst.productType}</td>
                      <td style={{ fontWeight: '500' }}>{inst.counterpartyName}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: inst.instrumentType === 'ASSET' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {formatCurrency(inst.principalAmount)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-primary)', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                        {inst.interestRate.toFixed(2)}%
                      </td>
                      <td style={{ fontSize: '13px' }}>{inst.originationDate}</td>
                      <td style={{ fontSize: '13px', fontWeight: '600' }}>{inst.maturityDate}</td>
                      <td style={{ fontSize: '13px' }}>{inst.cashFlowFrequency}</td>
                      <td>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          background: inst.isFloatingRate ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.03)',
                          border: '1px solid',
                          borderColor: inst.isFloatingRate ? 'rgba(168,85,247,0.15)' : 'var(--border-subtle)',
                          color: inst.isFloatingRate ? 'var(--accent-secondary)' : 'var(--text-secondary)'
                        }}>
                          {inst.isFloatingRate ? 'Floating' : 'Fixed'}
                        </span>
                      </td>
                      {isEditable && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleOpenEdit(inst)} 
                              className="btn-action" 
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit3 size={12} /> Edit
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDelete(inst.id)} 
                              className="btn-logout" 
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={12} /> Delete
                            </motion.button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                  {instruments.length === 0 && (
                    <tr>
                      <td colSpan={isEditable ? 11 : 10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Info size={24} />
                          <span>No financial instruments registered matching filter criteria.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination" style={{ padding: '20px 24px', borderTop: '1px solid var(--border-subtle)', marginTop: 0 }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  Page {page + 1} of {totalPages}
                </span>
                <div className="pagination-buttons">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPage(page - 1)} 
                    disabled={page === 0} 
                    className="btn-action"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPage(page + 1)} 
                    disabled={page >= totalPages - 1} 
                    className="btn-action"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    Next <ChevronRight size={14} />
                  </motion.button>
                </div>
              </div>
            )}
          </>
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
            >
              <div className="modal-header">
                <h3>{editingId ? 'Edit Instrument' : 'Create New Instrument'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="btn-close">
                  &times;
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="inst-type">Instrument Type</label>
                    <select
                      id="inst-type"
                      value={formData.instrumentType}
                      onChange={(e) => setFormData({ ...formData, instrumentType: e.target.value })}
                    >
                      <option value="ASSET">ASSET (Inflow)</option>
                      <option value="LIABILITY">LIABILITY (Outflow)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="prod-type">Product Type</label>
                    <select
                      id="prod-type"
                      value={formData.productType}
                      onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    >
                      <option value="LOAN">LOAN</option>
                      <option value="DEPOSIT">DEPOSIT</option>
                      <option value="BOND">BOND</option>
                      <option value="BORROWING">BORROWING</option>
                      <option value="TREASURY_BILL">TREASURY_BILL</option>
                      <option value="COMMERCIAL_PAPER">COMMERCIAL_PAPER</option>
                      <option value="REPO">REPO</option>
                      <option value="REVERSE_REPO">REVERSE_REPO</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="cp-id">Counterparty</label>
                    <select
                      id="cp-id"
                      value={formData.counterpartyId}
                      onChange={(e) => setFormData({ ...formData, counterpartyId: e.target.value })}
                      required
                    >
                      {counterparties.map((cp) => (
                        <option key={cp.id} value={cp.id}>
                          {cp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="principal">Principal Amount (INR)</label>
                    <input
                      id="principal"
                      type="number"
                      value={formData.principalAmount}
                      onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                      placeholder="e.g. 10000000"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="rate">Annual Interest Rate (%)</label>
                    <input
                      id="rate"
                      type="number"
                      step="0.01"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                      placeholder="e.g. 7.50"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="frequency">Payment Frequency</label>
                    <select
                      id="frequency"
                      value={formData.cashFlowFrequency}
                      onChange={(e) => setFormData({ ...formData, cashFlowFrequency: e.target.value })}
                    >
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="QUARTERLY">QUARTERLY</option>
                      <option value="SEMI_ANNUAL">SEMI_ANNUAL</option>
                      <option value="ANNUAL">ANNUAL</option>
                      <option value="BULLET">BULLET (Repay at Maturity)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="orig-date">Origination Date</label>
                    <input
                      id="orig-date"
                      type="date"
                      value={formData.originationDate}
                      onChange={(e) => setFormData({ ...formData, originationDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="mat-date">Maturity Date</label>
                    <input
                      id="mat-date"
                      type="date"
                      value={formData.maturityDate}
                      onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '14px' }}>
                  <input
                    id="floating-rate"
                    type="checkbox"
                    checked={formData.isFloatingRate}
                    onChange={(e) => setFormData({ ...formData, isFloatingRate: e.target.checked })}
                    style={{ width: 'auto', marginRight: '10px' }}
                  />
                  <label htmlFor="floating-rate" style={{ textTransform: 'none', cursor: 'pointer', fontSize: '13.5px' }}>
                    Floating Interest Rate (Indexes to Overnight Benchmarks)
                  </label>
                </div>

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="btn-primary"
                  >
                    {editingId ? 'Save Changes' : 'Create Instrument'}
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

      {/* PDF Upload Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="modal-backdrop">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel modal-content" 
              style={{ maxWidth: '540px' }}
            >
              <div className="modal-header">
                <h3>Bulk Import Instruments</h3>
                <button onClick={() => setIsUploadOpen(false)} className="btn-close">
                  &times;
                </button>
              </div>

              <form onSubmit={handleUploadPdf}>
                <div className="form-group">
                  <label htmlFor="pdf-file-input">Select PDF Document</label>
                  <input
                    id="pdf-file-input"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                    required
                  />
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: '700' }}>
                     <AlertCircle size={14} />
                    <span>Required PDF Layout (Comma/Whitespace Separated):</span>
                  </div>
                  <p style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '8px' }}>
                    instrumentType, productType, counterpartyId, principalAmount, currency, interestRate, originationDate, maturityDate, cashFlowFrequency, isFloatingRate
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700' }}>
                    <span>Example Line:</span>
                  </div>
                  <p style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                    ASSET,LOAN,4,50000000,INR,9.5,2026-01-15,2029-01-15,MONTHLY,false
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="btn-primary" 
                    disabled={loading}
                  >
                    {loading ? 'Uploading...' : 'Upload & Process'}
                  </motion.button>
                  <button type="button" onClick={() => setIsUploadOpen(false)} className="btn-logout" style={{ background: 'transparent' }}>
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

export default InstrumentsPage;
