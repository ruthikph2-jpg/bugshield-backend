const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Analysis = require("./models/Analysis");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ─── MongoDB Connection ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ─── Gemini Setup ─────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
];

async function callGemini(prompt) {
  let lastError = null;
  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} failed (${response.status}):`, errText.slice(0, 100));
        lastError = new Error(`${model}: ${response.status}`);
        continue;
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return text;
    } catch (err) {
      console.warn(`Error with model ${model}:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models failed.");
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({ message: "BugShield API is running 🛡️" });
});

// Analyze & Fix Code
app.post("/api/analyze", async (req, res) => {
  const { code, language } = req.body;
  if (!code || code.trim() === "")
    return res.status(400).json({ error: "No code provided." });

  const lang = language || "Python";
  const prompt = `You are BugShield, an expert AI code debugger.
Analyze the following ${lang} code. Respond ONLY with a valid JSON object matching this schema exactly:
{
  "hasBug": boolean,
  "bugDescription": "Short description of the bug or 'No bugs detected.'",
  "bugLine": "The exact buggy line(s) or null",
  "fixedCode": "Complete corrected code or original if no bug",
  "explanation": "Step-by-step explanation of the bug and fix",
  "whatChanged": ["Array of specific changes made"],
  "severity": "Low | Medium | High | None"
}

Code:
\`\`\`${lang}
${code}
\`\`\``;

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned invalid format. Try again." });
    }

    // Save to MongoDB
    try {
      await Analysis.create({
        language: lang,
        originalCode: code,
        fixedCode: parsed.fixedCode,
        bugDescription: parsed.bugDescription,
        bugLine: parsed.bugLine,
        explanation: parsed.explanation,
        whatChanged: parsed.whatChanged,
        severity: parsed.severity,
        hasBug: parsed.hasBug,
      });
    } catch (dbErr) {
      console.warn("DB save failed (non-critical):", dbErr.message);
    }

    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Failed to analyze: " + err.message });
  }
});

// Chat about a bug
app.post("/api/chat", async (req, res) => {
  const { messages, code, language, fixedCode } = req.body;
  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: "Messages required." });

  const lang = language || "Python";
  const systemContext = `You are BugShield AI, an expert code debugger assistant. 
The user is asking follow-up questions about this ${lang} code analysis.

Original code:
\`\`\`${lang}
${code || ""}
\`\`\`

Fixed code:
\`\`\`${lang}
${fixedCode || ""}
\`\`\`

Answer the user's questions clearly and concisely. Focus on the code and bugs discussed.`;

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "User" : "BugShield AI"}: ${m.content}`)
    .join("\n");

  const prompt = `${systemContext}\n\nConversation:\n${conversationText}\n\nBugShield AI:`;

  try {
    const reply = await callGemini(prompt);
    return res.json({ reply: reply.trim() });
  } catch (err) {
    return res.status(500).json({ error: "Chat failed: " + err.message });
  }
});

// Get fix history
app.get("/api/history", async (req, res) => {
  try {
    const history = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select("language bugDescription severity hasBug createdAt originalCode fixedCode");
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch history." });
  }
});

// Get stats
app.get("/api/stats", async (req, res) => {
  try {
    const total = await Analysis.countDocuments();
    const withBugs = await Analysis.countDocuments({ hasBug: true });
    const bySeverity = await Analysis.aggregate([
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);
    const byLanguage = await Analysis.aggregate([
      { $group: { _id: "$language", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    return res.json({ total, withBugs, bySeverity, byLanguage });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stats." });
  }
});

app.listen(PORT, () => {
  console.log(`🛡️  BugShield backend running on port ${PORT}`);
});
