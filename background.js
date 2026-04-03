// Background Service Worker for Chrome Extension

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
        try { chrome.action.openPopup(); } catch(e) {}

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
                try { chrome.action.openPopup(); } catch(e) {}
            });
        } else {
            contextData = {
                type: 'email',
                content: selectedText
            };
            try { chrome.action.openPopup(); } catch(e) {}
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
    try { chrome.action.openPopup(); } catch(e) {}
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

// Dummy URL Scanning Function (will be replaced with ML model)
async function performUrlScan(url) {
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Dummy analysis logic
    const isDummyPhishing = url.includes('fake') || url.includes('phish') || url.includes('malware');
    
    return {
        url: url,
        isPhishing: isDummyPhishing,
        confidence: isDummyPhishing ? Math.floor(Math.random() * 40 + 60) : Math.floor(Math.random() * 20 + 80),
        analysis: isDummyPhishing 
            ? 'This URL shows characteristics of a phishing attempt. Proceed with caution.'
            : 'This URL appears to be legitimate based on current analysis.'
    };
}

// Dummy Email Scanning Function (will be replaced with ML model)
async function performEmailScan(emailContent, type) {
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Dummy analysis logic
    const isDummyPhishing = emailContent.toLowerCase().includes('verify') || 
                            emailContent.toLowerCase().includes('confirm') ||
                            emailContent.toLowerCase().includes('urgent');
    
    const suspiciousPatterns = [];
    if (emailContent.toLowerCase().includes('verify')) suspiciousPatterns.push('Request to verify account');
    if (emailContent.toLowerCase().includes('confirm')) suspiciousPatterns.push('Confirmation request');
    if (emailContent.toLowerCase().includes('urgent')) suspiciousPatterns.push('Urgency language');
    if (emailContent.toLowerCase().includes('click here')) suspiciousPatterns.push('Suspicious link');
    
    return {
        sender: extractSender(emailContent) || 'Unknown',
        content: emailContent.substring(0, 100) + '...',
        type: type,
        isPhishing: isDummyPhishing,
        confidence: isDummyPhishing ? Math.floor(Math.random() * 40 + 60) : Math.floor(Math.random() * 20 + 80),
        suspiciousElements: suspiciousPatterns.length > 0 
            ? suspiciousPatterns.join(', ')
            : 'None detected',
        analysis: isDummyPhishing
            ? 'This email contains patterns commonly found in phishing attempts. Be cautious.'
            : 'This email appears to be legitimate based on current analysis.'
    };
}

// Helper function to extract sender from email content
function extractSender(emailContent) {
    const senderMatch = emailContent.match(/From:\s*(.+?)(?:\n|<)/i);
    return senderMatch ? senderMatch[1].trim() : null;
}
