# Quick Setup Guide - Phishing Detection Chrome Extension

## ⚡ Quick Start (2 minutes)

### Step 1: Load Extension in Chrome
1. Open **Chrome** (or Chromium-based browser)
2. Go to `chrome://extensions/`
3. Toggle **Developer mode** (top right corner)
4. Click **Load unpacked**
5. Select your **hackup** folder
6. ✅ Extension is now loaded and ready to test!

### Step 2: Test the Extension
1. Click the extension icon in your toolbar (should show a lock icon)
2. A popup window will open
3. Try the dummy scans to verify it works

## 🎯 Quick Testing

### Test URL Scanner
```
Test URLs to try:
✅ https://www.google.com
❌ https://malware-site.tk
❌ https://phishing-attempt.tk
```

### Test Email Scanner
```
Test Email Content:
"From: support@amazom.com
Subject: Verify your account
Please click here to verify your account immediately!"
```

## 📁 Project Structure Summary

```
hackup/
├── Core Extension Files (for Chrome extension framework)
│   ├── manifest.json ..................... Extension configuration
│   ├── popup.html/js ..................... Main UI interface
│   ├── background.js ..................... Service worker
│   ├── content.js ........................ Page interaction
│   └── styles.css ........................ UI styling
│
├── URL Detection Module
│   ├── url/detector.js ................... URL analysis logic
│   └── url/utils.js ...................... URL utilities
│
├── Email Detection Module
│   ├── email/detector.js ................. Email analysis logic
│   └── email/utils.js .................... Email utilities
│
└── Documentation
    ├── EXTENSION_README.md ............... Full documentation
    └── SETUP_GUIDE.md .................... This file
```

## 🔄 Features Implemented

### ✅ URL Scanner
- Manual URL input
- Auto-fetch current URL
- Right-click context menu
- Dummy phishing detection
- Confidence scoring

### ✅ Email Scanner  
- Text content input
- File upload (.eml, .txt, .html)
- Right-click on Gmail/Outlook
- Header parsing
- Phishing analysis

### ✅ UI/UX
- Tabbed interface
- Loading indicators
- Result display with confidence
- Status indicators (Legitimate/Phishing)
- Drag & drop file upload

## 🚀 Next Steps

After testing:

1. **Train Your ML Model** (ModelTraining folder)
   - Use the URL and email datasets
   - Export model to TensorFlow.js format

2. **Integrate Model**
   - Update `/url/detector.js` with your model
   - Update `/email/detector.js` with your model
   - Test with your real results

3. **Enhance Features**
   - Add database for known phishing URLs
   - Implement user feedback system
   - Add settings/preferences UI
   - Add result history

## 🐛 Troubleshooting

**Extension icon not showing?**
- Go to `chrome://extensions/`
- Make sure the extension is enabled (toggle on)

**Right-click menu not showing?**
- Reload the extension (toggle off/on)
- Clear browser cache
- Check console for errors

**Popup not loading?**
- Check Chrome DevTools (F12)
- Look for JavaScript errors
- Verify all files are in correct folders

**Need to reload?**
- Go to `chrome://extensions/`
- Click the reload icon on the extension

## 💡 Tips

- **For development**: Keep DevTools open (F12) to see errors
- **Test frequently**: After each code change, reload the extension
- **Use console**: `chrome.runtime.sendMessage()` for debugging
- **Check manifest**: Make sure permissions are correct

## 📝 Code Integration Checklist

When integrating your ML model:

- [ ] Update `URLDetector.analyze()` in `/url/detector.js`
- [ ] Update `EmailDetector.analyze()` in `/email/detector.js`
- [ ] Import TensorFlow.js or your ML library
- [ ] Update confidence calculation logic
- [ ] Test with sample data
- [ ] Handle model loading errors
- [ ] Update result messages

## 🔗 Useful Resources

- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Service Workers API](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [TensorFlow.js Guide](https://www.tensorflow.org/js)

---

**Ready to test?** Open `chrome://extensions/` and load the extension! 🎉
