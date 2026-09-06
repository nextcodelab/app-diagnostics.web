import type { ErrorGroup } from "../models/errorGroup";
import { escapeHtml } from "../utils/htmHelper";

// --- Detail View ---
export function openDetailView(group: ErrorGroup) {
  document.getElementById("detail-exception")!.innerText = group.exceptionType;
  document.getElementById("detail-frame")!.innerText = group.mainStackFrame;
  document.getElementById("detail-message")!.innerText = group.shortMessage;

  document.getElementById("detail-stats-container")!.innerHTML = `
    <strong>${group.occurrences.length} occurrences</strong> · ${group.affectedSessions.size} affected sessions
    <br><span style="color:var(--text-muted)">Affected versions: ${Array.from(group.versions).join(", ")}</span>
  `;

  const list = document.getElementById("detail-occurrences-list")!;
  list.innerHTML = "";

  // Sort by newest
  const sortedOccurrences = [...group.occurrences].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  sortedOccurrences.forEach((occ, idx) => {
    const card = document.createElement("div");
    card.className = "occurrence-card";
    card.innerHTML = `
      <div class="occurrence-header">
        <div><strong>${new Date(occ.timestamp).toLocaleString()}</strong> · v${occ.app_version}</div>
        <div>${occ.os_version} · ${occ.device} · Session: ${occ.session_id}</div>
      </div>
      <div class="occurrence-body ${idx === 0 ? "" : "hidden"}" id="occ-body-${idx}">
        <button class="btn btn-copy" onclick="navigator.clipboard.writeText(this.nextElementSibling.innerText)">Copy</button>
        <pre class="stack-trace">${escapeHtml(occ.stack_trace || "No stack trace available")}</pre>
      </div>
    `;
    // Expand/Collapse logic
    card.querySelector(".occurrence-header")!.addEventListener("click", () => {
      document.getElementById(`occ-body-${idx}`)!.classList.toggle("hidden");
    });
    list.appendChild(card);
  });

  document.getElementById("error-detail-view")!.classList.remove("hidden");
}
