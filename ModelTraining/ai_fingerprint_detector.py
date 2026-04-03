"""
AI-Generated Phishing Pattern Detection v2
Uses spaCy NLP, linguistic analysis, and pattern matching for accurate detection.
"""

import re
import math
import warnings
warnings.filterwarnings('ignore')

try:
    import spacy
    NLP_MODEL = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except (ImportError, OSError):
    SPACY_AVAILABLE = False
    print("⚠️  Warning: spaCy model not loaded. Install with: python -m spacy download en_core_web_sm")

from textblob import TextBlob
from collections import Counter


# ════════════════════════════════════════════════════════════════════════════
# 1. TEXT PREPROCESSING
# ════════════════════════════════════════════════════════════════════════════

def clean_for_analysis(text):
    """Removes URLs and collapses whitespace for cleaner NLP analysis."""
    text = re.sub(r'http\S+|www\.\S+', '', text)
    return re.sub(r'\s+', ' ', text).strip()


# ════════════════════════════════════════════════════════════════════════════
# 2. STATISTICAL METRICS
# ════════════════════════════════════════════════════════════════════════════

def calculate_entropy(text):
    """
    Calculates vocabulary entropy (measure of word diversity).
    Lower entropy = more repetitive/predictable vocabulary (AI signature).
    """
    cleaned = clean_for_analysis(text)
    words = re.findall(r'\w+', cleaned.lower())
    if not words:
        return 0
    
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    
    num_words = len(words)
    entropy = 0
    for count in freq.values():
        p = count / num_words
        if p > 0:
            entropy -= p * math.log2(p)
    
    return entropy


def calculate_burstiness(text):
    """
    Calculates sentence length variation (Coefficient of Variation).
    Lower CV = consistent sentence structure (AI trademark).
    """
    cleaned_text = re.sub(r'http\S+|www\.\S+', 'URLTOKEN', text)
    sentences = re.split(r'(?<=[.!?])\s+', cleaned_text)
    sentences = [s.strip() for s in sentences if len(s.strip().split()) > 2]
    
    if len(sentences) < 2:
        return 0.5
    
    lengths = [len(s.split()) for s in sentences]
    mean_length = sum(lengths) / len(lengths)
    
    if mean_length == 0:
        return 0
        
    variance = sum((l - mean_length) ** 2 for l in lengths) / len(lengths)
    std_dev = math.sqrt(variance)
    cv = std_dev / mean_length
    
    return cv


def calculate_punctuation_score(text):
    """
    Analyzes punctuation patterns.
    AI text often has exaggerated or minimal punctuation.
    """
    total_chars = len(text)
    if total_chars == 0:
        return 0
    
    excitement = text.count('!') + text.count('?')
    ellipsis = text.count('...')
    dashes = text.count('—') + text.count('--')
    
    # Natural text has ~5-15% punctuation
    punctuation_ratio = (excitement + ellipsis * 3 + dashes) / total_chars * 100
    
    score = 0
    if punctuation_ratio < 2 and len(text.split()) > 20:  # Too formal
        score += 15
    elif punctuation_ratio > 20:  # Overly excited
        score += 10
    
    return score


# ════════════════════════════════════════════════════════════════════════════
# 3. SPACY NLP ANALYSIS
# ════════════════════════════════════════════════════════════════════════════

def analyze_sentence_structure(text):
    """
    Uses spaCy to analyze:
    - Sentence complexity (dependent clauses)
    - Parallelism patterns
    - Average sentence depth
    """
    if not SPACY_AVAILABLE or not text:
        return 0, []
    
    doc = NLP_MODEL(text[:1000])  # Limit to first 1000 chars for performance
    signals = []
    score = 0
    
    sentence_complexities = []
    avg_sentence_length = 0
    
    sentences = list(doc.sents)
    if not sentences:
        return 0, []
    
    # Analyze each sentence
    for sent in sentences:
        # Count depth (nested clauses)
        depth = 0
        for token in sent:
            if token.dep_ in ['advcl', 'acl', 'relcl']:  # Dependent clauses
                depth += 1
        
        # Count POS tags for variety
        pos_tags = [token.pos_ for token in sent]
        sentence_complexities.append((len(sent), depth, len(set(pos_tags))))
    
    avg_length = sum(c[0] for c in sentence_complexities) / len(sentence_complexities)
    avg_depth = sum(c[1] for c in sentence_complexities) / len(sentence_complexities)
    avg_pos_variety = sum(c[2] for c in sentence_complexities) / len(sentence_complexities)
    
    # AI detection: Very uniform sentence structure
    lengths = [c[0] for c in sentence_complexities]
    if len(lengths) > 2:
        length_variance = sum((l - avg_length) ** 2 for l in lengths) / len(lengths)
        std_dev = math.sqrt(length_variance)
        if std_dev < avg_length * 0.2:  # Very consistent
            score += 20
            signals.append(f"[AI Pattern] Highly uniform sentence structure (std: {std_dev:.2f})")
    
    # AI detection: Low sentence complexity
    if avg_depth < 0.5 and avg_length > 10:
        score += 15
        signals.append(f"[AI Pattern] Simple sentence structure (low nested clauses: {avg_depth:.2f})")
    
    return score, signals


def detect_voice_passivity(text):
    """
    Detects passive voice prevalence.
    AI text uses more passive voice (impersonal, distant tone).
    """
    if not SPACY_AVAILABLE or not text:
        return 0, []
    
    doc = NLP_MODEL(text[:1000])
    signals = []
    score = 0
    
    passive_count = 0
    total_sentences = 0
    
    for sent in doc.sents:
        total_sentences += 1
        # Look for passive voice pattern: auxiliary verb + past participle
        for token in sent:
            if token.dep_ == "auxpass":  # auxiliary verb in passive voice
                passive_count += 1
                break
    
    if total_sentences > 0:
        passive_ratio = passive_count / total_sentences
        
        if passive_ratio > 0.6:  # More than 60% passive sentences (unusual for humans)
            score += 20
            signals.append(f"[AI Pattern] High passive voice usage ({passive_ratio:.1%})")
    
    return score, signals


def analyze_token_diversity(text):
    """
    Analyzes word repetition and token diversity.
    AI models sometimes repeat the same words/phrases too often.
    """
    if not SPACY_AVAILABLE or not text:
        return 0, []
    
    doc = NLP_MODEL(text[:1000])
    signals = []
    score = 0
    
    # Lemmatize to catch word variations
    lemmas = [token.lemma_.lower() for token in doc if not token.is_stop and token.is_alpha]
    
    if not lemmas:
        return 0, []
    
    # Calculate lexical diversity (Type-Token Ratio)
    unique_lemmas = len(set(lemmas))
    total_words = len(lemmas)
    diversity_ratio = unique_lemmas / total_words if total_words > 0 else 0
    
    # Natural text: 0.5-0.9 diversity ratio
    if diversity_ratio < 0.4 and total_words > 30:
        score += 15
        signals.append(f"[AI Pattern] Low lexical diversity (repetitive: {diversity_ratio:.2f})")
    
    # Check for specific repeated phrases
    bigrams = [(lemmas[i], lemmas[i+1]) for i in range(len(lemmas)-1)]
    bigram_freq = Counter(bigrams)
    
    if bigram_freq.most_common(1):
        top_bigram, count = bigram_freq.most_common(1)[0]
        if count > 3 and len(bigrams) > 20:
            score += 10
            signals.append(f"[AI Pattern] Repeated phrase pattern: '{' '.join(top_bigram)}' ({count}x)")
    
    return score, signals


# ════════════════════════════════════════════════════════════════════════════
# 4. SENTIMENT & TONE ANALYSIS
# ════════════════════════════════════════════════════════════════════════════

def analyze_sentiment_tone(text):
    """
    Analyzes sentiment polarity and subjectivity.
    Detects unusual emotional patterns typical of phishing/AI.
    """
    try:
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity  # -1 to 1
        subjectivity = blob.sentiment.subjectivity  # 0 to 1
    except:
        return 0, []
    
    signals = []
    score = 0
    
    # Phishing emails often have extreme polarity (very negative or positive)
    if polarity < -0.3 and subjectivity > 0.6:  # Negative + emotional
        score += 15
        signals.append(f"[Phishing Signal] Negative emotional tone (polarity: {polarity:.2f})")
    
    elif polarity > 0.5 and subjectivity < 0.3:  # Positive but impersonal (AI-like)
        score += 10
        signals.append(f"[AI Pattern] Optimistic but impersonal (polarity: {polarity:.2f})")
    
    return score, signals


# ════════════════════════════════════════════════════════════════════════════
# 5. KEYWORD & PHISHING MARKERS
# ════════════════════════════════════════════════════════════════════════════

def detect_phishing_keywords(text):
    """
    Detects common phishing + AI markers.
    """
    text_lower = text.lower()
    signals = []
    score = 0
    
    # Urgency markers
    urgency_markers = [
        "immediate action", "urgent", "act now", "limited time",
        "expire", "verify", "confirm", "update immediately",
        "critical", "alert", "warning", "suspension"
    ]
    
    # Formal/AI markers
    ai_markers = [
        "furthermore", "moreover", "subsequently", "consequently", "nevertheless",
        "in addition", "as a result", "in order to", "along with this",
        "firstly", "secondly", "to summarize", "overall", "specifically",
        "we kindly request", "kindly proceed", "please note that",
        "thank you for your cooperation", "is highly appreciated",
        "it is imperative", "secure your account", "verify your identity"
    ]
    
    # Authority/Impersonation markers
    authority_markers = [
        "on behalf of", "from the team of", "our system", "our records",
        "administrator", "compliance", "policy update", "security team"
    ]
    
    urgency_count = sum(text_lower.count(m) for m in urgency_markers)
    ai_count = sum(text_lower.count(m) for m in ai_markers)
    authority_count = sum(text_lower.count(m) for m in authority_markers)
    
    if urgency_count > 2:
        score += min(urgency_count * 10, 25)
        signals.append(f"[Phishing Signal] High urgency markers ({urgency_count})")
    
    if ai_count > 2:
        score += min(ai_count * 8, 25)
        signals.append(f"[AI Pattern] Formal AI-style phrases ({ai_count})")
    
    if authority_count > 1:
        score += min(authority_count * 12, 20)
        signals.append(f"[Phishing Signal] Authority impersonation markers ({authority_count})")
    
    return score, signals


# ════════════════════════════════════════════════════════════════════════════
# 6. CONTRACTION & FORMALITY ANALYSIS
# ════════════════════════════════════════════════════════════════════════════

def analyze_formality(text):
    """
    Detects lack of contractions and over-formality (AI signature).
    """
    signals = []
    score = 0
    text_lower = text.lower()
    
    contractions = ["don't", "can't", "won't", "isn't", "aren't", "it's", 
                   "you're", "i'm", "we're", "they're", "haven't", "doesn't"]
    full_forms = ["do not", "cannot", "will not", "is not", "are not", 
                 "it is", "you are", "i am", "we are", "they are"]
    
    contraction_count = sum(text_lower.count(c) for c in contractions)
    full_form_count = sum(text_lower.count(f) for f in full_forms)
    
    # AI detection: No contractions + many full forms
    if full_form_count >= 3 and contraction_count == 0 and len(text.split()) > 30:
        score += 20
        signals.append(f"[AI Pattern] No contractions with {full_form_count} formal phrases")
    elif contraction_count == 0 and len(text.split()) > 50:
        score += 10
        signals.append("[AI Pattern] Complete absence of contractions (over-formal)")
    
    return score, signals


# ════════════════════════════════════════════════════════════════════════════
# 7. MAIN ANALYSIS FUNCTION
# ════════════════════════════════════════════════════════════════════════════

def analyze_ai_fingerprint(text):
    """
    Master analysis function combining all detection methods.
    Returns: {
        'ai_score': 0-100,
        'phishing_score': 0-100,
        'combined_risk': 0-100,
        'signals': [list of detected patterns],
        'analysis': {detailed breakdown}
    }
    """
    if not text or len(text.split()) < 5:
        return {
            "ai_score": 0,
            "phishing_score": 0,
            "combined_risk": 0,
            "signals": ["Text too short for analysis"],
            "analysis": {}
        }
    
    signals = []
    analysis = {}
    
    # ─── Statistical Analysis ───
    entropy = calculate_entropy(text)
    entropy_score = 0
    if entropy < 4.8:
        entropy_score = 20
        signals.append(f"[AI Pattern] Low linguistic entropy ({entropy:.2f})")
    analysis['entropy'] = {'value': entropy, 'score': entropy_score}
    
    # ─── Burstiness (Sentence Consistency) ───
    cv = calculate_burstiness(text)
    burstiness_score = 0
    if cv < 0.4:
        burstiness_score = 20
        signals.append(f"[AI Pattern] Very consistent sentence lengths ({cv:.2f})")
    analysis['burstiness'] = {'value': cv, 'score': burstiness_score}
    
    # ─── Punctuation ───
    punctuation_score = calculate_punctuation_score(text)
    if punctuation_score > 0:
        signals.append(f"[AI Pattern] Unusual punctuation pattern")
    analysis['punctuation'] = {'score': punctuation_score}
    
    # ─── Sentence Structure (spaCy) ───
    structure_score, structure_signals = analyze_sentence_structure(text)
    signals.extend(structure_signals)
    analysis['sentence_structure'] = {'score': structure_score}
    
    # ─── Passive Voice ───
    passive_score, passive_signals = detect_voice_passivity(text)
    signals.extend(passive_signals)
    analysis['passivity'] = {'score': passive_score}
    
    # ─── Token Diversity ───
    diversity_score, diversity_signals = analyze_token_diversity(text)
    signals.extend(diversity_signals)
    analysis['diversity'] = {'score': diversity_score}
    
    # ─── Formality ───
    formality_score, formality_signals = analyze_formality(text)
    signals.extend(formality_signals)
    analysis['formality'] = {'score': formality_score}
    
    # ─── Sentiment ───
    sentiment_score, sentiment_signals = analyze_sentiment_tone(text)
    signals.extend(sentiment_signals)
    analysis['sentiment'] = {'score': sentiment_score}
    
    # ─── Phishing Keywords ───
    phishing_score, phishing_signals = detect_phishing_keywords(text)
    signals.extend(phishing_signals)
    analysis['phishing_keywords'] = {'score': phishing_score}
    
    # ─── Final Scores ───
    ai_components = [entropy_score, burstiness_score, structure_score, 
                     passive_score, diversity_score, formality_score]
    ai_score = min(sum(ai_components), 100)
    
    phishing_keywords_score = phishing_score
    combined_risk = int((ai_score * 0.4 + phishing_keywords_score * 0.6))
    
    if not signals:
        signals.append("[No Patterns] Text appears naturally written")
    
    return {
        "ai_score": ai_score,
        "phishing_score": phishing_keywords_score,
        "combined_risk": combined_risk,
        "signals": signals,
        "analysis": analysis
    }
