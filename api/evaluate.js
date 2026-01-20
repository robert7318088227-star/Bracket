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

    if (!projectTitle || !clientMessage || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
You are BRACKET, an assistant that helps freelancers evaluate incoming client projects
before replying.

Be calm, neutral, and practical.
Do not write a reply to the client.

Context:
Project title: ${projectTitle}

Client message:
${clientMessage}

User role: ${role}
Red flags: ${redFlags?.length ? redFlags.join(", ") : "None"}

Scope: ${scope || "Not specified"}
Deliverables: ${deliverables || "Not specified"}
Price: ${price || "Not specified"}

Return ONLY valid JSON in this schema:
{
  "summary": {
    "project": "",
    "role": "",
    "risk": "",
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const geminiData = await geminiResponse.json();

    console.log("RAW GEMINI RESPONSE:", JSON.stringify(geminiData, null, 2));

    if (!geminiData.candidates?.length) {
      return res.status(500).json({
        error: "No candidates returned",
        raw: geminiData
      });
    }

    const rawText = geminiData.candidates[0].content.parts[0].text;
    console.log("RAW TEXT:", rawText);

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({
        error: "No JSON found in model output",
        raw: rawText
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error("EVALUATE CRASH:", err);
    return res.status(500).json({
      error: err.message || "Unknown server error"
    });
  }
}
