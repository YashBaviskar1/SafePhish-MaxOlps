/**
 * URL Scanning Utilities and Helper Functions
 */

class URLScanUtils {
    /**
     * Format URL for display
     */
    static formatURL(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.href;
        } catch {
            return url;
        }
    }

    /**
     * Get domain name from URL
     */
    static extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return 'Invalid URL';
        }
    }

    /**
     * Get path from URL
     */
    static extractPath(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname + urlObj.search;
        } catch {
            return '';
        }
    }

    /**
     * Check if URL has common phishing keywords
     */
    static hasPhishingKeywords(url) {
        const keywords = [
            'verify', 'confirm', 'update', 'login', 'account',
            'security', 'alert', 'urgent', 'action', 'click'
        ];
        
        const urlLower = url.toLowerCase();
        return keywords.filter(kw => urlLower.includes(kw));
    }

    /**
     * Check URL reputation (simulated - will use real API later)
     */
    static async checkReputation(url) {
        // Placeholder for future API integration
        // Could integrate with VirusTotal, Google Safe Browsing, etc.
        return {
            status: 'clean',
            source: 'simulated'
        };
    }

    /**
     * Validate URL scheme
     */
    static hasValidScheme(url) {
        const validSchemes = ['http://', 'https://', 'ftp://'];
        const lowerUrl = url.toLowerCase();
        return validSchemes.some(scheme => lowerUrl.startsWith(scheme));
    }

    /**
     * Encode URL for safe display
     */
    static encodeURL(url) {
        return encodeURI(url);
    }

    /**
     * Get URL parameters
     */
    static getURLParameters(url) {
        try {
            const urlObj = new URL(url);
            const params = {};
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            return params;
        } catch {
            return {};
        }
    }

    /**
     * Check if URL seems shortened (bit.ly, tinyurl, etc.)
     */
    static isShortenedURL(url) {
        const shortenedHosts = [
            'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly',
            'short.link', 'is.gd', 'buff.ly', 't.co'
        ];
        
        try {
            const domain = new URL(url).hostname;
            return shortenedHosts.some(host => domain.includes(host));
        } catch {
            return false;
        }
    }

    /**
     * Generate report for URL scan
     */
    static generateReport(analysisResult) {
        return {
            timestamp: new Date().toISOString(),
            url: analysisResult.url,
            domain: this.extractDomain(analysisResult.url),
            isPhishing: analysisResult.isPhishing,
            confidence: analysisResult.confidence,
            suspiciousElements: analysisResult.suspiciousElements || [],
            recommendation: analysisResult.isPhishing ? 'BLOCK' : 'ALLOW'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = URLScanUtils;
}
