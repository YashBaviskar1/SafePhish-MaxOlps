import re
import math
from ai_fingerprint_detector import calculate_entropy, calculate_burstiness, detect_nlp_patterns

email_text = """
We kindly request that you verify your account information immediately to prevent any service interruption. Failure to comply may result in temporary suspension of your account.

Please click the link below to proceed with verification:
http://secure-update.xyz

We appreciate your prompt attention to this matter.

Sincerely,
Support Team
"""

entropy = calculate_entropy(email_text)
cv = calculate_burstiness(email_text)
formality_score, nlp_signals = detect_nlp_patterns(email_text)

print(f"Entropy: {entropy}")
print(f"CV: {cv}")
print(f"Formality: {formality_score}, Signals: {nlp_signals}")

sentences = re.split(r'[.!?]+', email_text)
sentences = [s.strip() for s in sentences if len(s.strip().split()) > 2]
print(f"Sentences Found (Count: {len(sentences)}): {sentences}")
for s in sentences:
    print(f"Length: {len(s.split())}, Sentence: {s}")
