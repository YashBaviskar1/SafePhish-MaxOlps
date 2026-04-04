import React, { useState, useEffect } from 'react';
import './UrlReport.css';

const FEATURE_DESCRIPTIONS = {
    AbnormalURL: "Detects abnormal URL patterns. Unusual character combinations or patterns may indicate phishing.",
    AgeofDomain: "Verifies domain age. Newly registered domains are more likely to be used for phishing.",
    AnchorURL: "Checks anchor tag destinations. Links may point to suspicious or unrelated domains.",
    DisableRightClick: "Checks if right-click is disabled. Legitimate sites rarely disable right-click functionality.",
    DNSRecording: "Checks DNS record existence. Missing or suspicious DNS records can indicate phishing.",
    DomainRegLen: "Checks domain registration length. Phishing domains are often newly registered or have short registration periods.",
    Favicon: "Verifies if favicon is loaded from proper domain. Phishing sites may load favicons from different domains.",
    GoogleIndex: "Verifies Google indexing status. Non-indexed sites are more likely to be malicious.",
    HTTPS: "Checks if HTTPS is used properly. While HTTPS is secure, phishers may also use it to appear legitimate.",
    HTTPSDomainURL: "Verifies HTTPS in domain part of URL. Inconsistent HTTPS usage can indicate phishing attempts.",
    IframeRedirection: "Checks for iframe-based redirection. Hidden iframes can be used for malicious redirects.",
    InfoEmail: "Looks for information submission to email. Legitimate sites rarely submit forms directly to email addresses.",
    LinksInScriptTags: "Analyzes links in script tags. Suspicious scripts may connect to external malicious domains.",
    LinksPointingToPage: "Counts links pointing to the page. Few external links can indicate a new or suspicious site.",
    LongURL: "Analyzes the length of the URL. Phishing URLs tend to be unusually long with many subdomains or path segments.",
    NonStdPort: "Checks if non-standard ports are used. Unusual port numbers can indicate suspicious activity.",
    PageRank: "Checks Google PageRank. Legitimate sites typically have established PageRank.",
    "PrefixSuffix-": "Looks for prefix or suffix separated by '-'. Phishing URLs often add prefixes or suffixes to mimic legitimate domains.",
    "Redirecting//": "Detects multiple forward slashes for redirection. Multiple slashes can indicate URL redirection attempts.",
    RequestURL: "Analyzes external resource request URLs. Phishing sites often load resources from multiple suspicious domains.",
    ServerFormHandler: "Checks form handler reliability. Form submissions should go to trusted domains.",
    ShortURL: "Detects if URL shortening services are used. Phishers often use these services to mask malicious URLs.",
    StatsReport: "Analyzes statistical reports. Unusual traffic patterns can indicate malicious activity.",
    StatusBarCust: "Detects status bar customization. Phishing sites may try to hide or modify the status bar.",
    SubDomains: "Counts the number of subdomains. Multiple subdomains can be used to create URLs that appear legitimate.",
    "Symbol@": "Checks for @ symbol in the URL. The @ symbol in URLs can be used to confuse users about the actual destination.",
    UsingIP: "Checks if the URL uses an IP address instead of a domain name. Phishing URLs often use IP addresses to hide the actual domain.",
    UsingPopupWindow: "Detects popup window usage. Excessive popups can indicate malicious behavior.",
    WebsiteForwarding: "Checks for website forwarding. Multiple redirections can hide the final malicious destination.",
    WebsiteTraffic: "Analyzes website traffic. Low traffic or sudden spikes can indicate suspicious activity."
};

const UrlReport = () => {
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [topFeatures, setTopFeatures] = useState([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('lastAnalysis', (data) => {
        if (data.lastAnalysis) {
          setReportData(data.lastAnalysis);
          // Safely extract the SHAP top features array
          setTopFeatures(data.lastAnalysis.topFeatures || []);
        }
      });
    } else {
      console.log("Running in dev mode (no chrome storage)");
    }
  }, []);

  if (!reportData) {
    return <div className="p-8 text-[#aab3d8] text-center mt-20 font-bold uppercase tracking-widest">Loading Analysis Engine...</div>;
  }

  // Map features to the requested Suspicious / Neutral / Legitimate format
  const featuresList = Object.keys(reportData.features || {}).map(key => {
    const val = reportData.features[key];
    let statusLabel = 'Neutral';
    let statusStyle = 'text-[#76767f] border-[#76767f]/30 bg-[#76767f]/10';
    let icon = 'horizontal_rule';

    if (val === 1) {
        statusLabel = 'Legitimate';
        statusStyle = 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
        icon = 'check_circle';
    } else if (val === -1) {
        statusLabel = 'Suspicious';
        statusStyle = 'text-[#892401] border-[#892401]/30 bg-[#892401]/10';
        icon = 'warning';
    }

    return {
      name: key,
      desc: FEATURE_DESCRIPTIONS[key] || "Extracted ML Feature",
      val,
      statusLabel,
      statusStyle,
      icon
    };
  }).sort((a, b) => a.val - b.val);

  const strokeOffset = 402.12 - (402.12 * reportData.confidence) / 100;

  return (
    <div className="p-8 space-y-10 w-full">
      {/* 1. Centerpiece: URL Verdict */}
      <section className="relative overflow-hidden rounded-xl bg-[#76767f]/5 border border-[#76767f]/20 p-1">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <span className="material-symbols-outlined text-[240px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
        </div>
        
        <div className="relative z-10 bg-[#060819]/60 backdrop-blur-md p-8 rounded-lg flex flex-col md:flex-row items-center gap-10 border border-[#76767f]/10">
          <div className="relative flex-shrink-0">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle cx="72" cy="72" r="64" fill="transparent" stroke="#76767f" strokeWidth="8" className="opacity-20"></circle>
              <circle cx="72" cy="72" r="64" fill="transparent" stroke={reportData.isPhishing ? "#892401" : "#4caf50"} strokeWidth="8" strokeDasharray="402.12" strokeDashoffset={strokeOffset}></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{reportData.confidence}%</span>
              <span className="text-[9px] uppercase tracking-widest text-[#76767f]">Risk Score</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 min-w-0">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${reportData.isPhishing ? 'bg-[#892401]/10 border border-[#892401]/30 text-[#892401]' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'}`}>
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                {reportData.isPhishing ? 'gpp_maybe' : 'gpp_good'}
              </span>
              {reportData.isPhishing ? 'Confirmed Phishing' : 'Legitimate'}
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#aab3d8] truncate" title={reportData.url} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {reportData.url}
              </h2>
              <p className="text-[#76767f] text-xs">
                {reportData.analysis || 'Targeted spoofing attack detected via abnormal network patterns.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Neural Explainability Drivers (SHAP Integration) */}
    {topFeatures && topFeatures.length > 0 && (
  <section className="explainability-section">
    <div className="section-header">
      <h2>Explainability</h2>
      <p>These are the top 4 factors that most influenced our AI's decision for this URL.</p>
    </div>
    <div className="drivers-container">
      {topFeatures.map((driver, idx) => {
        const name = driver.feature;
        const score = driver.score;
        const val = reportData.features?.[name] ?? 0;
        const isRisky = score < 0;
        const statusClass = isRisky ? "risky-contributor" : "safe-contributor";
        const impactText = isRisky ? "🚨 High Risk Impact" : "🛡️ Safe Indicator";
        let explanation = FEATURE_DESCRIPTIONS[name] || "Analyzing this feature's impact on the overall security verdict.";
        explanation = isRisky
          ? `This feature showed a strong correlation with phishing patterns. ${explanation}`
          : `This feature showed characteristics common in legitimate websites. ${explanation}`;
        return (
          <div className={`driver-card ${statusClass}`} key={name}>
            <div className="driver-rank">#{idx + 1}</div>
            <div className="driver-info">
              <span className="driver-name">{name}</span>
              <span className="driver-impact-badge">{impactText}</span>
            </div>
            <div className="driver-explanation">{explanation}</div>
            <div style={{ marginTop: "auto", fontSize: "0.7rem", color: "var(--text-muted)", opacity: 0.6, fontWeight: 600 }}>
              Impact Magnitude: {Math.abs(score).toFixed(4)}
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}

      {/* 3. Feature Explainability Matrix */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            <span className="material-symbols-outlined text-[#aab3d8]">data_table</span> 
            Full Feature Matrix
          </h3>
          
          <div className="flex gap-4 bg-[#060819] px-4 py-2 rounded-lg border border-[#76767f]/20">
            <span className="flex items-center gap-1.5 text-[11px] text-[#76767f] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#892401] text-sm">warning</span> Suspicious (-1)
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#76767f] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#76767f] text-sm">horizontal_rule</span> Neutral (0)
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#76767f] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Legitimate (1)
            </span>
          </div>
        </div>

        <div className="bg-[#060819] border border-[#76767f]/30 rounded-xl overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer bg-[#76767f]/5 hover:bg-[#76767f]/10 transition-colors"
            onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#aab3d8]">list_alt</span>
              <span className="font-bold text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>View All {featuresList.length} Extracted Features</span>
            </div>
            <span className={`material-symbols-outlined transition-transform duration-300 ${isMatrixExpanded ? 'rotate-180' : ''}`}>expand_more</span>
          </div>
          
          {isMatrixExpanded && (
            <div className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#060819] z-10 shadow-md">
                  <tr className="text-[10px] uppercase tracking-widest text-[#76767f] border-b border-[#76767f]/20">
                    <th className="p-4 w-1/4">Feature Name</th>
                    <th className="p-4 w-2/4">Description</th>
                    <th className="p-4 w-1/4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#76767f]/10 text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {featuresList.map((f, idx) => (
                    <tr key={idx} className="hover:bg-[#76767f]/5 transition-colors">
                      <td className="p-4 font-mono text-[#aab3d8] text-xs whitespace-nowrap">{f.name}</td>
                      <td className="p-4 text-[#76767f] text-xs break-words leading-relaxed">{f.desc}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${f.statusStyle} text-[10px] uppercase tracking-widest font-bold`}>
                          <span className="material-symbols-outlined text-[14px]">{f.icon}</span>
                          {f.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default UrlReport;