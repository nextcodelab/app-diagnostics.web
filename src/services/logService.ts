import {
  capitalize,
  populateVersionFilter,
  toggleLoading,
} from "@/utils/htmHelper";
import { State } from "../state/appState";
import type { RawLog } from "@/models/rawLog";
import type { ProcessedLog } from "../models/processedLog";
import type { ErrorGroup } from "../models/errorGroup";
import { applyFilters } from "./filterService";
import { showErrorModal } from "@/error/errorModal";
import { getLogRepository } from "./logRepositoryProvider";

const logRepository = getLogRepository();

// =========================================
// APPLICATION LIST
// =========================================

export async function loadAppList() {
  try {
    const apps = await logRepository.getApps();

    State.apps = apps;

    renderAppList();

    // Automatically select the first app.
    if (apps.length > 0) {
      await loadLogs(apps[0]);
    }
  } catch (error) {
    console.error("Failed to load applications:", error);

    document.getElementById("app-list")!.innerHTML =
      `<li style="color:var(--danger)">Error loading apps</li>`;
  }
}

export function renderAppList() {
  const ul = document.getElementById("app-list")!;

  ul.innerHTML = "";

  State.apps.forEach((sheetName) => {
    // Example:
    // shepherd-bible-windows
    // shepherd-bible-android

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

      void loadLogs(sheetName);
    });

    ul.appendChild(li);
  });
}

// =========================================
// LOAD LOGS
// =========================================

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
    const raw = await logRepository.getLogs(sheetName, {
      forceRefresh,
    });

    processLogs(raw);

    populateVersionFilter();
    applyFilters();

    document.getElementById("dashboard-content")?.classList.remove("hidden");
  } catch (error) {
    console.error(`Failed to load logs for ${sheetName}:`, error);

    showErrorModal(error);
  } finally {
    toggleLoading(false);
  }
}

// =========================================
// PROCESS LOGS
// =========================================

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

// =========================================
// STACK TRACE PROCESSING
// =========================================

// Extract app-owned stack frame while skipping
// generic .NET / WinRT / framework frames.
function extractMainFrame(stackTrace: string): string {
  if (!stackTrace) {
    return "Unknown Location";
  }

  const lines = stackTrace
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "));

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
      return line.substring(3).trim();
    }
  }

  return lines.length > 0 ? lines[0].substring(3).trim() : "Unknown Location";
}

function parseExceptionType(stackTrace: string): string {
  if (!stackTrace) {
    return "UnknownException";
  }

  const firstLine = stackTrace.split("\n")[0];

  const match = firstLine.match(/([a-zA-Z0-9_.]+Exception)/);

  return match ? match[1] : "UnknownException";
}

// =========================================
// GROUP LOGS
// =========================================

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

    if (log.session_id) {
      group.affectedSessions.add(log.session_id);
    }

    if (log.app_version) {
      group.versions.add(log.app_version);
    }

    const logDate = new Date(log.timestamp);

    if (logDate > group.latestOccurrence) {
      group.latestOccurrence = logDate;
    }
  });

  return Array.from(map.values())
    .map(analyzeRegression)
    .sort((a, b) => {
      // Crashes first.
      if (a.level === "crash" && b.level !== "crash") {
        return -1;
      }

      if (b.level === "crash" && a.level !== "crash") {
        return 1;
      }

      // Then occurrence count.
      return b.occurrences.length - a.occurrences.length;
    });
}

// =========================================
// REGRESSION ANALYSIS
// =========================================

function analyzeRegression(group: ErrorGroup): ErrorGroup {
  if (group.versions.size < 2) {
    return group;
  }

  const sortedVersions = Array.from(group.versions).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  const latestVer = sortedVersions[sortedVersions.length - 1];

  const prevVer = sortedVersions[sortedVersions.length - 2];

  const latestCount = group.occurrences.filter(
    (occurrence) => occurrence.app_version === latestVer,
  ).length;

  const prevCount = group.occurrences.filter(
    (occurrence) => occurrence.app_version === prevVer,
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
  try {
    const apps = await logRepository.refreshApps();

    State.apps = apps;

    renderAppList();

    return apps;
  } catch (error) {
    console.error("Failed to refresh application list:", error);

    showErrorModal(error);

    return State.apps;
  }
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

    const result = await logRepository.refreshLogs(currentApp);

    console.log("[LogSync]", {
      app: currentApp,
      newCount: result.newCount,
      totalCount: result.logs.length,
    });

    processLogs(result.logs);

    populateVersionFilter();
    applyFilters();
  } catch (error) {
    console.error("Refresh failed:", error);

    showErrorModal(error);
  } finally {
    toggleLoading(false);

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄 Refresh";
    }
  }
}
