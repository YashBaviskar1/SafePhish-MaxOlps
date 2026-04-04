// Background Service Worker for Chrome Extension

// Load the URL feature extractor (pure JS, no DOM needed)
importScripts('url/featureExtractor.js');

const ML_SERVER = 'http://localhost:5000';

let contextData = null;

// Email platforms list (shared logic)
const EMAIL_PLATFORMS = [
    'mail.google.com',
    'outlook.live.com',
    'outlook.office.com',
    'mail.yahoo.com',
    'mail.proton.me'
];

function isEmailPlatformUrl(url) {
    if (!url) return false;
    return EMAIL_PLATFORMS.some(platform => url.includes(platform));
}

// Create context menus upon installation
chrome.runtime.onInstalled.addListener(() => {
    // Remove all existing context menus first to avoid duplicates on reload
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "scanUrl",
            title: " Scan Link for Phishing",
            contexts: ["link"]
        });

        chrome.contextMenus.create({
            id: "scanSelection",
            title: "📋 Scan Selected Text for Phishing",
            contexts: ["selection"]
        });

        chrome.contextMenus.create({
            id: "scanEmail",
            title: "📧 Scan Email for Phishing",
            contexts: ["page", "frame"]
        });
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "scanUrl") {
        contextData = {
            type: 'url',
            url: info.linkUrl
        };
        // Attempt to open the popup
        try { chrome.action.openPopup(); } catch (e) { }

    } else if (info.menuItemId === "scanSelection") {
        const selectedText = info.selectionText || '';
        // If on email platform, treat selected text as email body
        if (isEmailPlatformUrl(tab.url)) {
            // Also try to get the subject and sender from the page
            chrome.tabs.sendMessage(tab.id, { action: 'extractEmailSubjectOnly' }, (metaResponse) => {
                const subject = (metaResponse && metaResponse.subject) ? metaResponse.subject : 'Unknown Subject';
                const sender = (metaResponse && metaResponse.sender) ? metaResponse.sender : '';
                contextData = {
                    type: 'email',
                    content: `From: ${sender}\nSubject: ${subject}\n\n${selectedText}`
                };
                try { chrome.action.openPopup(); } catch (e) { }
            });
        } else {
            contextData = {
                type: 'email',
                content: selectedText
            };
            try { chrome.action.openPopup(); } catch (e) { }
        }

    } else if (info.menuItemId === "scanEmail") {
        // Extract full email content from the page via the content script
        if (!tab || !tab.id) return;

        chrome.tabs.sendMessage(tab.id, { action: 'extractEmailContent' }, (emailData) => {
            if (chrome.runtime.lastError) {
                // Content script may not be injected yet - inject it and retry
                chrome.scripting.executeScript(
                    { target: { tabId: tab.id }, files: ['content.js'] },
                    () => {
                        // Small delay then retry
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, { action: 'extractEmailContent' }, (retryData) => {
                                _storeEmailContextAndOpen(retryData, tab.url);
                            });
                        }, 500);
                    }
                );
                return;
            }
            _storeEmailContextAndOpen(emailData, tab.url);
        });
    }
});

// Internal helper: store extracted email data and open popup
function _storeEmailContextAndOpen(emailData, tabUrl) {
    if (emailData && (emailData.subject || emailData.body)) {
        contextData = {
            type: 'email',
            content: `From: ${emailData.sender || ''}\nSubject: ${emailData.subject || 'Unknown Subject'}\n\n${emailData.body || ''}`
        };
    } else {
        // Store a signal so popup knows to try extraction itself
        contextData = {
            type: 'email_page',
            url: tabUrl
        };
    }
    try { chrome.action.openPopup(); } catch (e) { }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'storeEmailData') {
        // Store data from double-click extraction
        contextData = {
            type: 'email',
            content: `From: ${request.data.sender || ''}\nSubject: ${request.data.subject}\n\n${request.data.body}`
        };
        sendResponse({ success: true });
    } else if (request.action === 'getContextData') {
        // Return and clear context data
        sendResponse(contextData);
        contextData = null;
    } else if (request.action === 'scanUrl') {
        performUrlScan(request.url).then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ error: error.message });
        });
        return true; // Indicates async response
    } else if (request.action === 'scanEmail') {
        performEmailScan(request.content, request.type, request.attachmentScore || 0, request.sender || "", request.enableAIDetection || false).then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ error: error.message });
        });
        return true; // Indicates async response
    } else if (request.action === 'scanAttachment') {
        performAttachmentScan(request.fileData, request.fileName, request.skipVT).then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ error: error.message });
        });
        return true; // Indicates async response
    }
});

// ── ML-Powered URL Scan ──────────────────────────────────────────────────────
async function performUrlScan(url) {
    // Extract the 30 URL features using our JS feature extractor
    let features;
    try {
        features = URLFeatureExtractor.extract(url);
    } catch (e) {
        features = {};
    }

    try {
        const response = await fetch(`${ML_SERVER}/predict/url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features, url })
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const result = await response.json();

        // Build a human-readable feature summary
        const phishingFeatures = Object.entries(features)
            .filter(([, v]) => v === -1)
            .map(([k]) => k);

        const analysisText = result.isPhishing
            ? `⚠️ ML model detected phishing patterns. Suspicious indicators: ${phishingFeatures.join(', ') || 'general URL structure'}. Do not enter credentials on this page.`
            : `✅ ML model classified this URL as legitimate (${result.phishingProbability}% phishing probability). Always verify the domain before sharing sensitive data.`;

        // Prefer the server-computed Python features (full 30-feature set with real WHOIS/DNS/Google data).
        // Fall back to the JS-extracted features only if the server didn't return any.
        const finalFeatures = (result.features && Object.keys(result.features).length > 0)
            ? result.features
            : features;

        return {
            url,
            isPhishing: result.isPhishing,
            confidence: result.confidence,
            analysis: analysisText,
            mlLabel: result.label,
            phishingProb: result.phishingProbability,
            features: finalFeatures,
            topFeatures: result.topFeatures
        };

    } catch (err) {
        console.warn('SafePhish: ML server unreachable, using fallback analysis.', err.message);
        return _fallbackUrlScan(url, features);
    }
}

/** Fallback rule-based scan when the ML server is not running */
function _fallbackUrlScan(url, features) {
    const phishCount = Object.values(features).filter(v => v === -1).length;
    const isPhishing = phishCount >= 4;
    const phishingFeatures = Object.entries(features)
        .filter(([, v]) => v === -1)
        .map(([k]) => k);

    return {
        url,
        isPhishing,
        confidence: Math.round(Math.min(95, 40 + phishCount * 8)),
        analysis: isPhishing
            ? `⚠️ Rule-based fallback (ML server offline): ${phishCount} suspicious features detected — ${phishingFeatures.join(', ')}.`
            : `✅ Rule-based fallback (ML server offline): Only ${phishCount} suspicious feature(s) detected.`,
        mlLabel: isPhishing ? 'PHISHING' : 'LEGITIMATE',
        phishingProb: null,
        features: features
    };
}

// ── Helper: Analyze URLs found in email ──────────────────────────────────────
async function _analyzeEmailUrls(emailContent) {
    // Extract URLs from email using simple regex
    const urlRegex = /(https?:\/\/|ftp:\/\/)[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = emailContent.match(urlRegex) || [];

    // Normalize URLs (remove trailing slashes) before deduplication
    // This prevents the same URL appearing twice with/without trailing slash
    const normalizedUrls = urls.map(url => url.replace(/\/+$/, ''));

    // Remove duplicates and limit to 5
    const uniqueUrls = [...new Set(normalizedUrls)];
    const urlsToScan = uniqueUrls.slice(0, 5);

    if (urlsToScan.length === 0) {
        return null; // No URLs found
    }

    try {
        // Scan all URLs in parallel
        const urlScanResults = await Promise.all(
            urlsToScan.map(url => performUrlScan(url))
        );

        // Analyze results
        const phishingUrls = [];
        const legitimateUrls = [];

        urlScanResults.forEach((result, index) => {
            if (result.isPhishing && result.confidence > 70) {
                phishingUrls.push({
                    url: result.url,
                    confidence: result.confidence,
                    mlLabel: result.mlLabel
                });
            } else {
                legitimateUrls.push({
                    url: result.url,
                    confidence: result.confidence,
                    mlLabel: result.mlLabel
                });
            }
        });

        const hasHighRiskUrl = phishingUrls.length > 0;
        const summary = `${phishingUrls.length} phishing, ${legitimateUrls.length} legitimate`;

        return {
            phishingUrls,
            legitimateUrls,
            hasHighRiskUrl,
            summary,
            allResults: urlScanResults
        };
    } catch (err) {
        console.warn('SafePhish: Error scanning URLs in email:', err.message);
        return null;
    }
}

// ── ML-Powered Email Scan ─────────────────────────────────────────────────────
async function performEmailScan(emailContent, type, attachmentScore = 0, providedSender = "", enableAIDetection = false) {
    // Parse From and Subject from the combined string
    let subject = '';
    let sender = providedSender;
    let body = emailContent;

    let lines = emailContent.split('\n');
    if (lines.length > 0 && lines[0].startsWith('From:')) {
        sender = sender || lines[0].replace(/^From:\s*/i, '').trim();
        lines = lines.slice(1);
    }
    if (lines.length > 0 && lines[0].startsWith('Subject:')) {
        subject = lines[0].replace(/^Subject:\s*/i, '').trim();
        lines = lines.slice(1);
    }
    // Remove blank line separator if present
    if (lines.length > 0 && lines[0].trim() === '') {
        lines = lines.slice(1);
    }
    body = lines.join('\n').trim();

    if (!sender) {
        sender = extractSender(emailContent) || "";
    }

    // sender is already extracted above

    // 1. Get ML-based analysis for individual URLs to pass into our Master Score
    const urlAnalysis = await _analyzeEmailUrls(emailContent);
    let urlsToPass = [];
    let maxUrlScore = 0;

    if (urlAnalysis) {
        const allScanned = [...urlAnalysis.phishingUrls, ...urlAnalysis.legitimateUrls];
        urlsToPass = allScanned.map(u => u.url);

        if (allScanned.length > 0) {
            maxUrlScore = Math.max(...allScanned.map(u => u.confidence));
        }
    }

    // 2. Fetch the Full Unified Analysis from Server
    let emailAnalysis;
    try {
        const response = await fetch(`${ML_SERVER}/analyze/email_full`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_email: sender,
                subject: subject,
                body: body,
                urls: urlsToPass,
                url_score: maxUrlScore,
                attachment_score: attachmentScore,
                enable_ai_detection: enableAIDetection
            })
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        emailAnalysis = await response.json();

    } catch (err) {
        console.warn('SafePhish: ML server unreachable, using fallback analysis.', err.message);
        emailAnalysis = _fallbackEmailScan(emailContent);
        // Normalize the fallback to match our new schema so the UI doesn't crash
        emailAnalysis.components = {
            mlContentScore: emailAnalysis.phishingProb || 0,
            urlScore: maxUrlScore,
            contextScore: 0,
            behaviorScore: 0,
            attachmentScore: attachmentScore
        };
        emailAnalysis.findings = emailAnalysis.suspiciousElements ? emailAnalysis.suspiciousElements.split(', ') : ["Rule-based fallback scan used."];
    }

    // 3. Construct Final Result Object for UI
    const resultToReturn = {
        isPhishing: emailAnalysis.isPhishing,
        confidence: emailAnalysis.riskScore !== undefined ? emailAnalysis.riskScore : emailAnalysis.confidence, // map riskScore to confidence for backward compatibility
        phishingProb: emailAnalysis.components ? emailAnalysis.components.mlContentScore : emailAnalysis.phishingProb, // map sub-score
        analysis: emailAnalysis.analysis || 'See detailed findings in the UI context sections.',
        suspiciousElements: emailAnalysis.findings ? emailAnalysis.findings.join(' | ') : emailAnalysis.suspiciousElements,
        findings: emailAnalysis.findings || [],
        components: emailAnalysis.components || {}
    };

    if (urlAnalysis) {
        resultToReturn.urls = urlAnalysis;
    }

    return resultToReturn;
}

/** Fallback rule-based email scan when the ML server is not running */
function _fallbackEmailScan(emailContent, subject, body, type) {
    const text = (subject + ' ' + body).toLowerCase();
    const phishKeywords = ['verify', 'confirm', 'urgent', 'click here', 'update account',
        'suspended', 'password', 'credit card', 'unusual activity'];
    const found = phishKeywords.filter(kw => text.includes(kw));
    const isPhishing = found.length >= 2;

    return {
        sender: extractSender(emailContent) || 'Unknown',
        content: emailContent.substring(0, 120) + '…',
        type,
        isPhishing,
        confidence: Math.min(95, 30 + found.length * 12),
        suspiciousElements: found.length > 0 ? `Phishing keywords: ${found.join(', ')}` : 'None detected',
        analysis: isPhishing
            ? `⚠️ Rule-based fallback (ML server offline): ${found.length} phishing keywords found — ${found.join(', ')}.`
            : `✅ Rule-based fallback (ML server offline): No strong phishing signals detected.`,
        mlLabel: isPhishing ? 'PHISHING' : 'LEGITIMATE',
        phishingProb: null
    };
}

// ── ML-Powered Attachment Scan ────────────────────────────────────────────────
async function performAttachmentScan(base64Data, fileName, skipVT = false) {
    try {
        // Convert base64 to Blob
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab]);

        // Create FormData
        const formData = new FormData();
        formData.append('file', blob, fileName);
        if (skipVT) {
            formData.append('skip_vt', '1');
        }

        const response = await fetch(`${ML_SERVER}/analyze/attachment`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const result = await response.json();

        return {
            filename: result.filename,
            hash: result.hash,
            fileType: result.fileType,
            fileSize: result.fileSize,
            isMalicious: result.isMalicious,
            riskScore: result.riskScore,
            label: result.label,
            findings: result.findings || [],
            layers: result.layers || {},
        };

    } catch (err) {
        console.warn('SafePhish: Attachment scan failed.', err.message);
        return {
            filename: fileName,
            isMalicious: false,
            riskScore: 0,
            label: 'ERROR',
            findings: [`Analysis failed: ${err.message}`],
            layers: {},
            error: err.message
        };
    }
}

// Helper function to extract sender from email content
function extractSender(emailContent) {
    const senderMatch = emailContent.match(/From:\s*(.+?)(?:\n|<)/i);
    return senderMatch ? senderMatch[1].trim() : null;
}

// ─── Layer 1: Auto-Scan Handler (Inbox Watcher) ─────────────────────────────
// Receives sender/subject/snippet from the InboxWatcher in content.js,
// runs the ML scan, and triggers alerts if phishing is detected.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoScanEmail') {
        const { sender: emailSender, subject, snippet } = request.data;

        // Construct email content from available data
        const emailContent = `From: ${emailSender}\nSubject: ${subject}\n\n${snippet}`;

        // Run the scan in the background (fire-and-forget, no response needed)
        _autoScanAndAlert(emailSender, subject, snippet, emailContent);
        return false; // synchronous, no response needed
    }
});

async function _autoScanAndAlert(emailSender, subject, snippet, emailContent) {
    try {
        console.log(`SafePhish AutoScan: Scanning "${subject}" from ${emailSender}…`);

        const result = await performEmailScan(emailContent, 'auto', 0, emailSender, false);

        if (result.error) {
            console.warn('SafePhish AutoScan: Scan failed —', result.error);
            return;
        }

        console.log(`SafePhish AutoScan: ✅ Result → isPhishing=${result.isPhishing}, confidence=${result.confidence}%, riskScore=${result.confidence}`);
        console.log('SafePhish AutoScan: Full result →', JSON.stringify(result));

        // Alert threshold matches server: phishing at >= 60
        if (result.isPhishing && result.confidence >= 60) {
            console.log('SafePhish AutoScan: 🚨 PHISHING DETECTED — triggering Chrome notification + SMTP alert…');

            // 1. Chrome desktop notification
            _showPhishingNotification(emailSender, subject, result.confidence);

            // 2. SMTP alert email via backend
            await _sendSmtpAlert(emailSender, subject, snippet, result);
        } else {
            console.log(`SafePhish AutoScan: ✅ Email appears safe (isPhishing=${result.isPhishing}, confidence=${result.confidence}%). No alert sent.`);
        }
    } catch (err) {
        console.warn('SafePhish AutoScan: Error during scan —', err.message);
    }
}

function _showPhishingNotification(emailSender, subject, confidence) {
    try {
        chrome.notifications.create(`safephish-alert-${Date.now()}`, {
            type: 'basic',
            iconUrl: 'favicon.svg',
            title: '🚨 SafePhish: Phishing Email Detected!',
            message: `From: ${emailSender}\nSubject: ${subject}\nRisk: ${confidence}%`,
            priority: 2,
            requireInteraction: true
        });
    } catch (err) {
        console.warn('SafePhish: Could not show notification —', err.message);
    }
}

async function _sendSmtpAlert(emailSender, subject, snippet, scanResult) {
    try {
        const response = await fetch(`${ML_SERVER}/alert/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email_sender: emailSender,
                email_subject: subject,
                email_snippet: snippet,
                risk_score: scanResult.confidence,
                is_phishing: scanResult.isPhishing,
                findings: scanResult.findings || [],
                components: scanResult.components || {}
            })
        });

        if (response.ok) {
            console.log('SafePhish AutoScan: SMTP alert sent successfully.');
        } else {
            console.warn(`SafePhish AutoScan: SMTP alert failed (${response.status}).`);
        }
    } catch (err) {
        console.warn('SafePhish AutoScan: Could not send SMTP alert —', err.message);
    }
}
