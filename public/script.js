const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
document.body.classList.add("light");
themeIcon.textContent = "☾";
themeText.textContent = "Dark";
}

themeBtn.addEventListener("click", () => {
document.body.classList.toggle("light");

const isLight = document.body.classList.contains("light");

if (isLight) {
    themeIcon.textContent = "☾";
    themeText.textContent = "Dark";
    localStorage.setItem("theme", "light");
} else {
    themeIcon.textContent = "☀";
    themeText.textContent = "Light";
    localStorage.setItem("theme", "dark");
}
});

const codeInput = document.getElementById("codeInput");
const language = document.getElementById("language");

const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

const characterCount = document.getElementById("characterCount");

const loading = document.getElementById("loading");
const results = document.getElementById("results");
const errorBox = document.getElementById("errorBox");

const summary = document.getElementById("summary");
const bugCount = document.getElementById("bugCount");

const bugsContainer = document.getElementById("bugsContainer");
const suggestionsContainer = document.getElementById("suggestionsContainer");

const fixedCode = document.getElementById("fixedCode");

codeInput.addEventListener("input", () => {
const count = codeInput.value.length;

characterCount.textContent = `${count.toLocaleString()} characters`;
});

clearBtn.addEventListener("click", () => {
codeInput.value = "";

results.classList.add("hidden");
errorBox.classList.add("hidden");

characterCount.textContent = "0 characters";

codeInput.focus();
});

analyzeBtn.addEventListener("click", analyzeCode);

async function analyzeCode() {
const code = codeInput.value.trim();
const selectedLanguage = language.value;

if (!code) {
    showError("Please paste some code before analyzing.");

    return;
}

errorBox.classList.add("hidden");
results.classList.add("hidden");
loading.classList.remove("hidden");

analyzeBtn.disabled = true;

analyzeBtn.textContent = "Analyzing...";

try {
    const response = await fetch("/api/analyze", {
    method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        code: code,
        language: selectedLanguage,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    displayResults(data);
  } catch (error) {
    console.error(error);

    showError(error.message || "Something went wrong. Please try again.");
  } finally {
    loading.classList.add("hidden");

    analyzeBtn.disabled = false;

    analyzeBtn.textContent = "🔍 Analyze Code";
  }
}

function displayResults(data) {
  results.classList.remove("hidden");

  summary.textContent = data.summary || "Analysis completed.";

  const bugs = Array.isArray(data.bugs) ? data.bugs : [];

  bugCount.textContent = `${bugs.length} ${bugs.length === 1 ? "bug" : "bugs"}`;

  displayBugs(bugs);

  displaySuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);

  fixedCode.textContent = data.fixedCode || "No corrected code provided.";

  results.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function displayBugs(bugs) {
  bugsContainer.innerHTML = "";

  if (bugs.length === 0) {
    bugsContainer.innerHTML = `
            <div class="bug-card">
                <div class="bug-title">
                    ✅ No obvious bugs found
                </div>

                <p class="bug-explanation">
                    The AI did not identify any obvious
                    problems in the submitted code.
                </p>
            </div>
        `;

    return;
  }

  bugs.forEach((bug) => {
    const card = document.createElement("div");

    card.className = "bug-card";

    const severity = String(bug.severity || "medium").toLowerCase();

    card.innerHTML = `
            <div class="bug-top">

                <div class="bug-title">
                    ${escapeHTML(bug.title || "Possible problem")}
                </div>

                <span
                    class="severity severity-${severity}"

                >
                    ${escapeHTML(severity)}
                </span>

            </div>

            <div class="bug-line">
                📍 Line:
                ${escapeHTML(String(bug.line || "Not specified"))}
            </div>

            <div class="bug-explanation">
                ${escapeHTML(bug.explanation || "No explanation provided.")}
            </div>

            <div class="fix-box">
                <strong>💡 Suggested Fix</strong>

                <br>

                ${escapeHTML(bug.fix || "No fix provided.")}
            </div>
        `;

    bugsContainer.appendChild(card);
  });
}

function displaySuggestions(suggestions) {
  suggestionsContainer.innerHTML = "";

  if (suggestions.length === 0) {
    const li = document.createElement("li");

    li.textContent = "No additional suggestions.";

    suggestionsContainer.appendChild(li);

    return;
  }

  suggestions.forEach((suggestion) => {
    const li = document.createElement("li");

    li.textContent = suggestion;

    suggestionsContainer.appendChild(li);
  });
}

copyBtn.addEventListener("click", async () => {
  const text = fixedCode.textContent;

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    copyBtn.textContent = "✅ Copied!";

    setTimeout(() => {
      copyBtn.textContent = "📋 Copy";
    }, 1500);
  } catch (error) {
    console.error(error);

    showError("Could not copy the corrected code.");
  }
});

function showError(message) {
  errorBox.textContent = message;

  errorBox.classList.remove("hidden");

  errorBox.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
