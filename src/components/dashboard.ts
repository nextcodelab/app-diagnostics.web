import { State } from "../state/appState";
import { escapeHtml, getLevelIcon } from "../utils/htmHelper";
import { openDetailView } from "./detailView";
import { updateCharts } from "./chart";

export function renderDashboard() {
  // Update Stats
  document.getElementById("stat-total")!.innerText =
    State.filteredLogs.length.toString();
  document.getElementById("stat-errors")!.innerText = State.filteredLogs
    .filter((l) => l.level === "error")
    .length.toString();
  document.getElementById("stat-crashes")!.innerText = State.filteredLogs
    .filter((l) => l.level === "crash")
    .length.toString();
  document.getElementById("stat-sessions")!.innerText = new Set(
    State.filteredLogs.map((l) => l.session_id),
  ).size.toString();
  document.getElementById("stat-devices")!.innerText = new Set(
    State.filteredLogs.map((l) => l.device),
  ).size.toString();

  // Render Groups
  const list = document.getElementById("error-groups-list")!;
  list.innerHTML = "";

  State.groups.forEach((group) => {
    const card = document.createElement("div");
    card.className = "group-card";
    const icon = getLevelIcon(group.level);
    const dateStr = group.latestOccurrence.toLocaleDateString();

    card.innerHTML = `
      <div class="group-icon">${icon}</div>
      <div class="group-details">
        <div class="group-title">${group.exceptionType} ${group.isRegression ? '<span class="regression-badge">⚠ Regression</span>' : ""}</div>
        <div class="group-message">${escapeHtml(group.shortMessage)}</div>
        <div class="group-meta">${escapeHtml(group.mainStackFrame)}</div>
      </div>
      <div class="group-stats">
        <strong>${group.occurrences.length}</strong> occurrences<br>
        <span class="group-meta">${group.affectedSessions.size} sessions · Latest ${dateStr}</span>
      </div>
    `;
    card.addEventListener("click", () => openDetailView(group));
    list.appendChild(card);
  });

  updateCharts();
}
