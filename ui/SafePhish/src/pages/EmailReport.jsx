import React, { useState, useEffect } from 'react';

const EmailReport = () => {
  const [emailData, setEmailData] = useState(null);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('lastEmailAnalysis', (data) => {
        if (data.lastEmailAnalysis) {
          const raw = data.lastEmailAnalysis;
          
          // 1. Safely Parse the URLs
          let parsedUrls = [];
          if (Array.isArray(raw.urls)) {
              parsedUrls = raw.urls;
          } else if (raw.urls && typeof raw.urls === 'object') {
              const pUrls = (raw.urls.phishingUrls || []).map(u => ({ url: u.url, score: u.confidence, verdict: u.mlLabel || 'PHISHING' }));
              const lUrls = (raw.urls.legitimateUrls || []).map(u => ({ url: u.url, score: u.confidence, verdict: u.mlLabel || 'LEGITIMATE' }));
              parsedUrls = [...pUrls, ...lUrls];
          }

          // 2. Separate AI Signals from General Findings
          const allFindings = raw.findings || [];
          const aiFindings = allFindings.filter(f => f.includes('[AI Pattern]') || f.includes('[Phishing Signal]'));
          const generalFindings = allFindings.filter(f => !f.includes('[AI Pattern]') && !f.includes('[Phishing Signal]'));

          // 3. Map Backend Data to UI State
          setEmailData({
            subject: raw.subject || "Analyzed Email",
            sender: raw.sender || "Unknown Sender",
            masterScore: raw.confidence || 0,
            verdict: raw.isPhishing ? "Confirmed Phishing" : "Legitimate",
            
            // 6-Engine Map
            engines: {
              mlContent: { score: raw.components?.mlContentScore || raw.phishingProb || 0, label: "Text/TF-IDF", icon: "text_snippet", status: (raw.components?.mlContentScore >= 50 || raw.phishingProb >= 50) ? "danger" : "safe" },
              urlRisk: { score: raw.components?.urlScore || 0, label: "URL Analysis", icon: "link", status: raw.components?.urlScore > 50 ? "danger" : "safe" },
              behavior: { score: raw.components?.behaviorScore || 0, label: "Behavioral Intent", icon: "psychology", status: raw.components?.behaviorScore >= 30 ? "warning" : "safe" },
              context: { score: raw.components?.contextScore || 0, label: "Contextual Anomalies", icon: "manage_search", status: raw.components?.contextScore >= 30 ? "danger" : "safe" },
              attachment: { score: raw.components?.attachmentScore || 0, label: "Attachment", icon: "attachment", status: raw.components?.attachmentScore > 0 ? "warning" : "safe", desc: raw.components?.attachmentScore > 0 ? null : "No File" },
              ai: { score: raw.components?.aiFingerprintScore || 0, label: "AI Fingerprint", icon: "memory", status: raw.components?.aiFingerprintScore >= 50 ? "danger" : (raw.components?.aiFingerprintScore > 0 ? "warning" : "safe"), desc: (raw.components?.aiFingerprintScore === null || raw.components?.aiFingerprintScore === undefined || raw.components?.aiFingerprintScore === 0) ? "Human" : null }
            },
            
            urls: parsedUrls,
            attachmentScore: raw.components?.attachmentScore || 0,
            aiScore: raw.components?.aiFingerprintScore || 0,
            aiFindings: aiFindings,
            findings: generalFindings.length > 0 ? generalFindings : [raw.analysis || "Rule-based fallback scan used. No detailed findings."]
          });
        }
      });
    }
  }, []);

  if (!emailData) {
    return <div className="p-8 text-[#aab3d8] text-center mt-20 font-bold tracking-widest uppercase">Loading Fusion Engines...</div>;
  }

  const strokeOffset = 402.12 - (402.12 * emailData.masterScore) / 100;

  return (
    <div className="p-8 space-y-8 w-full">

      {/* 🔥 Master Verdict */}
      <section className="relative overflow-hidden rounded-xl bg-[#76767f]/5 border border-[#76767f]/20 p-1">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <span className="material-symbols-outlined text-[240px]" style={{ fontVariationSettings: "'FILL' 1" }}>mail_lock</span>
        </div>

        <div className="relative z-10 bg-[#060819]/60 backdrop-blur-md p-8 rounded-lg flex flex-col md:flex-row items-center gap-10 border border-[#76767f]/10">

          {/* Score Circle */}
          <div className="relative flex-shrink-0">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle cx="72" cy="72" r="64" fill="transparent" stroke="#76767f" strokeWidth="8" className="opacity-20" />
              <circle
                cx="72"
                cy="72"
                r="64"
                fill="transparent"
                stroke={emailData.masterScore > 50 ? "#892401" : "#4caf50"}
                strokeWidth="8"
                strokeDasharray="402.12"
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {emailData.masterScore}%
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#76767f] text-center mt-1">
                Master Risk<br />Score
              </span>
            </div>
          </div>

          {/* Email Info */}
          <div className="flex-1 space-y-4 min-w-0">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest 
              ${emailData.masterScore > 50 
                ? 'bg-[#892401]/10 border border-[#892401]/30 text-[#892401]' 
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'}`}>
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                {emailData.masterScore > 50 ? 'gpp_maybe' : 'gpp_good'}
              </span>
              {emailData.verdict}
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-[#76767f] uppercase tracking-widest font-bold">
                  Subject
                </span>
                <h2 className="text-xl font-bold text-[#aab3d8] truncate" title={emailData.subject} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {emailData.subject}
                </h2>
              </div>
              <div>
                <span className="text-[10px] text-[#76767f] uppercase tracking-widest font-bold block mb-1">
                  Sender
                </span>
                <p className="text-[#aab3d8] font-mono text-xs bg-[#76767f]/10 border border-[#76767f]/20 inline-block px-2 py-1 rounded">
                  {emailData.sender}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔥 6-Engine Breakdown */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          <span className="text-[#aab3d8]">#</span> 6-Engine Master Fusion
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Object.entries(emailData.engines || {}).map(([key, engine]) => {
            const isDanger = engine.status === 'danger';
            const isWarning = engine.status === 'warning';

            return (
              <div key={key} className={`bg-[#060819] border ${isDanger ? 'border-[#892401]/50 shadow-[0_0_15px_rgba(137,36,1,0.1)]' : isWarning ? 'border-[#f59e0b]/40' : 'border-[#76767f]/20'} rounded-xl p-4 text-center flex flex-col items-center justify-center relative overflow-hidden transition-all hover:-translate-y-1`}>
                {isDanger && <div className="absolute top-0 left-0 w-full h-1 bg-[#892401]"></div>}
                {isWarning && <div className="absolute top-0 left-0 w-full h-1 bg-[#f59e0b]"></div>}

                <div className={`p-2 rounded-full mb-2 ${isDanger ? 'bg-[#892401]/20 text-[#892401]' : isWarning ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-[#76767f]/10 text-[#76767f]'}`}>
                  <span className="material-symbols-outlined text-xl">{engine.icon}</span>
                </div>

                <h4 className="text-[10px] font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {engine.label}
                </h4>

                {engine.desc ? (
                  <p className="text-sm font-bold text-[#76767f] mt-1">{engine.desc}</p>
                ) : (
                  <p className={`text-2xl font-black mt-1 ${isDanger ? 'text-[#892401]' : isWarning ? 'text-[#f59e0b]' : 'text-white'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {engine.score}<span className="text-[10px] text-[#76767f] font-normal">/100</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Split Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 🔥 LEFT: Findings */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
             <span className="text-[#aab3d8]">#</span> Explainability Findings
          </h3>

          <div className="bg-[#060819] border border-[#76767f]/20 p-5 rounded-xl space-y-3 h-full">
            {emailData.findings?.map((f, i) => {
                let icon = "info";
                let tagColor = "bg-[#76767f]/20 text-[#76767f]";
                let tagLabel = "ML";

                if (f.includes('[Context]')) {
                  icon = "travel_explore";
                  tagColor = "bg-[#aab3d8]/20 text-[#aab3d8]";
                  tagLabel = "CTX";
                  f = f.replace('[Context] ', '');
                } else if (f.includes('[Behavior]')) {
                  icon = "psychology_alt";
                  tagColor = "bg-[#892401]/20 text-[#892401]";
                  tagLabel = "BEH";
                  f = f.replace('[Behavior] ', '');
                } 

                return (
                  <div key={i} className="flex items-start gap-3 bg-[#76767f]/5 p-3 rounded border border-[#76767f]/10">
                    <span className="material-symbols-outlined text-[#76767f] text-sm mt-0.5">{icon}</span>
                    <div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mr-2 ${tagColor}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {tagLabel}
                      </span>
                      <span className="text-xs text-[#aab3d8] leading-relaxed">{f}</span>
                    </div>
                  </div>
                );
            })}
          </div>
        </section>

        {/* 🔥 RIGHT: Extracted Payloads & AI */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            <span className="text-[#aab3d8]">#</span> Extracted Payloads
          </h3>

          <div className="bg-[#060819] border border-[#76767f]/20 rounded-xl overflow-hidden h-full flex flex-col">
             
            {/* 1. URLs */}
            <div className="bg-[#76767f]/10 p-3 border-b border-[#76767f]/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#aab3d8] text-sm">link</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Embedded Links ({emailData.urls.length})</h4>
            </div>
            <div className="p-4 space-y-3 bg-[#060819]">
              {emailData.urls?.length > 0 ? emailData.urls.map((u, i) => (
                <div key={i} className={`p-3 rounded border ${u.verdict === 'PHISHING' ? 'bg-[#892401]/10 border-[#892401]/30' : 'bg-emerald-900/10 border-emerald-900/30'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${u.verdict === 'PHISHING' ? 'bg-[#892401] text-white' : 'bg-emerald-600 text-white'}`}>
                      {u.score}% {u.verdict}
                    </span>
                    <a href="#" className="text-[10px] text-[#76767f] hover:text-white flex items-center gap-1 transition-colors">
                      Deep Scan <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                    </a>
                  </div>
                  <p className={`text-[11px] font-mono truncate ${u.verdict === 'PHISHING' ? 'text-[#892401]' : 'text-emerald-500'}`} title={u.url}>
                    {u.url}
                  </p>
                </div>
              )) : (
                <p className="text-xs text-[#76767f] italic text-center py-2">No URLs extracted from this email.</p>
              )}
            </div>

            {/* 2. Attachments */}
            <div className="bg-[#76767f]/10 p-3 border-t border-b border-[#76767f]/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#aab3d8] text-sm">attachment</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Files Scanned</h4>
            </div>
            <div className="p-4 bg-[#060819]">
              {emailData.attachmentScore > 0 ? (
                <div className="p-3 rounded border bg-[#892401]/10 border-[#892401]/30 flex flex-col gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#892401] text-white self-start">
                      {emailData.attachmentScore}% MALICIOUS
                    </span>
                    <p className="text-[11px] font-mono text-[#892401]">Suspicious attachment flagged by sandboxed dynamic analysis.</p>
                </div>
              ) : (
                <div className="text-center text-[#76767f] text-sm py-2">
                  <span className="material-symbols-outlined text-3xl mb-1 opacity-50">folder_off</span>
                  <p className="text-xs">No attachments detected or scanned.</p>
                </div>
              )}
            </div>

            {/* 3. LLM Fingerprinting (Dynamic Findings) */}
            <div className="bg-[#76767f]/10 p-3 border-t border-b border-[#76767f]/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#aab3d8] text-sm">memory</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>LLM Fingerprinting</h4>
            </div>
            <div className="p-4 bg-[#060819] flex-1">
              {emailData.aiScore > 0 ? (
                <div className={`p-3 rounded border ${emailData.aiScore >= 50 ? 'bg-[#892401]/10 border-[#892401]/30' : 'bg-[#f59e0b]/10 border-[#f59e0b]/30'} flex flex-col gap-2`}>
                   <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${emailData.aiScore >= 50 ? 'bg-[#892401] text-white' : 'bg-[#f59e0b] text-white'} self-start`}>
                      {emailData.aiScore}% AI PROBABILITY
                    </span>
                  </div>
                  
                  {/* Dynamic List Rendering here */}
                  {emailData.aiFindings?.length > 0 ? (
                    <ul className="space-y-1 mt-1">
                      {emailData.aiFindings.map((finding, idx) => (
                        <li key={idx} className={`text-[11px] ${emailData.aiScore >= 50 ? 'text-[#892401]' : 'text-[#f59e0b]'}`}>
                          • {finding}
                        </li>
                      ))}
                    </ul>
                  ) : (
                     <p className={`text-[11px] ${emailData.aiScore >= 50 ? 'text-[#892401]' : 'text-[#f59e0b]'}`}>
                      Structural patterns indicate Large Language Model generation (e.g. ChatGPT).
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center text-[#76767f] text-sm py-2">
                  <span className="material-symbols-outlined text-3xl mb-1 opacity-50">edit_document</span>
                  <p className="text-xs">No AI generation patterns detected. Text structure aligns with human authors.</p>
                </div>
              )}
            </div>

          </div>
        </section>
      </div>

    </div>
  );
};

export default EmailReport;