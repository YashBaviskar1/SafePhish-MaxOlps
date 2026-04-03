/**
 * Email Scanning Utilities and Helper Functions
 */

class EmailScanUtils {
    /**
     * Parse email headers from raw email content
     */
    static parseHeaders(emailContent) {
        const headers = {};
        const headerSection = emailContent.split('\n\n')[0];
        
        const lines = headerSection.split('\n');
        let currentHeader = null;
        let currentValue = '';

        lines.forEach(line => {
            if (line.match(/^[A-Z-]+:/)) {
                if (currentHeader) {
                    headers[currentHeader] = currentValue.trim();
                }
                const [header, ...rest] = line.split(':');
                currentHeader = header.trim();
                currentValue = rest.join(':').trim();
            } else if (currentHeader && line.startsWith(' ')) {
                currentValue += ' ' + line.trim();
            }
        });

        if (currentHeader) {
            headers[currentHeader] = currentValue.trim();
        }

        return headers;
    }

    /**
     * Extract email body from raw email
     */
    static extractBody(emailContent) {
        const parts = emailContent.split('\n\n');
        if (parts.length > 1) {
            return parts.slice(1).join('\n\n');
        }
        return emailContent;
    }

    /**
     * Extract sender from email headers
     */
    static extractSender(headers) {
        return headers['From'] || headers['from'] || 'Unknown Sender';
    }

    /**
     * Extract subject from email headers
     */
    static extractSubject(headers) {
        return headers['Subject'] || headers['subject'] || 'No Subject';
    }

    /**
     * Extract recipient from email headers
     */
    static extractRecipient(headers) {
        return headers['To'] || headers['to'] || 'Unknown Recipient';
    }

    /**
     * Check SPF/DKIM/DMARC authentication
     */
    static checkAuthentication(headers) {
        const authenticationStatus = {
            spf: false,
            dkim: false,
            dmarc: false
        };

        if (headers['Authentication-Results']) {
            const authResults = headers['Authentication-Results'].toLowerCase();
            authenticationStatus.spf = authResults.includes('spf=pass');
            authenticationStatus.dkim = authResults.includes('dkim=pass');
            authenticationStatus.dmarc = authResults.includes('dmarc=pass');
        }

        return authenticationStatus;
    }

    /**
     * Extract all links from email content
     */
    static extractLinks(emailContent) {
        const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]*)/gi;
        const links = emailContent.match(urlRegex) || [];
        return [...new Set(links)]; // Remove duplicates
    }

    /**
     * Extract all email addresses from content
     */
    static extractEmails(emailContent) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
        const emails = emailContent.match(emailRegex) || [];
        return [...new Set(emails)]; // Remove duplicates
    }

    /**
     * Check if email is HTML or plain text
     */
    static getEmailType(emailContent) {
        if (emailContent.includes('<html') || emailContent.includes('<body')) {
            return 'html';
        }
        return 'plain';
    }

    /**
     * Check for common phishing templates
     */
    static detectPhishingTemplate(emailContent) {
        const templates = {
            accountVerification: /verify.*account|confirm.*identity|update.*account/i,
            paymentUpdate: /update.*payment|billing.*information|card.*expired/i,
            securityAlert: /suspicious.*activity|unauthorized.*access|security.*alert/i,
            passwordReset: /reset.*password|change.*password|update.*credential/i,
            urgentAction: /immediate.*action|urgent|act.*now|limited.*time/i
        };

        const detected = [];
        for (const [template, regex] of Object.entries(templates)) {
            if (regex.test(emailContent)) {
                detected.push(template);
            }
        }
        return detected;
    }

    /**
     * Generate email scan report
     */
    static generateReport(analysisResult, headers) {
        return {
            timestamp: new Date().toISOString(),
            sender: analysisResult.sender,
            subject: analysisResult.subject,
            recipient: this.extractRecipient(headers),
            isPhishing: analysisResult.isPhishing,
            confidence: analysisResult.confidence,
            suspiciousElements: analysisResult.suspiciousElements || [],
            links: this.extractLinks(analysisResult.emailContent || ''),
            authentication: this.checkAuthentication(headers),
            recommendation: analysisResult.isPhishing ? 'QUARANTINE' : 'DELIVER'
        };
    }

    /**
     * Sanitize email content for display
     */
    static sanitizeContent(emailContent) {
        const div = document.createElement('div');
        div.textContent = emailContent;
        return div.innerHTML;
    }

    /**
     * Check if email has authentication issues
     */
    static hasAuthenticationIssues(headers) {
        const auth = this.checkAuthentication(headers);
        return !auth.spf && !auth.dkim && !auth.dmarc;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailScanUtils;
}
