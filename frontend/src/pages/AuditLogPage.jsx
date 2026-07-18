import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { ShieldAlert, ChevronLeft, ChevronRight, Info, Clock, User } from 'lucide-react';

const AuditLogPage = () => {
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/audit-logs?page=${page}&size=20&sort=timestamp,desc`);
      setLogs(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      setError('Failed to fetch platform audit log trail.');
      showToast('Error loading security audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts) => {
    return new Date(ts).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '36px' }}>
        <div className="page-title-section">
          <h1>Security Audit Trail</h1>
          <p>Immutable ledger of administrative actions, user logins, and risk database changes.</p>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '24px' }}>{error}</div>}

      {/* Audit Log Table container */}
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
                    <th>Timestamp</th>
                    <th>User identity</th>
                    <th>Security Action</th>
                    <th>Module</th>
                    <th>Resource ID</th>
                    <th>Transaction Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <motion.tr 
                      key={log.id}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
                      transition={{ duration: 0.15 }}
                    >
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc' }}>{log.userName}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{log.userEmail}</span>
                        </div>
                      </td>
                      <td>
                        <span className="user-badge" style={{
                          background: log.action === 'DELETE' ? 'rgba(255, 59, 92, 0.08)' : 
                                      log.action === 'CREATE' || log.action === 'LOGIN' ? 'rgba(0, 255, 136, 0.08)' : 'rgba(0, 212, 255, 0.08)',
                          color: log.action === 'DELETE' ? 'var(--accent-red)' : 
                                 log.action === 'CREATE' || log.action === 'LOGIN' ? 'var(--accent-green)' : 'var(--accent-primary)',
                          borderColor: log.action === 'DELETE' ? 'rgba(255, 59, 92, 0.2)' : 
                                       log.action === 'CREATE' || log.action === 'LOGIN' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 212, 255, 0.2)',
                          padding: '2px 8px',
                          fontSize: '11px',
                          display: 'inline-flex'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', fontSize: '13.5px' }}>{log.entityType}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                        {log.entityId ? `#${log.entityId}` : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>{log.details}</td>
                    </motion.tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Info size={24} />
                          <span>No security audit records found.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
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
    </motion.div>
  );
};

export default AuditLogPage;
