const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// List of models with fallbacks in case of high demand (503) or rate limits
const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.8-flash"
];

app.get("/", (req, res) => {
  res.json({ message: "BugShield API is running 🛡️" });
});

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
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} returned status ${response.status}: ${errText.slice(0, 150)}`);
        lastError = new Error(`Model ${model} (${response.status}): ${errText.slice(0, 150)}`);
        continue; // Try next fallback model
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) {
        return text;
      }
    } catch (err) {
      console.warn(`Error calling model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed to respond.");
}

app.post("/api/analyze", async (req, res) => {
  const { code, language } = req.body;

  if (!code || code.trim() === "") {
    return res.status(400).json({ error: "No code provided." });
  }

  const lang = language || "Python";

  const prompt = `You are BugShield, an expert AI code debugger.
Analyze the following ${lang} code. Respond ONLY with a valid JSON object matching this schema:
{
  "hasBug": boolean,
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
\`\`\``;

  try {
    const rawText = await callGemini(prompt);

    // Strip markdown code fences if model wrapped in \`\`\`json
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error:", e.message, "Raw was:", rawText);
      return res.status(500).json({
        error: "AI returned invalid response format. Please try again.",
        raw: rawText
      });
    }

    return res.json(parsed);
  } catch (err) {
    console.error("BugShield backend error:", err.message);
    return res.status(500).json({
      error: "Failed to analyze code: " + err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🛡️  BugShield backend running on port ${PORT}`);
});
