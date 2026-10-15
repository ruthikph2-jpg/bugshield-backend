const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

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
    console.error("Gemini API error:", err.message);
    return res.status(500).json({ error: "Failed to analyze code. Check your API key." });
  }
});

app.listen(PORT, () => {
  console.log(`🛡️  BugShield backend running on http://localhost:${PORT}`);
});
