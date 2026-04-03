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

    if (request.action === 'scanDeceptiveUI') {
        try {
            const count = detectDeceptiveUI();
            sendResponse({ success: true, count });
        } catch (e) {
            sendResponse({ success: false, error: e.message, count: 0 });
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

// --- Feature: UI Deception Detection ---
function detectDeceptiveUI() {
    let deceptiveCount = 0;

    // Query every potentially interactive element
    const clickableElements = document.querySelectorAll(
        'a[href], [onclick], button, [role="button"], [role="link"]'
    );

    const flag = (el, reason) => {
        deceptiveCount++;
        el.dataset.safephishFlagged = 'true';

        el.style.setProperty('outline',           '3px dashed #ef4444', 'important');
        el.style.setProperty('outline-offset',    '3px',                'important');
        el.style.setProperty('background-color',  'rgba(239,68,68,0.12)', 'important');
        el.title = `\u26a0\ufe0f SafePhish: ${reason}`;

        const badge = document.createElement('span');
        badge.textContent = `\u26a0\ufe0f ${reason}`;
        badge.style.cssText = [
            'display:inline-block',
            'position:absolute',
            'top:-22px',
            'left:0',
            'background:#ef4444',
            'color:#fff',
            'font:bold 10px/1 Arial,sans-serif',
            'padding:3px 7px',
            'border-radius:4px',
            'pointer-events:none',
            'white-space:nowrap',
            'z-index:2147483647',
            'box-shadow:0 2px 6px rgba(0,0,0,.35)',
        ].join(';');

        const cs = window.getComputedStyle(el);
        if (cs.position === 'static') {
            el.style.setProperty('position', 'relative', 'important');
        }
        try { el.appendChild(badge); } catch (_) {}
    };

    clickableElements.forEach(el => {
        if (el.dataset.safephishFlagged) return;

        const cs   = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        // Skip layout-invisible elements
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (rect.width < 1 || rect.height < 1) return;

        const opacity    = parseFloat(cs.opacity);
        const hasText    = (el.innerText || el.textContent || '').trim().length > 0;
        const tag        = el.tagName.toLowerCase();
        const isAnchor   = tag === 'a';
        const isButton   = tag === 'button';
        const hasOnclick = el.hasAttribute('onclick');

        // textDecoration: Chrome returns shorthand like "none solid rgb(0,0,0)"
        const tdFull    = cs.textDecoration     || '';
        const tdLine    = cs.textDecorationLine || '';
        const hasUnderline = tdFull.includes('underline') || tdLine.includes('underline');

        const cursor     = cs.cursor;
        const isPointer  = cursor === 'pointer';
        const isTextlike = cursor === 'text' || cursor === 'default' || cursor === 'auto';

        const elBg      = cs.backgroundColor;
        const isTransBg = elBg === 'rgba(0, 0, 0, 0)' || elBg === 'transparent';

        // ---------------------------------------------------------------
        // RULE 1 — Invisible/zero-opacity clickable element (overlay attack)
        //   e.g. <a style="opacity:0; position:absolute; width:100%; height:100%">
        // ---------------------------------------------------------------
        if (opacity <= 0.05 && rect.width > 5 && rect.height > 5) {
            flag(el, 'Invisible clickable overlay');
            return;
        }

        // ---------------------------------------------------------------
        // RULE 2 — Anchor with href but NO underline (disguised as body text)
        //   e.g. <a href="..." style="text-decoration:none; color:black">
        //   Allow it only if it clearly looks like a styled button
        // ---------------------------------------------------------------
        if (isAnchor && el.hasAttribute('href') && hasText && !hasUnderline) {
            const hasPadding    = parseFloat(cs.paddingTop) > 4 || parseFloat(cs.paddingLeft) > 8;
            const hasBorder     = parseFloat(cs.borderWidth) > 0 && cs.borderStyle !== 'none';
            const hasExplicitBg = !isTransBg;
            const looksLikeBtn  = hasPadding && (hasBorder || hasExplicitBg);

            if (!looksLikeBtn) {
                flag(el, 'Link disguised as plain text');
                return;
            }
        }

        // ---------------------------------------------------------------
        // RULE 3 — onclick on a non-button/non-anchor element (hidden JS handler)
        //   e.g. <p onclick="..."> or <div onclick="..."> that looks like text
        //   Key: cursor is NOT pointer, so user can't tell it's clickable
        // ---------------------------------------------------------------
        if (hasOnclick && !isButton && !isAnchor && hasText && !isPointer) {
            flag(el, 'Hidden JavaScript click handler');
            return;
        }

        // ---------------------------------------------------------------
        // RULE 4 — Transparent absolute/fixed overlay element (clickjacking)
        //   e.g. empty <a> sitting on top of other content
        // ---------------------------------------------------------------
        if ((cs.position === 'absolute' || cs.position === 'fixed') && (isAnchor || isButton || hasOnclick)) {
            if (!hasText && isTransBg && cs.backgroundImage === 'none' && rect.width > 20 && rect.height > 10) {
                flag(el, 'Transparent clickjacking overlay');
                return;
            }
        }
    });

    if (deceptiveCount > 0) {
        showToast(`\ud83d\udea8 SafePhish: ${deceptiveCount} deceptive element${deceptiveCount !== 1 ? 's' : ''} found \u2014 highlighted on page.`);
    } else {
        showToast('\u2705 SafePhish: No deceptive UI elements detected.');
    }

    return deceptiveCount;
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
