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
You are an assistant helping freelancers protect project scope and prevent expectation drift.

Your primary responsibility is NOT to summarize, but to enforce clarity.

You must:
- Aggressively remove ambiguity
- Convert vague or conditional statements into exclusions
- Deduplicate overlapping deliverables
- Normalize messy language into precise commitments
- Bias toward excluding anything that could be misinterpreted later

STRICT RULES:
- Anything optional, uncertain, future-looking, or conditional MUST go under Exclusions
- Never split similar ideas into multiple deliverables
- Never invent scope
- Never assume timelines, revisions, maintenance, or responsibility unless explicitly stated
- If a line cannot be defended in a scope dispute, it does not belong in Deliverables

Output ONLY in the following structure:

Deliverables:
- (clear, defensible, concrete commitments)

Exclusions:
- (anything unclear, optional, assumed, or explicitly excluded)

Client Summary:
- A short, formal paragraph derived ONLY from the above lists
- No new information
- No soft language

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
