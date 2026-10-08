const express = require("express");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

if (!OPENROUTER_API_KEY) {
    console.error("ERROR: OPENROUTER_API_KEY is missing from .env");
    process.exit(1);
}

const client = new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_TITLE || "AI Bug Finder"
    }
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

        const response = await client.chat.completions.create({
            model: OPENROUTER_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are a precise software debugging assistant. Return only valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
        });

        const aiText = response.choices[0].message.content.trim();

        let result;

        try {
            result = JSON.parse(aiText);
        } catch (parseError) {
            console.error("AI returned invalid JSON:", aiText);

            return res.status(500).json({
                error: "The AI returned an unexpected response. Please try again."
            });
        }

        if (
            typeof result !== "object" ||
            result === null ||
            typeof result.summary !== "string" ||
            typeof result.bugCount !== "number" ||
            !Array.isArray(result.bugs) ||
            !Array.isArray(result.suggestions) ||
            typeof result.fixedCode !== "string"
        ) {
            return res.status(500).json({
                error: "The AI returned an invalid analysis format."
            });
        }

        res.json(result);

    } catch (error) {
        console.error("OpenRouter API Error:", error);

        res.status(500).json({
            error: "Something went wrong while analyzing the code."
        });
    }
});

app.listen(PORT, () => {
    console.log(`🐛 AI Bug Finder running at http://localhost:${PORT}`);
});
