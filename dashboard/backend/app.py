import os
import sqlite3
import json
from flask import Flask, jsonify, request
from flask_cors import CORS

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

if __name__ == "__main__":
    print(f"🚀 SafePhish Admin API running on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
