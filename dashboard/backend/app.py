import os
import sqlite3
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database.sqlite"))

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route("/api/scans", methods=["GET"])
def get_scans():
    """Returns a list of all analysis logs."""
    try:
        conn = get_db_connection()
        scans = conn.execute('SELECT id, scan_type, target, is_phishing, confidence, timestamp FROM analysis_logs ORDER BY timestamp DESC').fetchall()
        conn.close()
        
        result = []
        for row in scans:
            result.append(dict(row))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/scans/<int:scan_id>", methods=["GET"])
def get_scan_details(scan_id):
    """Returns the full data for a specific scan."""
    try:
        conn = get_db_connection()
        scan = conn.execute('SELECT * FROM analysis_logs WHERE id = ?', (scan_id,)).fetchone()
        conn.close()
        
        if scan is None:
            return jsonify({"error": "Scan not found"}), 404
        
        scan_dict = dict(scan)
        # Parse the JSON string back into a dictionary
        scan_dict["full_data"] = json.loads(scan_dict["full_data"])
        return jsonify(scan_dict)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Returns summary stats for the dashboard."""
    try:
        conn = get_db_connection()
        total = conn.execute('SELECT COUNT(*) FROM analysis_logs').fetchone()[0]
        phishing = conn.execute('SELECT COUNT(*) FROM analysis_logs WHERE is_phishing = 1').fetchone()[0]
        legit = total - phishing
        conn.close()
        
        return jsonify({
            "total_scans": total,
            "phishing_detected": phishing,
            "legitimate_detected": legit
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/clusters", methods=["GET"])
def get_clusters():
    """Returns clustered campaigns using TF-IDF, PCA, and KMeans."""
    try:
        conn = get_db_connection()
        scans = conn.execute('SELECT id, scan_type, target, is_phishing, confidence, timestamp, full_data FROM analysis_logs').fetchall()
        conn.close()
        
        if not scans:
            return jsonify({"clusters": []})
            
        texts = []
        meta = []
        for row in scans:
            text_features = str(row['target']) + " " + str(row['full_data'])
            texts.append(text_features)
            meta.append({
                "id": row['id'],
                "target": row['target'],
                "scan_type": row['scan_type'],
                "is_phishing": row['is_phishing'],
                "confidence": row['confidence'],
                "timestamp": row['timestamp']
            })
            
        if len(texts) < 3:
            for i, m in enumerate(meta):
                m['x'] = i * 10.0
                m['y'] = i * 10.0
                m['cluster'] = 0
            return jsonify({"clusters": meta})
            
        # Extract features
        vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        X_tfidf = vectorizer.fit_transform(texts).toarray()
        
        # Reduce to 2D for visualization
        pca = PCA(n_components=2)
        X_2d = pca.fit_transform(X_tfidf)
        
        # Cluster
        n_clusters = min(4, len(texts))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
        clusters = kmeans.fit_predict(X_tfidf)
        
        for i, m in enumerate(meta):
            m['x'] = float(X_2d[i][0])
            m['y'] = float(X_2d[i][1])
            m['cluster'] = int(clusters[i])
            
        return jsonify({"clusters": meta})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print(f"🚀 SafePhish Admin API running on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
