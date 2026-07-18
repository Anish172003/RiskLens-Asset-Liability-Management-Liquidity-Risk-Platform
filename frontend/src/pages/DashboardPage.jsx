import React, { useState, useEffect } from 'react';
import CountUpModule from 'react-countup';
const CountUp = CountUpModule.default || CountUpModule;
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  Play,
  ArrowRight,
  ChevronRight,
  Layers,
  BarChart4,
  PieChart,
  MessageSquare,
  X,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend
);

// Currency formatter helper
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

// Count-up currency formatter with smooth transition
const AnimatedCurrency = ({ value }) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <span>{formatCurrency(value || 0)}</span>;
  }

  return (
    <CountUp
      start={0}
      end={value || 0}
      duration={2.0}
      separator=","
      formattingFn={formatCurrency}
    />
  );
};

// Dynamic Skeletons for Bloomberg layout
const GridSkeleton = () => (
  <div className="grid-12" style={{ gap: '24px' }}>
    <div className="col-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
      {[1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '110px' }} />)}
    </div>
    <div className="col-8" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div className="skeleton skeleton-chart" style={{ height: '320px' }} />
      <div className="skeleton skeleton-chart" style={{ height: '320px' }} />
    </div>
    <div className="col-4" className="skeleton skeleton-card" style={{ height: '320px' }} />
  </div>
);

const DashboardPage = () => {
  const shouldReduceMotion = useReducedMotion();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableDates, setAvailableDates] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [allocationData, setAllocationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // AI Advisor sliding panel state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState('');
  const [fetchingAi, setFetchingAi] = useState(false);

  // Chat agent state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your RiskLens AI Assistant. How can I help you analyze risk or adjust your portfolio today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setSendingChat(true);

    try {
      const res = await api.post('/api/v1/ai/chat', { message: userMsg });
      const aiReply = res.data.response;
      setChatMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
      
      // If database changed, update UI data immediately
      if (aiReply.includes("Database Action Executed") || aiReply.includes("Created Successfully") || aiReply.includes("Successfully deleted") || aiReply.includes("Generated")) {
        showToast("Database updated by AI Assistant.", "info");
        fetchReport();
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I encountered an error communicating with the server.' }]);
    } finally {
      setSendingChat(false);
    }
  };
  
  // AI Data Generator state
  const [generatorStyle, setGeneratorStyle] = useState('BALANCED');
  const [generatorCount, setGeneratorCount] = useState(10);
  const [generatorLoading, setGeneratorLoading] = useState(false);

  const { showToast } = useToast();

  // Fetch distinct report dates and portfolio data
  useEffect(() => {
    const fetchInitData = async () => {
      if (!localStorage.getItem('accessToken')) return;
      try {
        const datesRes = await api.get('/api/v1/liquidity-gap/dates');
        setAvailableDates(datesRes.data);
        
        // Fetch allocation composition
        const instRes = await api.get('/api/v1/instruments?page=0&size=1000');
        setAllocationData(instRes.data.content);
      } catch (err) {
        console.error('Failed to fetch initial dates or allocation', err);
      }
    };
    fetchInitData();
  }, []);

  // Fetch report data on date change
  const fetchReport = async () => {
    if (!localStorage.getItem('accessToken')) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/liquidity-gap/report?reportDate=${reportDate}`);
      setReportData(res.data);
    } catch (err) {
      setError('Failed to load gap analysis report.');
      showToast('Error loading liquidity gap report.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportDate]);

  // Fetch AI insights once report data is loaded
  const fetchAiInsights = async () => {
    if (!localStorage.getItem('accessToken')) return;
    if (reportData.length === 0) return;
    setFetchingAi(true);
    try {
      const res = await api.post('/api/v1/ai/insights', {
        date: reportDate,
        buckets: reportData.map(item => ({
          label: item.bucketLabel,
          inflows: item.totalAssets,
          outflows: item.totalLiabilities,
          netGap: item.gap,
          cumulativeGap: item.cumulativeGap,
          ratio: item.gapRatio
        }))
      });
      setAiInsights(res.data.insights);
    } catch (err) {
      console.error('Failed to fetch AI insights', err);
      setAiInsights('### AI Insights offline\nCould not connect to model fallback. Local checks active.');
    } finally {
      setFetchingAi(false);
    }
  };

  useEffect(() => {
    if (reportData.length > 0) {
      fetchAiInsights();
    }
  }, [reportData]);

  // Handle AI Data Generation
  const handleGenerateData = async (e) => {
    e.preventDefault();
    setGeneratorLoading(true);
    showToast('Synthesizing risk profiles...', 'info');
    try {
      const res = await api.post('/api/v1/ai/generate-data', {
        count: generatorCount,
        style: generatorStyle
      });
      showToast(res.data.message, 'success');
      
      // Update allocation chart list
      const instRes = await api.get('/api/v1/instruments?page=0&size=1000');
      setAllocationData(instRes.data.content);
      
      fetchReport();
    } catch (err) {
      console.error(err);
      showToast('Failed to generate portfolio data.', 'error');
    } finally {
      setGeneratorLoading(false);
    }
  };

  // Compute KPI metrics
  const totalAssets = reportData.reduce((sum, item) => sum + item.totalAssets, 0);
  const totalLiabilities = reportData.reduce((sum, item) => sum + item.totalLiabilities, 0);
  const netGap = totalAssets - totalLiabilities;

  // Find worst mismatch
  let largestMismatch = { bucketLabel: 'None', gap: 0 };
  reportData.forEach((item) => {
    if (item.gap < largestMismatch.gap) {
      largestMismatch = { bucketLabel: item.bucketLabel, gap: item.gap };
    }
  });

  // Calculate Product Allocation percentages
  const productAllocation = {};
  allocationData.forEach(item => {
    const type = item.productType;
    productAllocation[type] = (productAllocation[type] || 0) + item.principalAmount;
  });

  // Render markdown insights
  const renderMarkdown = (text) => {
    if (!text) return null;
    let html = text;
    html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/^\s*\-\s*(.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\>\s*(.*$)/gim, '<blockquote>$1</blockquote>');
    const lines = html.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<block') || trimmed === '') return line;
      return `<p>${line}</p>`;
    }).join('\n');
    return <div dangerouslySetInnerHTML={{ __html: lines }} className="ai-markdown" />;
  };

  // ==================== CHARTS CONFIGURATION ====================

  // Chart Labels
  const chartLabels = reportData.map(item => item.bucketLabel);

  // 1. Liquidity Trend (Cumulative Ratio line)
  const liquidityTrendData = {
    labels: chartLabels,
    datasets: [{
      label: 'Cumulative Gap Ratio',
      data: reportData.map(item => item.gapRatio * 100),
      borderColor: '#00d4ff',
      backgroundColor: 'rgba(0, 212, 255, 0.08)',
      fill: true,
      tension: 0.4,
      borderWidth: 2.5,
      pointRadius: 4,
      pointBackgroundColor: '#00d4ff',
      pointBorderColor: '#000'
    }]
  };

  // 2. Asset vs Liability (Inflows vs Outflows bar)
  const assetVsLiabilityData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Inflows (Assets)',
        data: reportData.map(item => item.totalAssets),
        backgroundColor: 'rgba(0, 255, 136, 0.65)',
        borderColor: '#00ff88',
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        label: 'Outflows (Liabilities)',
        data: reportData.map(item => item.totalLiabilities),
        backgroundColor: 'rgba(255, 59, 92, 0.65)',
        borderColor: '#ff3b5c',
        borderWidth: 1.5,
        borderRadius: 4
      }
    ]
  };

  // 3. Cash Flow Projection (Area net gap progression)
  const cashFlowProjectionData = {
    labels: chartLabels,
    datasets: [{
      label: 'Net Gap Progress',
      data: reportData.map(item => item.gap),
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168, 85, 247, 0.08)',
      fill: true,
      tension: 0.35,
      borderWidth: 2
    }]
  };

  // 4. Maturity Bucket Distribution (Radar)
  const maturityDistributionData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Asset Concentration',
        data: reportData.map(item => item.totalAssets),
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 2
      },
      {
        label: 'Liability Concentration',
        data: reportData.map(item => item.totalLiabilities),
        borderColor: '#ff3b5c',
        backgroundColor: 'rgba(255, 59, 92, 0.1)',
        borderWidth: 2
      }
    ]
  };

  // 5. Portfolio Allocation (Doughnut)
  const allocationLabels = Object.keys(productAllocation);
  const allocationValues = Object.values(productAllocation);
  const portfolioAllocationData = {
    labels: allocationLabels.length > 0 ? allocationLabels : ['No Data'],
    datasets: [{
      data: allocationValues.length > 0 ? allocationValues : [1],
      backgroundColor: [
        '#00d4ff', '#a855f7', '#00ff88', '#ffaa00', '#ff3b5c', '#6366f1', '#ec4899'
      ],
      borderWidth: 1.5,
      borderColor: '#07070a'
    }]
  };

  // Global Chart options
  const globalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Inter', size: 11, weight: '500' } }
      },
      tooltip: {
        backgroundColor: '#0a0b0f',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
      }
    }
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
    },
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 10 } },
        ticks: { display: false }
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', position: 'relative' }}
    >
      <div style={{ flex: 1, maxWidth: '100%', paddingRight: isAiOpen ? '420px' : '0', transition: 'padding-right 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        {/* Top Header Row */}
        <div className="page-header" style={{ marginBottom: '32px' }}>
          <div className="page-title-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', background: 'rgba(0, 212, 255, 0.08)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.2)', fontWeight: '700' }}>
                ALM PROTOCOL V3.8
              </span>
            </div>
            <h1 style={{ marginTop: '8px' }}>Risk Control Desk</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="filter-item" style={{ width: '200px' }}>
              <select
                id="report-date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '10px 18px', color: '#fff' }}
              >
                <option value={new Date().toISOString().split('T')[0]}>Current (Today)</option>
                {availableDates.map(date => <option key={date} value={date}>{date}</option>)}
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAiOpen(true)}
              className="btn-header"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-gradient)', borderRadius: '20px' }}
            >
              <Sparkles size={14} /> AI Copilot
            </motion.button>
          </div>
        </div>

        {loading ? (
          <GridSkeleton />
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : (
          <div className="grid-12" style={{ gap: '24px' }}>
            
            {/* 1. KPI Cards */}
            <div className="col-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              <motion.div 
                className="stat-card glass-panel glow-cyan-active"
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? {} : { duration: 0.6, delay: 0 * 0.15 }}
                whileHover={shouldReduceMotion ? {} : {
                  y: -6,
                  scale: 1.02,
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35), 0 0 20px rgba(0, 212, 255, 0.15)',
                  transition: { duration: 0.25, ease: "easeOut" }
                }}
                style={{
                  animationDelay: '0.60s'
                }}
              >
                <div className="stat-header">
                  <span className="stat-title">Cash &amp; Liquid Assets</span>
                  <span className="stat-icon"><TrendingUp size={14} className="text-success" /></span>
                </div>
                <div className="stat-value text-success" style={{ fontFamily: 'var(--font-mono)' }}>
                  <AnimatedCurrency value={totalAssets} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span className="stat-desc">Inflow Projections</span>
                  <motion.span 
                    initial={shouldReduceMotion ? {} : { opacity: 0 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1 }}
                    transition={shouldReduceMotion ? {} : { delay: 2.3, duration: 0.4 }}
                    style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600' }}
                  >
                    +12.4%
                  </motion.span>
                </div>
              </motion.div>

              <motion.div 
                className="stat-card glass-panel glow-purple-active"
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? {} : { duration: 0.6, delay: 1 * 0.15 }}
                whileHover={shouldReduceMotion ? {} : {
                  y: -6,
                  scale: 1.02,
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35), 0 0 20px rgba(168, 85, 247, 0.15)',
                  transition: { duration: 0.25, ease: "easeOut" }
                }}
                style={{
                  animationDelay: '0.75s'
                }}
              >
                <div className="stat-header">
                  <span className="stat-title">Liability Drawdowns</span>
                  <span className="stat-icon"><TrendingDown size={14} className="text-danger" /></span>
                </div>
                <div className="stat-value text-danger" style={{ fontFamily: 'var(--font-mono)' }}>
                  <AnimatedCurrency value={totalLiabilities} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span className="stat-desc">Outflow Commitments</span>
                  <motion.span 
                    initial={shouldReduceMotion ? {} : { opacity: 0 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1 }}
                    transition={shouldReduceMotion ? {} : { delay: 2.3, duration: 0.4 }}
                    style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: '600' }}
                  >
                    +8.1%
                  </motion.span>
                </div>
              </motion.div>

              <motion.div 
                className="stat-card glass-panel glow-cyan-active"
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? {} : { duration: 0.6, delay: 2 * 0.15 }}
                whileHover={shouldReduceMotion ? {} : {
                  y: -6,
                  scale: 1.02,
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35), 0 0 20px rgba(0, 212, 255, 0.15)',
                  transition: { duration: 0.25, ease: "easeOut" }
                }}
                style={{
                  animationDelay: '0.90s'
                }}
              >
                <div className="stat-header">
                  <span className="stat-title">Net Buffer Gap</span>
                  <span className="stat-icon"><Activity size={14} className="text-info" /></span>
                </div>
                <div className="stat-value" style={{ fontFamily: 'var(--font-mono)', color: netGap >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  <AnimatedCurrency value={netGap} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span className="stat-desc">Liquidity Coverage</span>
                  <motion.span 
                    initial={shouldReduceMotion ? {} : { opacity: 0 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1 }}
                    transition={shouldReduceMotion ? {} : { delay: 2.3, duration: 0.4 }}
                    style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600' }}
                  >
                    STABLE
                  </motion.span>
                </div>
              </motion.div>

              <motion.div 
                className="stat-card glass-panel glow-purple-active"
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? {} : { duration: 0.6, delay: 3 * 0.15 }}
                whileHover={shouldReduceMotion ? {} : {
                  y: -6,
                  scale: 1.02,
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35), 0 0 20px rgba(168, 85, 247, 0.15)',
                  transition: { duration: 0.25, ease: "easeOut" }
                }}
                style={{
                  animationDelay: '1.05s'
                }}
              >
                <div className="stat-header">
                  <span className="stat-title">Max Maturity Gap</span>
                  <span className="stat-icon"><AlertTriangle size={14} className="text-warning" /></span>
                </div>
                <div className="stat-value" style={{ fontFamily: 'var(--font-mono)', color: largestMismatch.gap < 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                  {largestMismatch.gap < 0 ? <AnimatedCurrency value={largestMismatch.gap} /> : 'None'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span className="stat-desc">Mismatch: {largestMismatch.bucketLabel}</span>
                  <motion.span 
                    initial={shouldReduceMotion ? {} : { opacity: 0 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1 }}
                    transition={shouldReduceMotion ? {} : { delay: 2.3, duration: 0.4 }}
                    style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: '700' }}
                  >
                    LIMIT CHECK
                  </motion.span>
                </div>
              </motion.div>

            </div>

            {/* 2. Top-level compact AI alert card */}
            <div className="col-12">
              <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderLeft: '3px solid var(--accent-secondary)', background: 'radial-gradient(circle at left, rgba(168,85,247,0.08) 0%, transparent 60%), var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={16} className="text-secondary" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800' }}>ALM Stress Alert</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Large mismatch detected in the **3-6m** bucket. Click to consult Copilot for mitigations.
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => setIsAiOpen(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '13.5px' }}
                >
                  Open Advisor <ChevronRight size={16} />
                </motion.button>
              </div>
            </div>

            {/* 3. Charts Section */}
            
            {/* Row 1 Charts */}
            <div className="col-8 glass-panel chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="chart-title" style={{ margin: 0 }}>Asset vs Liability (Inflows / Outflows)</h3>
                <BarChart4 size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ height: '320px', position: 'relative' }}>
                <Bar data={assetVsLiabilityData} options={globalOptions} />
              </div>
            </div>

            <div className="col-4 glass-panel chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="chart-title" style={{ margin: 0 }}>Portfolio Composition</h3>
                <PieChart size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ height: '320px', position: 'relative' }}>
                <Doughnut data={portfolioAllocationData} options={globalOptions} />
              </div>
            </div>

            {/* Row 2 Charts */}
            <div className="col-4 glass-panel chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="chart-title" style={{ margin: 0 }}>Liquidity Concentration</h3>
                <Layers size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ height: '320px', position: 'relative' }}>
                <Radar data={maturityDistributionData} options={radarOptions} />
              </div>
            </div>

            <div className="col-8 glass-panel chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="chart-title" style={{ margin: 0 }}>Maturity Net Gap Projection</h3>
                <Activity size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ height: '320px', position: 'relative' }}>
                <Line data={cashFlowProjectionData} options={globalOptions} />
              </div>
            </div>

            {/* Row 3 Charts (Liquidity Trend) */}
            <div className="col-12 glass-panel chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="chart-title" style={{ margin: 0 }}>Cumulative Gap Ratio Trend</h3>
                <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ height: '300px', position: 'relative' }}>
                <Line data={liquidityTrendData} options={globalOptions} />
              </div>
            </div>

            {/* 4. Portfolio Synthesizer */}
            <div className="col-12 glass-panel ai-generator-panel" style={{ padding: '24px 32px' }}>
              <div style={{ display: 'flex', justifyItems: 'center', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} className="text-info" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Risk Modeller</h3>
              </div>
              <form onSubmit={handleGenerateData} className="ai-generator-grid" style={{ marginTop: '16px' }}>
                <div className="filter-item">
                  <label htmlFor="risk-profile">Stress Scenario Profile</label>
                  <select
                    id="risk-profile"
                    value={generatorStyle}
                    onChange={(e) => setGeneratorStyle(e.target.value)}
                  >
                    <option value="BALANCED">Balanced Assets &amp; Liabilities (Normal)</option>
                    <option value="ASSET_HEAVY">Asset Heavy (Duration Mismatch Stress)</option>
                    <option value="LIABILITY_HEAVY">Liability Heavy (Deposit Drawdown Stress)</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label htmlFor="inst-count">Simulate Contract Count</label>
                  <input
                    id="inst-count"
                    type="number"
                    min="5"
                    max="50"
                    value={generatorCount}
                    onChange={(e) => setGeneratorCount(parseInt(e.target.value))}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={generatorLoading}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                >
                  {generatorLoading ? 'Modelling...' : (
                    <>
                      <Play size={12} fill="#fff" /> Run Stress Simulation
                    </>
                  )}
                </motion.button>
              </form>
            </div>

            {/* 5. Maturity Ladder Gap Table */}
            <div className="col-12 glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '800' }}>Liquidity Maturity Ladder</h3>
              <div className="table-container" style={{ marginTop: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Maturity Bucket</th>
                      <th style={{ textAlign: 'right' }}>Inflows (Asset Maturation)</th>
                      <th style={{ textAlign: 'right' }}>Outflows (Liability Drawdowns)</th>
                      <th style={{ textAlign: 'right' }}>Maturity Gap</th>
                      <th style={{ textAlign: 'right' }}>Cumulative Gap</th>
                      <th style={{ textAlign: 'right' }}>Cumulative Gap Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item) => (
                      <motion.tr 
                        key={item.id}
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.015)' }}
                      >
                        <td style={{ fontWeight: '700' }}>{item.bucketLabel}</td>
                        <td style={{ textAlign: 'right', color: 'var(--accent-green)', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(item.totalAssets)}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--accent-red)', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(item.totalLiabilities)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: item.gap >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {formatCurrency(item.gap)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: item.cumulativeGap >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {formatCurrency(item.cumulativeGap)}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                          {item.gapRatio ? `${(item.gapRatio * 100).toFixed(2)}%` : '0.00%'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Expandable Chat Drawer */}
      <AnimatePresence>
        {isAiOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '400px',
              height: '100vh',
              background: 'rgba(7, 7, 10, 0.95)',
              backdropFilter: 'blur(30px)',
              borderLeft: '1px solid var(--border-subtle)',
              zIndex: 2000,
              boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              padding: '30px 24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} className="text-secondary" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>RiskLens AI Copilot</h3>
              </div>
              <button onClick={() => setIsAiOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.sender === 'user' ? 'rgba(255,255,255,0.03)' : 'rgba(168,85,247,0.03)',
                    border: msg.sender === 'user' ? '1px solid var(--border-subtle)' : '1px solid rgba(168,85,247,0.2)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#fff'
                  }}
                >
                  {msg.sender === 'ai' ? renderMarkdown(msg.text) : <p style={{ margin: 0 }}>{msg.text}</p>}
                </div>
              ))}
              {sendingChat && (
                <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'rgba(168,85,247,0.03)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '16px', padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: '6px', height: '6px', borderRadius: '50%' }} />
                    <div className="skeleton" style={{ width: '6px', height: '6px', borderRadius: '50%' }} />
                    <div className="skeleton" style={{ width: '6px', height: '6px', borderRadius: '50%' }} />
                    <span style={{ marginLeft: '4px' }}>Executing database operations...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Area */}
            <form onSubmit={handleSendChatMessage} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question or type a portfolio command..."
                  disabled={sendingChat}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '10px 16px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={sendingChat || !chatInput.trim()}
                  className="btn-primary"
                  style={{
                    background: 'var(--accent-secondary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} className={sendingChat ? 'spin-anim' : ''} style={{ transform: sendingChat ? 'none' : 'rotate(45deg)' }} />
                </motion.button>
              </div>
              <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: 0 }}>
                Try: *"Create asset loan of 5M INR at 8.5% maturity 2029-01-15"* or *"Delete instrument 42"*
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DashboardPage;
