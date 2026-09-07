import {
  capitalize,
  populateVersionFilter,
  toggleLoading,
} from "@/utils/htmHelper";
import { fetchApps, fetchLogs } from "../api/logsApi";
import { State } from "../state/appState";
import type { RawLog } from "@/models/rawLog";
import type { ProcessedLog } from "../models/processedLog";
import type { ErrorGroup } from "../models/errorGroup";
import { applyFilters } from "./filterService";

// --- Core Logic ---

export async function loadAppList() {
  try {
    // Try cached app list first
    const cachedApps = getCachedApps();

    if (cachedApps && cachedApps.length > 0) {
      State.apps = cachedApps;

      renderAppList();

      // Automatically select the first app
      await loadLogs(cachedApps[0]);

      return;
    }

    // No cache -> fetch from Apps Script
    const apps = await fetchApps();

    State.apps = apps;

    // Save app list
    cacheApps(apps);

    renderAppList();

    // Automatically select first app
    if (apps.length > 0) {
      await loadLogs(apps[0]);
    }
  } catch (error) {
    console.error(error);

    document.getElementById("app-list")!.innerHTML =
      `<li style="color:var(--danger)">Error loading apps</li>`;
  }
}

export function renderAppList() {
  const ul = document.getElementById("app-list")!;
  ul.innerHTML = "";
  State.apps.forEach((sheetName) => {
    // Parse name and platform (e.g., "shepherd bible-windows")
    const parts = sheetName.split("-");
    const platform = parts.pop() || "Unknown";
    const appName = parts.join("-") || sheetName;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="app-name-wrap">
        <span class="app-name">${capitalize(appName)}</span>
        <span class="app-platform">${platform}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      document
        .querySelectorAll(".app-list li")
        .forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
      loadLogs(sheetName);
    });
    ul.appendChild(li);
  });
}

export async function loadLogs(sheetName: string, forceRefresh = false) {
  State.currentSheetName = sheetName;

  const parts = sheetName.split("-");

  document.getElementById("current-app-title")!.innerText = capitalize(
    parts.slice(0, -1).join("-") || sheetName,
  );

  const platformBadge = document.getElementById("current-app-platform")!;

  platformBadge.innerText = parts[parts.length - 1] || "";

  platformBadge.classList.remove("hidden");

  document.getElementById("btn-refresh")?.removeAttribute("disabled");

  toggleLoading(true);

  try {
    let raw: RawLog[] | null = null;

    // -----------------------------------------
    // Try cache unless explicitly refreshing
    // -----------------------------------------
    if (!forceRefresh) {
      raw = getCachedLogs(sheetName);
    }

    // -----------------------------------------
    // No cache -> fetch from Apps Script
    // -----------------------------------------
    if (!raw) {
      raw = await fetchLogs(sheetName);

      // Save logs to cache
      cacheLogs(sheetName, raw);
    }

    processLogs(raw);

    populateVersionFilter();
    applyFilters();

    document.getElementById("dashboard-content")?.classList.remove("hidden");
  } catch (err) {
    console.error(err);

    alert("Failed to load application logs.");
  } finally {
    toggleLoading(false);
  }
}

function processLogs(raw: RawLog[]) {
  State.rawLogs = raw.map((log) => {
    const exceptionType = log.type || parseExceptionType(log.stack_trace);
    const mainStackFrame = extractMainFrame(log.stack_trace);
    const shortMessage = (log.message || "No message provided").split("\n")[0];
    const errorGroupKey = `${exceptionType}|${mainStackFrame}`;

    return {
      ...log,
      exceptionType,
      mainStackFrame,
      shortMessage,
      errorGroupKey,
    };
  });
}

// Extract app-owned stack frame skipping generic .NET/Framework frames
function extractMainFrame(stackTrace: string): string {
  if (!stackTrace) return "Unknown Location";
  const lines = stackTrace
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("at "));
  const frameworkPrefixes = [
    "at System.",
    "at Microsoft.",
    "at WinRT.",
    "at ABI.",
    "at SQLite.",
    "at Windows.",
  ];

  for (const line of lines) {
    if (!frameworkPrefixes.some((prefix) => line.startsWith(prefix))) {
      return line.substring(3).trim(); // Remove 'at '
    }
  }
  return lines.length > 0 ? lines[0].substring(3).trim() : "Unknown Location";
}

function parseExceptionType(stackTrace: string): string {
  if (!stackTrace) return "UnknownException";
  const firstLine = stackTrace.split("\n")[0];
  const match = firstLine.match(/([a-zA-Z0-9_.]+Exception)/);
  return match ? match[1] : "UnknownException";
}

export function groupLogs(logs: ProcessedLog[]): ErrorGroup[] {
  const map = new Map<string, ErrorGroup>();

  logs.forEach((log) => {
    if (!map.has(log.errorGroupKey)) {
      map.set(log.errorGroupKey, {
        key: log.errorGroupKey,
        exceptionType: log.exceptionType,
        mainStackFrame: log.mainStackFrame,
        shortMessage: log.shortMessage,
        level: log.level,
        occurrences: [],
        affectedSessions: new Set(),
        versions: new Set(),
        latestOccurrence: new Date(0),
      });
    }
    const group = map.get(log.errorGroupKey)!;
    group.occurrences.push(log);
    if (log.session_id) group.affectedSessions.add(log.session_id);
    if (log.app_version) group.versions.add(log.app_version);

    const logDate = new Date(log.timestamp);
    if (logDate > group.latestOccurrence) group.latestOccurrence = logDate;
  });

  return Array.from(map.values())
    .map(analyzeRegression)
    .sort((a, b) => {
      // Sort by crashes first, then occurrence count
      if (a.level === "crash" && b.level !== "crash") return -1;
      if (b.level === "crash" && a.level !== "crash") return 1;
      return b.occurrences.length - a.occurrences.length;
    });
}

function analyzeRegression(group: ErrorGroup): ErrorGroup {
  if (group.versions.size < 2) return group;
  const sortedVersions = Array.from(group.versions).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const latestVer = sortedVersions[sortedVersions.length - 1];
  const prevVer = sortedVersions[sortedVersions.length - 2];

  const latestCount = group.occurrences.filter(
    (o) => o.app_version === latestVer,
  ).length;
  const prevCount = group.occurrences.filter(
    (o) => o.app_version === prevVer,
  ).length;

  if (prevCount === 0 && latestCount > 5) {
    group.isRegression = true;
  }
  return group;
}
// =========================================
// REFRESH APPLICATION LIST
// =========================================

export async function refreshAppList() {
  const apps = await fetchApps();

  State.apps = apps;

  // Update app list cache
  cacheApps(apps);

  // Re-render application menu
  renderAppList();

  return apps;
}
// =========================================
// REFRESH CURRENT APP LOGS
// =========================================

export async function refreshCurrentAppLogs() {
  const currentApp = State.currentSheetName;

  if (!currentApp) {
    return;
  }
  const refreshButton = document.getElementById(
    "btn-refresh",
  ) as HTMLButtonElement | null;

  try {
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "🔄 Refreshing...";
    }

    toggleLoading(true);

    const raw = await fetchLogs(currentApp);

    // Update log cache
    cacheLogs(currentApp, raw);

    // Process fresh logs
    processLogs(raw);

    populateVersionFilter();
    applyFilters();
  } catch (error) {
    console.error("Refresh failed:", error);

    alert("Failed to refresh application data.");
  } finally {
    toggleLoading(false);

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄 Refresh";
    }
  }
}

//CACHE KEYS
const APP_LIST_CACHE_KEY = "appDiagnostics.appList";
const LOG_CACHE_PREFIX = "appDiagnostics.logs.";

function getLogsCacheKey(sheetName: string): string {
  return `${LOG_CACHE_PREFIX}${sheetName}`;
}

function getCachedApps(): string[] | null {
  try {
    const cached = localStorage.getItem(APP_LIST_CACHE_KEY);

    if (!cached) {
      return null;
    }

    const apps = JSON.parse(cached);

    return Array.isArray(apps) ? apps : null;
  } catch (error) {
    console.warn("Failed to read app list cache:", error);
    return null;
  }
}

function getCachedLogs(sheetName: string): RawLog[] | null {
  try {
    const cached = localStorage.getItem(getLogsCacheKey(sheetName));

    if (!cached) {
      return null;
    }

    const logs = JSON.parse(cached);

    return Array.isArray(logs) ? logs : null;
  } catch (error) {
    console.warn(`Failed to read logs cache for ${sheetName}:`, error);

    return null;
  }
}

function cacheApps(apps: string[]): void {
  localStorage.setItem(APP_LIST_CACHE_KEY, JSON.stringify(apps));
}

function cacheLogs(sheetName: string, logs: RawLog[]): void {
  localStorage.setItem(getLogsCacheKey(sheetName), JSON.stringify(logs));
}
