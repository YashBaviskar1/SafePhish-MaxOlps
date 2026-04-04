import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, LayoutDashboard, Search, X, Calendar, User, Link as LinkIcon, FileText, ExternalLink, Mail, Info, ChevronRight, Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:5001/api';

const Dashboard = () => {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({ total_scans: 0, phishing_detected: 0, legitimate_detected: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

      {selectedScan && (
        <ScanDetailModal 
          scan={selectedScan} 
          onClose={() => setSelectedScan(null)} 
        />
      )}
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
