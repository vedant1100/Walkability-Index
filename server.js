const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '1mb' }));

const countyData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'county_walkability.json'), 'utf8')
);

const countyContext = countyData
    .map(c => `${c.name}: avg=${c.avgScore}, least=${c.least}%, below=${c.below}%, above=${c.above}%, most=${c.most}%, n=${c.total}`)
    .join('\n');

const BASE_SYSTEM = `You are an expert data analyst assistant embedded in a California Walkability Index (NWI) dashboard. Answer questions about walkability data, methodology, geographic patterns, and chart analysis. Be concise and data-driven. Use specific numbers from the data when relevant.

## National Walkability Index (NWI) Methodology
- Score range: 1–20 (higher = more walkable)
- Tiers: Least Walkable (1–5.75), Below Average (5.76–10.5), Above Average (10.51–15.25), Most Walkable (15.26–20)
- Unit of analysis: Census block groups (~1,000–3,000 residents each)
- 4 component scores (each ranked 1–20), combined to produce NWI:
  • D2a: Population/Employment Density — rewards dense residential/commercial areas
  • D2b: Land Use Mix — rewards proximity of different land uses (mixed-use neighborhoods)
  • D3b: Intersection Density — rewards street connectivity (more intersections = shorter walking routes)
  • D4a: Transit Proximity — rewards closeness to transit stops
- Source: EPA National Walkability Index (2021)

## All 58 California Counties (sorted by avg NWI, descending)
${countyContext}`;

function buildSystemPrompt(mapContext) {
    if (!mapContext) return BASE_SYSTEM;
    return BASE_SYSTEM + `\n\n## Current Map Viewport (live data)\nAverage NWI score: ${mapContext.avgScore}\nTier breakdown — Most Walkable: ${mapContext.most}%, Above Average: ${mapContext.above}%, Below Average: ${mapContext.below}%, Least Walkable: ${mapContext.least}%`;
}

// Convert OpenAI-style messages { role, content } to Gemini contents format.
// Gemini uses 'model' instead of 'assistant'.
function toGeminiContents(messages) {
    return messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));
}

app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set. Add it to your .env file.' });
    }

    const { messages, mapContext } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required.' });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const ai = new GoogleGenAI({ apiKey });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const stream = await ai.models.generateContentStream({
            model: modelName,
            contents: toGeminiContents(messages),
            config: {
                systemInstruction: buildSystemPrompt(mapContext),
                maxOutputTokens: 1024,
            }
        });

        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
    } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    }

    res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\nServer running at http://localhost:${PORT}/src/frontend/`);
    console.log(`  Map view:     http://localhost:${PORT}/src/frontend/index.html`);
    console.log(`  County chart: http://localhost:${PORT}/src/frontend/barchart.html\n`);
});
