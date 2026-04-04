# SafePhish: Multi-Engine AI Phishing Defense

SafePhish is a state-of-the-art phishing detection ecosystem that fuses deep learning, behavioral intelligence, and contextual analysis to protect users across web and email platforms.

## 🛡️ Core Detection Ecosystem

### 1. 30-Point Neural URL Analysis
Our primary ML model analyzes URLs across 30 distinct feature dimensions to identify structural, technical, and reputation-based anomalies:
- **Structural Indicators**: IP-based URLs, extreme length, '@' symbol usage, hyphenated domains, and subdomain depth.
- **Technical Metrics**: Domain registration age, DNS recording status, non-standard port usage, and HTTPS-in-domain deceptive naming.
- **Content Integrity**: External object request ratios (Favicon, images, scripts), Safe Form Handler (SFH) validation, and IFrame redirection tracking.
- **External Intelligence**: Real-time integration with Alexa Rank, Page Rank, and Google Index status.

### 2. Multi-Engine Email Risk Fusion
SafePhish employs a master "Risk Fusion" engine that calculates a unified threat score (0-100) by combining signals from 5 specialized sub-engines:
- **ML Content Engine**: TF-IDF + XGBoost pipeline trained on large-scale phishing datasets for deep intent classification.
- **Contextual Analysis Engine**: 
  - **Brand Impersonation Detection**: Cross-references mentions of top brands (PayPal, Microsoft, Google, Amazon, etc.) against the actual sender domain.
  - **Cross-Domain Link Validation**: Identifies mismatches between the sender's domain and the destination domains of embedded links.
  - **Intent Signal Extraction**: Uses keyword heuristics to detect high-urgency language (e.g., "account suspended") and financial/billing-related social engineering.
- **Behavioral Intelligence Engine**: 
  - **Dynamic Redirect Tracing**: Performs real-time link detonation to follow redirect chains (up to 3 levels) to find the ultimate landing page.
  - **Evasive Pattern Detection**: Flags automated redirect loops and obfuscation techniques used to hide malicious payloads.
  - **High-Risk TLD Tracking**: Monitors for throwaway infrastructure and sketchy top-level domains (.xyz, .top, .pw, .ru) in redirect destinations.
  - **Action Intent Analysis**: Detects forced user actions such as "Verify Now" or "Login to Update."
- **AI Fingerprint Detector**: Advanced anti-LLM logic to identify AI-generated phishing patterns using linguistic entropy and structural uniformity.
- **Attachment Defense Layer**: 3-layered analysis including Docker-based static triage and VirusTotal dynamic detonation.

### 3. Anti-LLM AI Fingerprint Detection
To counter the rise of AI-automated phishing, SafePhish identifies GPT/LLM signatures through deep NLP metrics:
- **Linguistic Entropy**: Measuring word diversity to detect repetitive AI patterns.
- **Burstiness Scaling**: Analyzing sentence length variation (Coefficient of Variation).
- **Linguistic Formality**: Tracking the absence of contractions and over-formalized "AI voice."
- **Passive Voice Prevalence**: Detecting the impersonal and distant tone typical of generative models.

## 🛠️ Browser Security Features

### 4. Deceptive UI "Scan the Page" Engine
Integrated directly into the browser, this engine identifies UI-based attacks that bypass traditional scanners:
- **Invisible Clickable Overlays**: Highlighting hidden elements used for clickjacking.
- **Disguised Links**: Detecting phishing URLs masquerading as plain, non-interactive text.
- **Hidden JS Handlers**: Flagging interactive elements without standard visual cues.
- **Real-time Feedback**: Visual highlighting with dashed borders, warning badges, and instant toast notifications.

### 5. Context Menu & Gesture Intelligence
- **Right-Click to Scan**: Instantly analyze any link, selected text, or entire email blocks without visiting or clicking.
- **Double-Click Capture**: A rapid gesture system to capture and analyze content blocks directly within Gmail and Outlook.
- **Toast Notification System**: Lightweight background feedback for scan status and immediate risk alerts.

### 6. Specialized Platform Integration
Deep DOM-level integration for the world's most popular email providers:
- **Gmail & Outlook**: Native extraction of Sender, Subject, Body, and Attachment signatures.
- **Yahoo & Proton**: Targeted support for privacy-focused and legacy email environments.
- **Auto-Attachment Triage**: Background extraction of attachment metadata for zero-trust analysis.

### 7. Neural Explainability Drivers
We believe in "White-Box" security. SafePhish provides transparency through:
- **Top 4 Feature Contributions**: Using XGBoost native explainability to show EXACTLY which features (e.g., "Non-standard Port", "Long URL") drove the risk score.
- **Signal Logs**: Human-readable justifications for every engine flag raised during analysis.
