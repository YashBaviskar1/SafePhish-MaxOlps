# Phishing Detection Chrome Extension

A Chrome extension for detecting phishing URLs and emails with both manual input and right-click context menu integration.

## Features

### URL Scanner
- ✅ Manual URL input for scanning
- ✅ Auto-fetch current website URL
- ✅ Right-click context menu on URLs
- ✅ Real-time phishing detection with confidence scores
- ✅ Detailed analysis reports

### Email Scanner
- ✅ Manual email content input
- ✅ Email file upload support (.eml, .txt, .html)
- ✅ Right-click context menu for Gmail, Outlook, and other email services
- ✅ Header and body analysis
- ✅ Phishing keyword detection
- ✅ Suspicious domain identification

## Project Structure

```
hackup/
├── manifest.json              # Chrome extension configuration
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup interaction logic
├── background.js              # Service worker (context menus, message handling)
├── content.js                 # Content script for webpage interaction
├── styles.css                 # Popup styling
│
├── url/                       # URL detection module
│   ├── detector.js           # URL analysis logic
│   └── utils.js              # URL utility functions
│
└── email/                     # Email detection module
    ├── detector.js           # Email analysis logic
    └── utils.js              # Email utility functions
```

## Installation

1. **Clone/Download the extension:**
   ```bash
   git clone <repository-url>
   cd hackup
   ```

2. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `hackup` folder
   - The extension should now appear in your Chrome toolbar

## Usage

### URL Scanner

**Method 1: Manual Scan**
- Click the extension icon in your toolbar
- Paste the URL in the text field
- Click "Scan URL"

**Method 2: Current Website**
- Click the extension icon
- Click "Fetch Current URL" to automatically load the current page URL
- Click "Scan URL"

**Method 3: Right-Click Context Menu**
- Right-click on any link on a webpage
- Select "Scan with Phishing Detector"
- The extension will open with that URL pre-populated

### Email Scanner

**Method 1: Text Input**
- Click the extension icon
- Go to "Email Scanner" tab
- Select "Text Content" option
- Paste your email content
- Click "Scan Email"

**Method 2: File Upload**
- Click the extension icon
- Go to "Email Scanner" tab
- Select "Upload File" option
- Click and select or drag-and-drop an email file (.eml, .txt, .html)
- Click "Scan Email File"

**Method 3: Right-Click on Email**
- Open Gmail, Outlook, or other email services
- Select/highlight email text
- Right-click and select "Scan Email with Phishing Detector"
- The extension will open with that content pre-populated

## How It Works

### URL Detection
The URL detector analyzes:
- Domain legitimacy and age
- IP address usage (suspicious)
- Suspicious TLDs (.tk, .ml, .ga, .cf)
- HTTPS/SSL certificate
- URL length and structure
- Phishing keywords

### Email Detection
The email detector analyzes:
- Sender address and domain
- Subject line for urgency indicators
- Phishing keywords (verify, confirm, urgent, etc.)
- Suspicious domain spoofing
- HTML encoding and hidden content
- URL patterns in email body
- Email authentication (SPF, DKIM, DMARC)

## Result Interpretation

### Confidence Score
- **80-100%**: High confidence indicator
- **60-80%**: Medium confidence indicator
- **0-60%**: Low confidence, likely legitimate

### Status
- 🔴 **PHISHING**: Email/URL appears to be a phishing attempt
- 🟢 **LEGITIMATE**: Email/URL appears to be legitimate

## Extending with ML Model

### URL Detection Integration
To integrate your trained ML model for URL detection:

1. Update `/url/detector.js` - Replace the `analyze()` method with your model inference
2. Create a `/url/model.js` for your TensorFlow.js or other ML library
3. Update the confidence calculation logic

### Email Detection Integration
To integrate your trained ML model for email detection:

1. Update `/email/detector.js` - Replace the `analyze()` method with your model inference
2. Create an `/email/model.js` for your ML library
3. Update the feature extraction and classification logic

## API Integration (Future)

The extension is designed to easily integrate with external APIs:
- **VirusTotal API** for URL reputation
- **Google Safe Browsing API** for malware detection
- **Have I Been Pwned API** for breach checking
- **EmailValidator API** for sender verification

## Security Notes

⚠️ **This is a prototype with dummy analysis for testing purposes.**

Currently, the extension uses pattern matching and heuristics. Before deploying to production:
1. Train and integrate your ML model
2. Implement proper API security (API key management)
3. Add data encryption for sensitive information
4. Implement rate limiting to prevent abuse
5. Get proper security audits

## Permissions

The extension requests:
- `contextMenus` - To add right-click menus
- `activeTab` - To access current tab information
- `scripting` - To run scripts on web pages
- `storage` - To cache results
- `tabs` - To manage browser tabs
- `<all_urls>` - To analyze any URL or email

## Debugging

To debug the extension:

1. **Check Extension Logs:**
   - Go to `chrome://extensions/`
   - Click "Details" on the extension
   - Click "Errors"

2. **Console Logs:**
   - Right-click extension icon → Inspect Popup
   - Open DevTools Console

3. **Service Worker Logs:**
   - Go to `chrome://extensions/`
   - Click "Service Worker" link

## Next Steps

1. ✅ Test the UI and dummy results
2. Train and integrate your ML model
3. Add database for blacklisted/whitelisted domains
4. Implement user preferences and settings
5. Add email notification system
6. Deploy to Chrome Web Store

## License

This project is for educational and hackathon purposes.

## Support

For issues, feature requests, or questions, please refer to the project documentation or open an issue in the repository.

---

Built for hackathon: Phishing Detection Challenge
