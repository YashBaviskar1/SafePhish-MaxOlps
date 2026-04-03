import React, { useState, useEffect } from 'react';

const EmailReport = () => {
  const [isEnginesExpanded, setIsEnginesExpanded] = useState(true);
  const [emailData, setEmailData] = useState(null);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('lastEmailAnalysis', (data) => {
        if (data.lastEmailAnalysis) {
          const raw = data.lastEmailAnalysis;
          
          // Safely map the backend data into the beautiful UI format
          setEmailData({
            subject: raw.subject || "Analyzed Email",
            sender: raw.sender || "Unknown Sender",
            masterScore: raw.confidence || 0,
            verdict: raw.isPhishing ? "Confirmed Phishing" : "Legitimate",
            engines: {
              mlContent: { score: raw.components?.mlContentScore || raw.phishingProb || 0, label: "Text/TF-IDF", icon: "text_snippet", status: raw.isPhishing ? "danger" : "safe" },
              urlRisk: { score: raw.components?.urlScore || 0, label: "URL Analysis", icon: "link", status: raw.components?.urlScore > 50 ? "danger" : "safe" },
              behavior: { score: raw.components?.behaviorScore || 0, label: "Behavioral Intent", icon: "psychology", status: raw.components?.behaviorScore > 50 ? "warning" : "safe" },
              context: { score: raw.components?.contextScore || 0, label: "Contextual Anomalies", icon: "manage_search", status: raw.components?.contextScore > 50 ? "danger" : "safe" },
              attachment: { score: raw.components?.attachmentScore || 0, label: "Attachment", icon: "attachment", status: "safe", desc: "No Attachment" }
            },
            urls: Array.isArray(raw.urls) ? raw.urls : [],
            findings: raw.findings && raw.findings.length > 0 ? raw.findings : [raw.analysis || "Rule-based fallback scan used. No detailed findings."]
          });
        }
      });
    }
  }, []);

  if (!emailData) {
    return <div className="p-8 text-white text-center mt-20 font-bold tracking-widest uppercase">Loading Fusion Engines...</div>;
  }

  const strokeOffset = 552.92 - (552.92 * emailData.masterScore) / 100;

  return (
    <div className="p-8 space-y-8 w-full">

      {/* 🔥 Master Verdict */}
      <section className="relative overflow-hidden rounded-xl bg-[#76767f]/5 border border-[#76767f]/20 p-1">

        <div className="relative z-10 bg-[#060819]/60 backdrop-blur-md p-10 rounded-lg flex flex-col md:flex-row items-center gap-12 border border-[#76767f]/10">

          {/* 🔥 Score Circle */}
          <div className="relative flex-shrink-0">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle cx="96" cy="96" r="88" fill="transparent" stroke="#76767f" strokeWidth="8" className="opacity-20" />
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="transparent"
                stroke={emailData.masterScore > 70 ? "#892401" : "#4caf50"}
                strokeWidth="8"
                strokeDasharray="552.92"
                strokeDashoffset={strokeOffset}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-white">
                {emailData.masterScore}%
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#76767f] text-center mt-1">
                Master Risk<br />Score
              </span>
            </div>
          </div>

          {/* 🔥 Email Info */}
          <div className="flex-1 space-y-4">

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest 
              ${emailData.masterScore > 70 
                ? 'bg-[#892401]/10 border-[#892401]/30 text-[#892401]' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>

              <span className="material-symbols-outlined text-xs">
                {emailData.masterScore > 70 ? 'gpp_maybe' : 'gpp_good'}
              </span>

              {emailData.verdict}
            </div>

            <div className="space-y-3">

              <div>
                <span className="text-[10px] text-[#76767f] uppercase tracking-widest font-bold">
                  Subject
                </span>
                <h2 className="text-2xl font-black text-[#aab3d8] break-all">
                  {emailData.subject}
                </h2>
              </div>

              <div>
                <span className="text-[10px] text-[#76767f] uppercase tracking-widest font-bold">
                  Sender
                </span>
                <p className="text-[#892401] font-mono text-sm bg-[#892401]/10 border border-[#892401]/20 inline-block px-2 py-1 rounded mt-1">
                  {emailData.sender}
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 🔥 Engine Breakdown */}
      <section className="space-y-4">

        <h3 className="text-xl font-bold text-white">
          5-Engine Master Fusion
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

          {Object.entries(emailData.engines || {}).map(([key, engine]) => {
            const isDanger = engine.status === 'danger';
            const isWarning = engine.status === 'warning';

            return (
              <div key={key} className={`bg-[#060819] border ${isDanger ? 'border-[#892401]' : 'border-[#76767f]/20'} rounded-xl p-5 text-center`}>

                <span className="material-symbols-outlined text-2xl">
                  {engine.icon}
                </span>

                <h4 className="text-xs font-bold text-white mt-2">
                  {engine.label}
                </h4>

                {engine.desc ? (
                  <p className="text-sm text-[#76767f] mt-2">
                    {engine.desc}
                  </p>
                ) : (
                  <p className={`text-3xl font-black mt-2 ${isDanger ? 'text-[#892401]' : 'text-white'}`}>
                    {engine.score}
                  </p>
                )}

              </div>
            );
          })}
        </div>
      </section>

      {/* 🔥 Findings */}
      <section className="space-y-4">

        <h3 className="text-xl font-bold text-white">
          Explainability Findings
        </h3>

        <div className="bg-[#060819] p-6 rounded-xl space-y-3">

          {emailData.findings?.map((f, i) => (
            <div key={i} className="text-[#aab3d8] text-sm">
              • {f}
            </div>
          ))}

        </div>
      </section>

      {/* 🔥 URLs */}
      <section className="space-y-4">

        <h3 className="text-xl font-bold text-white">
          Extracted Links
        </h3>

        <div className="space-y-3">

          {emailData.urls?.map((u, i) => (
            <div key={i} className="p-3 rounded border border-[#76767f]/20">

              <div className="flex justify-between">
                <span className="text-xs">
                  {u.score}% {u.verdict}
                </span>
              </div>

              <p className="text-xs font-mono break-all mt-2">
                {u.url}
              </p>

            </div>
          ))}

        </div>
      </section>

    </div>
  );
};

export default EmailReport;