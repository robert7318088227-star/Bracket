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

    // Basic validation (backend-level)
    if (!projectTitle || !clientMessage || !role) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const systemPrompt = `
You are BRACKET, an assistant that helps freelancers evaluate incoming client projects
before replying.

Your role is to assess clarity, risk, and responsibility — not to persuade or sell.

You must:
- Read the client message carefully
- Factor in the user’s selected role (Executor, Collaborator, Decision Maker)
- Consider any selected red flags
- Respect the provided scope, deliverables, and pricing
- Be calm, neutral, and practical

DO NOT:
- Write a reply to the client
- Add enthusiasm or emotional language
- Invent missing details
- Assume agreement or acceptance

Your job is to help the user think clearly.
`;

    const userPrompt = `
Project title:
${projectTitle}

Client message:
${clientMessage}

User role:
${role}

Selected red flags:
${redFlags && redFlags.length ? redFlags.join(", ") : "None"}

Scope:
${scope || "Not specified"}

Deliverables:
${deliverables || "Not specified"}

Price:
${price || "Not specified"}

TASK:
Generate the following outputs.

1. SUMMARY TABLE
Include exactly these rows:
- Project
- Role
- Risk (Proceed / Caution / High Risk)
- Price

2. AI RECOMMENDATION
Structure strictly as:

A. Verdict
(one short paragraph)

B. Key points to clarify
(bulleted list)

C. Potential issues to watch out for
(bulleted list)

D. Suggested response strategy
(short, practical guidance — not a draft reply)

Rules:
- Be realistic and protective of the freelancer
- If something is unclear, flag it instead of assuming
- Keep language concise and professional
- Output MUST be valid JSON using this schema:

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
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt },
                { text: userPrompt }
              ]
            }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error("Gemini API failed");
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates[0].content.parts[0].text;

    // Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      return res.status(500).json({
        error: "AI response could not be parsed",
        raw: rawText
      });
    }

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: "Internal evaluation error"
    });
  }
}
