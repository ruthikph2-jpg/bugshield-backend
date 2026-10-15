const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

app.get("/", (req, res) => {
  res.json({ message: "BugShield API is running 🛡️" });
});

app.post("/api/analyze", async (req, res) => {
  const { code, language } = req.body;

  if (!code || code.trim() === "") {
    return res.status(400).json({ error: "No code provided." });
  }

  const lang = language || "Python";

  const prompt = `
You are BugShield, an expert AI code debugger.

Analyze the following ${lang} code. Respond ONLY with a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "hasBug": true or false,
  "bugDescription": "Short description of the bug found, or 'No bugs detected.'",
  "bugLine": "The exact line(s) of code that contain the bug, or null if no bug",
  "fixedCode": "The complete corrected code, or the original code if no bug",
  "explanation": "Step-by-step explanation of what the bug was and how it was fixed",
  "whatChanged": ["Array of strings, each describing one specific change made"],
  "severity": "Low | Medium | High | None"
}

Code to analyze:
\`\`\`${lang}
${code}
\`\`\`
`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return res.status(500).json({ error: "Failed to analyze code. Check your API key." });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({
        error: "AI returned invalid JSON. Please try again.",
        raw: text,
      });
    }

    return res.json(parsed);
  } catch (err) {
    console.error("Server error:", err.message);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🛡️  BugShield backend running on http://localhost:${PORT}`);
});
