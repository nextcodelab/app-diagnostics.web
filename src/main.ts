import { State } from "./state/appState";
import {
  loadAppList,
  refreshCurrentApp,
} from "./services/logService";
import { applyFilters } from "./services/filterService";
import { updateCharts } from "./components/chart";

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupEventListeners();
  loadAppList();
});

function initTheme() {
  const prefersLight = window.matchMedia(
    "(prefers-color-scheme: light)",
  ).matches;
  State.theme = prefersLight ? "light" : "dark";
  document.body.setAttribute("data-theme", State.theme);
}

function setupEventListeners() {
  document.getElementById("btn-theme")?.addEventListener("click", () => {
    State.theme = State.theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", State.theme);
    updateCharts(); // Redraw with new theme colors
  });

  document.getElementById("btn-refresh")?.addEventListener("click", () => {
    refreshCurrentApp();
  });

  document.getElementById("btn-back")?.addEventListener("click", () => {
    document.getElementById("error-detail-view")?.classList.add("hidden");
  });

  document
    .getElementById("search-input")
    ?.addEventListener("input", applyFilters);
  document
    .getElementById("filter-version")
    ?.addEventListener("change", applyFilters);
}

