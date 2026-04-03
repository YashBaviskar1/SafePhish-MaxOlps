/**
 * Email Detection Utilities
 * Contains helper functions for email header and body analysis
 */

class EmailDetector {
    constructor() {
        this.phishingKeywords = [
            'verify', 'confirm', 'urgent action', 'update account',
            'confirm identity', 'verify account', 'suspicious activity',
            'unauthorized access', 'click here', 'act now', 'reset password',
            'update payment', 'limited time', 'confirm receipt'
        ];

        this.suspiciousDomains = [
            'amaizn.com', 'amazom.com', 'ammzon.com',
            'microsooft.com', 'microsft.com',
            'paypa1.com', 'paypal-secure.com'
        ];
    }

    /**
     * Analyze email content for phishing indicators
     * @param {string} emailContent - The email content to analyze
     * @returns {object} - Analysis result object
     */
    analyze(emailContent) {
        const analysis = {
            isPhishing: false,
            confidence: 0,
            indicators: [],
            suspiciousElements: [],
            sender: this.extractSender(emailContent),
            subject: this.extractSubject(emailContent)
        };

        // Perform various checks
        this.checkPhishingKeywords(emailContent, analysis);
        this.checkSuspiciousDomains(emailContent, analysis);
        this.checkURLsInEmail(emailContent, analysis);
        this.checkAttachments(emailContent, analysis);
        this.checkHTMLEncoding(emailContent, analysis);
        this.checkUrgencyLanguage(emailContent, analysis);

        // Calculate confidence
        this.calculateConfidence(analysis);

        return analysis;
    }

    /**
     * Extract sender from email headers
     */
    extractSender(emailContent) {
        const fromMatch = emailContent.match(/From:\s*(.+?)(?:\n|<|$)/i);
        if (fromMatch) {
            return fromMatch[1].trim();
        }
        return 'Unknown';
    }

    /**
     * Extract subject from email headers
     */
    extractSubject(emailContent) {
        const subjectMatch = emailContent.match(/Subject:\s*(.+?)(?:\n|$)/i);
        if (subjectMatch) {
            return subjectMatch[1].trim();
        }
        return 'No Subject';
    }

    /**
     * Check for phishing keywords
     */
    checkPhishingKeywords(emailContent, analysis) {
        const emailLower = emailContent.toLowerCase();
        const foundKeywords = [];

        this.phishingKeywords.forEach(keyword => {
            if (emailLower.includes(keyword)) {
                foundKeywords.push(keyword);
                analysis.indicators.push(0.45);
            }
        });

        if (foundKeywords.length > 0) {
            analysis.suspiciousElements.push(`Phishing keywords found: ${foundKeywords.join(', ')}`);
        }
    }

    /**
     * Check for suspicious domains
     */
    checkSuspiciousDomains(emailContent, analysis) {
        const emailLower = emailContent.toLowerCase();

        this.suspiciousDomains.forEach(domain => {
            if (emailLower.includes(domain)) {
                analysis.suspiciousElements.push(`Suspicious domain detected: ${domain}`);
                analysis.indicators.push(0.8);
            }
        });

        // Check for misspelled popular domains
        const commonDomains = ['amazon', 'apple', 'microsoft', 'google', 'paypal', 'bank'];
        commonDomains.forEach(domain => {
            const regex = new RegExp(`${domain}[\\W_]`, 'i');
            if (regex.test(emailContent)) {
                analysis.suspiciousElements.push(`Potential domain spoofing: ${domain}`);
                analysis.indicators.push(0.6);
            }
        });
    }

    /**
     * Check for suspicious URLs in email
     */
    checkURLsInEmail(emailContent, analysis) {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const urls = emailContent.match(urlRegex) || [];

        if (urls.length > 3) {
            analysis.suspiciousElements.push('Multiple suspicious links in email');
            analysis.indicators.push(0.4);
        }

        urls.forEach(url => {
            if (url.includes('javascript:') || url.includes('data:')) {
                analysis.suspiciousElements.push('Suspicious URL scheme detected');
                analysis.indicators.push(0.85);
            }
        });
    }

    /**
     * Check for attachment indicators
     */
    checkAttachments(emailContent, analysis) {
        const attachmentIndicators = ['attachment', 'enclosed', 'attached file', 'download'];
        const emailLower = emailContent.toLowerCase();

        const hasAttachments = attachmentIndicators.some(indicator => 
            emailLower.includes(indicator)
        );

        if (hasAttachments) {
            analysis.suspiciousElements.push('Email contains attachments');
            analysis.indicators.push(0.3); // Lower risk, just informational
        }
    }

    /**
     * Check for HTML encoding and hidden content
     */
    checkHTMLEncoding(emailContent, analysis) {
        const htmlEntityRegex = /&#x?[0-9a-f]+;/gi;
        const entities = emailContent.match(htmlEntityRegex) || [];

        if (entities.length > 5) {
            analysis.suspiciousElements.push('Suspicious HTML encoding detected');
            analysis.indicators.push(0.6);
        }
    }

    /**
     * Check for urgency language
     */
    checkUrgencyLanguage(emailContent, analysis) {
        const urgencyPhrases = [
            'immediately', 'urgent', 'act now', 'limited time',
            'expires', 'deadline', 'asap', 'right away',
            'verify before', 'confirm within'
        ];

        const emailLower = emailContent.toLowerCase();
        const urgencyFound = urgencyPhrases.filter(phrase => emailLower.includes(phrase));

        if (urgencyFound.length > 0) {
            analysis.suspiciousElements.push(`Urgency language detected: ${urgencyFound.join(', ')}`);
            analysis.indicators.push(0.5);
        }
    }

    /**
     * Calculate overall confidence score
     */
    calculateConfidence(analysis) {
        if (analysis.indicators.length === 0) {
            analysis.isPhishing = false;
            analysis.confidence = 90;
        } else {
            const avgScore = analysis.indicators.reduce((a, b) => a + b, 0) / analysis.indicators.length;
            analysis.confidence = Math.round(avgScore * 100);
            analysis.isPhishing = avgScore > 0.5;
        }
    }

    /**
     * Extract URLs from email content
     * @param {string} emailContent - The email content to parse
     * @returns {array} - Array of unique URLs found (max 5)
     */
    extractURLsFromEmail(emailContent) {
        // Extract all URLs (http, https, ftp)
        const urlRegex = /(https?:\/\/|ftp:\/\/)[^\s<>"{}|\\^`\[\]]+/gi;
        const urls = emailContent.match(urlRegex) || [];
        
        // Remove duplicates using Set
        const uniqueUrls = [...new Set(urls)];
        
        // Return only the first 5 URLs to avoid performance issues
        return uniqueUrls.slice(0, 5);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailDetector;
}
