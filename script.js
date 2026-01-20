// =========================
// DOM REFERENCES
// =========================

const continueBtn = document.getElementById("continueBtn");

const inputSection = document.getElementById("inputSection");
const loadingSection = document.getElementById("loadingSection");
const resultsSection = document.getElementById("resultsSection");

// Inputs
const projectTitleInput = document.getElementById("projectTitle");
const clientMessageInput = document.getElementById("clientMessage");
const scopeInput = document.getElementById("scope");
const deliverablesInput = document.getElementById("deliverables");
const priceInput = document.getElementById("price");

// Outputs
const summaryProject = document.getElementById("summaryProject");
const summaryRole = document.getElementById("summaryRole");
const summaryRisk = document.getElementById("summaryRisk");
const summaryPrice = document.getElementById("summaryPrice");

const verdictOutput = document.getElementById("verdictOutput");
const clarifyOutput = document.getElementById("clarifyOutput");
const issuesOutput = document.getElementById("issuesOutput");
const strategyOutput = document.getElementById("strategyOutput");

// =========================
// HELPERS
// =========================

function getSelectedRole() {
  const roles = document.querySelectorAll('input[name="role"]');
  for (const role of roles) {
    if (role.checked) return role.value;
  }
  return null;
}

function getSelectedRedFlags() {
  const flags = [];
  document.querySelectorAll(".redFlag").forEach(cb => {
    if (cb.checked) flags.push(cb.value);
  });
  return flags;
}

function populateList(element, items) {
  element.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  });
}

// =========================
// MAIN FLOW
// =========================

continueBtn.addEventListener("click", async () => {
  const projectTitle = projectTitleInput.value.trim();
  const clientMessage = clientMessageInput.value.trim();
  const role = getSelectedRole();

  if (!projectTitle || !clientMessage || !role) {
    alert("Please fill all mandatory fields marked with *");
    return;
  }

  const payload = {
    projectTitle,
    clientMessage,
    role,
    redFlags: getSelectedRedFlags(),
    scope: scopeInput.value.trim(),
    deliverables: deliverablesInput.value.trim(),
    price: priceInput.value.trim()
  };

  // UI transition
  inputSection.hidden = true;
  loadingSection.hidden = false;

  try {
    const response = await fetch("/api/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Evaluation failed");
    }

    const result = await response.json();

    loadingSection.hidden = true;
    resultsSection.hidden = false;

    renderResults(result);

  } catch (error) {
    loadingSection.hidden = true;
    inputSection.hidden = false;
    alert("Something went wrong while evaluating the project. Please try again.");
  }
});

// =========================
// RENDER RESULTS
// =========================

function renderResults(result) {
  // Summary
  summaryProject.textContent = result.summary.project;
  summaryRole.textContent = result.summary.role;
  summaryRisk.textContent = result.summary.risk;
  summaryPrice.textContent = result.summary.price;

  // Recommendation
  verdictOutput.textContent = result.recommendation.verdict;
  populateList(clarifyOutput, result.recommendation.keyPointsToClarify);
  populateList(issuesOutput, result.recommendation.potentialIssues);
  strategyOutput.textContent = result.recommendation.responseStrategy;
}
