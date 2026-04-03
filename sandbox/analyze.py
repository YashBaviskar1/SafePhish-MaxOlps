#!/usr/bin/env python3
"""
SafePhish Sandbox Static Analyzer
Runs inside a Docker container. Receives a filename (relative to /sandbox/input/)
as a CLI argument. Outputs a JSON report to stdout.
"""

import hashlib
import json
import os
import subprocess
import sys
import re


def sha256_hash(filepath):
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def get_file_type(filepath):
    """Get MIME type using `file` command."""
    try:
        result = subprocess.run(
            ["file", "--mime-type", "-b", filepath],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip()
    except Exception:
        return "unknown"


def get_exiftool_metadata(filepath):
    """Extract metadata using exiftool."""
    try:
        result = subprocess.run(
            ["exiftool", "-json", filepath],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout)
            if data and isinstance(data, list):
                meta = data[0]
                # Extract only interesting fields
                interesting = {}
                for key in ["Author", "Creator", "Producer", "Software",
                            "Company", "Title", "Subject", "CreateDate",
                            "ModifyDate", "LastModifiedBy"]:
                    if key in meta:
                        interesting[key] = str(meta[key])
                return interesting
    except Exception:
        pass
    return {}


def check_oletools(filepath):
    """Run olevba to detect VBA macros in Office documents."""
    findings = []
    has_macros = False
    try:
        result = subprocess.run(
            ["python3", "-m", "oletools.olevba", "--json", filepath],
            capture_output=True, text=True, timeout=30
        )
        output = result.stdout.strip()
        if output:
            data = json.loads(output)
            # olevba JSON output structure
            for entry in data:
                if isinstance(entry, dict):
                    if entry.get("type") == "AutoExec":
                        has_macros = True
                        findings.append(f"Auto-executing macro: {entry.get('keyword', 'unknown')}")
                    elif entry.get("type") == "Suspicious":
                        has_macros = True
                        findings.append(f"Suspicious macro keyword: {entry.get('keyword', 'unknown')}")
                    elif entry.get("type") == "IOC":
                        has_macros = True
                        findings.append(f"Indicator of Compromise: {entry.get('value', 'unknown')}")
    except (json.JSONDecodeError, Exception):
        # Try plain text mode as fallback
        try:
            result = subprocess.run(
                ["python3", "-m", "oletools.olevba", filepath],
                capture_output=True, text=True, timeout=30
            )
            text = result.stdout.lower()
            if "vba macros found" in text or "autoexec" in text:
                has_macros = True
                findings.append("VBA macros detected in document")
            if "suspicious" in text:
                findings.append("Suspicious VBA patterns detected")
        except Exception:
            pass

    return {"hasMacros": has_macros, "findings": findings}


def check_pdf(filepath, mime_type):
    """Analyze PDF files for suspicious elements."""
    findings = []
    suspicious = False

    if "pdf" not in mime_type.lower():
        return {"suspicious": False, "findings": []}

    try:
        with open(filepath, "rb") as f:
            content = f.read(50000).decode("latin-1", errors="ignore")

        # Check for suspicious PDF elements
        checks = [
            ("/JavaScript", "PDF contains embedded JavaScript"),
            ("/JS", "PDF contains JS action"),
            ("/OpenAction", "PDF has auto-open action"),
            ("/Launch", "PDF has launch action (can execute programs)"),
            ("/EmbeddedFile", "PDF contains embedded files"),
            ("/RichMedia", "PDF contains rich media"),
            ("/XFA", "PDF contains XFA forms (potential exploit vector)"),
            ("/URI", "PDF contains URI references"),
            ("/SubmitForm", "PDF has form submission action"),
            ("/AcroForm", "PDF contains interactive AcroForm"),
        ]

        for pattern, description in checks:
            if pattern in content:
                suspicious = True
                findings.append(description)

    except Exception as e:
        findings.append(f"PDF analysis error: {str(e)}")

    return {"suspicious": suspicious, "findings": findings}


def run_yara(filepath):
    """Run YARA rules against the file."""
    matches = []
    try:
        rules_path = "/sandbox/rules.yar"
        if os.path.exists(rules_path):
            result = subprocess.run(
                ["yara", "-s", rules_path, filepath],
                capture_output=True, text=True, timeout=15
            )
            if result.stdout.strip():
                for line in result.stdout.strip().split("\n"):
                    # YARA output: RuleName filepath
                    parts = line.split(" ", 1)
                    if parts:
                        rule_name = parts[0].strip()
                        if rule_name and not rule_name.startswith("0x"):
                            matches.append(rule_name)
                # Deduplicate
                matches = list(set(matches))
    except Exception:
        pass
    return matches


def calculate_risk_score(mime_type, macro_result, pdf_result, yara_matches):
    """Calculate a 0-100 risk score based on all findings."""
    score = 0

    # Dangerous file types
    dangerous_types = [
        "application/x-executable", "application/x-msdos-program",
        "application/x-dosexec", "application/x-msdownload",
        "application/vnd.microsoft.portable-executable",
        "application/x-shellscript", "text/x-shellscript",
    ]
    risky_types = [
        "application/zip", "application/x-rar",
        "application/x-7z-compressed", "application/java-archive",
    ]

    if any(dt in mime_type for dt in dangerous_types):
        score += 60
    elif any(rt in mime_type for rt in risky_types):
        score += 20

    # Macro findings
    if macro_result["hasMacros"]:
        score += 30
        score += min(len(macro_result["findings"]) * 5, 20)

    # PDF findings
    if pdf_result["suspicious"]:
        score += 15
        score += min(len(pdf_result["findings"]) * 5, 25)

    # YARA matches
    for match in yara_matches:
        if "Executable" in match or "PowerShell" in match:
            score += 25
        elif "VBA" in match or "Macro" in match:
            score += 20
        elif "Obfuscation" in match:
            score += 15
        else:
            score += 10

    return min(score, 100)


def analyze(filepath):
    """Main analysis function."""
    if not os.path.exists(filepath):
        return {"error": f"File not found: {filepath}"}

    file_size = os.path.getsize(filepath)
    file_hash = sha256_hash(filepath)
    mime_type = get_file_type(filepath)
    metadata = get_exiftool_metadata(filepath)
    macro_result = check_oletools(filepath)
    pdf_result = check_pdf(filepath, mime_type)
    yara_matches = run_yara(filepath)

    risk_score = calculate_risk_score(mime_type, macro_result, pdf_result, yara_matches)

    # Compile all findings for explainability
    all_findings = []
    if macro_result["hasMacros"]:
        all_findings.extend(macro_result["findings"])
    if pdf_result["suspicious"]:
        all_findings.extend(pdf_result["findings"])
    for ym in yara_matches:
        all_findings.append(f"YARA rule matched: {ym}")

    return {
        "hash": file_hash,
        "fileType": mime_type,
        "size": file_size,
        "metadata": metadata,
        "macros": macro_result,
        "pdfAnalysis": pdf_result,
        "yaraMatches": yara_matches,
        "riskScore": risk_score,
        "findings": all_findings,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: analyze.py <filename>"}))
        sys.exit(1)

    filename = sys.argv[1]
    input_dir = "/sandbox/input"
    filepath = os.path.join(input_dir, filename)

    report = analyze(filepath)
    print(json.dumps(report))
