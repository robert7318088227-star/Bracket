const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click", async () => {
  const text = document.getElementById("projectInput").value;
  const price = document.getElementById("priceInput").value;

  const deliverablesList = document.getElementById("deliverablesOutput");
  const exclusionsList = document.getElementById("exclusionsOutput");
  const summaryOutput = document.getElementById("summaryOutput");

  deliverablesList.innerHTML = "";
  exclusionsList.innerHTML = "";
  summaryOutput.textContent = "Generating…";

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

Price (for reference, do not reinterpret): ${price}
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + window.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();
  const output = data.candidates[0].content.parts[0].text;

  // VERY simple parser (Phase 1)
  const deliverables = output.split("Exclusions:")[0]
    .replace("Deliverables:", "")
    .trim()
    .split("\n")
    .filter(l => l.startsWith("-"));

  const exclusions = output.split("Exclusions:")[1]
    .split("Client Summary:")[0]
    .trim()
    .split("\n")
    .filter(l => l.startsWith("-"));

  const summary = output.split("Client Summary:")[1].trim();

  deliverables.forEach(d => {
    const li = document.createElement("li");
    li.textContent = d.replace("- ", "");
    deliverablesList.appendChild(li);
  });

  exclusions.forEach(e => {
    const li = document.createElement("li");
    li.textContent = e.replace("- ", "");
    exclusionsList.appendChild(li);
  });

  summaryOutput.textContent = summary;
});
