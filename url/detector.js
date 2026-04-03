/**
 * URL Detection Utilities
 * Contains helper functions for URL analysis and validation
 */

class URLDetector {
    constructor() {
        this.suspiciousPatterns = [
            'phish',
            'malware',
            'fake',
            'verify',
            'confirm',
            'urgent',
            'secure',
            'bank',
            'paypal',
            'amazon',
            'apple',
            'microsoft'
        ];
        
        this.suspiciousTLDs = ['tk', 'ml', 'ga', 'cf'];
    }

    /**
     * Analyze a URL for phishing indicators
     * @param {string} url - The URL to analyze
     * @returns {object} - Analysis result object
     */
    analyze(url) {
        const analysis = {
            url: url,
            isPhishing: false,
            confidence: 0,
            indicators: [],
            suspiciousElements: []
        };

        try {
            const urlObj = new URL(url);
            
            // Check domain age (simulated - will be enhanced with ML)
            this.checkDomain(urlObj, analysis);
            
            // Check for suspicious patterns
            this.checkSuspiciousPatterns(url, analysis);
            
            // Check HTTPS and certificate
            this.checkSSL(urlObj, analysis);
            
            // Check URL length (very long URLs are often phishing)
            this.checkURLLength(url, analysis);
            
            // Update confidence based on indicators
            this.calculateConfidence(analysis);
            
        } catch (error) {
            analysis.error = 'Invalid URL format';
            analysis.isPhishing = false;
        }

        return analysis;
    }

    /**
     * Check domain-related indicators
     */
    checkDomain(urlObj, analysis) {
        const domain = urlObj.hostname;
        
        // Check for IP address instead of domain
        if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
            analysis.suspiciousElements.push('Uses IP address instead of domain');
            analysis.indicators.push(0.8);
        }

        // Check TLD
        const tld = domain.split('.').pop();
        if (this.suspiciousTLDs.includes(tld)) {
            analysis.suspiciousElements.push(`Suspicious TLD: .${tld}`);
            analysis.indicators.push(0.6);
        }

        // Check for subdomain count
        const parts = domain.split('.');
        if (parts.length > 3) {
            analysis.suspiciousElements.push('Multiple subdomains');
            analysis.indicators.push(0.3);
        }
    }

    /**
     * Check for suspicious keywords in URL
     */
    checkSuspiciousPatterns(url, analysis) {
        const urlLower = url.toLowerCase();
        
        this.suspiciousPatterns.forEach(pattern => {
            if (urlLower.includes(pattern)) {
                analysis.suspiciousElements.push(`Contains keyword: "${pattern}"`);
                analysis.indicators.push(0.4);
            }
        });
    }

    /**
     * Check SSL/HTTPS usage
     */
    checkSSL(urlObj, analysis) {
        if (urlObj.protocol !== 'https:') {
            analysis.suspiciousElements.push('Does not use HTTPS');
            analysis.indicators.push(0.5);
        }
    }

    /**
     * Check URL length (longer URLs are often suspicious)
     */
    checkURLLength(url, analysis) {
        if (url.length > 75) {
            analysis.suspiciousElements.push('Unusually long URL');
            analysis.indicators.push(0.3);
        }
    }

    /**
     * Calculate overall confidence score
     */
    calculateConfidence(analysis) {
        if (analysis.indicators.length === 0) {
            analysis.isPhishing = false;
            analysis.confidence = 95;
        } else {
            const avgScore = analysis.indicators.reduce((a, b) => a + b, 0) / analysis.indicators.length;
            analysis.confidence = Math.round(avgScore * 100);
            analysis.isPhishing = avgScore > 0.5;
        }
    }

    /**
     * Validate URL format
     */
    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Extract domain from URL
     */
    static getDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = URLDetector;
}
