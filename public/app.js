const scoresElement = document.querySelector("#scores");
const filterElement = document.querySelector("#filter");
const titleElement = document.querySelector("#title");
const formatElement = document.querySelector("#format");
const statusElement = document.querySelector("#status");
const playElement = document.querySelector("#play");
const tempoElement = document.querySelector("#tempo");
const tempoValueElement = document.querySelector("#tempo-value");
const emptyElement = document.querySelector("#empty");
const scoreElement = document.querySelector("#score");
let scores = [];
let selected = null;

function renderScores() {
  const query = filterElement.value.trim().toLowerCase();
  scoresElement.replaceChildren();
  const visible = scores.filter((score) => score.name.toLowerCase().includes(query));
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = scores.length ? "No matching scores." : "No scores are available.";
    scoresElement.append(empty);
    return;
  }
  for (const score of visible) {
    const button = document.createElement("button");
    button.className = `score-item${selected?.id === score.id ? " selected" : ""}`;
    button.innerHTML = `${escapeHtml(score.name)}<small>${score.format.toUpperCase()}${score.modifiedAt ? ` · ${new Date(score.modifiedAt).toLocaleDateString()}` : ""}</small>`;
    button.addEventListener("click", () => selectScore(score));
    scoresElement.append(button);
  }
}
function escapeHtml(value) { const element = document.createElement("span"); element.textContent = value; return element.innerHTML; }
function selectScore(score) { selected = score; titleElement.textContent = score.name; formatElement.textContent = `${score.format.toUpperCase()} · ${score.path}`; emptyElement.hidden = true; scoreElement.hidden = false; playElement.disabled = false; renderScores(); }
async function load() {
  try {
    const [catalogResponse, settingsResponse] = await Promise.all([fetch("/api/catalog"), fetch("/api/settings")]);
    const data = await catalogResponse.json();
    const settings = await settingsResponse.json();
    scores = data.scores;
    if (Number.isFinite(settings.tempo)) {
      tempoElement.value = settings.tempo;
      tempoValueElement.textContent = `${settings.tempo} BPM`;
    }
    statusElement.textContent = data.error ?? `${scores.length} score${scores.length === 1 ? "" : "s"}`;
    renderScores();
  } catch { statusElement.textContent = "Catalog unavailable"; scoresElement.textContent = "Could not load the score catalog."; }
}
filterElement.addEventListener("input", renderScores);
tempoElement.addEventListener("input", () => { tempoValueElement.textContent = `${tempoElement.value} BPM`; saveSettings(); });
document.querySelector("#fullscreen").addEventListener("click", () => document.documentElement.requestFullscreen?.());
document.querySelector("#clear").addEventListener("click", async () => { await fetch("/api/settings", { method: "DELETE" }); location.reload(); });
playElement.addEventListener("click", () => { playElement.textContent = playElement.textContent.includes("Play") ? "❚❚ Pause" : "▶ Play"; });
async function saveSettings() { await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ voiceVolumes: {}, emphasizedVoices: [], mutedVoices: [], tempo: Number(tempoElement.value) }) }); }
load();
