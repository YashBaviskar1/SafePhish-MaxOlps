import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Shield, LayoutDashboard, Search, X, Calendar, User, Link as LinkIcon, FileText, ExternalLink, Mail, Info, ChevronRight, Activity, AlertTriangle, CheckCircle2, Clock, Map } from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:5001/api';

const Dashboard = () => {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({ total_scans: 0, phishing_detected: 0, legitimate_detected: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('stream');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [scansRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/scans`),
        axios.get(`${API_BASE}/stats`)
      ]);
      setScans(scansRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openScan = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/scans/${id}`);
      setSelectedScan(res.data);
    } catch (err) {
      console.error('Error fetching scan details:', err);
    }
  };

  const filteredScans = scans.filter(scan => 
    scan.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scan.scan_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-container">
      <header>
        <div className="logo-section">
          <h1>SafePhish <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', verticalAlign: 'middle', background: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(99, 102, 241, 0.2)', marginLeft: '1rem' }}>Admin Console</span></h1>
        </div>
        <div className="search-box" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.5rem 1rem', border: '1px solid var(--card-border)' }}>
          <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
          <input 
            type="text" 
            placeholder="Search targets..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '250px' }}
          />
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total Scans</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
            <span className="stat-value">{stats.total_scans}</span>
            <Activity color="var(--accent-primary)" size={32} />
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <p className="stat-label">Phishing Flagged</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
            <span className="stat-value">{stats.phishing_detected}</span>
            <AlertTriangle color="var(--danger)" size={32} />
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <p className="stat-label">Legitimate</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
            <span className="stat-value">{stats.legitimate_detected}</span>
            <CheckCircle2 color="var(--success)" size={32} />
          </div>
        </div>
      </section>

      <div className="tabs-container">
        <button 
          className={`tab-button ${activeTab === 'stream' ? 'active' : ''}`}
          onClick={() => setActiveTab('stream')}
        >
           <Activity size={18} /> Live Stream
        </button>
        <button 
          className={`tab-button ${activeTab === 'clusters' ? 'active' : ''}`}
          onClick={() => setActiveTab('clusters')}
        >
           <Map size={18} /> Cluster Analysis
        </button>
      </div>

      {activeTab === 'stream' ? (
        <section className="data-section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <Clock size={20} color="var(--accent-primary)" />
               <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Live Analysis Stream</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Auto-updating every 10 seconds</p>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Verdict</th>
                  <th>Confidence</th>
                  <th>Timestamp</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map(scan => (
                  <tr key={scan.id} onClick={() => openScan(scan.id)}>
                    <td>
                      <span className="type-tag" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {scan.scan_type === 'URL' ? <LinkIcon size={14} /> : <Mail size={14} />}
                        {scan.scan_type}
                      </span>
                    </td>
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 500 }}>{scan.target}</span>
                    </td>
                    <td>
                      <span className={`badge ${scan.is_phishing ? 'badge-phishing' : 'badge-legitimate'}`}>
                        {scan.is_phishing ? 'PHISHING' : 'LEGITIMATE'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${scan.confidence}%`, height: '100%', background: scan.is_phishing ? 'var(--danger)' : 'var(--success)' }}></div>
                         </div>
                         <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{scan.confidence}%</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(scan.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </td>
                  </tr>
                ))}
                {filteredScans.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                      No analysis records found. Perform a scan in the extension to see results here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <ClusterAnalysisTab onOpenScan={openScan} />
      )}

      {selectedScan && (
        <ScanDetailModal 
          scan={selectedScan} 
          onClose={() => setSelectedScan(null)} 
        />
      )}
    </div>
  );
};

const ClusterAnalysisTab = ({ onOpenScan }) => {
  const [clustersData, setClustersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchClusters();
  }, []);

  const fetchClusters = async () => {
    try {
      const res = await axios.get(`${API_BASE}/clusters`);
      setClustersData(res.data.clusters);
    } catch (err) {
      console.error('Error fetching clusters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && canvasRef.current && clustersData.length > 0) {
      drawClusters(canvasRef.current, clustersData, hoveredPoint);
    }
  }, [loading, clustersData, hoveredPoint]);

  const scalePoint = (item, width, height, data) => {
    const xs = data.map(d => d.x);
    const ys = data.map(d => d.y);
    const minX = Math.min(...xs) - 0.1;
    const maxX = Math.max(...xs) + 0.1;
    const minY = Math.min(...ys) - 0.1;
    const maxY = Math.max(...ys) + 0.1;
    
    // Range protection
    const diffX = (maxX - minX) === 0 ? 1 : (maxX - minX);
    const diffY = (maxY - minY) === 0 ? 1 : (maxY - minY);
    
    return {
      x: ((item.x - minX) / diffX) * (width - 80) + 40,
      y: height - (((item.y - minY) / diffY) * (height - 80) + 40)
    };
  };

  const drawClusters = (canvas, data, hovered) => {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // High-DPI canvas fix
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if(canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }
    
    const drawWidth = rect.width;
    const drawHeight = rect.height;
    
    ctx.clearRect(0, 0, drawWidth, drawHeight);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, drawHeight * (i/10));
        ctx.lineTo(drawWidth, drawHeight * (i/10));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(drawWidth * (i/10), 0);
        ctx.lineTo(drawWidth * (i/10), drawHeight);
        ctx.stroke();
    }
    
    const clusterColors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#3b82f6'];

    data.forEach(item => {
      const pos = scalePoint(item, drawWidth, drawHeight, data);
      ctx.beginPath();
      
      const isHovered = hovered && hovered.id === item.id;
      const radius = isHovered ? 12 : 8;
      
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      
      const isPhishing = item.is_phishing;
      // Core cluster color
      let color = clusterColors[item.cluster % clusterColors.length];
      
      ctx.fillStyle = color;
      
      // If hovered, glow effect
      if (isHovered) {
         ctx.shadowColor = color;
         ctx.shadowBlur = 10;
      } else {
         ctx.shadowBlur = 0;
      }
      
      ctx.fill();
      
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.strokeStyle = isPhishing ? '#ef4444' : '#22c55e'; // Red border if phishing, Green if legitimate
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset
    });
  };

  const handleMouseMove = (e) => {
    if(!canvasRef.current || clustersData.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let closest = null;
    let minDist = 15; // Hover radius
    
    clustersData.forEach(item => {
      const pos = scalePoint(item, rect.width, rect.height, clustersData);
      const dist = Math.sqrt(Math.pow(pos.x - mouseX, 2) + Math.pow(pos.y - mouseY, 2));
      if (dist < minDist) {
        minDist = dist;
        closest = item;
      }
    });
    
    setHoveredPoint(closest);
  };
  
  const handleClick = () => {
    if(hoveredPoint) {
       onOpenScan(hoveredPoint.id);
    }
  };

  return (
    <div className="cluster-analysis-container">
       <div className="section-header" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '1.5rem 1.5rem 0 0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <Map size={20} color="var(--accent-primary)" />
                 <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Campaign Clustering (TF-IDF + PCA)</h2>
             </div>
             <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'transparent', border: '2px solid #ef4444' }}></div>
                    Phishing
                 </span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'transparent', border: '2px solid #22c55e' }}></div>
                    Legitimate
                 </span>
             </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
             This map projects behavioral and textual artifacts into a 2D space using KMeans. Points clustered together represent similar attack vectors or campaigns. Colors represent identified campaigns.
          </p>
       </div>
       <div className="canvas-wrapper" style={{ position: 'relative', width: '100%', height: '500px', background: '#0a0d25', border: '1px solid var(--card-border)', borderTop: 'none', borderRadius: '0 0 1.5rem 1.5rem' }}>
          {loading ? (
             <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Analyzing dimensions...</div>
          ) : clustersData.length > 0 ? (
             <>
               <canvas 
                 ref={canvasRef} 
                 style={{ width: '100%', height: '100%', cursor: hoveredPoint ? 'pointer' : 'crosshair' }}
                 onMouseMove={handleMouseMove}
                 onClick={handleClick}
                 onMouseLeave={() => setHoveredPoint(null)}
               />
               {hoveredPoint && (
                 <div className="canvas-tooltip" style={{
                    position: 'absolute',
                    top: '1rem', right: '1rem',
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--card-border)',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    width: '300px',
                    pointerEvents: 'none'
                 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                       <span className={`badge ${hoveredPoint.is_phishing ? 'badge-phishing' : 'badge-legitimate'}`}>{hoveredPoint.is_phishing ? 'PHISHING' : 'LEGIT'}</span>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{hoveredPoint.scan_type}</span>
                    </div>
                    <p style={{ fontWeight: 700, wordBreak: 'break-all', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{hoveredPoint.target}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Campaign Cluster ID: <strong style={{ color: 'var(--accent-primary)' }}>#{hoveredPoint.cluster}</strong></p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence: <strong style={{ color: '#fff' }}>{hoveredPoint.confidence}%</strong></p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Click point to open full analysis</p>
                 </div>
               )}
             </>
          ) : (
             <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Not enough data for clustering (Need at least 3 records).</div>
          )}
       </div>
    </div>
  );
};

const ScanDetailModal = ({ scan, onClose }) => {
  const data = scan.full_data;
  const isUrl = scan.scan_type === 'URL';

  const strokeDashoffset = 251.32 - (251.32 * scan.confidence) / 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className={`badge ${scan.is_phishing ? 'badge-phishing' : 'badge-legitimate'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
              {scan.is_phishing ? 'CRITICAL RISK' : 'SAFE RECORD'}
            </div>
            <h2 style={{ fontSize: '1.25rem' }}>Full Analysis Report</h2>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-content">
          <div className="report-grid">
            
            {/* Header info card */}
            <div className="report-header">
              <div className="confidence-circle">
                <svg width="100" height="100" className="svg-circle">
                  <circle cx="50" cy="50" r="40" className="circle-bg" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    className="circle-progress"
                    stroke={scan.is_phishing ? '#ef4444' : '#22c55e'}
                    strokeDasharray="251.32"
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="confidence-text">
                  <span className="confidence-value">{scan.confidence}%</span>
                  <span className="confidence-label">Risk</span>
                </div>
              </div>
              
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {isUrl ? 'Target URL' : 'Email Sender'}
                </p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, wordBreak: 'break-all', marginBottom: '0.5rem' }}>
                  {scan.target}
                </h3>
                {isUrl && (
                  <a href={scan.target} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ExternalLink size={14} /> Open in browser
                  </a>
                )}
                {!isUrl && data.subject && (
                  <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subject:</span> {data.subject}
                  </p>
                )}
              </div>
            </div>

            {/* Content for URL Analysis */}
            {isUrl && (
              <>
                <section>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <Activity size={20} color="var(--accent-primary)" />
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Neural Feature Grid</h4>
                   </div>
                   <div className="feature-grid">
                      {data.features && Object.entries(data.features).map(([name, value]) => (
                        <div key={name} className="feature-item">
                           <span className="feature-name">{name}</span>
                           <span className={`feature-val ${value === -1 ? 'val-danger' : value === 1 ? 'val-safe' : 'val-neutral'}`}>
                              {value}
                           </span>
                        </div>
                      ))}
                   </div>
                </section>

                {data.topFeatures && (
                  <section style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Info size={20} color="var(--accent-primary)" />
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Top Decision Drivers</h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      {data.topFeatures.map((f, i) => (
                        <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                           <span style={{ fontSize: '0.85rem' }}>{f.feature}</span>
                           <span style={{ color: f.score < 0 ? '#f87171' : '#4ade80', fontWeight: 800 }}>{f.score.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Content for Email Analysis */}
            {!isUrl && (
              <>
                <section>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <Shield size={20} color="var(--accent-primary)" />
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>6-Engine Fusion Breakdown</h4>
                   </div>
                   <div className="engine-grid">
                      {data.components && Object.entries(data.components).map(([key, score]) => (
                        <div key={key} className="engine-card">
                           <div className="engine-score" style={{ color: score > 50 ? 'var(--danger)' : score > 15 ? 'var(--warning)' : 'var(--success)' }}>
                              {score}
                           </div>
                           <div className="engine-name">{key.replace('Score', '').replace('ml', 'ML').replace('url', 'URL').replace('ai', 'AI')}</div>
                        </div>
                      ))}
                   </div>
                </section>

                <section style={{ marginTop: '2rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <FileText size={20} color="var(--accent-primary)" />
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Analysis Findings</h4>
                   </div>
                   <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {data.findings && data.findings.map((f, i) => (
                        <div key={i} style={{ padding: '0.75rem 1rem', background: 'rgba(255,225,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '0.5rem', fontSize: '0.85rem', display: 'flex', gap: '0.75rem' }}>
                           <ChevronRight size={14} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                           {f}
                        </div>
                      ))}
                   </div>
                </section>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
