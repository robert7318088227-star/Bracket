import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "AI is not configured."
    });
  }

  try {
    const { text, price } = req.body || {};

    if (!text || !price) {
      return res.status(200).json({
        error: "Missing project description or price."
      });
    }

    const prompt = `
You are an assistant helping freelancers convert messy project descriptions into a clear, professional project agreement.

Your job is to:
- Extract what is included and what is not included
- Remove ambiguity and casual language
- Never invent new requirements
- Never assume timelines, revisions, or payment terms
- Keep language neutral and client-facing

STRICT OUTPUT FORMAT (do not deviate):

Deliverables:
- item

Exclusions:
- item

Client Summary:
short professional paragraph

Rules:
- If something is unclear, place it under Exclusions
- Do not add new information
- No emojis
- No casual tone

Project description:
${text}

Project price (reference only, do not reinterpret):
${price}
`.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 400
      }
    });

    const outputText = response?.text;

    if (!outputText) {
      return res.status(200).json({
        error: "AI could not generate a response."
      });
    }

    // -------- PARSING (defensive but simple) --------

    const deliverablesBlock =
      outputText.split("Exclusions:")[0] || "";

    const exclusionsBlock =
      outputText.split("Exclusions:")[1]?.split("Client Summary:")[0] || "";

    const summaryBlock =
      outputText.split("Client Summary:")[1] || "";

    const deliverables = deliverablesBlock
      .replace("Deliverables:", "")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.startsWith("-"))
      .map(l => l.slice(2));

    const exclusions = exclusionsBlock
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.startsWith("-"))
      .map(l => l.slice(2));

    return res.status(200).json({
      deliverables,
      exclusions,
      summary: summaryBlock.trim()
    });

  } catch (err) {
    console.error("Gemini failure:", err);
    return res.status(200).json({
      error: "Failed to generate scope."
    });
  }
}
