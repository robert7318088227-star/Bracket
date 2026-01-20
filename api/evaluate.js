export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      projectTitle,
      clientMessage,
      role,
      redFlags,
      scope,
      deliverables,
      price
    } = req.body;

    // Backend validation
    if (!projectTitle || !clientMessage || !role) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    // Single, Gemini-friendly prompt
    const prompt = `
You are BRACKET, an assistant that helps freelancers evaluate incoming client projects
before replying.

Your role is to assess clarity, risk, and responsibility — not to persuade or sell.
Be calm, neutral, and practical.
Do NOT write a reply to the client.

Context:
Project title: ${projectTitle}

Client message:
${clientMessage}

User role: ${role}

Selected red flags:
${redFlags?.length ? redFlags.join(", ") : "None"}

Scope:
${scope || "Not specified"}

Deliverables:
${deliverables || "Not specified"}

Price:
${price || "Not specified"}

Return ONLY valid JSON using this schema:

{
  "summary": {
    "project": "",
    "role": "",
    "risk": "Proceed | Caution | High Risk",
    "price": ""
  },
  "recommendation": {
    "verdict": "",
    "keyPointsToClarify": [],
    "potentialIssues": [],
    "responseStrategy": ""
  }
}
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const geminiData = await geminiResponse.json();

    // Log full response for debugging
    console.log("RAW GEMINI RESPONSE:", JSON.stringify(geminiData, null, 2));

    if (!geminiData.candidates || !geminiData.candidates.length) {
      return res.status(500).json({
        error: "No candidates returned from Gemini",
        raw: geminiData
      });
    }

    const rawText = geminiData.candidates[0].content.parts[0].text;
    console.log("RAW MODEL TEXT:", rawText);

    // Extract JSON safely (Gemini may add text)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({
        error: "No JSON found in AI response",
        raw: rawText
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("EVALUATE API ERROR:", error);
    return res.status(500).json({
      error: error.message || "Internal evaluation error"
    });
  }
}
