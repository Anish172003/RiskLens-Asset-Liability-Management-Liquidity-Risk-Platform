import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { LogOut, BarChart3, Database, ShieldAlert, Users2, Activity, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully.', 'info');
    navigate('/login');
  };

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="navbar"
    >
      <div className="navbar-inner">
        <div className="nav-brand">
          <Activity size={24} className="text-info" style={{ strokeWidth: 2.5 }} />
          <span>RiskLens</span>
        </div>
      
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
          {({ isActive }) => (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={15} /> Dashboard
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeNavIndicator" 
                  className="active-indicator"
                  style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'var(--accent-gradient)',
                    boxShadow: '0 0 10px rgba(0, 212, 255, 0.8)'
                  }}
                />
              )}
            </>
          )}
        </NavLink>
        
        <NavLink to="/instruments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
          {({ isActive }) => (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={15} /> Instruments
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeNavIndicator" 
                  className="active-indicator"
                  style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'var(--accent-gradient)',
                    boxShadow: '0 0 10px rgba(0, 212, 255, 0.8)'
                  }}
                />
              )}
            </>
          )}
        </NavLink>
        
        <NavLink to="/counterparties" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
          {({ isActive }) => (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users2 size={15} /> Counterparties
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeNavIndicator" 
                  className="active-indicator"
                  style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'var(--accent-gradient)',
                    boxShadow: '0 0 10px rgba(0, 212, 255, 0.8)'
                  }}
                />
              )}
            </>
          )}
        </NavLink>
        
        {user.role === 'ADMIN' && (
          <>
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
              {({ isActive }) => (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} /> Users
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator" 
                      className="active-indicator"
                      style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'var(--accent-gradient)',
                        boxShadow: '0 0 10px rgba(0, 212, 255, 0.8)'
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
            
            <NavLink to="/audit-logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
              {({ isActive }) => (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={15} /> Audit Logs
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator" 
                      className="active-indicator"
                      style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'var(--accent-gradient)',
                        boxShadow: '0 0 10px rgba(0, 212, 255, 0.8)'
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
          </>
        )}
      </div>
      
      <div className="nav-user">
        <span className="user-badge">{user.role}</span>
        <span style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '-0.01em' }}>{user.name}</span>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout} 
          className="btn-logout"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <LogOut size={14} /> Logout
        </motion.button>
      </div>
     </div>
    </motion.nav>
  );
};

export default Navbar;
