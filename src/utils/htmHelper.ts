
import { State } from "../state/appState";


// --- Utils ---
export function populateVersionFilter() {
  const select = document.getElementById("filter-version")!;
  select.innerHTML = '<option value="all">All versions</option>';
  const versions = new Set(
    State.rawLogs.map((l) => l.app_version).filter(Boolean),
  );
  Array.from(versions)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .forEach((v) => {
      select.innerHTML += `<option value="${v}">${v}</option>`;
    });
}

export function toggleLoading(show: boolean) {
  const el = document.getElementById("loading-overlay")!;
  show ? el.classList.remove("hidden") : el.classList.add("hidden");
}

export function getLevelIcon(level: string) {
  switch (level?.toLowerCase()) {
    case "crash":
      return "🔴";
    case "error":
      return "🟠";
    case "warning":
      return "🟡";
    case "info":
      return "🔵";
    default:
      return "⚪";
  }
}

export function capitalize(s: string) {
  return s.replace(/\b\w/g, (l) => l.toUpperCase());
}
export function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
