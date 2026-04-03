"""
SafePhish ML Server
Serves predictions from trained XGBoost models for URL and email phishing detection,
plus layered attachment analysis (Docker sandbox + VirusTotal).
Run with: python server.py
Listens on http://localhost:5000
"""

import os
import hashlib
import json
import pickle
import platform
import subprocess
import tempfile
import traceback
import time
import numpy as np
import requests as http_requests
import re
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

from feature_extractor import FeatureExtraction
from context_engine import analyze_context
from behavior_engine import analyze_behavior
from ai_fingerprint_detector import analyze_ai_fingerprint

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

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

# ─── SHAP Explainer Initialization ──────────────────────────────────────────
import shap
explainer = shap.TreeExplainer(url_model)

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

        # SHAP values computation
        shap_values = explainer.shap_values(X)
        # For binary classification, shap_values is list OR array depending on version
        if isinstance(shap_values, list):
            shap_vals = shap_values[1][0]  # phishing class
        else:
            shap_vals = shap_values[0]
        # Map feature → shap value
        feature_contributions = {
            URL_FEATURE_ORDER[i]: float(shap_vals[i])
            for i in range(len(URL_FEATURE_ORDER))
        }
        # Sort by absolute importance
        sorted_contributions = sorted(
            feature_contributions.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        )

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
            "features": features,
            "shap": {
                "values": feature_contributions,
                "topFeatures": sorted_contributions[:5]
            }
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def clean_email_text(text):
    """
    Clean raw email body text to match training data preprocessing:
    - Lowercase
    - Strip HTML tags
    - Remove URLs (replaced by urltoken)
    - Remove email addresses (replaced by emailtoken)
    - Collapse whitespace
    - Drop very short / empty results
    """
    if not isinstance(text, str) or text.strip() == '':
        return ''
    text = text.lower()
    text = re.sub(r'<[^>]+>', ' ', text)          # strip HTML tags
    text = re.sub(r'http\S+|www\.\S+', ' urltoken ', text)  # replace URLs
    text = re.sub(r'\S+@\S+', ' emailtoken ', text)          # replace emails
    text = re.sub(r'[^a-z0-9\s]', ' ', text)     # keep only alphanumeric
    text = re.sub(r'\s+', ' ', text).strip()      # collapse whitespace
    return text


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

        # Combine subject and body
        combined = f"{subject} {body}".strip()
        
        # CLEAN email text (CRITICAL: must match training preprocessing)
        cleaned = clean_email_text(combined)

        if not cleaned:
            return jsonify({
                "isPhishing": False,
                "confidence": 0.0,
                "phishingProbability": 0.0,
                "label": "LEGITIMATE",
                "note": "Empty email content after cleaning"
            })

        # The pkl is a Pipeline with TfidfVectorizer + XGBoost
        proba = email_model.predict_proba([cleaned])[0]
        pred  = int(email_model.predict([cleaned])[0])

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


# ── Attachment Analysis (Defense-in-Depth) ─────────────────────────────────────

VT_API_KEY = os.environ.get("VT_API_KEY", "")
VT_BASE = "https://www.virustotal.com/api/v3"
SANDBOX_IMAGE = "safephish-sandbox"


def _sha256(filepath):
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _run_docker_sandbox(filepath, filename):
    """
    Layer 1 — Spin up an ephemeral Docker container for static triage.
    Uses `wsl docker` on Windows, or plain `docker` on Linux.
    """
    try:
        is_windows = platform.system() == "Windows"

        # Convert Windows path to WSL path if needed
        if is_windows:
            # e.g. D:\temp\file.pdf → /mnt/d/temp/file.pdf
            wsl_path = filepath.replace("\\", "/")
            if len(wsl_path) >= 2 and wsl_path[1] == ":":
                drive = wsl_path[0].lower()
                wsl_path = f"/mnt/{drive}{wsl_path[2:]}"
            mount_src = wsl_path
        else:
            mount_src = filepath

        # Build the docker command
        docker_cmd = [
            "docker", "run", "--rm", "--network=none",
            "-v", f"{mount_src}:/sandbox/input/{filename}:ro",
            SANDBOX_IMAGE, filename
        ]

        if is_windows:
            cmd = ["wsl"] + docker_cmd
        else:
            cmd = docker_cmd

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=60
        )

        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout.strip())
        else:
            return {
                "error": f"Sandbox exited with code {result.returncode}",
                "stderr": result.stderr[:500] if result.stderr else "",
                "riskScore": 0,
                "findings": ["Sandbox analysis failed"],
                "hash": _sha256(filepath),
                "fileType": "unknown",
            }
    except subprocess.TimeoutExpired:
        return {"error": "Sandbox timed out", "riskScore": 0, "findings": ["Sandbox timeout"], "hash": _sha256(filepath)}
    except Exception as e:
        return {"error": str(e), "riskScore": 0, "findings": [f"Sandbox error: {e}"], "hash": _sha256(filepath)}


def _vt_hash_lookup(file_hash):
    """
    Layer 2 — Check VirusTotal by hash.
    Returns dict with detection stats or None if not found / no key.
    """
    if not VT_API_KEY:
        return {"available": False, "reason": "No VT API key configured"}

    try:
        resp = http_requests.get(
            f"{VT_BASE}/files/{file_hash}",
            headers={"x-apikey": VT_API_KEY},
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json().get("data", {}).get("attributes", {})
            stats = data.get("last_analysis_stats", {})
            malicious = stats.get("malicious", 0)
            suspicious_count = stats.get("suspicious", 0)
            total = sum(stats.values()) if stats else 0
            return {
                "available": True,
                "found": True,
                "malicious": malicious,
                "suspicious": suspicious_count,
                "total": total,
                "reputation": data.get("reputation", 0),
                "tags": data.get("tags", [])[:10],
                "popularThreatName": data.get("popular_threat_classification", {}).get("suggested_threat_label", ""),
            }
        elif resp.status_code == 404:
            return {"available": True, "found": False}
        else:
            return {"available": False, "reason": f"VT API returned {resp.status_code}"}
    except Exception as e:
        return {"available": False, "reason": str(e)}


def _vt_upload_file(filepath):
    """
    Layer 3 — Upload file to VirusTotal for detonation.
    Only called when hash is unknown AND sandbox found suspicious indicators.
    """
    if not VT_API_KEY:
        return {"available": False, "reason": "No VT API key configured"}

    try:
        with open(filepath, "rb") as f:
            resp = http_requests.post(
                f"{VT_BASE}/files",
                headers={"x-apikey": VT_API_KEY},
                files={"file": f},
                timeout=60,
            )
        if resp.status_code == 200:
            analysis_id = resp.json().get("data", {}).get("id", "")
            # Poll for results (max 30s for hackathon demo)
            for _ in range(6):
                time.sleep(5)
                poll = http_requests.get(
                    f"{VT_BASE}/analyses/{analysis_id}",
                    headers={"x-apikey": VT_API_KEY},
                    timeout=15,
                )
                if poll.status_code == 200:
                    status = poll.json().get("data", {}).get("attributes", {}).get("status")
                    if status == "completed":
                        stats = poll.json()["data"]["attributes"].get("stats", {})
                        return {
                            "available": True,
                            "completed": True,
                            "malicious": stats.get("malicious", 0),
                            "suspicious": stats.get("suspicious", 0),
                            "total": sum(stats.values()) if stats else 0,
                        }
            return {"available": True, "completed": False, "reason": "Analysis still pending"}
        else:
            return {"available": False, "reason": f"Upload returned {resp.status_code}"}
    except Exception as e:
        return {"available": False, "reason": str(e)}


def _combine_scores(sandbox_result, vt_hash, vt_detonation):
    """Combine all layer results into a unified risk score (0-100) with findings."""
    score = 0
    findings = []

    # Layer 1 — Sandbox
    sandbox_score = sandbox_result.get("riskScore", 0)
    sandbox_findings = sandbox_result.get("findings", [])
    score += sandbox_score * 0.4  # 40% weight
    findings.extend([f"[Sandbox] {f}" for f in sandbox_findings])

    # Layer 2 — VT Hash
    if vt_hash.get("found"):
        malicious = vt_hash.get("malicious", 0)
        total = vt_hash.get("total", 1)
        vt_ratio = (malicious / max(total, 1)) * 100
        score += vt_ratio * 0.5  # 50% weight
        threat = vt_hash.get("popularThreatName", "")
        if malicious > 0:
            findings.append(f"[VirusTotal] {malicious}/{total} vendors flagged as malicious")
            if threat:
                findings.append(f"[VirusTotal] Threat: {threat}")
        else:
            findings.append(f"[VirusTotal] 0/{total} vendors flagged — clean hash")
    elif vt_hash.get("available") and not vt_hash.get("found"):
        # Unknown file — slightly suspicious if sandbox also flagged it
        if sandbox_score > 20:
            score += 10
            findings.append("[VirusTotal] Hash unknown — file not previously seen (novel threat)")
        else:
            findings.append("[VirusTotal] Hash not in database")

    # Layer 3 — VT Detonation
    if vt_detonation:
        if vt_detonation.get("completed"):
            det_malicious = vt_detonation.get("malicious", 0)
            det_total = vt_detonation.get("total", 1)
            det_ratio = (det_malicious / max(det_total, 1)) * 100
            score += det_ratio * 0.1  # 10% weight
            if det_malicious > 0:
                findings.append(f"[VT Detonation] {det_malicious}/{det_total} vendors flagged after sandbox analysis")
            else:
                findings.append(f"[VT Detonation] Clean after dynamic analysis")
        elif vt_detonation.get("available"):
            findings.append("[VT Detonation] Analysis still in progress")

    final_score = min(round(score), 100)
    return final_score, findings


@app.route("/analyze/attachment", methods=["POST"])
def analyze_attachment():
    """
    Layered attachment analysis:
      Layer 1: Docker sandbox (static triage)
      Layer 2: VirusTotal hash lookup
      Layer 3: VirusTotal detonation (if needed)
    Expects multipart/form-data with a 'file' field.
    """
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        uploaded = request.files["file"]
        filename = uploaded.filename or "unknown_file"

        # Save to temp file
        tmp_dir = tempfile.mkdtemp(prefix="safephish_")
        tmp_path = os.path.join(tmp_dir, filename)
        uploaded.save(tmp_path)

        print(f"\n📎 Analyzing attachment: {filename} ({os.path.getsize(tmp_path)} bytes)")

        # Check if VT should be skipped (dev mode / API conservation)
        skip_vt = request.form.get("skip_vt", "0") == "1"
        if skip_vt:
            print("  ℹ️  VT layers disabled (sandbox-only mode)")

        # Layer 1 — Docker Sandbox
        print("  ⏳ Layer 1: Docker Sandbox...")
        sandbox_result = _run_docker_sandbox(tmp_path, filename)
        file_hash = sandbox_result.get("hash", _sha256(tmp_path))
        print(f"  ✅ Layer 1 done — sandbox risk: {sandbox_result.get('riskScore', '?')}")

        # Layer 2 — VirusTotal Hash Lookup (skip if disabled)
        vt_hash = {"available": False, "reason": "VT disabled (sandbox-only mode)"}
        if not skip_vt:
            print("  ⏳ Layer 2: VirusTotal Hash Lookup...")
            vt_hash = _vt_hash_lookup(file_hash)
            print(f"  ✅ Layer 2 done — found: {vt_hash.get('found', 'N/A')}")
        else:
            print("  ⏭️  Layer 2: Skipped (VT disabled)")

        # Layer 3 — VT Detonation (conditional, skip if disabled)
        vt_detonation = None
        sandbox_score = sandbox_result.get("riskScore", 0)
        hash_found = vt_hash.get("found", False)
        vt_malicious = vt_hash.get("malicious", 0) if hash_found else 0

        if not skip_vt and ((not hash_found and sandbox_score > 15) or (hash_found and vt_malicious > 5)):
            print("  ⏳ Layer 3: VirusTotal Detonation...")
            vt_detonation = _vt_upload_file(tmp_path)
            print(f"  ✅ Layer 3 done")
        else:
            print("  ⏭️  Layer 3: Skipped (not needed or VT disabled)")

        # Combine all layers
        final_score, all_findings = _combine_scores(sandbox_result, vt_hash, vt_detonation)

        is_malicious = final_score >= 40

        # Cleanup temp file
        try:
            os.remove(tmp_path)
            os.rmdir(tmp_dir)
        except OSError:
            pass

        return jsonify({
            "filename": filename,
            "hash": file_hash,
            "fileType": sandbox_result.get("fileType", "unknown"),
            "fileSize": sandbox_result.get("size", 0),
            "isMalicious": is_malicious,
            "riskScore": final_score,
            "label": "MALICIOUS" if is_malicious else "CLEAN",
            "findings": all_findings,
            "layers": {
                "sandbox": {
                    "riskScore": sandbox_result.get("riskScore", 0),
                    "fileType": sandbox_result.get("fileType", "unknown"),
                    "metadata": sandbox_result.get("metadata", {}),
                    "macros": sandbox_result.get("macros", {}),
                    "pdfAnalysis": sandbox_result.get("pdfAnalysis", {}),
                    "yaraMatches": sandbox_result.get("yaraMatches", []),
                    "findings": sandbox_result.get("findings", []),
                },
                "virusTotalHash": vt_hash,
                "virusTotalDetonation": vt_detonation,
            },
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/analyze/email_full", methods=["POST"])
def analyze_email_full():
    """
    Unified Email Risk Engine: Fuses ML text classification with Contextual Analysis.
    Expects JSON body: { "sender_email": str, "subject": str, "body": str, "urls": list }
    """
    try:
        data = request.get_json(force=True)
        sender_email = data.get("sender_email", "")
        subject = data.get("subject", "")
        body = data.get("body", "")
        urls = data.get("urls", [])
        
        # Accept optional pre-computed external scores (for 5-engine master calculation)
        incoming_url_score = data.get("url_score", 0)
        incoming_attachment_score = data.get("attachment_score", 0)
        enable_ai_detection = data.get("enable_ai_detection", False)
        
        print(f"\n📢 [New Engine] Analyzing email with enable_ai_detection={enable_ai_detection}", flush=True)

        # --- STAGE 1: ML Content Analysis (TF-IDF + XGBoost) ---
        combined_text = f"{subject} {body}".strip()
        cleaned_text = clean_email_text(combined_text)
        
        # Default to 0 if text is empty
        ml_risk_score = 0
        if cleaned_text:
            proba = email_model.predict_proba([cleaned_text])[0]
            classes = list(email_model.classes_)
            phish_idx = classes.index(1) if 1 in classes else 0
            ml_phish_prob = float(proba[phish_idx])
            ml_risk_score = ml_phish_prob * 100

        # --- STAGE 2: Contextual Analysis ---
        context_result = analyze_context(sender_email, subject, body, urls)
        context_score = context_result["context_score"]
        context_signals = context_result["signals"]

        # --- STAGE 3: Behavioral Analysis ---
        behavior_result = analyze_behavior(subject, body, urls)
        behavior_score = behavior_result["behavior_score"]
        behavior_signals = behavior_result["signals"]

        # --- STAGE 3.5: AI Fingerprint Detection (NEW) ---
        ai_score = 0
        ai_signals = []
        if enable_ai_detection:
            ai_result = analyze_ai_fingerprint(body)
            ai_score = ai_result["ai_score"]
            ai_signals = ai_result["signals"]
            print(f"   🤖 AI Engine Score: {ai_score}/100", flush=True)
            if ai_signals:
                print(f"   🤖 AI Signals: {ai_signals}", flush=True)

        # --- STAGE 4: The Master Risk Fusion Engine (5 Engines) ---
        # Weights: Email ML (30%), URL ML (25%), Context (15%), Behavior (20%), Attachment (10%)
        # If no attachment is provided, rebalance smoothly.
        if incoming_attachment_score > 0:
            final_risk_score = (ml_risk_score * 0.25) + (incoming_url_score * 0.20) + (context_score * 0.15) + (behavior_score * 0.20) + (incoming_attachment_score * 0.10) + (ai_score * 0.10)
        else:
            final_risk_score = (ml_risk_score * 0.30) + (incoming_url_score * 0.25) + (context_score * 0.15) + (behavior_score * 0.20) + (ai_score * 0.10)
            
        # Cap at 100 and round it cleanly
        final_risk_score = min(round(final_risk_score), 100)
        is_phishing = final_risk_score >= 50

        # --- STAGE 5: Explainability (Gathering Findings) ---
        all_findings = []
        
        # Translate the ML score into human-readable English
        if ml_risk_score >= 75:
            all_findings.append(f"Text matches known phishing templates (ML Confidence: {round(ml_risk_score)}%)")
        elif ml_risk_score <= 25:
            all_findings.append("Text structure appears normal and safe")
            
        # Add the contextual and behavioral signals (skipping default "No..." strings if needed, though they provide good feedback)
        # We'll just extend everything to ensure explainability is high.
        all_findings.extend([sig for sig in context_signals if "No" not in sig])
        all_findings.extend([sig for sig in behavior_signals if "No" not in sig])
        all_findings.extend([sig for sig in ai_signals if "No" not in sig])
        
        # If no flags were raised at all
        if not all_findings:
            all_findings.append("No malicious indicators detected across content, context, or behavior.")

        return jsonify({
            "isPhishing": is_phishing,
            "riskScore": final_risk_score,
            "label": "PHISHING" if is_phishing else "LEGITIMATE",
            "findings": all_findings,
            "components": {
                "mlContentScore": round(ml_risk_score, 1),
                "urlScore": incoming_url_score,
                "contextScore": context_score,
                "behaviorScore": behavior_score,
                "attachmentScore": incoming_attachment_score,
                "aiFingerprintScore": ai_score
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("\n🚀 SafePhish ML Server [NEW ENGINE v2] running at http://localhost:5000", flush=True)
    print(f"   VT API Key: {'configured ✅' if VT_API_KEY else 'NOT SET ⚠️'}\n", flush=True)
    app.run(host="0.0.0.0", port=5000, debug=False)
