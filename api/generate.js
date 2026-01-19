export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, price } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing project text" });
  }

  const prompt = `
You are an assistant helping freelancers convert messy project descriptions into a clear, professional project agreement.

Your job is to:
- Extract what is included and what is not included
- Remove ambiguity and casual language
- Never invent new requirements
- Never assume timelines, revisions, or payment terms
- Keep language neutral and client-facing

STRICT OUTPUT FORMAT:

Deliverables:
- item

Exclusions:
- item

Client Summary:
paragraph

Rules:
- If unclear, put it under Exclusions
- Do not add new information
- No emojis, no casual tone

INPUT:
${text}

PRICE (reference only): ${price}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // 🔒 HARD STOP if Gemini misbehaves
    if (
      !data ||
      !data.candidates ||
      !Array.isArray(data.candidates) ||
      !data.candidates[0] ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts[0]
    ) {
      console.error("BAD GEMINI RESPONSE:", data);
      return res.status(500).json({
        error: "Gemini returned an invalid response"
      });
    }

    const textOutput = data.candidates[0].content.parts[0].text;

    // ---------- PARSING ----------
    const deliverablesBlock = textOutput.split("Exclusions:")[0] || "";
    const exclusionsBlock = textOutput.split("Exclusions:")[1]?.split("Client Summary:")[0] || "";
    const summaryBlock = textOutput.split("Client Summary:")[1] || "";

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

    res.status(200).json({
      deliverables,
      exclusions,
      summary: summaryBlock.trim()
    });

  } catch (err) {
    console.error("SERVER FAILURE:", err);
    res.status(500).json({ error: "Server failed to generate scope" });
  }
}
