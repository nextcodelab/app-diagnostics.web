import { State } from "./state/appState";
import {
  loadAppList,
  refreshAppList,
  refreshCurrentAppLogs,
} from "./services/logService";
import { applyFilters } from "./services/filterService";
import { updateCharts } from "./components/chart";
import { initializeErrorModal } from "./error/errorModal";

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initializeErrorModal();
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
    refreshCurrentAppLogs();
  });
  const refreshAppsButton = document.getElementById(
    "btn-refresh-apps",
  ) as HTMLButtonElement | null;

  refreshAppsButton?.addEventListener("click", async () => {
    try {
      refreshAppsButton.disabled = true;

      await refreshAppList();
    } catch (error) {
      console.error("Failed to refresh application list:", error);
      alert("Failed to refresh applications.");
    } finally {
      refreshAppsButton.disabled = false;
    }
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



