/**
 * Detailed Feature Analysis Page Logic
 * SafePhish Chrome Extension
 */

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

document.addEventListener('DOMContentLoaded', () => {
    // Load data from chrome.storage.local
    chrome.storage.local.get('lastAnalysis', (data) => {
        if (!data.lastAnalysis) {
            document.body.innerHTML = '<div class="container" style="text-align:center; padding-top:100px;"><h2>No analysis data found.</h2><p>Please perform a URL scan first.</p></div>';
            return;
        }

        const report = data.lastAnalysis;
        
        // Update Header/Summary Information
        document.getElementById('analyzedUrl').textContent = report.url;
        document.getElementById('confidenceValue').textContent = `${report.confidence}%`;
        document.getElementById('detectionMethod').textContent = report.phishingProb !== null ? '🤖 XGBoost Classifier' : '📐 Heuristic Fallback';
        
        const riskBadge = document.getElementById('riskBadge');
        const riskLabel = document.getElementById('riskLabel');
        
        if (report.isPhishing) {
            riskBadge.classList.add('risk-high');
            riskLabel.textContent = 'DANGEROUS';
        } else {
            riskBadge.classList.add('risk-safe');
            riskLabel.textContent = 'LEGITIMATE';
        }

        // Render Feature Grid
        const grid = document.getElementById('featureGrid');
        grid.innerHTML = ''; // Clear loading state

        const features = report.features || {};
        
        // Sort features so that Dangerous ones (-1) come first
        const sortedFeatureNames = Object.keys(FEATURE_DESCRIPTIONS).sort((a, b) => {
            const valA = features[a] === undefined ? 0 : features[a];
            const valB = features[b] === undefined ? 0 : features[b];
            return valA - valB; // -1 < 0 < 1
        });

        sortedFeatureNames.forEach(name => {
            const val = features[name] === undefined ? 0 : features[name];
            let statusClass = 'neutral';
            let statusText = 'Suspicious';
            
            if (val === 1) {
                statusClass = 'safe';
                statusText = 'Safe';
            } else if (val === -1) {
                statusClass = 'dangerous';
                statusText = 'Danger';
            }

            const card = document.createElement('div');
            card.className = `feature-card ${statusClass}`;
            card.innerHTML = `
                <div class="feature-header">
                    <span class="feature-name">${name}</span>
                    <span class="feature-status-label">${statusText}</span>
                </div>
                <div class="feature-desc">${FEATURE_DESCRIPTIONS[name]}</div>
                <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 10px; opacity: 0.7;">
                    ML Signal Value: ${val}
                </div>
            `;
            grid.appendChild(card);
        });
    });
});
