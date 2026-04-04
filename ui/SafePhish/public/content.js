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
            const emailData = extractEmailContent(); // Reuse extraction logic for sender
            sendResponse({ 
                subject: subject,
                sender: emailData.sender
            });
        } catch (e) {
            sendResponse({ subject: '', sender: '' });
        }
        return true;
    }

    if (request.action === 'extractAttachmentInfo') {
        try {
            const attachments = extractAttachmentInfo();
            sendResponse(attachments);
        } catch (e) {
            sendResponse({ hasAttachments: false, attachments: [] });
        }
        return true;
    }

    if (request.action === 'fetchAttachmentData') {
        // Async: fetch the actual attachment binary from the page
        fetchAttachmentData(request.index || 0)
            .then(data => sendResponse(data))
            .catch(e => sendResponse({ success: false, error: e.message }));
        return true; // async
    }

    if (request.action === 'scanDeceptiveUI') {
        try {
            const scanResult = detectDeceptiveUI();
            sendResponse({ success: true, count: scanResult.count, urls: scanResult.urls });
        } catch (e) {
            sendResponse({ success: false, error: e.message, count: 0, urls: [] });
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
        try {
            chrome.runtime.sendMessage({
                action: 'storeEmailData',
                data: emailData
            });
            
            // Visual feedback to the user
            showToast('📧 Email captured! Click the SafePhish icon to scan.');
        } catch (err) {
            console.warn('SafePhish: Could not send data to extension. Try refreshing the page.', err);
            showToast('⚠️ Please refresh the page to reconnect SafePhish.');
        }
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
    let sender = '';
    let subject = '';
    let body = '';
    
    // Gmail
    if (url.includes('mail.google.com')) {
        // Try to find the active message subject and sender
        // KEEPING ORIGINAL SELECTORS FOR SENDER AND SUBJECT AS REQUESTED
        const senderElement = document.querySelector('.gD');
        const subjectElement = document.querySelector('h2.hP');
        // Find visible message bodies
        const bodies = document.querySelectorAll('.a3s.aiL'); // Specifically targets the body within Gmail's container
        
        sender = senderElement ? (senderElement.getAttribute('email') || senderElement.innerText) : '';
        subject = subjectElement ? subjectElement.innerText : '';
        
        if (bodies && bodies.length > 0) {
            // Updated: Take the FIRST one (original message) instead of the last one
            // This ensures consistency with the sender and subject info fetched above.
            body = bodies[0].innerText;
        } else {
            // Fallback to previous selectors
            const bodyElements = document.querySelectorAll('.adn.ads');
            if (bodyElements && bodyElements.length > 0) {
                // Consistent with bodies[0]: Take the FIRST message in thread
                const firstMessage = bodyElements[0];
                const actualBody = firstMessage.querySelector('.ii.gt') || firstMessage;
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
        const senderElement = document.querySelector('[data-testid="AddressBlock"] .ms-Persona-primaryText') || document.querySelector('[aria-label="Message Header"] [title*="@"]');
        const subjectElement = document.querySelector('[aria-label="Message Header"]') || 
                               document.querySelector('[data-testid="SubjectRead"]') ||
                               document.querySelector('.ms-Pivot-content');
                               
        const readingPane = document.querySelector('[aria-label="Reading Pane"]') ||
                            document.querySelector('[aria-label="Message body"]') ||
                            document.querySelector('div[data-testid="ReadingPane"]') ||
                            document.querySelector('.customScrollBar');
        
        if (senderElement) {
            sender = senderElement.getAttribute('title') || senderElement.innerText;
        }
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

    // Append actual URLs from links so backend can scan them
    let extractedUrls = [];
    if (targetNode) {
        const container = targetNode.closest('p, div, article, section') || targetNode;
        if (container && container.querySelectorAll) {
            container.querySelectorAll('a[href]').forEach(a => extractedUrls.push(a.href));
        }
    } else {
        // Try reading pane or document body
        const pane = document.querySelector('[role="main"]') || document.querySelector('.ii.gt') || document.body;
        pane.querySelectorAll('a[href]').forEach(a => {
            if (a.href.startsWith('http') && !a.href.includes('mail.google.com') && !a.href.includes('outlook.live') && !a.href.includes('outlook.office')) {
                extractedUrls.push(a.href);
            }
        });
    }

    if (body) {
        // Normalize URLs before deduplication to prevent same URL appearing with/without trailing slash
        const normalizedUrls = extractedUrls.map(url => url.replace(/\/+$/, ''));
        const uniqueUrls = [...new Set(normalizedUrls)].filter(u => !body.includes(u));
        if (uniqueUrls.length > 0) {
            body += '\n\nExtracted Links:\n' + uniqueUrls.join('\n');
        }
    }

    // Limit extreme lengths
    if (body.length > 10000) {
        body = body.substring(0, 10000) + "... [truncated]";
    }

    return {
        sender: sender ? sender.trim() : '',
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
    const foundUrls = new Set();

    // Query every potentially interactive element
    const clickableElements = document.querySelectorAll(
        'a[href], [onclick], button, [role="button"], [role="link"]'
    );

    const flag = (el, reason) => {
        deceptiveCount++;
        
        if (el.tagName.toLowerCase() === 'a' && el.hasAttribute('href')) {
            foundUrls.add(el.href);
        } else if (el.hasAttribute('onclick')) {
            const match = el.getAttribute('onclick').match(/['"](https?:\/\/[^'"]+)['"]/);
            if (match) foundUrls.add(match[1]);
        }

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

    return { count: deceptiveCount, urls: Array.from(foundUrls) };
}

// --- Attachment Detection ---
function extractAttachmentInfo() {
    const url = window.location.href;
    const attachments = [];

    // Gmail
    if (url.includes('mail.google.com')) {
        // Gmail attachment chips — each has class .aQH or parent .aZo
        const chips = document.querySelectorAll('.aQH, .aZo .aV3');
        chips.forEach(chip => {
            const nameEl = chip.querySelector('.aV3') || chip;
            const name = (nameEl.getAttribute('title') || nameEl.innerText || '').trim();
            // Size is sometimes in a sibling span
            const sizeEl = chip.querySelector('.aQA span') || chip.closest('.aQH')?.querySelector('.SaijPb');
            const size = sizeEl ? sizeEl.innerText.trim() : '';
            if (name) {
                attachments.push({
                    name,
                    size: size || 'unknown',
                    type: _guessTypeFromName(name),
                });
            }
        });

        // Fallback: look for download links
        if (attachments.length === 0) {
            const downloadLinks = document.querySelectorAll('[download_url], a[href*="mail-attachment"]');
            downloadLinks.forEach(link => {
                const downloadUrl = link.getAttribute('download_url') || '';
                const parts = downloadUrl.split(':');
                const name = parts.length > 1 ? parts[1].split(':')[0] : (link.title || link.innerText || '').trim();
                if (name) {
                    attachments.push({
                        name,
                        size: 'unknown',
                        type: parts[0] || _guessTypeFromName(name),
                    });
                }
            });
        }
    }
    // Outlook
    else if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
        const attachContainers = document.querySelectorAll(
            '[data-testid="AttachmentCard"], .attachment-card, [aria-label*="attachment"], [role="listitem"][draggable="true"]'
        );
        attachContainers.forEach(container => {
            const name = (container.getAttribute('aria-label') || container.innerText || '').split('\n')[0].trim();
            if (name && name.length < 200) {
                attachments.push({
                    name,
                    size: 'unknown',
                    type: _guessTypeFromName(name),
                });
            }
        });
    }

    // Deduplicate attachments by name
    const uniqueAttachments = [];
    const seenNames = new Set();
    for (const att of attachments) {
        if (!seenNames.has(att.name)) {
            uniqueAttachments.push(att);
            seenNames.add(att.name);
        }
    }

    return {
        hasAttachments: uniqueAttachments.length > 0,
        attachments: uniqueAttachments,
    };
}

// --- Fetch actual attachment data (binary) from the page ---
async function fetchAttachmentData(index = 0) {
    const url = window.location.href;

    // Gmail
    if (url.includes('mail.google.com')) {
        return await _fetchGmailAttachment(index);
    }
    // Outlook
    if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
        return await _fetchOutlookAttachment(index);
    }

    return { success: false, error: 'Not on a supported email platform' };
}

async function _fetchGmailAttachment(index) {
    // Strategy 1: Find elements with download_url attribute
    // Gmail format: "mime_type:filename:https://mail.google.com/...&disp=safe"
    const downloadEls = document.querySelectorAll('[download_url]');
    if (downloadEls.length === 0) {
        // Strategy 2: Find attachment download links by pattern
        const allLinks = document.querySelectorAll('a[href*="&disp="]');
        const attachLinks = Array.from(allLinks).filter(a => {
            const h = a.href;
            return h.includes('mail.google.com') && (h.includes('disp=safe') || h.includes('disp=attd'));
        });
        if (attachLinks.length === 0) {
            return { success: false, error: 'No downloadable attachments found. Try downloading manually.' };
        }
        const targetLink = attachLinks[Math.min(index, attachLinks.length - 1)];
        if (!targetLink) return { success: false, error: 'Target attachment link not found' };
        return await _downloadFromUrl(targetLink);
    }

    const el = downloadEls[Math.min(index, downloadEls.length - 1)];
    if (!el) return { success: false, error: 'Attachment element not found' };
    const attr = el.getAttribute('download_url') || '';
    // Parse: "mime_type:filename:url"
    const colonIdx = attr.indexOf(':');
    const secondColon = attr.indexOf(':', colonIdx + 1);
    const mime = attr.substring(0, colonIdx);
    const filename = attr.substring(colonIdx + 1, secondColon);
    const downloadUrl = attr.substring(secondColon + 1);

    if (!downloadUrl || !downloadUrl.startsWith('http')) {
        return { success: false, error: 'Could not parse attachment download URL' };
    }

    try {
        const resp = await fetch(downloadUrl, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const base64 = await _blobToBase64(blob);
        return {
            success: true,
            filename: filename || 'attachment',
            mimeType: mime || blob.type,
            size: blob.size,
            base64: base64,
        };
    } catch (e) {
        return { success: false, error: `Download failed: ${e.message}` };
    }
}

async function _downloadFromUrl(linkEl) {
    if (!linkEl) return { success: false, error: 'Invalid attachment link' };
    const downloadUrl = linkEl.href;
    const filename = (linkEl.getAttribute && linkEl.getAttribute('download')) || linkEl.innerText?.trim() || 'attachment';
    try {
        const resp = await fetch(downloadUrl, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const base64 = await _blobToBase64(blob);
        return {
            success: true,
            filename: filename,
            mimeType: blob.type,
            size: blob.size,
            base64: base64,
        };
    } catch (e) {
        return { success: false, error: `Download failed: ${e.message}` };
    }
}

async function _fetchOutlookAttachment(index) {
    // Outlook: look for download links in attachment cards
    const downloadLinks = document.querySelectorAll(
        'a[href*="attachment"], a[aria-label*="Download"], button[aria-label*="Download"]'
    );
    if (downloadLinks.length === 0) {
        return { success: false, error: 'No downloadable Outlook attachments found. Try downloading manually.' };
    }
    const link = downloadLinks[Math.min(index, downloadLinks.length - 1)];
    if (link && link.href) {
        return await _downloadFromUrl(link);
    }
    return { success: false, error: 'Outlook attachment links not found or inaccessible. Try downloading manually.' };
}

function _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            resolve(dataUrl.split(',')[1]); // strip "data:...;base64,"
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function _guessTypeFromName(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const typeMap = {
        pdf: 'application/pdf',
        doc: 'application/msword', docx: 'application/msword',
        xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.ms-excel',
        ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.ms-powerpoint',
        zip: 'application/zip', rar: 'application/x-rar',
        exe: 'application/x-executable', msi: 'application/x-executable',
        js: 'text/javascript', vbs: 'text/vbscript',
        html: 'text/html', htm: 'text/html',
        jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
        txt: 'text/plain', csv: 'text/csv',
    };
    return typeMap[ext] || 'application/octet-stream';
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

// ─── Layer 1: Inbox Auto-Scan (New Email Detection) ─────────────────────────
// Polls the inbox DOM every 15 seconds for email rows. Tracks which emails
// have already been scanned by sender+subject hash. Only NEW emails are
// sent to the background for ML phishing analysis + SMTP alerts.

class InboxWatcher {
    constructor() {
        this.seenHashes = new Set();
        this.pollTimer = null;
        this.isFirstScan = true; // Skip alerting on the very first scan (existing emails)
        this.POLL_INTERVAL = 15000; // 15 seconds
    }

    start() {
        if (!isEmailPlatform()) return;
        console.log('SafePhish InboxWatcher: Starting inbox polling…');

        // Wait for inbox to load, then begin polling
        this._waitForInbox();
    }

    _waitForInbox() {
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            const rows = this._getInboxRows();
            if (rows.length > 0) {
                clearInterval(check);
                console.log(`SafePhish InboxWatcher: Inbox found with ${rows.length} rows. Starting poll cycle.`);
                this._poll(); // Run first scan immediately
                this.pollTimer = setInterval(() => this._poll(), this.POLL_INTERVAL);
            } else if (attempts > 30) {
                clearInterval(check);
                console.warn('SafePhish InboxWatcher: Could not find inbox rows after 60s.');
            }
        }, 2000);
    }

    _getInboxRows() {
        const url = window.location.href;

        if (url.includes('mail.google.com')) {
            // Gmail: each email row is a <tr> inside the main content area
            // Use broad selector: all table rows inside role="main" that look like email rows
            const mainArea = document.querySelector('div[role="main"]');
            if (!mainArea) return [];
            const rows = mainArea.querySelectorAll('tr');
            // Filter: only rows that contain actual email content (have enough cells/text)
            return Array.from(rows).filter(row => {
                const text = (row.innerText || '').trim();
                return text.length > 20 && row.querySelectorAll('td').length >= 2;
            });
        }

        if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
            return Array.from(document.querySelectorAll('[role="list"] [role="listitem"], [role="option"]'));
        }

        if (url.includes('mail.yahoo.com')) {
            return Array.from(document.querySelectorAll('[data-test-id="message-list-item"], ul[role="list"] li'));
        }

        return [];
    }

    _poll() {
        const rows = this._getInboxRows();
        if (rows.length === 0) return;

        let newCount = 0;

        for (const row of rows) {
            const parsed = this._parseRow(row);
            if (!parsed || (!parsed.sender && !parsed.subject)) continue;

            // Create a stable identifier for this email
            const hashInput = (parsed.sender + '|' + parsed.subject).substring(0, 200);
            const hash = this._simpleHash(hashInput);

            if (this.seenHashes.has(hash)) continue;
            this.seenHashes.add(hash);

            // On first scan, just catalog existing emails — don't send alerts
            if (this.isFirstScan) continue;

            newCount++;
            console.log(`SafePhish InboxWatcher: 🆕 New email detected → "${parsed.subject}" from ${parsed.sender}`);

            try {
                chrome.runtime.sendMessage({
                    action: 'autoScanEmail',
                    data: {
                        sender: parsed.sender,
                        subject: parsed.subject,
                        snippet: parsed.snippet
                    }
                });
            } catch (err) {
                console.warn('SafePhish InboxWatcher: Could not send to background.', err);
            }
        }

        if (this.isFirstScan) {
            console.log(`SafePhish InboxWatcher: Initial scan cataloged ${this.seenHashes.size} existing emails. Watching for new ones…`);
            this.isFirstScan = false;
        } else if (newCount > 0) {
            console.log(`SafePhish InboxWatcher: Sent ${newCount} new email(s) for scanning.`);
            showToast(`🔍 SafePhish: Auto-scanning ${newCount} new email(s)…`);
        }

        // Keep set manageable
        if (this.seenHashes.size > 1000) {
            const iter = this.seenHashes.values();
            for (let i = 0; i < 200; i++) iter.next();
            // Remove oldest 200 entries
            const entries = Array.from(this.seenHashes);
            this.seenHashes = new Set(entries.slice(200));
        }
    }

    _parseRow(row) {
        const url = window.location.href;
        if (url.includes('mail.google.com')) return this._parseGmailRow(row);
        if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) return this._parseOutlookRow(row);
        if (url.includes('mail.yahoo.com')) return this._parseYahooRow(row);
        return null;
    }

    _parseGmailRow(row) {
        // Strategy: Parse the row's inner text which typically looks like:
        // "SenderName  Subject — Snippet preview text  Time"
        // Also try to find spans with [email] attribute for sender email
        let sender = '';
        let subject = '';
        let snippet = '';

        // Try to get sender email from [email] attribute (most reliable)
        const emailSpan = row.querySelector('span[email]');
        if (emailSpan) {
            sender = emailSpan.getAttribute('email') || emailSpan.getAttribute('name') || emailSpan.innerText || '';
            sender = sender.trim();
        }

        // Get the full row text and try to parse subject + snippet
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            // Gmail typically: checkbox | star | sender | subject+snippet | date
            // Sender cell (usually 3rd or 4th td)
            if (!sender) {
                const senderCell = cells[2] || cells[1];
                sender = (senderCell.innerText || '').split('\n')[0].trim();
            }

            // Subject+snippet cell (usually the widest one)
            for (const cell of cells) {
                const text = (cell.innerText || '').trim();
                // The subject/snippet cell is usually the longest
                if (text.length > 30 && !text.includes('@') && text !== sender) {
                    // Split by " — " or " - " which separates subject from snippet in Gmail
                    const dashMatch = text.match(/^(.+?)\s*[—–-]\s*(.+)$/);
                    if (dashMatch) {
                        subject = dashMatch[1].trim();
                        snippet = dashMatch[2].trim();
                    } else {
                        subject = text.substring(0, 100);
                        snippet = text.substring(100, 300);
                    }
                    break;
                }
            }
        }

        // Fallback: just use the entire row text
        if (!sender && !subject) {
            const allText = (row.innerText || '').trim();
            if (allText.length > 10) {
                const lines = allText.split('\n').filter(l => l.trim().length > 0);
                sender = lines[0] || '';
                subject = lines[1] || '';
                snippet = lines.slice(2).join(' ').substring(0, 200);
            }
        }

        if (!sender && !subject) return null;
        return { sender, subject, snippet };
    }

    _parseOutlookRow(item) {
        const senderEl = item.querySelector('[data-testid="AvatarText"]') ||
                         item.querySelector('span[title]');
        const subjectEl = item.querySelector('[data-testid="SubjectLine"]');
        const snippetEl = item.querySelector('[data-testid="PreviewText"]');

        // Fallback: parse from innerText
        let sender = senderEl ? (senderEl.getAttribute('title') || senderEl.innerText || '').trim() : '';
        let subject = subjectEl ? subjectEl.innerText.trim() : '';
        let snippet = snippetEl ? snippetEl.innerText.trim() : '';

        if (!sender && !subject) {
            const text = (item.innerText || '').trim();
            const lines = text.split('\n').filter(l => l.trim());
            sender = lines[0] || '';
            subject = lines[1] || '';
            snippet = lines.slice(2).join(' ').substring(0, 200);
        }

        return { sender, subject, snippet };
    }

    _parseYahooRow(item) {
        const senderEl = item.querySelector('[data-test-id="senders"]');
        const subjectEl = item.querySelector('[data-test-id="message-subject"]');
        const snippetEl = item.querySelector('[data-test-id="message-preview"]');

        let sender = senderEl ? senderEl.innerText.trim() : '';
        let subject = subjectEl ? subjectEl.innerText.trim() : '';
        let snippet = snippetEl ? snippetEl.innerText.trim() : '';

        if (!sender && !subject) {
            const text = (item.innerText || '').trim();
            const lines = text.split('\n').filter(l => l.trim());
            sender = lines[0] || '';
            subject = lines[1] || '';
            snippet = lines.slice(2).join(' ').substring(0, 200);
        }

        return { sender, subject, snippet };
    }

    _simpleHash(str) {
        // Simple string hash — fast, no crypto needed
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
}

// Auto-start the InboxWatcher
new InboxWatcher().start();
