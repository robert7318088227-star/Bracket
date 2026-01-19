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

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, price })
    });

    const data = await response.json();

    if (data.error) {
      summaryOutput.textContent = data.error;
      return;
    }

    data.deliverables.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      deliverablesList.appendChild(li);
    });

    data.exclusions.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      exclusionsList.appendChild(li);
    });

    summaryOutput.textContent = data.summary;

  } catch (err) {
    summaryOutput.textContent = "Something went wrong.";
    console.error(err);
  }
});
