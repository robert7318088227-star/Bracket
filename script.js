const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click", () => {
  const text = document.getElementById("projectInput").value;
  const price = document.getElementById("priceInput").value;

  const deliverablesList = document.getElementById("deliverablesOutput");
  const exclusionsList = document.getElementById("exclusionsOutput");
  const summaryOutput = document.getElementById("summaryOutput");

  deliverablesList.innerHTML = "";
  exclusionsList.innerHTML = "";
  summaryOutput.textContent = "";

  const lines = text
    .split(/\n|•|-|\*/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const deliverables = [];
  const exclusions = [];

  lines.forEach(line => {
    const lower = line.toLowerCase();

    const isDeliverable =
      /design|develop|create|build|provide|include/.test(lower);

    const isExclusion =
      /not included|does not include|excluded|out of scope|no\b/.test(lower);

    if (isDeliverable && !isExclusion) {
      deliverables.push(line);
    } else {
      exclusions.push(line);
    }
  });

  deliverables.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    deliverablesList.appendChild(li);
  });

  exclusions.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    exclusionsList.appendChild(li);
  });

  summaryOutput.textContent = 
    `This project includes ${deliverables.length} defined deliverables and excludes any items not explicitly listed above. The agreed price for this scope is ${price}.`;
});
