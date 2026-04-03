import os
import re

# Resolve .gitignore
with open("d:/MaxOlps/.gitignore", "r", encoding="utf-8") as f:
    text = f.read()
text = re.sub(r'<<<<<<< ours.*?=======(.*?)>>>>>>> [^\n]+', r'\1', text, flags=re.DOTALL)
lines = set([l.strip() for l in text.split('\n') if l.strip() and not l.startswith('<<<<') and not l.startswith('====') and not l.startswith('>>>>')])
with open("d:/MaxOlps/.gitignore", "w", encoding="utf-8") as f:
    f.write("\n".join(sorted(lines)))

# Resolve background.js
with open("d:/MaxOlps/background.js", "r", encoding="utf-8") as f:
    bg_text = f.read()

m = re.search(r'<<<<<<< ours\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+', bg_text, re.DOTALL)
if m:
    head = m.group(1)
    inc = m.group(2)
    
    # Extract _analyzeEmailUrls from head
    analyze_urls_match = re.search(r'(// ── Helper: Analyze URLs found in email ──────────────────────────────────────\nasync function _analyzeEmailUrls.*?^})', head, re.MULTILINE | re.DOTALL)
    
    # Extract performEmailScan from head
    perform_email_match = re.search(r'(// ── ML-Powered Email Scan ─────────────────────────────────────────────────────\nasync function performEmailScan.*?^})', head, re.MULTILINE | re.DOTALL)
    
    # Extract fallback email scan from head
    fallback_email_match = re.search(r'(/\*\* Fallback rule-based email scan.*?\*/\nfunction _fallbackEmailScan.*?^})', head, re.MULTILINE | re.DOTALL)
    
    # Now in inc, replace the performEmailScan and fallbackEmailScan
    inc_mod = re.sub(r'// ── ML-Powered Email Scan ─────────────────────────────────────────────────────\nasync function performEmailScan.*?^}', perform_email_match.group(1).replace('\\', '\\\\'), inc, flags=re.MULTILINE | re.DOTALL)
    if fallback_email_match:
        inc_mod = re.sub(r'/\*\* Fallback rule-based email scan.*?\*/\nfunction _fallbackEmailScan.*?^}', fallback_email_match.group(1).replace('\\', '\\\\'), inc_mod, flags=re.MULTILINE | re.DOTALL)
    
    # Insert analyze_urls_match right before performEmailScan
    if analyze_urls_match:
        inc_mod = inc_mod.replace('// ── ML-Powered Email Scan ─────────────────────────────────────────────────────\nasync function performEmailScan', analyze_urls_match.group(1).replace('\\', '\\\\') + '\n\n// ── ML-Powered Email Scan ─────────────────────────────────────────────────────\nasync function performEmailScan')

    bg_text = bg_text[:m.start()] + inc_mod + bg_text[m.end():]
    with open("d:/MaxOlps/background.js", "w", encoding="utf-8") as f:
        f.write(bg_text)


# Resolve popup.js
with open("d:/MaxOlps/popup.js", "r", encoding="utf-8") as f:
    popup_text = f.read()

m = re.search(r'<<<<<<< ours\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+', popup_text, re.DOTALL)
if m:
    head = m.group(1)
    inc = m.group(2)
    
    # Let's extract deceptive scan additions:
    # 1. ── Wire up both Scan Page buttons ── in DOMContentLoaded
    wire_up_match = re.search(r'(// ── Wire up both Scan Page buttons ──.*?}\);)', head, re.MULTILINE | re.DOTALL)
    
    # 2. Deceptive Scan full block
    deceptive_scan_match = re.search(r'(// ── Scan Page: detect hidden/deceptive clickable elements ──────────────────.*?^})', head, re.MULTILINE | re.DOTALL)
    
    # Merge them into inc
    inc_mod = inc
    if wire_up_match:
        # replace the end of DOMContentLoaded
        inc_mod = re.sub(r'        } else {\n            // Not an email platform — scan the current page URL\n            scanUrl\(\);\n        }\n    }\);\n', 
                         r'        } else {\n            // Not an email platform — scan the current page URL\n            scanUrl();\n        }\n    });\n\n    ' + wire_up_match.group(1).replace('\\', '\\\\') + '\n', 
                         inc_mod)
                         
    if deceptive_scan_match:
        # Insert before URL Scanner
        inc_mod = inc_mod.replace('// URL Scanner', deceptive_scan_match.group(1).replace('\\', '\\\\') + '\n\n// URL Scanner')

    display_url_res_match = re.search(r'(function displayUrlResult.*?Result Display Functions.*?function displayUrlResult\(result\) \{.*?\n\})', head, re.MULTILINE | re.DOTALL)
    if not display_url_res_match:
        display_url_res_match = re.search(r'(function displayUrlResult\(result\) \{.*?\n\})', head, re.MULTILINE | re.DOTALL)
        
    if display_url_res_match:
        inc_mod = re.sub(r'function displayUrlResult\(result\) \{.*?^\}', display_url_res_match.group(1).replace('\\', '\\\\'), inc_mod, flags=re.MULTILINE | re.DOTALL)

    display_email_res_match = re.search(r'(function displayEmailResult\(result\) \{.*?^\})', head, re.MULTILINE | re.DOTALL)
    if display_email_res_match:
        inc_mod = re.sub(r'function displayEmailResult\(result\) \{.*?^\}', display_email_res_match.group(1).replace('\\', '\\\\'), inc_mod, flags=re.MULTILINE | re.DOTALL)
        
    popup_text = popup_text[:m.start()] + inc_mod + popup_text[m.end():]
    with open("d:/MaxOlps/popup.js", "w", encoding="utf-8") as f:
        f.write(popup_text)

print("Merge done!")
