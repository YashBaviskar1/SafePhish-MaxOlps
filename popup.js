// Tab Navigation
const urlTab = document.getElementById('url-tab');
const emailTab = document.getElementById('email-tab');
const toggleEmail = document.getElementById('toggleEmail');
const toggleUrl = document.getElementById('toggleUrl');

// Track whether a URL scan is currently running (so Scan Page button can wait)
let isUrlScanRunning = false;

toggleEmail.addEventListener('click', (e) => {
    e.preventDefault();
    urlTab.classList.add('hidden');
    emailTab.classList.remove('hidden');
});

toggleUrl.addEventListener('click', (e) => {
    e.preventDefault();
    emailTab.classList.add('hidden');
    urlTab.classList.remove('hidden');
});

// ─── Helper: extract email data from a tab, auto-injecting content.js if needed ───
// This handles the case where the tab was already open before the extension loaded,
// meaning the content script was never injected automatically.
async function extractEmailFromTab(tabId) {
    // First attempt: message the already-loaded content script
    try {
        const data = await chrome.tabs.sendMessage(tabId, { action: 'extractEmailContent' });
        if (data) return data;
    } catch (_) {
        // Content script not present — fall through to injection
    }

    // Second attempt: inject content.js now, wait briefly, then retry
    try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
        // Small delay to let the script initialise its listeners
        await new Promise(r => setTimeout(r, 350));
        const data = await chrome.tabs.sendMessage(tabId, { action: 'extractEmailContent' });
        return data || null;
    } catch (err) {
        console.error('SafePhish: Could not inject/extract from tab:', err);
        return null;
    }
}

// ─── Populate email fields from extracted data ───
function populateEmailFields(emailData) {
    if (!emailData) return;
    document.getElementById('emailSubject').value = emailData.subject || '';
    document.getElementById('emailBody').value    = emailData.body    || '';
}

// ─── Show a status line in the email tab while extracting ───
function showExtractionStatus(msg) {
    let el = document.getElementById('sp-extract-status');
    if (!el) {
        el = document.createElement('p');
        el.id = 'sp-extract-status';
        el.style.cssText = 'font-size:12px;color:#7c8ba1;margin:6px 0 0;text-align:center';
        // Insert right above the scan button if possible
        const btn = document.getElementById('scanEmailBtn');
        if (btn) btn.parentNode.insertBefore(el, btn);
        else document.getElementById('email-tab').appendChild(el);
    }
    el.textContent = msg;
}
function clearExtractionStatus() {
    const el = document.getElementById('sp-extract-status');
    if (el) el.textContent = '';
}

// ─── Check for context menu data or current tab data ───
document.addEventListener('DOMContentLoaded', async () => {
    chrome.runtime.sendMessage({ action: 'getContextData' }, async (response) => {

        // ── A. Right-clicked a link → scan that URL ──
        if (response && response.type === 'url' && response.url) {
            document.getElementById('urlInput').value = response.url;
            urlTab.classList.remove('hidden');
            emailTab.classList.add('hidden');
            scanUrl();
            return;
        }

        // ── B. Have ready-made email content (right-click page scan / double-click) ──
        if (response && response.type === 'email' && response.content) {
            if (response.content.startsWith('Subject:')) {
                const parts = response.content.split('\n\n');
                document.getElementById('emailSubject').value = parts[0].replace('Subject:', '').trim();
                document.getElementById('emailBody').value    = parts.slice(1).join('\n\n').trim();
            } else {
                document.getElementById('emailBody').value = response.content;
            }
            emailTab.classList.remove('hidden');
            urlTab.classList.add('hidden');
            scanEmail();
            return;
        }

        // ── C. Background signalled 'email page but no content yet' ──
        if (response && response.type === 'email_page') {
            emailTab.classList.remove('hidden');
            urlTab.classList.add('hidden');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                showExtractionStatus('⏳ Extracting email content…');
                const emailData = await extractEmailFromTab(tab.id);
                clearExtractionStatus();
                if (emailData && emailData.body && emailData.body.length > 10) {
                    populateEmailFields(emailData);
                    scanEmail();
                }
            }
            return;
        }

        // ── D. No context data — check the active tab ourselves ──
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        const url = tab.url;
        document.getElementById('urlInput').value = url;

        const isEmailPlatform =
            url.includes('mail.google.com')    ||
            url.includes('outlook.live.com')   ||
            url.includes('outlook.office.com') ||
            url.includes('mail.yahoo.com')     ||
            url.includes('mail.proton.me');

        if (isEmailPlatform) {
            // Switch to email tab immediately so user sees something
            urlTab.classList.add('hidden');
            emailTab.classList.remove('hidden');

            showExtractionStatus('⏳ Extracting email content…');
            const emailData = await extractEmailFromTab(tab.id);
            clearExtractionStatus();

            if (emailData && emailData.body && emailData.body.length > 10) {
                populateEmailFields(emailData);
                scanEmail();               // ← auto-trigger scan
            } else {
                showExtractionStatus('📭 No email open — paste content above and click Scan.');
            }
        } else {
            // Not an email platform — scan the current page URL
            scanUrl();
        }
    });

    // ── Wire up both Scan Page buttons ──
    const scanDeceptiveBtn = document.getElementById('scanDeceptiveBtn');
    const scanDeceptiveBtnEmail = document.getElementById('scanDeceptiveBtnEmail');
    if (scanDeceptiveBtn) scanDeceptiveBtn.addEventListener('click', triggerDeceptiveScan);
    if (scanDeceptiveBtnEmail) scanDeceptiveBtnEmail.addEventListener('click', triggerDeceptiveScan);
});


// ── Scan Page: detect hidden/deceptive clickable elements ──────────────────
function setDeceptiveBtnsState(disabled, text) {
    ['scanDeceptiveBtn', 'scanDeceptiveBtnEmail'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.disabled = disabled;
        btn.textContent = text;
    });
}

async function triggerDeceptiveScan() {
    // If a URL scan is running, wait for it to finish first
    if (isUrlScanRunning) {
        setDeceptiveBtnsState(true, '⏳ Waiting…');
        await new Promise(resolve => {
            const poll = setInterval(() => {
                if (!isUrlScanRunning) { clearInterval(poll); resolve(); }
            }, 150);
        });
    }

    setDeceptiveBtnsState(true, '🔍 Scanning…');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        setDeceptiveBtnsState(false, '🕵️ Scan Page');
        return;
    }

    const sendScan = () => new Promise(resolve => {
        chrome.tabs.sendMessage(tab.id, { action: 'scanDeceptiveUI' }, response => {
            if (chrome.runtime.lastError) resolve(null);
            else resolve(response);
        });
    });

    let result = await sendScan();

    // Content script might not be injected yet — try injecting then retry
    if (!result) {
        try {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            await new Promise(r => setTimeout(r, 400));
            result = await sendScan();
        } catch (err) {
            showDeceptiveResult({
                error: 'Cannot scan this page. ' +
                       (tab.url.startsWith('file://') ?
                        'For local files, go to chrome://extensions → Details and enable "Allow access to file URLs".' :
                        'The extension could not access this page.')
            });
            setDeceptiveBtnsState(false, '🕵️ Scan Page');
            return;
        }
    }

    showDeceptiveResult(result || { count: 0, urls: [] });
    
    // Auto-scan the first hidden URL found
    if (result && result.urls && result.urls.length > 0) {
        document.getElementById('email-tab').classList.add('hidden');
        document.getElementById('url-tab').classList.remove('hidden');
        document.getElementById('urlInput').value = result.urls[0];
        
        // Minor delay to let the user digest the "deceptive elements found" result before the loader starts
        setTimeout(() => {
            scanUrl();
        }, 1200);
    }

    setDeceptiveBtnsState(false, '🕵️ Scan Page');
}

function showDeceptiveResult(result) {
    const div = document.getElementById('deceptiveResult');
    const content = document.getElementById('deceptiveResultContent');
    if (!div || !content) return;

    if (result.error) {
        content.innerHTML = `
            <div class="result-header risk-error">
                <h3>⚠️ Cannot Scan</h3>
                <p>${result.error}</p>
            </div>`;
    } else if (result.count > 0) {
        content.innerHTML = `
            <div class="result-header risk-high">
                <h3>🚨 ${result.count} Deceptive Element${result.count !== 1 ? 's' : ''} Found!</h3>
                <p>Hidden clickable areas have been highlighted directly on the page.</p>
            </div>`;
    } else {
        content.innerHTML = `
            <div class="result-header risk-safe">
                <h3>✅ Page Looks Clean</h3>
                <p>No hidden or deceptive clickable elements detected.</p>
            </div>`;
    }

    div.classList.remove('hidden');
}

// URL Scanner
document.getElementById('scanUrlBtn').addEventListener('click', scanUrl);

async function scanUrl() {
    const url = document.getElementById('urlInput').value.trim();

    if (!url) {
        alert('Please enter a URL');
        return;
    }

    showUrlLoading();

    try {
        // Send to background script for processing
        const result = await chrome.runtime.sendMessage({
            action: 'scanUrl',
            url: url
        });

        displayUrlResult(result);
    } catch (error) {
        console.error('Error scanning URL:', error);
        displayUrlError('Error scanning URL. Please try again.');
    } finally {
        hideUrlLoading();
    }
}

// Email Scanner
document.getElementById('scanEmailBtn').addEventListener('click', scanEmail);

async function scanEmail() {
    const emailSubject = document.getElementById('emailSubject').value.trim();
    const emailBody = document.getElementById('emailBody').value.trim();

    if (!emailBody) {
        alert('Please enter email content');
        return;
    }

    showEmailLoading();

    try {
        const emailContent = `Subject: ${emailSubject}\n\n${emailBody}`;

        const result = await chrome.runtime.sendMessage({
            action: 'scanEmail',
            content: emailContent,
            type: 'text'
        });

        displayEmailResult(result);
    } catch (error) {
        console.error('Error scanning email:', error);
        displayEmailError('Error scanning email. Please try again.');
    } finally {
        hideEmailLoading();
    }
}

// Result Display Functions
function displayUrlResult(result) {
    const resultDiv = document.getElementById('urlResult');
    const contentDiv = document.getElementById('urlResultContent');

    const riskLevel = result.isPhishing ? 'PHISHING' : 'LEGITIMATE';
    const riskColor = result.isPhishing ? 'risk-high' : 'risk-safe';

    contentDiv.innerHTML = `
        <div class="result-header ${riskColor}">
            <h3>${riskLevel}</h3>
            <p>Confidence: ${result.confidence}%</p>
        </div>
        <div class="result-details">
            <div class="detail-item">
                <strong>URL:</strong>
                <p>${escapeHtml(result.url)}</p>
            </div>
            <div class="detail-item">
                <strong>Status:</strong>
                <p>${result.isPhishing ? '⚠️ Potential Phishing' : '✅ Legitimate'}</p>
            </div>
            <div class="detail-item">
                <strong>Analysis:</strong>
                <p>${result.analysis || 'No additional details available'}</p>
            </div>
        </div>
    `;

    resultDiv.classList.remove('hidden');
}

function displayEmailResult(result) {
    const resultDiv = document.getElementById('emailResult');
    const contentDiv = document.getElementById('emailResultContent');

    const riskLevel = result.isPhishing ? 'PHISHING' : 'LEGITIMATE';
    const riskColor = result.isPhishing ? 'risk-high' : 'risk-safe';

    contentDiv.innerHTML = `
        <div class="result-header ${riskColor}">
            <h3>${riskLevel}</h3>
            <p>Confidence: ${result.confidence}%</p>
        </div>
        <div class="result-details">
            <div class="detail-item">
                <strong>Status:</strong>
                <p>${result.isPhishing ? '⚠️ Potential Phishing' : '✅ Legitimate'}</p>
            </div>
            <div class="detail-item">
                <strong>Suspicious Elements Found:</strong>
                <p>${result.suspiciousElements || 'None'}</p>
            </div>
            <div class="detail-item">
                <strong>Analysis:</strong>
                <p>${result.analysis || 'No additional details available'}</p>
            </div>
        </div>
    `;

    resultDiv.classList.remove('hidden');
}

function displayUrlError(message) {
    const resultDiv = document.getElementById('urlResult');
    const contentDiv = document.getElementById('urlResultContent');

    contentDiv.innerHTML = `
        <div class="result-header risk-error">
            <h3>ERROR</h3>
            <p>${message}</p>
        </div>
    `;

    resultDiv.classList.remove('hidden');
}

function displayEmailError(message) {
    const resultDiv = document.getElementById('emailResult');
    const contentDiv = document.getElementById('emailResultContent');

    contentDiv.innerHTML = `
        <div class="result-header risk-error">
            <h3>ERROR</h3>
            <p>${message}</p>
        </div>
    `;

    resultDiv.classList.remove('hidden');
}

// Loading Indicators
function showUrlLoading() {
    isUrlScanRunning = true;           // ← mark scan as in-progress
    document.getElementById('urlLoading').classList.remove('hidden');
    document.getElementById('urlResult').classList.add('hidden');
}

function hideUrlLoading() {
    isUrlScanRunning = false;          // ← mark scan as done
    document.getElementById('urlLoading').classList.add('hidden');
}

function showEmailLoading() {
    document.getElementById('emailLoading').classList.remove('hidden');
    document.getElementById('emailResult').classList.add('hidden');
}

function hideEmailLoading() {
    document.getElementById('emailLoading').classList.add('hidden');
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
