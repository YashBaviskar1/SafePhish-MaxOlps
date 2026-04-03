import requests
from urllib.parse import urlparse
import re

# Action verbs that try to force user behavior (Social Engineering triggers)
ACTION_INTENT_KEYWORDS = [
    "click here", "login", "verify", "update now", 
    "reset password", "confirm", "sign in", "open attachment",
    "validate", "authenticate"
]

# TLDs (Top Level Domains) highly associated with cheap/throwaway phishing infrastructure
SKETCHY_TLDS = [".xyz", ".top", ".pw", ".ru", ".cn", ".tk", ".ml", ".ga"]

def get_domain(url):
    """Safely extracts the domain from a full URL."""
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return ""

def trace_url_redirects(url):
    """
    Follows a URL to see if it redirects multiple times or to a sketchy final destination.
    This mimics real-time link detonation.
    Returns: (redirect_count, final_domain, is_sketchy_tld)
    """
    try:
        # We use a short 3-second timeout so the server doesn't hang on dead links.
        # We use requests.head (not GET) so we don't download giant payloads, just the headers.
        response = requests.head(url, allow_redirects=True, timeout=3)
        
        redirect_count = len(response.history)
        final_url = response.url
        final_domain = get_domain(final_url)
        
        is_sketchy = any(final_domain.endswith(tld) for tld in SKETCHY_TLDS)
        
        return redirect_count, final_domain, is_sketchy
    except requests.RequestException:
        # If the site is dead or times out, we return default safe-ish values 
        # (Dead links can't phish you)
        return 0, get_domain(url), False

def check_action_intent(text):
    """
    Checks if the email is trying to force the user to perform an action.
    """
    text_lower = text.lower()
    found_intents = []
    for keyword in ACTION_INTENT_KEYWORDS:
        if keyword in text_lower:
            found_intents.append(keyword)
    return found_intents

def analyze_behavior(subject, body, urls):
    """
    Main fusion function for Behavioral Analysis.
    Returns a dictionary with a behavior_score (0-100) and an array of findings.
    """
    score = 0
    signals = []
    combined_text = f"{subject} {body}"
    
    # 1. Action Intent Check
    intents = check_action_intent(combined_text)
    if intents:
        score += 20
        signals.append(f"[Behavior] Strong action intent detected: '{intents[0]}'")
        
    # 2. URL Volume Check
    if len(urls) > 3:
        score += 10
        signals.append(f"[Behavior] High volume of links ({len(urls)}) in a single email")
        
    # 3. Dynamic Redirect Tracing (The heavy lifter)
    sketchy_redirect_found = False
    excessive_redirect_found = False
    
    # We only trace the first 3 URLs to ensure the API responds fast to the Chrome extension
    for url in urls[:3]: 
        redirect_count, final_domain, is_sketchy = trace_url_redirects(url)
        
        # Attackers use 2+ redirects to hide the final payload from simple scanners
        if redirect_count >= 2 and not excessive_redirect_found:
            score += 35
            signals.append(f"[Behavior] Evasion detected: URL redirects {redirect_count} times before landing")
            excessive_redirect_found = True
            
        if is_sketchy and not sketchy_redirect_found:
            score += 45
            signals.append(f"[Behavior] URL ultimately redirects to a high-risk domain ending in '{final_domain[-4:]}'")
            sketchy_redirect_found = True

    # Cap the maximum behavior score at 100
    final_score = min(score, 100)
    
    # Provide a 'clean' signal if nothing was found
    if final_score == 0:
        signals.append("[Behavior] No anomalous behavior detected")

    return {
        "behavior_score": final_score,
        "signals": signals
    }

# --- Quick Test to verify it works ---
if __name__ == "__main__":
    test_urls = ["http://bit.ly/3XyZ12"] # A URL shortener that will force a redirect
    
    print("Running Behavioral Analysis Test...\n")
    result = analyze_behavior(
        "Action Required", 
        "Please click here to login to your account.", 
        test_urls
    )
    
    print(f"Behavior Score: {result['behavior_score']}/100")
    print("Signals Found:")
    for sig in result['signals']:
        print(f" - {sig}")