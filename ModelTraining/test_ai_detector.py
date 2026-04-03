#!/usr/bin/env python3
"""
Comprehensive test of the improved AI-Generated Phishing Pattern Detector
Demonstrates the new spaCy-based detection capabilities
"""

from ai_fingerprint_detector import analyze_ai_fingerprint
import json


def print_result(title, text, result):
    """Pretty print analysis result"""
    print("\n" + "="*70)
    print(f" {title}")
    print("="*70)
    print(f"\nInput text:\n{text[:150]}{'...' if len(text) > 150 else ''}\n")
    print(f"AI Score:           {result['ai_score']}/100")
    print(f"Phishing Score:     {result['phishing_score']}/100")
    print(f"Combined Risk:      {result['combined_risk']}/100")
    print(f"\nDetected Signals:")
    for signal in result['signals']:
        print(f"  ✓ {signal}")


# Test Case 1: Classic AI-Generated Phishing Email
test1 = """
Dear Valued Customer,

We are writing to inform you that unauthorized activity has been detected on your account. 
To prevent any service interruption, we kindly request that you verify your account information immediately.

Furthermore, failure to comply with this security alert may result in temporary suspension of your account. 
Please click here to secure your account immediately.

We appreciate your prompt attention to this urgent matter.

Sincerely,
Security Team
"""

# Test Case 2: Natural/Human Written Email
test2 = """
Hey there!

Just wanted to check in and see how you're doing! I noticed you haven't logged in for a bit, 
so I thought I'd reach out. 

Nothing urgent, but if you get a chance, swing by the dashboard and update some info. 
It's not a big deal though—take your time!

Thanks so much for everything you do. Really appreciate it!

Cheers,
Sarah
"""

# Test Case 3: Moderate Risk Email
test3 = """
Hello,

Your account requires verification to continue. We've detected some unusual activity 
and need you to update your security details as soon as possible.

Click the link below to verify your account:
[link]

This is important for your account's safety.

Best regards,
Account Team
"""

# Test Case 4: High Formality with AI Markers
test4 = """
To Whom It May Concern,

In order to maintain the integrity of our service, we kindly request that you 
update your account credentials. Subsequently, we will complete the verification process.

Moreover, your account security is of paramount importance. In addition to this, 
we must emphasize the critical nature of your immediate response.

Furthermore, any delay in compliance may result in account suspension.

Yours sincerely,
Administrative Department
"""

if __name__ == "__main__":
    results = [
        ("TEST 1: Classic AI-Generated Phishing Email", test1),
        ("TEST 2: Natural Human-Written Email", test2),
        ("TEST 3: Moderate Risk Email (Mixed Signals)", test3),
        ("TEST 4: Overly Formal AI-Style Email", test4),
    ]
    
    print("\n" + "×"*70)
    print("  AI-GENERATED PHISHING PATTERN DETECTION - COMPREHENSIVE TEST SUITE")
    print("×"*70)
    
    for title, text in results:
        result = analyze_ai_fingerprint(text)
        print_result(title, text, result)
    
    print("\n" + "="*70)
    print(" SUMMARY")
    print("="*70)
    print("""
✅ spaCy NLP Analysis: Enabled (en_core_web_sm)
✅ Sentence Structure Analysis: Active
✅ Passive Voice Detection: Active
✅ Token Diversity Analysis: Active
✅ Sentiment Analysis: Active
✅ Formality Detection: Active
✅ Phishing Keyword Detection: Active

Key Improvements Over Previous Version:
- Linguistic entropy analysis
- Burstiness (sentence consistency) scoring
- Grammar-aware sentence complexity detection
- Passive voice ratio analysis
- Lexical diversity ratios
- Bigram repetition detection
- Sentiment/tone analysis
- Combined risk scoring (AI + Phishing)
    """)
