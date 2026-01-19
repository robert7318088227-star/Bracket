export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, price } = req.body;

  if (!text || !price) {
    return res.status(400).json({ error: "Missing input" });
  }

  const prompt = `
You are an assistant helping freelancers convert messy project descriptions into a clear, professional project agreement.

Your job is to:
- Extract what is included and what is not included
- Remove ambiguity and casual language
- Never invent new requirements
- Never assume timelines, revisions, or payment terms
- Keep language neutral and client-facing

Output ONLY in this structure:

Deliverables:
- …

Exclusions:
- …

Client Summary:
(1–2 short paragraphs)

Rules:
- If unclear, put it under Exclusions
- Do not add new information
- No emojis, no casual tone

Input:
${text}

Price (reference only): ${price}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    // 🔒 Defensive checks
    if (
      !data.candidates ||
      !data.candidates.length ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts.length
    ) {
      return res.status(500).json({
        error: "Gemini returned an unexpected response"
      });
    }

    const outputText = data.candidates[0].content.parts[0].text;

    // Safe parsing
    const deliverables = outputText
      .split("Exclusions:")[0]
      .replace("Deliverables:", "")
      .trim()
      .split("\n")
      .filter(l => l.startsWith("-"))
      .map(l => l.replace("- ", ""));

    const exclusions = outputText
      .split("Exclusions:")[1]
      .split("Client Summary:")[0]
      .trim()
      .split("\n")
      .filter(l => l.startsWith("-"))
      .map(l => l.replace("- ", ""));

    const summary = outputText.split("Client Summary:")[1]?.trim() || "";

    res.status(200).json({
      deliverables,
      exclusions,
      summary
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Failed to generate scope" });
  }
}
