const express = require("express");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is missing from .env");
    process.exit(1);
}

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

app.post("/api/analyze", async (req, res) => {
    try {
        const { code, language } = req.body;

        // Validate input
        if (!code || typeof code !== "string") {
            return res.status(400).json({
                error: "Please provide some code."
            });
        }

        if (!language || typeof language !== "string") {
            return res.status(400).json({
                error: "Please select a programming language."
            });
        }

        if (code.length > 50000) {
            return res.status(400).json({
                error: "Code is too large. Maximum size is 50,000 characters."
            });
        }

        const prompt = `
You are an expert software developer and code debugging assistant.

Analyze the following ${language} code carefully.

IMPORTANT:
- Do not invent bugs.
- Only report problems that are reasonably supported by the code.
- If the code is correct, say that no obvious bugs were found.
- Give beginner-friendly explanations.
- Return ONLY valid JSON.
- Do not use Markdown code fences.

Return this exact JSON structure:

{
  "summary": "Short summary of the analysis",
  "bugCount": 0,
  "bugs": [
    {
      "severity": "critical|high|medium|low",
      "line": 1,
      "title": "Short bug title",
      "explanation": "Explain the problem",
      "fix": "Explain how to fix it"
    }
  ],
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "fixedCode": "Corrected version of the code"
}

Analyze:
1. Syntax errors
2. Logic errors
3. Runtime errors
4. Undefined variables/functions
5. Incorrect conditions
6. Common security problems
7. Obvious performance problems
8. Code-quality problems

Programming language:
${language}

CODE:
--------------------
${code}
--------------------
`;

        const response = await client.responses.create({
            model: "gpt-6-luna",
            input: prompt
        });

        const aiText = response.output_text.trim();

        let result;

        try {
            result = JSON.parse(aiText);
        } catch (parseError) {
            console.error("AI returned invalid JSON:", aiText);

            return res.status(500).json({
                error: "The AI returned an unexpected response. Please try again."
            });
        }

        res.json(result);

    } catch (error) {
        console.error("AI API Error:", error);

        res.status(500).json({
            error: "Something went wrong while analyzing the code."
        });
    }
});

app.listen(PORT, () => {
    console.log(`🐛 AI Bug Finder running at http://localhost:${PORT}`);
});