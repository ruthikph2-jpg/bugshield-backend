# 🛡️ BugShield — Backend API Service

> **Robust, Fault-Tolerant AI Debugging Engine for BugShield**

This is the Express & Node.js backend powering [BugShield](https://bugshield-ruthik.vercel.app/). It integrates Google Gemini AI with multi-model automatic failover to analyze, diagnose, fix, and explain code bugs across multiple programming languages.

---

### 🚀 Live Demo

[![Live Demo](https://img.shields.io/badge/▶_LIVE_DEMO-bugshield--ruthik.vercel.app-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://bugshield-ruthik.vercel.app/)

👉 **Live Web App**: **[https://bugshield-ruthik.vercel.app/](https://bugshield-ruthik.vercel.app/)**
🚀 **Live Backend API**: **[https://bugshield-ruthik-api.onrender.com](https://bugshield-ruthik-api.onrender.com)**
🎨 **Frontend Repository**: [github.com/ruthikph2-jpg/bugshield-frontend](https://github.com/ruthikph2-jpg/bugshield-frontend)

---

## ⚡ Features & Architecture

- **Multi-Model Auto-Fallback**: Automatically switches across `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, and `gemini-3-flash-preview` to maintain 100% availability during provider demand spikes or temporary 503 errors.
- **Strict JSON Contract**: Enforces deterministic JSON outputs directly from the LLM for structured frontend consumption.
- **MongoDB Integration**: Saves every analysis to MongoDB Atlas for history tracking.
- **AI Chat**: Supports follow-up questions about bugs via `/api/chat`.
- **CORS Enabled**: Configured for seamless communication with the Vercel-hosted client.
- **Multi-Language Support**: Analyzes code across Python, Java, JavaScript, C++, TypeScript, Go, Rust, and more.

---

## 📡 API Endpoints

### 1. Health Check
`GET /`

**Response:**
```json
{
  "message": "BugShield API is running 🛡️"
}
```

### 2. Analyze & Fix Code
`POST /api/analyze`

**Request Body:**
```json
{
  "code": "def divide(a, b):\n    return a / b\n\nprint(divide(10, 0))",
  "language": "Python"
}
```

**Response:**
```json
{
  "hasBug": true,
  "bugDescription": "The code attempts to perform division by zero, which raises a ZeroDivisionError.",
  "bugLine": "return a / b",
  "fixedCode": "def divide(a, b):\n    if b == 0:\n        return \"Error: Division by zero\"\n    return a / b\n\nprint(divide(10, 0))",
  "explanation": "The function divide does not check if divisor b is zero...",
  "whatChanged": [
    "Added an if-statement to check if b is zero before performing the division"
  ],
  "severity": "High"
}
```

### 3. AI Chat
`POST /api/chat`

### 4. Fix History
`GET /api/history`

### 5. Stats
`GET /api/stats`

---

## 🛠️ Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ruthikph2-jpg/bugshield-backend.git
   cd bugshield-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   MONGODB_URI=your_mongodb_uri_here
   PORT=5000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

---

## 🔒 License

Copyright (c) 2026 Ruthik PH. All Rights Reserved. See [LICENSE](./LICENSE) for details.

---

## 👨‍💻 Author

**Ruthik PH** — [@ruthikph2-jpg](https://github.com/ruthikph2-jpg)
