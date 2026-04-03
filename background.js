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
            title: "🔗 Scan Link for Phishing",
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
            // Also try to get the subject from the page
            chrome.tabs.sendMessage(tab.id, { action: 'extractEmailSubjectOnly' }, (subjectResponse) => {
                const subject = (subjectResponse && subjectResponse.subject) ? subjectResponse.subject : 'Unknown Subject';
                contextData = {
                    type: 'email',
                    content: `Subject: ${subject}\n\n${selectedText}`
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
            content: `Subject: ${emailData.subject || 'Unknown Subject'}\n\n${emailData.body || ''}`
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
            content: `Subject: ${request.data.subject}\n\n${request.data.body}`
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
        performEmailScan(request.content, request.type).then(result => {
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
            body: JSON.stringify({ features })
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

        return {
            url,
            isPhishing: result.isPhishing,
            confidence: result.confidence,
            analysis: analysisText,
            mlLabel: result.label,
            phishingProb: result.phishingProbability,
            features: features
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

// ── ML-Powered Email Scan ─────────────────────────────────────────────────────
async function performEmailScan(emailContent, type) {
    // Parse subject and body from the combined string
    let subject = '';
    let body = emailContent;
    if (emailContent.startsWith('Subject:')) {
        const parts = emailContent.split('\n\n');
        subject = parts[0].replace(/^Subject:\s*/i, '').trim();
        body = parts.slice(1).join('\n\n').trim();
    }

    try {
        const response = await fetch(`${ML_SERVER}/predict/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, body })
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const result = await response.json();

        const analysisText = result.isPhishing
            ? `⚠️ ML model detected phishing content with ${result.phishingProbability}% confidence. This email may attempt to steal credentials or personal data. Do not click any links or download attachments.`
            : `✅ ML model classified this email as legitimate (${result.phishingProbability}% phishing probability). Exercise normal caution with any links or attachments.`;

        return {
            sender: extractSender(emailContent) || 'Unknown',
            content: emailContent.substring(0, 120) + '…',
            type,
            isPhishing: result.isPhishing,
            confidence: result.confidence,
            suspiciousElements: result.isPhishing ? 'ML model identified phishing patterns in the email content.' : 'None detected',
            analysis: analysisText,
            mlLabel: result.label,
            phishingProb: result.phishingProbability
        };

    } catch (err) {
        console.warn('SafePhish: ML server unreachable, using fallback email analysis.', err.message);
        return _fallbackEmailScan(emailContent, subject, body, type);
    }
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

// Helper function to extract sender from email content
function extractSender(emailContent) {
    const senderMatch = emailContent.match(/From:\s*(.+?)(?:\n|<)/i);
    return senderMatch ? senderMatch[1].trim() : null;
}
