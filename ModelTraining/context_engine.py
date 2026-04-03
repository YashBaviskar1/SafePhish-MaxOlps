import re
import tldextract
from urllib.parse import urlparse

# A dictionary mapping brand names to their legitimate root domains.
# You can expand this list with more brands for the hackathon.
TOP_BRANDS = {
    "paypal": ["paypal.com"],
    "microsoft": ["microsoft.com", "onmicrosoft.com", "live.com", "outlook.com"],
    "google": ["google.com", "gmail.com"],
    "netflix": ["netflix.com"],
    "amazon": ["amazon.com"],
    "dhl": ["dhl.com"],
    "fedex": ["fedex.com"],
    "apple": ["apple.com", "icloud.com"],
    "bank of america": ["bankofamerica.com"],
    "chase": ["chase.com"]
}

# Contextual keywords that imply a high-risk situation
URGENCY_KEYWORDS = ["urgent", "immediately", "24 hours", "suspended", "blocked", "action required"]
FINANCIAL_KEYWORDS = ["invoice", "payment", "billing", "receipt", "transfer", "wire"]

def get_base_domain(url_or_email):
    """Extracts the base domain (e.g., 'paypal.com') from a URL or email address."""
    if not url_or_email:
        return ""
    
    # If it's an email, split at the '@'
    if "@" in url_or_email:
        url_or_email = url_or_email.split("@")[-1]
        
    extracted = tldextract.extract(url_or_email)
    
    # If it's an IP address or localhost, tldextract handles it gracefully
    if extracted.domain and extracted.suffix:
        return f"{extracted.domain}.{extracted.suffix}".lower()
    return extracted.domain.lower()

def check_brand_impersonation(sender_domain, text_content):
    """
    Checks if the email text talks about a brand, but the sender domain 
    does not belong to that brand.
    """
    text_lower = text_content.lower()
    
    for brand, legit_domains in TOP_BRANDS.items():
        if brand in text_lower:
            # The brand is mentioned. Does the sender domain match?
            if sender_domain not in legit_domains:
                return True, brand
    return False, None

def check_sender_link_mismatch(sender_domain, urls):
    """
    Checks if the links inside the email point to completely different 
    base domains than the sender's domain.
    """
    if not sender_domain or not urls:
        return False, []
        
    mismatched_domains = set()
    for url in urls:
        link_domain = get_base_domain(url)
        # Ignore common clean links or internal anchor links
        if link_domain and link_domain != sender_domain:
            mismatched_domains.add(link_domain)
            
    # If all links go to a different domain, it's highly suspicious
    if len(mismatched_domains) > 0:
        return True, list(mismatched_domains)
    
    return False, []

def analyze_context(sender_email, subject, body, extracted_urls):
    """
    Main fusion function for Contextual Analysis.
    Returns a dictionary with a context_score (0-100) and an array of findings.
    """
    score = 0
    signals = []
    
    # 1. Extract the Sender Domain
    sender_domain = get_base_domain(sender_email)
    combined_text = f"{subject} {body}"
    
    # 2. Check for Brand Impersonation
    is_impersonating, spoofed_brand = check_brand_impersonation(sender_domain, combined_text)
    if is_impersonating:
        score += 40
        signals.append(f"[Context] Impersonation: Mentions '{spoofed_brand}' but sent from '{sender_domain}'")
        
    # 3. Check for Sender vs. Link Domain Mismatch
    has_mismatch, sketchy_domains = check_sender_link_mismatch(sender_domain, extracted_urls)
    if has_mismatch:
        score += 30
        signals.append(f"[Context] Mismatch: Email from '{sender_domain}' but contains links to external domains like '{sketchy_domains[0]}'")
        
    # 4. Check for Urgency Context (Social Engineering)
    if any(word in combined_text.lower() for word in URGENCY_KEYWORDS):
        score += 15
        signals.append("[Context] High urgency language detected")
        
    # 5. Check for Financial/Credential Intent
    if any(word in combined_text.lower() for word in FINANCIAL_KEYWORDS):
        score += 15
        signals.append("[Context] Financial or billing intent detected")
        
    # Cap the maximum context score at 100
    final_score = min(score, 100)
    
    # Provide a 'clean' signal if nothing was found
    if final_score == 0:
        signals.append("[Context] No contextual anomalies detected")

    return {
        "context_score": final_score,
        "signals": signals
    }

# --- Quick Test to verify it works ---
if __name__ == "__main__":
    test_email = {
        "sender_email": "security-alert@update-account-info.xyz",
        "subject": "URGENT: Your PayPal account has been suspended",
        "body": "Dear customer, your PayPal payment failed. Please update your billing info immediately to restore access.",
        "extracted_urls": ["http://billing-update-paypal.xyz/login"]
    }
    
    print("Running Contextual Analysis Test...\n")
    result = analyze_context(
        test_email["sender_email"], 
        test_email["subject"], 
        test_email["body"], 
        test_email["extracted_urls"]
    )
    
    print(f"Context Score: {result['context_score']}/100")
    print("Signals Found:")
    for sig in result['signals']:
        print(f" - {sig}")