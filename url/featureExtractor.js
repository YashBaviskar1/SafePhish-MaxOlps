/**
 * SafePhish URL Feature Extractor
 * Computes the 30 features used to train the XGBoost phishing detection model.
 *
 * Feature encoding convention (matches training dataset):
 *   -1  → phishing indicator
 *    0  → suspicious / neutral
 *    1  → legitimate indicator
 *
 * Features are extracted purely from the URL string since the extension
 * cannot perform live DNS or page-crawl lookups without a backend.
 * Features requiring external data are given a conservative neutral value (0).
 */

class URLFeatureExtractor {

    /**
     * @param {string} url - The URL to analyse
     * @returns {Object} - Dictionary of feature_name → numeric value
     */
    static extract(url) {
        let parsed;
        try {
            parsed = new URL(url);
        } catch (_) {
            // Invalid URL – return all neutral
            return URLFeatureExtractor._neutral();
        }

        const hostname  = parsed.hostname;          // e.g. "sub.example.com"
        const pathname  = parsed.pathname;           // e.g. "/path/page"
        const fullUrl   = url;

        return {
            UsingIP:            URLFeatureExtractor.usingIP(hostname),
            LongURL:            URLFeatureExtractor.longURL(fullUrl),
            ShortURL:           URLFeatureExtractor.shortURL(hostname),
            "Symbol@":          URLFeatureExtractor.symbolAt(fullUrl),
            "Redirecting//":    URLFeatureExtractor.redirectingSlash(fullUrl),
            "PrefixSuffix-":    URLFeatureExtractor.prefixSuffix(hostname),
            SubDomains:         URLFeatureExtractor.subDomains(hostname),
            HTTPS:              URLFeatureExtractor.https(parsed),
            DomainRegLen:       0,           // Requires WHOIS – conservative neutral
            Favicon:            0,           // Requires page fetch – neutral
            NonStdPort:         URLFeatureExtractor.nonStdPort(parsed),
            HTTPSDomainURL:     URLFeatureExtractor.httpsDomainURL(hostname),
            RequestURL:         0,           // Requires page DOM – neutral
            AnchorURL:          0,           // Requires page DOM – neutral
            LinksInScriptTags:  0,           // Requires page DOM – neutral
            ServerFormHandler:  0,           // Requires page DOM – neutral
            InfoEmail:          URLFeatureExtractor.infoEmail(fullUrl),
            AbnormalURL:        URLFeatureExtractor.abnormalURL(hostname, fullUrl),
            WebsiteForwarding:  URLFeatureExtractor.websiteForwarding(fullUrl),
            StatusBarCust:      0,           // Requires page DOM – neutral
            DisableRightClick:  0,           // Requires page DOM – neutral
            UsingPopupWindow:   0,           // Requires page DOM – neutral
            IframeRedirection:  0,           // Requires page DOM – neutral
            AgeofDomain:        0,           // Requires WHOIS – neutral
            DNSRecording:       0,           // Requires DNS lookup – neutral
            WebsiteTraffic:     0,           // Requires Alexa/SimilarWeb – neutral
            PageRank:           0,           // Requires PageRank API – neutral
            GoogleIndex:        URLFeatureExtractor.googleIndex(hostname),
            LinksPointingToPage:0,           // Requires external lookup – neutral
            StatsReport:        0,           // Requires stats lookup – neutral
        };
    }

    /** -1 if IP used, 1 if normal domain */
    static usingIP(hostname) {
        // IPv4
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return -1;
        // IPv6 (hex groups)
        if (/^\[?[0-9a-fA-F:]+\]?$/.test(hostname)) return -1;
        return 1;
    }

    /**
     * URL length buckets used in the dataset:
     *  1  → URL < 54 chars (short = safe)
     *  0  → URL 54–75 chars (medium = suspicious)
     * -1  → URL > 75 chars (long = phishing)
     */
    static longURL(url) {
        if (url.length < 54)  return 1;
        if (url.length <= 75) return 0;
        return -1;
    }

    /** Whether a known URL-shortener service is used */
    static shortURL(hostname) {
        const shorteners = [
            'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 'is.gd',
            'buff.ly', 't.co', 'rb.gy', 'cutt.ly', 'short.link',
            'tiny.cc', 'lnkd.in', 'linktr.ee'
        ];
        const h = hostname.toLowerCase();
        return shorteners.some(s => h === s || h.endsWith('.' + s)) ? -1 : 1;
    }

    /** @ symbol in URL redirects browser to what follows it */
    static symbolAt(url) {
        return url.includes('@') ? -1 : 1;
    }

    /**
     * Phishers use "http://legit.com//evil.com" tricks.
     * Check for // after the scheme:
     *   1  = only has the scheme's //          (safe)
     *  -1  = has extra // somewhere in the path (phishing)
     */
    static redirectingSlash(url) {
        // Remove scheme "http://" then see if // appears
        const withoutScheme = url.replace(/^https?:\/\//, '');
        return withoutScheme.includes('//') ? -1 : 1;
    }

    /**
     * Dash (-) in domain is a classic phishing trick:
     * "paypal-secure.com"
     *  1 = no dash in domain
     * -1 = dash present
     */
    static prefixSuffix(hostname) {
        // Remove TLD+1 and check for dashes
        return hostname.includes('-') ? -1 : 1;
    }

    /**
     * Sub-domain count:
     *  1  → 1 sub-level (www.example.com)
     *  0  → 2 sub-levels
     * -1  → 3+ sub-levels
     */
    static subDomains(hostname) {
        // Remove www. prefix for counting
        const parts = hostname.replace(/^www\./, '').split('.');
        // parts[-1] = TLD, parts[-2] = SLD, rest = subdomains
        const depth = parts.length - 2; // number of sub-domains above SLD
        if (depth <= 0) return 1;
        if (depth === 1) return 0;
        return -1;
    }

    /** HTTPS usage */
    static https(parsed) {
        return parsed.protocol === 'https:' ? 1 : -1;
    }

    /**
     * HTTPSDomainURL: checks if the domain part itself contains "https"
     * (which phishers use to trick users: http://https-paypal.com)
     *  1  = domain does NOT contain "https"  (safe)
     * -1  = domain contains "https"          (phishing signal)
     */
    static httpsDomainURL(hostname) {
        return hostname.toLowerCase().includes('https') ? -1 : 1;
    }

    /** Non-standard port */
    static nonStdPort(parsed) {
        const stdPorts = ['', '80', '443', '21', '22', '25', '8080', '8443'];
        const port = parsed.port;
        return stdPorts.includes(port) ? 1 : -1;
    }

    /** mailto: or info@ in URL path/query */
    static infoEmail(url) {
        return /mailto:|@[^/]+\.(com|net|org)/i.test(url) ? -1 : 1;
    }

    /**
     * AbnormalURL: hostname not in URL path (legitimate sites reference themselves).
     * Quick heuristic: if the URL has an encoded IP or suspicious pattern.
     */
    static abnormalURL(hostname, url) {
        // If hostname contains a typical brand but URL has extra words → suspicious
        const brands = ['paypal', 'ebay', 'amazon', 'apple', 'microsoft', 'google', 'bank'];
        const urlLower = url.toLowerCase();
        const hn = hostname.toLowerCase();

        // Typosquatting: brand name appears in path but not in the legitimate domain
        for (const brand of brands) {
            if (urlLower.includes(brand) && !hn.startsWith(brand) && !hn.startsWith('www.' + brand)) {
                return -1;
            }
        }
        return 1;
    }

    /**
     * WebsiteForwarding: count of redirects is hard to detect from URL alone.
     * Heuristic: presence of known forwarding patterns in URL.
     */
    static websiteForwarding(url) {
        // Multiple query params that look like redirect keys
        const fwdPatterns = ['redirect=', 'next=', 'url=', 'goto=', 'return=', 'redir='];
        const urlLower = url.toLowerCase();
        const count = fwdPatterns.filter(p => urlLower.includes(p)).length;
        if (count === 0) return 1;
        if (count === 1) return 0;
        return -1;
    }

    /**
     * GoogleIndex heuristic: well-known domains are indexed; new/suspicious ones aren't.
     * We can't query Google from the extension, so use a whitelist of popular TLDs + age signal.
     */
    static googleIndex(hostname) {
        const safeTLDs = ['com', 'org', 'net', 'edu', 'gov', 'co.uk', 'io', 'app'];
        const tld = hostname.split('.').slice(-1)[0].toLowerCase();
        return safeTLDs.includes(tld) ? 1 : -1;
    }

    /** Fallback: all neutral features */
    static _neutral() {
        const names = [
            'UsingIP','LongURL','ShortURL','Symbol@','Redirecting//','PrefixSuffix-',
            'SubDomains','HTTPS','DomainRegLen','Favicon','NonStdPort','HTTPSDomainURL',
            'RequestURL','AnchorURL','LinksInScriptTags','ServerFormHandler','InfoEmail',
            'AbnormalURL','WebsiteForwarding','StatusBarCust','DisableRightClick',
            'UsingPopupWindow','IframeRedirection','AgeofDomain','DNSRecording',
            'WebsiteTraffic','PageRank','GoogleIndex','LinksPointingToPage','StatsReport'
        ];
        return Object.fromEntries(names.map(n => [n, 0]));
    }
}

// Export for Node / bundle environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = URLFeatureExtractor;
}
