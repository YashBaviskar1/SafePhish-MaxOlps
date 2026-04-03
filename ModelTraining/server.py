"""
SafePhish ML Server
Serves predictions from trained XGBoost models for URL and email phishing detection.
Run with: python server.py
Listens on http://localhost:5000
"""

import os
import pickle
import traceback
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from feature_extractor import FeatureExtraction

app = Flask(__name__)
CORS(app)  # Allow requests from Chrome extension

# ─── Load Models ──────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

URL_MODEL_PATH   = os.path.join(BASE_DIR, "models", "url_model", "xgboost_phishing_detector.pkl")
EMAIL_MODEL_PATH = os.path.join(BASE_DIR, "email_models", "models", "email_tfidf_xgboost.pkl")

print("Loading URL model …")
with open(URL_MODEL_PATH, "rb") as f:
    url_model = pickle.load(f)
print("✅ URL model loaded")

print("Loading Email model …")
with open(EMAIL_MODEL_PATH, "rb") as f:
    email_model = pickle.load(f)
print("✅ Email model loaded")

# ─── Expected feature order for the URL model ─────────────────────────────────
# Must match the column order used during training (from the dataset notebook)
URL_FEATURE_ORDER = [
    "UsingIP",
    "LongURL",
    "ShortURL",
    "Symbol@",
    "Redirecting//",
    "PrefixSuffix-",
    "SubDomains",
    "HTTPS",
    "DomainRegLen",
    "Favicon",
    "NonStdPort",
    "HTTPSDomainURL",
    "RequestURL",
    "AnchorURL",
    "LinksInScriptTags",
    "ServerFormHandler",
    "InfoEmail",
    "AbnormalURL",
    "WebsiteForwarding",
    "StatusBarCust",
    "DisableRightClick",
    "UsingPopupWindow",
    "IframeRedirection",
    "AgeofDomain",
    "DNSRecording",
    "WebsiteTraffic",
    "PageRank",
    "GoogleIndex",
    "LinksPointingToPage",
    "StatsReport",
]

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/predict/url", methods=["POST"])
def predict_url():
    """
    Expects JSON body with the 30 URL features as a flat dict.
    Returns { isPhishing: bool, confidence: float, label: str }
    """
    try:
        data = request.get_json(force=True)
        features = data.get("features", {})
        url = data.get("url", "")
        
        if url:
            # Use the exact old extraction logic to perfectly match dataset inputs
            extractor = FeatureExtraction(url)
            feature_list = extractor.getFeaturesList()
            
            # Map the exact listed output back to the dictionary
            for idx, feature_name in enumerate(URL_FEATURE_ORDER):
                if idx < len(feature_list):
                    features[feature_name] = feature_list[idx]

        # Build feature vector in correct order, defaulting missing to 0
        vector = [features.get(f, 0) for f in URL_FEATURE_ORDER]
        X = np.array([vector], dtype=float)

        # XGBoost predict_proba: [[prob_legit, prob_phish]]
        proba = url_model.predict_proba(X)[0]
        pred  = int(url_model.predict(X)[0])

        # Model was trained with -1 = phishing, 1 = legitimate (common convention)
        # Normalise: is_phishing = True when pred == -1 (or 0 depending on encoding)
        # We check which class has the higher probability for the phishing class
        classes = list(url_model.classes_)
        # phishing class is -1 or 0; safe class is 1
        if -1 in classes:
            phish_idx = classes.index(-1)
        else:
            phish_idx = classes.index(0)

        phish_prob  = float(proba[phish_idx])
        is_phishing = phish_prob >= 0.5

        return jsonify({
            "isPhishing": is_phishing,
            "confidence": round(phish_prob * 100 if is_phishing else (1 - phish_prob) * 100, 1),
            "phishingProbability": round(phish_prob * 100, 1),
            "label": "PHISHING" if is_phishing else "LEGITIMATE",
            "features": features
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/predict/email", methods=["POST"])
def predict_email():
    """
    Expects JSON body: { subject: str, body: str }
    The email TF-IDF pipeline concatenates subject + body for classification.
    Returns { isPhishing: bool, confidence: float, label: str }
    """
    try:
        data    = request.get_json(force=True)
        subject = data.get("subject", "")
        body    = data.get("body", "")

        # Combine subject and body — mirrors training pre-processing
        combined = f"{subject} {body}".strip()

        # The pkl is a Pipeline with TfidfVectorizer + XGBoost
        proba = email_model.predict_proba([combined])[0]
        pred  = int(email_model.predict([combined])[0])

        classes = list(email_model.classes_)
        # phishing = 1, safe = 0 (typical for email dataset)
        if 1 in classes:
            phish_idx = classes.index(1)
        else:
            phish_idx = 0

        phish_prob  = float(proba[phish_idx])
        is_phishing = phish_prob >= 0.5

        return jsonify({
            "isPhishing": is_phishing,
            "confidence": round(phish_prob * 100 if is_phishing else (1 - phish_prob) * 100, 1),
            "phishingProbability": round(phish_prob * 100, 1),
            "label": "PHISHING" if is_phishing else "LEGITIMATE"
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n🚀 SafePhish ML Server running at http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
