// Content Script - runs in the context of the webpage

console.log('SafePhish extension loaded on page:', window.location.href);

// Listen for messages from the background/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractEmailContent') {
        try {
            const emailData = extractEmailContent();
            sendResponse(emailData);
        } catch (e) {
            sendResponse({ subject: '', body: '' });
        }
        return true;
    }

    if (request.action === 'extractEmailSubjectOnly') {
        try {
            const subject = extractSubjectOnly();
            sendResponse({ subject });
        } catch (e) {
            sendResponse({ subject: '' });
        }
        return true;
    }

    return true;
});

// Add double-click listener for email content extraction
document.addEventListener('dblclick', (event) => {
    // Only process if we are on a known email platform
    if (!isEmailPlatform()) return;
    
    // Instead of opening popup right away (Manifest V3 restricts opening popups programmatically from content scripts),
    // we'll store the data in background script so it's ready when user clicks the extension manually
    // Or, we could just alert the user to click the extension. We'll store it.
    const emailData = extractEmailContent(event.target);
    if (emailData && (emailData.subject || emailData.body)) {
        chrome.runtime.sendMessage({
            action: 'storeEmailData',
            data: emailData
        });
        
        // Visual feedback to the user
        showToast('📧 Email captured! Click the SafePhish icon to scan.');
    }
});

function isEmailPlatform() {
    const url = window.location.href;
    return url.includes('mail.google.com') || 
           url.includes('outlook.live.com') || 
           url.includes('outlook.office.com') ||
           url.includes('mail.yahoo.com') ||
           url.includes('mail.proton.me');
}

function extractEmailContent(targetNode = null) {
    const url = window.location.href;
    let subject = '';
    let body = '';
    
    // Gmail
    if (url.includes('mail.google.com')) {
        // Try to find the active message subject
        const subjectElement = document.querySelector('h2.hP');
        // Find visible message bodies
        const bodies = document.querySelectorAll('.a3s.aiL'); // Specifically targets the body within Gmail's container
        
        subject = subjectElement ? subjectElement.innerText : '';
        
        if (bodies && bodies.length > 0) {
            // Take the last one as it's usually the most recent reply/message in thread
            body = bodies[bodies.length - 1].innerText;
        } else {
            // Fallback to previous selectors
            const bodyElements = document.querySelectorAll('.adn.ads');
            if (bodyElements && bodyElements.length > 0) {
                const lastMessage = bodyElements[bodyElements.length - 1];
                const actualBody = lastMessage.querySelector('.ii.gt') || lastMessage;
                body = actualBody.innerText;
            }
        }

        if (!subject && !body) {
            const fallbackBody = document.querySelector('[role="main"]');
            // Only use role="main" if it seems to contain an actual message (not just inbox list)
            if (fallbackBody && (fallbackBody.innerText.length > 100)) {
                body = fallbackBody.innerText;
            }
        }
    } 
    // Outlook
    else if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
        const subjectElement = document.querySelector('[aria-label="Message Header"]') || 
                               document.querySelector('[data-testid="SubjectRead"]') ||
                               document.querySelector('.ms-Pivot-content');
                               
        const readingPane = document.querySelector('[aria-label="Reading Pane"]') ||
                            document.querySelector('[aria-label="Message body"]') ||
                            document.querySelector('div[data-testid="ReadingPane"]') ||
                            document.querySelector('.customScrollBar');
        
        if (subjectElement) {
            subject = subjectElement.innerText.split('\n')[0];
        }
        if (readingPane) body = readingPane.innerText;
    }
    
    // Generic fallback for any email platform
    if (!body) {
        const mainContent = document.querySelector('[role="main"]') || document.querySelector('main');
        if (mainContent) body = mainContent.innerText;
    }

    // Fallback for selected text/double-click
    if (!body && targetNode) {
        const selection = window.getSelection().toString();
        if (selection.length > 20) {
            body = selection;
        } else {
            const container = targetNode.closest('p, div, article, section') || targetNode;
            body = container.innerText;
        }
    }

    // Absolute fallback: if we are executing this, we are guaranteed to be on an email domain
    // Grab whatever we can from the body so scanning triggers.
    if (!body) {
        body = document.body.innerText;
    }

    // Limit extreme lengths
    if (body.length > 10000) {
        body = body.substring(0, 10000) + "... [truncated]";
    }

    return {
        subject: subject ? subject.trim() : 'Unknown Subject',
        body: body ? body.trim() : ''
    };
}

// Extract only the subject line (used when background needs subject alongside selected text)
function extractSubjectOnly() {
    const url = window.location.href;
    let subject = '';

    if (url.includes('mail.google.com')) {
        const el = document.querySelector('h2.hP');
        subject = el ? el.innerText.trim() : '';
    } else if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
        const el = document.querySelector('[data-testid="SubjectRead"]') ||
                   document.querySelector('[aria-label="Message Header"]');
        subject = el ? el.innerText.split('\n')[0].trim() : '';
    } else if (url.includes('mail.yahoo.com')) {
        const el = document.querySelector('[data-test-id="message-subject"]') ||
                   document.querySelector('h1');
        subject = el ? el.innerText.trim() : '';
    } else if (url.includes('mail.proton.me')) {
        const el = document.querySelector('h1') ||
                   document.querySelector('[data-testid="message-header:subject"]');
        subject = el ? el.innerText.trim() : '';
    }

    return subject || 'Unknown Subject';
}

// Simple toast notification system
function showToast(message) {
    let toast = document.getElementById('safephish-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'safephish-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 999999;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}
