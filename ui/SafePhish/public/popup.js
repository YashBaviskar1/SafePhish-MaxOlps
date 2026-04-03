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
    document.getElementById('emailSender').value  = emailData.sender  || '';
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
            let content = response.content;
            
            // 1. Extract From: line if present
            const fromMatch = content.match(/^From:\s*(.+)$/mi);
            if (fromMatch) {
                document.getElementById('emailSender').value = fromMatch[1].trim();
                content = content.replace(/^From:\s*.+$/mi, '').trimStart();
            }
            
            // 2. Extract Subject: line if present
            const subjectMatch = content.match(/^Subject:\s*(.+)$/mi);
            if (subjectMatch) {
                document.getElementById('emailSubject').value = subjectMatch[1].trim();
                content = content.replace(/^Subject:\s*.+$/mi, '').trimStart();
            }
            
            // 3. The rest is the body
            document.getElementById('emailBody').value = content.trim();

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

// ── Scan Page: detect hidden/deceptive clickable elements ──────────────────
function setDeceptiveBtnsState(disabled, text) {
    ['scanDeceptiveBtn', 'scanDeceptiveBtnEmail'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.disabled = disabled;
        btn.textContent = text;
    });
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
        const emailSender = document.getElementById('emailSender').value.trim();

        const aiToggle = document.getElementById('aiToggle');

        const result = await chrome.runtime.sendMessage({
            action: 'scanEmail',
            content: emailContent,
            sender: emailSender,
            type: 'text',
            enableAIDetection: aiToggle ? aiToggle.checked : false
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

    // Explainability Factor Logic (from user's recent update)
    let explainabilityHtml = '';
    if (result.topFeatures && result.topFeatures.length > 0) {
        const top4 = result.topFeatures.slice(0, 4);
        const featureList = top4.map(f => {
            const isRisky = f.score < 0; 
            const icon = isRisky ? '🚨' : '🛡️';
            return `${icon} ${f.feature}`;
        }).join(', ');
        explainabilityHtml = `
            <div class="detail-item">
                <strong>🧠 Explainability</strong>
                <p>Key Factors: ${featureList}. These indicators most influenced the ${riskLevel} verdict.</p>
            </div>`;
    } else {
        explainabilityHtml = `
            <div class="detail-item">
                <strong>🧠 Explainability</strong>
                <p>${result.analysis || 'Analysis complete.'}</p>
            </div>`;
    }

    const probVal = result.phishingProb !== null ? result.phishingProb : (result.phishingProbability !== undefined ? result.phishingProbability : null);

    contentDiv.innerHTML = `
        <div class="result-header ${riskColor}">
            <h3>${riskLevel}</h3>
            <p>Confidence: ${result.confidence}%</p>
        </div>
        <div class="result-details">
            <div class="detail-item">
                <strong>URL</strong>
                <p>${escapeHtml(result.url)}</p>
            </div>
            ${probVal !== null ? `<div class="detail-item"><strong>Probability</strong><p>${probVal}%</p></div>` : ''}
            ${explainabilityHtml}
            <div style="margin-top: 1rem;">
                <button id="viewFeaturesBtn" class="btn btn-secondary">
                    <span class="material-symbols-outlined">analytics</span>
                    Detailed Analysis
                </button>
            </div>
        </div>
    `;

    resultDiv.classList.remove('hidden');

    const btn = document.getElementById('viewFeaturesBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            // Store results for the detail page, including topFeatures
            chrome.storage.local.set({ 
                lastAnalysis: {
                    url: result.url,
                    isPhishing: result.isPhishing,
                    confidence: result.confidence,
                    features: result.features,
                    mlLabel: result.mlLabel,
                    phishingProb: result.phishingProb,
                    topFeatures: result.topFeatures || []
                }
            }, () => {
                // Open the React app index file, passing a URL parameter
                chrome.tabs.create({ url: 'index.html?page=url_report' });
            });
        });
    }
}

function displayEmailResult(result) {
    const resultDiv = document.getElementById('emailResult');
    const contentDiv = document.getElementById('emailResultContent');

    const riskLevel = result.isPhishing ? 'PHISHING' : 'LEGITIMATE';
    const riskColor = result.isPhishing ? 'risk-high' : 'risk-safe';

    // Build URL display section if URLs were scanned
    let urlSection = '';
    if (result.urls) {
        const { phishingUrls, legitimateUrls, summary } = result.urls;
        let urlVerdictList = '';
        
        if (phishingUrls && phishingUrls.length > 0) {
            phishingUrls.forEach(urlData => {
                urlVerdictList += `
                    <div class="finding-item finding-sandbox" style="border-left-color: var(--danger);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-weight: 800; font-size: 0.75rem;">🚨 PHISHING</span>
                            <span style="font-size: 0.65rem; opacity: 0.7;">${urlData.confidence}%</span>
                        </div>
                        <p style="font-size: 0.7rem; opacity: 0.9; margin: 0; word-break: break-all;">${escapeHtml(urlData.url)}</p>
                    </div>`;
            });
        }
        
        if (legitimateUrls && legitimateUrls.length > 0) {
            legitimateUrls.forEach(urlData => {
                urlVerdictList += `
                    <div class="finding-item finding-sandbox" style="border-left-color: var(--safe);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-weight: 800; font-size: 0.75rem;">🛡️ SAFE</span>
                            <span style="font-size: 0.65rem; opacity: 0.7;">${urlData.confidence}%</span>
                        </div>
                        <p style="font-size: 0.7rem; opacity: 0.9; margin: 0; word-break: break-all;">${escapeHtml(urlData.url)}</p>
                    </div>`;
            });
        }

        urlSection = `
            <div class="detail-item">
                <strong>🔗 Embedded Links (${summary})</strong>
                <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.375rem;">
                    ${urlVerdictList}
                </div>
            </div>`;
    }

    let componentsSection = '';
    if (result.components) {
        const c = result.components;
        componentsSection = `
            <div class="detail-item">
                <strong>📊 5-Engine Master Breakdown</strong>
                <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 0.5rem;">
                    ${[
                        { label: '📧 Email Content', score: c.mlContentScore },
                        { label: '🔗 URL Risk', score: c.urlScore },
                        { label: '🕸️ Behavioral', score: c.behaviorScore },
                        { label: '🕵️ Contextual', score: c.contextScore },
                        { label: '📎 Attachments', score: c.attachmentScore || 0 },
                        { label: '🤖 AI Pattern (LLM)', score: c.aiFingerprintScore || 0 }
                    ].map(engine => `
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; padding: 2px 0;">
                            <span style="color: var(--text-muted);">${engine.label}</span>
                            <span style="font-weight: 700; color: ${engine.score >= 50 ? 'var(--danger)' : 'var(--safe)'}">${engine.score}/100</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    let findingsSection = '';
    if (result.findings && result.findings.length > 0) {
        let findingsList = result.findings.map(f => `<div class="finding-item"><p style="margin: 0;">${escapeHtml(f)}</p></div>`).join('');
        findingsSection = `
            <div class="detail-item">
                <strong>🔍 Explainability Findings</strong>
                <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 4px;">
                    ${findingsList}
                </div>
            </div>`;
    }

    contentDiv.innerHTML = `
        <div class="result-header ${riskColor}">
            <h3>${riskLevel}</h3>
            <p>Total Master Risk Score: ${result.confidence}/100</p>
        </div>
        <div class="result-details">
            ${componentsSection}
            <div class="detail-item">
                <strong>Verdict</strong>
                <p>${result.isPhishing ? '⚠️ Potential Phishing via 5-Engine Analysis' : '✅ Looks Safe across all components'}</p>
            </div>
            ${urlSection}
            ${findingsSection}
            <div style="margin-top: 1rem;">
                <button id="viewEmailFeaturesBtn" class="btn btn-secondary">
                    <span class="material-symbols-outlined">analytics</span>
                    Detailed Analysis
                </button>
            </div>
        </div>
    `;

    resultDiv.classList.remove('hidden');

    const btn = document.getElementById('viewEmailFeaturesBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            chrome.storage.local.set({ lastEmailAnalysis: result }, () => {
                chrome.tabs.create({ url: 'index.html?page=email_report' });
            });
        });
    }
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

// ── Attachment Analysis ──────────────────────────────────────────────────────

let selectedFile = null;
let selectedBase64 = null; // For auto-fetched files
let selectedFileName = null; // For auto-fetched files

// Wire up attachment UI on load
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('attachmentDropZone');
    const fileInput = document.getElementById('attachmentFileInput');
    const scanBtn = document.getElementById('scanAttachmentBtn');
    const clearBtn = document.getElementById('clearFileBtn');
    const autoFetchBtn = document.getElementById('autoFetchBtn');
    const vtToggle = document.getElementById('vtToggle');

    if (!dropZone) return;

    // Click drop zone to open file picker
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-active');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files.length > 0) {
            selectFile(e.dataTransfer.files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            selectFile(fileInput.files[0]);
        }
    });

    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            selectedFile = null;
            selectedBase64 = null;
            selectedFileName = null;
            document.getElementById('selectedFileInfo').classList.add('hidden');
            scanBtn.disabled = true;
            document.getElementById('attachmentResult').classList.add('hidden');
        });
    }

    // Scan button
    if (scanBtn) {
        scanBtn.addEventListener('click', scanAttachment);
    }

    // Auto-fetch button
    if (autoFetchBtn) {
        autoFetchBtn.addEventListener('click', autoFetchAttachment);
    }

    // VT Toggle
    if (vtToggle) {
        vtToggle.addEventListener('change', () => {
            const label = document.getElementById('vtToggleLabel');
            const loadingText = document.getElementById('loadingLayerText');
            if (vtToggle.checked) {
                label.textContent = 'Sandbox + VT';
                if (loadingText) loadingText.textContent = 'Docker Sandbox → VirusTotal Hash → Detonation';
            } else {
                label.textContent = 'Sandbox Only';
                if (loadingText) loadingText.textContent = 'Docker Sandbox Analysis';
            }
        });
    }

    // Try to detect attachments from the current email
    detectAttachmentsFromPage();
});

function selectFile(file) {
    selectedFile = file;
    selectedBase64 = null; // Clear any auto-fetched data
    selectedFileName = null;
    const info = document.getElementById('selectedFileInfo');
    const nameEl = document.getElementById('selectedFileName');
    const scanBtn = document.getElementById('scanAttachmentBtn');

    nameEl.textContent = `📄 ${file.name} (${formatBytes(file.size)})`;
    info.classList.remove('hidden');
    scanBtn.disabled = false;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function detectAttachmentsFromPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractAttachmentInfo' });
        if (response && response.hasAttachments && response.attachments.length > 0) {
            const infoDiv = document.getElementById('attachmentInfo');
            const listDiv = document.getElementById('attachmentList');
            const autoFetchBtn = document.getElementById('autoFetchBtn');
            infoDiv.classList.remove('hidden');

            listDiv.innerHTML = response.attachments.map((att, i) =>
                `<div class="attachment-chip" data-index="${i}">
                    <span class="chip-icon">${getFileIcon(att.type)}</span>
                    <span class="chip-name">${escapeHtml(att.name)}</span>
                    ${att.size !== 'unknown' ? `<span class="chip-size">${att.size}</span>` : ''}
                </div>`
            ).join('');

            // Show auto-fetch button
            if (autoFetchBtn) {
                autoFetchBtn.classList.remove('hidden');
                autoFetchBtn.textContent = response.attachments.length === 1
                    ? `⬇️ Auto-Fetch: ${response.attachments[0].name}`
                    : `⬇️ Auto-Fetch ${response.attachments.length} Attachments`;
            }

            // Make individual chips clickable for single fetch
            listDiv.querySelectorAll('.attachment-chip').forEach(chip => {
                chip.style.cursor = 'pointer';
                chip.addEventListener('click', () => autoFetchAttachment(parseInt(chip.dataset.index)));
            });
        }
    } catch (e) {
        // Content script may not be available — ignore
    }
}

function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('msword')) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return '📦';
    if (mimeType.includes('executable') || mimeType.includes('x-dosexec')) return '⚠️';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('javascript') || mimeType.includes('vbscript')) return '⚠️';
    return '📎';
}

async function autoFetchAttachment(index = 0) {
    const fetchStatus = document.getElementById('fetchStatus');
    const scanBtn = document.getElementById('scanAttachmentBtn');
    const autoFetchBtn = document.getElementById('autoFetchBtn');

    fetchStatus.classList.remove('hidden');
    fetchStatus.innerHTML = '<p class="fetch-progress">⏳ Fetching attachment from email…</p>';
    if (autoFetchBtn) {
        autoFetchBtn.disabled = true;
        autoFetchBtn.textContent = '⏳ Fetching…';
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab');

        // Send fetch request to content script
        let result;
        try {
            result = await chrome.tabs.sendMessage(tab.id, {
                action: 'fetchAttachmentData',
                index: index
            });
        } catch (_) {
            // Content script not loaded — inject and retry
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            await new Promise(r => setTimeout(r, 400));
            result = await chrome.tabs.sendMessage(tab.id, {
                action: 'fetchAttachmentData',
                index: index
            });
        }

        if (result && result.success) {
            selectedBase64 = result.base64;
            selectedFileName = result.filename;
            selectedFile = null; // Clear any manual file

            const info = document.getElementById('selectedFileInfo');
            const nameEl = document.getElementById('selectedFileName');
            nameEl.textContent = `📄 ${result.filename} (${formatBytes(result.size)}) — auto-fetched`;
            info.classList.remove('hidden');
            scanBtn.disabled = false;

            fetchStatus.innerHTML = `<p class="fetch-success">✅ Fetched: ${escapeHtml(result.filename)}</p>`;
        } else {
            const errMsg = result?.error || 'Unknown error';
            fetchStatus.innerHTML = `<p class="fetch-error">❌ ${escapeHtml(errMsg)}</p>`;
        }
    } catch (e) {
        fetchStatus.innerHTML = `<p class="fetch-error">❌ Could not fetch: ${escapeHtml(e.message)}</p>`;
    } finally {
        if (autoFetchBtn) {
            autoFetchBtn.disabled = false;
            autoFetchBtn.textContent = '⬇️ Auto-Fetch Attachment from Email';
        }
    }
}

async function scanAttachment() {
    if (!selectedFile && !selectedBase64) return;

    const scanBtn = document.getElementById('scanAttachmentBtn');
    const loadingDiv = document.getElementById('attachmentLoading');
    const resultDiv = document.getElementById('attachmentResult');
    const vtToggle = document.getElementById('vtToggle');
    const skipVT = vtToggle ? !vtToggle.checked : false;

    scanBtn.disabled = true;
    scanBtn.textContent = '🔬 Analyzing…';
    loadingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    try {
        let base64;
        let fileName;

        if (selectedBase64) {
            // Auto-fetched data already available as base64
            base64 = selectedBase64;
            fileName = selectedFileName || 'attachment';
        } else {
            // Read file from file input as base64
            base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    const base64Part = dataUrl.split(',')[1];
                    resolve(base64Part);
                };
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
            });
            fileName = selectedFile.name;
        }

        // Send to background for analysis
        const result = await chrome.runtime.sendMessage({
            action: 'scanAttachment',
            fileData: base64,
            fileName: fileName,
            skipVT: skipVT
        });

        displayAttachmentResult(result);

    } catch (error) {
        console.error('Error scanning attachment:', error);
        displayAttachmentError('Attachment scan failed. Is the ML server running?');
    } finally {
        loadingDiv.classList.add('hidden');
        scanBtn.disabled = false;
        scanBtn.textContent = '🔬 Scan Attachment';
    }
}

function displayAttachmentResult(result) {
    const resultDiv = document.getElementById('attachmentResult');
    const contentDiv = document.getElementById('attachmentResultContent');

    if (result.error && result.label === 'ERROR') {
        contentDiv.innerHTML = `
            <div class="result-header risk-error">
                <h3>⚠️ Analysis Error</h3>
                <p>${escapeHtml(result.error)}</p>
            </div>`;
        resultDiv.classList.remove('hidden');
        return;
    }

    const riskColor = result.riskScore >= 60 ? 'risk-high' :
                      result.riskScore >= 30 ? 'risk-medium' : 'risk-safe';
    const riskEmoji = result.riskScore >= 60 ? '🚨' :
                      result.riskScore >= 30 ? '⚠️' : '✅';

    // Build findings HTML
    const findingsHtml = result.findings && result.findings.length > 0
        ? result.findings.map(f => {
            let icon = '🔍';
            let cls = 'finding-info';
            if (f.startsWith('[Sandbox]')) { icon = '🐳'; cls = 'finding-sandbox'; }
            else if (f.startsWith('[VirusTotal]')) { icon = '🛡️'; cls = 'finding-vt'; }
            else if (f.startsWith('[VT Detonation]')) { icon = '💥'; cls = 'finding-det'; }
            return `<div class="finding-item ${cls}">${icon} ${escapeHtml(f)}</div>`;
        }).join('')
        : '<div class="finding-item finding-info">✅ No suspicious indicators found</div>';

    // Build layer status badges
    const sandbox = result.layers?.sandbox || {};
    const vtHash = result.layers?.virusTotalHash || {};
    const vtDet = result.layers?.virusTotalDetonation;

    const sandboxBadge = `<div class="layer-badge layer-sandbox">
        <span class="layer-name">🐳 Docker Sandbox</span>
        <span class="layer-score">Risk: ${sandbox.riskScore ?? '?'}/100</span>
    </div>`;

    let vtHashBadge = '';
    if (vtHash.found) {
        const m = vtHash.malicious || 0;
        const t = vtHash.total || 0;
        vtHashBadge = `<div class="layer-badge ${m > 0 ? 'layer-danger' : 'layer-clean'}">
            <span class="layer-name">🛡️ VT Hash Lookup</span>
            <span class="layer-score">${m}/${t} flagged</span>
        </div>`;
    } else if (vtHash.available === false) {
        vtHashBadge = `<div class="layer-badge layer-skip">
            <span class="layer-name">🛡️ VT Hash Lookup</span>
            <span class="layer-score">${vtHash.reason || 'Unavailable'}</span>
        </div>`;
    } else {
        vtHashBadge = `<div class="layer-badge layer-unknown">
            <span class="layer-name">🛡️ VT Hash Lookup</span>
            <span class="layer-score">Hash not found</span>
        </div>`;
    }

    let vtDetBadge = '';
    if (vtDet) {
        if (vtDet.completed) {
            const dm = vtDet.malicious || 0;
            vtDetBadge = `<div class="layer-badge ${dm > 0 ? 'layer-danger' : 'layer-clean'}">
                <span class="layer-name">💥 VT Detonation</span>
                <span class="layer-score">${dm}/${vtDet.total || 0} flagged</span>
            </div>`;
        } else {
            vtDetBadge = `<div class="layer-badge layer-pending">
                <span class="layer-name">💥 VT Detonation</span>
                <span class="layer-score">Pending</span>
            </div>`;
        }
    } else {
        vtDetBadge = `<div class="layer-badge layer-skip">
            <span class="layer-name">💥 VT Detonation</span>
            <span class="layer-score">Skipped</span>
        </div>`;
    }

    contentDiv.innerHTML = `
        <div class="result-header ${riskColor}">
            <h3>${result.label}</h3>
            <p>Risk Score: ${result.riskScore}/100</p>
        </div>
        <div class="result-details">
            <div class="detail-item">
                <strong>File</strong>
                <p>${escapeHtml(result.filename || 'unknown')}</p>
            </div>
            <div class="detail-item">
                <strong>Type</strong>
                <p>${escapeHtml(result.fileType || 'unknown')}</p>
            </div>
            <div class="detail-item">
                <strong>SHA-256</strong>
                <p style="font-size: 0.65rem; word-break: break-all; opacity: 0.7; font-family: var(--font-mono);">${result.hash || 'N/A'}</p>
            </div>

            <div class="layers-section">
                <strong>Defense-in-Depth Layers</strong>
                <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 4px;">
                    ${sandboxBadge}
                    ${vtHashBadge}
                    ${vtDetBadge}
                </div>
            </div>

            <div class="layers-section" style="border-top: none; margin-top: 0.5rem; padding-top: 0;">
                <strong>Findings & Explainability</strong>
                <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 4px;">
                    ${findingsHtml}
                </div>
            </div>
        </div>
    `;

    resultDiv.classList.remove('hidden');
}

function displayAttachmentError(message) {
    const resultDiv = document.getElementById('attachmentResult');
    const contentDiv = document.getElementById('attachmentResultContent');

    contentDiv.innerHTML = `
        <div class="result-header risk-error">
            <h3>ERROR</h3>
            <p>${message}</p>
        </div>
    `;
    resultDiv.classList.remove('hidden');
}

