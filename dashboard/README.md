# SafePhish Admin Dashboard System Guide

This folder contains a standalone administrative console for SafePhish. It is designed to run separately from the main browser extension and performs real-time monitoring of all phishing analysis requests.

## 🏗️ Architecture Summary

- **SQLite Database**: `database.sqlite`
  - Stores all scan logs (URL/Email), verdicts, confidence scores, and raw engine data.
- **Backend API**: `backend/app.py`
  - A Flask-based REST API that provides statistics and analysis history.
- **Frontend UI**: `ui/`
  - A premium React + Vite application with Glassmorphism design features for clear results visualization.

---

## 🚀 Getting Started

### 1. Database Initialization
_If the `database.sqlite` file is missing:_
```powershell
python database_init.py
```

### 2. Start the Backend API
```powershell
cd backend
python app.py
```
*Console output will show: 🚀 SafePhish Admin API running on http://localhost:5001*

### 3. Launch the Management Console
```powershell
cd ui
npm install
npm run dev
```
*Access the dashboard at http://localhost:5173*

---

## 📡 Live Stream Logging
The main SafePhish ML server (`ModelTraining/server.py`) has been configured to automatically log every prediction to this system. You do not need to perform any extra steps to see live records in the dashboard as the extension scans URLs and emails.

---

## ✨ Features
- **Real-Time Polling**: Dashboard updates automatically every 10 seconds.
- **Verdict Persistence**: All historical analysis reports are stored and can be reviewed.
- **Detailed Drill-Down**: Click any scan record in the table to see the full 6-engine fusion or neural feature breakdown as seen in the original reports.
