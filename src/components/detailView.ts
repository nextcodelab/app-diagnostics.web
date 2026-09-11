import { escapeHtml } from "@/utils/htmHelper";
import type { ErrorGroup } from "../models/errorGroup";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import "../utils/stackTraceLanguage";

// --------------------------------------------------
// Markdown + Highlight.js
// --------------------------------------------------

marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === "stacktrace") {
        const highlighted = hljs.highlight(text, {
          language: "stacktrace",
        }).value;
        return `<pre><code class="hljs language-stacktrace">${highlighted}</code></pre>`;
      }
      return `<pre><code>${escapeHtml(text)}</code></pre>`;
    },
  },
});

// --------------------------------------------------
// Duration
// --------------------------------------------------

function formatDuration(duration: number): string {
  if (duration < 1000) {
    return `${duration} ms`;
  }
  const seconds = duration / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

// --------------------------------------------------
// Stack trace highlighting
// --------------------------------------------------

function highlightStackTrace(text: string): string {
  const normalizedText = text.replace(/\u00A0/g, " ");

  return normalizedText
    .split("\n")
    .map((line) => {
      if (/^\s*---.*---\s*$/.test(line)) {
        return `<span class="hljs-comment">${escapeHtml(line)}</span>`;
      }

      const tokenRegex =
        /(\[ErrorCode:[^\]]+\])|((?:[A-Za-z]:\\|\/)[^()\s]+?\.(?:onnx|dll|exe|cs|cshtml|xaml|json|db|sqlite|txt)(?::line\s+\d+)?)|(\b(?:System|Microsoft|Windows|UniversalProject|KokoroSharp)(?:\.[A-Za-z_][\w<>`+]*)+)|(\b[A-Za-z_][\w<>`]*(?:Exception|Error)\b)|(\bat\b|\bin\b)|(\b[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+)(?=\()|(\b(?:String|Int32|Int64|Boolean|Object|Action|Task|SessionOptions|PrePackedWeightsContainer)\b)|(`[^`]+`)/g;

      let result = "";
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = tokenRegex.exec(line)) !== null) {
        result += escapeHtml(line.slice(lastIndex, match.index));
        const token = match[0];

        if (match[1]) result += `<span class="hljs-meta">${escapeHtml(token)}</span>`;
        else if (match[2]) result += `<span class="hljs-string">${escapeHtml(token)}</span>`;
        else if (match[3]) result += `<span class="hljs-title class_">${escapeHtml(token)}</span>`;
        else if (match[4]) result += `<span class="hljs-title class_">${escapeHtml(token)}</span>`;
        else if (match[5]) result += `<span class="hljs-keyword">${escapeHtml(token)}</span>`;
        else if (match[6]) result += `<span class="hljs-title function_">${escapeHtml(token)}</span>`;
        else if (match[7]) result += `<span class="hljs-title class_">${escapeHtml(token)}</span>`;
        else if (match[8]) result += `<span class="hljs-meta">${escapeHtml(token)}</span>`;
        else result += escapeHtml(token);

        lastIndex = tokenRegex.lastIndex;
      }

      result += escapeHtml(line.slice(lastIndex));
      return result;
    })
    .join("\n");
}

function renderMarkdownCode(text: string): string {
  const highlighted = highlightStackTrace(text);
  return `<pre><code class="hljs language-stacktrace">${highlighted}</code></pre>`;
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

// --------------------------------------------------
// Diagnostic Info
// --------------------------------------------------

interface DiagnosticInfoItem {
  key: string;
  value: string;
}

function parseInfo(info: unknown): DiagnosticInfoItem[] {
  if (!hasValue(info)) return [];

  // 1. Try JSON parsing first (Modern format)
  if (typeof info === "string") {
    const trimmed = info.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Object.entries(parsed).map(([k, v]) => ({ key: k, value: String(v) }));
      } catch { /* Fallthrough to pipe split */ }
    }
  } else if (typeof info === "object") {
    return Object.entries(info as Record<string, unknown>).map(([k, v]) => ({ key: k, value: String(v) }));
  }

  // 2. Fallback to Pipe-separated parsing (Legacy format)
  return String(info)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(":");
      if (separatorIndex === -1) {
        return { key: "", value: item };
      }
      return {
        key: item.slice(0, separatorIndex).trim(),
        value: item.slice(separatorIndex + 1).trim(),
      };
    });
}

// --------------------------------------------------
// Diagnostic Info Helpers
// --------------------------------------------------

function normalizeInfoKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, "");
}

function getInfoClass(key: string, value: string): string {
  const normalizedKey = normalizeInfoKey(key);
  const normalizedValue = value.toLowerCase();

  // Warning for memory over limits
  if (
    (normalizedKey.includes("memory") || normalizedKey === "appmemoryusagelevel") &&
    normalizedValue.includes("overlimit")
  ) {
    return "warning-chip"; // Assuming you update CSS to use .warning-chip or just "warning"
  }

  // Offline for network issues
  if (
    (normalizedKey.includes("internet") || normalizedKey.includes("wifi") || normalizedKey.includes("network")) &&
    (normalizedValue.includes("no internet") || normalizedValue === "false" || normalizedValue === "offline")
  ) {
    return "offline-chip"; 
  }

  if (normalizedValue === "ok" || normalizedValue === "online" || normalizedValue === "connected" || normalizedValue === "true") {
    return "success-chip";
  }

  return "";
}

// --------------------------------------------------
// Group Classification & Icons
// --------------------------------------------------

function getInfoGroup(key: string): string {
  const normalizedKey = normalizeInfoKey(key);

  if (["os", "osname", "osdescription", "osversion", "device", "devicemanufacturer", "devicemodel", "cpu", "cpucore", "cpucores", "processorcount", "ram", "ramtotal", "ramavailable", "ramfree", "storage", "storagefree", "storagetotal", "systemdrivefreespace", "systemdrivetotalspace", "freespace", "gpu", "architecture", "machine", "systemfamily"].includes(normalizedKey)) {
    return "System Specs";
  }

  if (["app", "appversion", "applicationname", "applicationversion", "memory", "memorystatus", "appmemoryusage", "appmemorylimit", "appmemoryusagelevel", "duration", "startup", "startupduration", "initialization", "database", "cache"].includes(normalizedKey)) {
    return "App Diagnostics";
  }

  if (["wifi", "network", "internet", "hasinternet", "connection", "connectionname", "connectiontype", "region", "locale", "language", "languagecode", "languagenative", "timezone", "time_zone", "culture"].includes(normalizedKey)) {
    return "Network & Locale";
  }

  return "Additional Info";
}

function getEmojiForKey(normalizedKey: string): string {
  if (["os", "osname", "osdescription"].includes(normalizedKey)) return "🪟";
  if (["device", "devicemanufacturer", "devicemodel"].includes(normalizedKey)) return "💻";
  if (["cpu", "cpucore", "cpucores", "processorcount"].includes(normalizedKey)) return "⚙️";
  if (["ram", "ramtotal", "ramavailable", "ramfree", "memory", "appmemoryusage"].includes(normalizedKey)) return "🧠";
  if (["storage", "storagefree", "storagetotal", "systemdrivefreespace", "systemdrivetotalspace", "freespace"].includes(normalizedKey)) return "💾";
  if (["app", "appversion", "applicationname", "applicationversion"].includes(normalizedKey)) return "📱";
  if (["memorystatus", "appmemoryusagelevel"].includes(normalizedKey)) return "⚠️";
  if (["duration", "startupduration"].includes(normalizedKey)) return "⏱";
  if (["wifi", "network", "internet", "hasinternet", "connection", "connectiontype", "connectionname"].includes(normalizedKey)) return "📶";
  if (["region", "locale", "language", "languagecode", "languagenative"].includes(normalizedKey)) return "🌍";
  if (["timezone", "time_zone", "culture"].includes(normalizedKey)) return "🕒";
  if (["architecture", "systemfamily"].includes(normalizedKey)) return "🔧";
  return "🔹";
}

function formatInfoKey(key: string): string {
  if (!key) return "";
  const normalized = normalizeInfoKey(key);
  const emoji = getEmojiForKey(normalized);
  
  const readableText = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return `${emoji} ${readableText}`;
}

// --------------------------------------------------
// Build Diagnostic Groups
// --------------------------------------------------

function buildDiagnosticInfo(info: unknown, duration: unknown): string {
  const items = parseInfo(info);

  if (duration !== null && duration !== undefined && Number.isFinite(Number(duration))) {
    // If it's a number, format it and push it as a duration item
    items.push({
      key: "Duration",
      value: formatDuration(Number(duration)),
    });
  }

  if (items.length === 0) return "";

  const groups = new Map<string, DiagnosticInfoItem[]>();

  for (const item of items) {
    // Skip empty items
    if (!hasValue(item.value)) continue;

    const group = getInfoGroup(item.key);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(item);
  }

  const groupOrder = [
    "System Specs",
    "App Diagnostics",
    "Network & Locale",
    "Additional Info",
  ];

  const html: string[] = [];

  for (const groupName of groupOrder) {
    const groupItems = groups.get(groupName);
    if (!groupItems || groupItems.length === 0) continue;

    const chips = groupItems
      .map((item) => {
        const chipClass = getInfoClass(item.key, item.value);
        const isDuration = normalizeInfoKey(item.key) === "duration";
        const extraClass = isDuration ? "duration-chip" : "";

        // Combine icon, key, and value formatting
        const keyHtml = item.key
          ? `<strong>${escapeHtml(formatInfoKey(item.key))}</strong>`
          : "";

        return `
          <div class="info-chip ${chipClass} ${extraClass}">
            ${keyHtml ? `${keyHtml}:&nbsp;` : ""}
            <span>${escapeHtml(item.value)}</span>
          </div>
        `;
      })
      .join("");

    html.push(`
      <div class="occurrence-info">
        <div class="occurrence-field-label">
          ${escapeHtml(groupName)}
        </div>
        <div class="info-chips">
          ${chips}
        </div>
      </div>
    `);
  }

  return html.join("");
}

// --------------------------------------------------
// Detail View
// --------------------------------------------------

// --------------------------------------------------
// Detail View (With divider restored above info at the bottom)
// --------------------------------------------------

export function openDetailView(group: ErrorGroup) {
  document.getElementById("detail-exception")!.innerText = group.exceptionType;
  document.getElementById("detail-frame")!.innerText = group.mainStackFrame;
  document.getElementById("detail-message")!.innerText = group.shortMessage;

  document.getElementById("detail-stats-container")!.innerHTML = `
    <strong>${group.occurrences.length} occurrences</strong>
    · ${group.affectedSessions.size} affected sessions
    <br>
    <span style="color:var(--text-muted)">
      Affected versions: ${escapeHtml(Array.from(group.versions).join(", "))}
    </span>
  `;

  const list = document.getElementById("detail-occurrences-list")!;
  list.innerHTML = "";

  const sortedOccurrences = [...group.occurrences].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  sortedOccurrences.forEach((occ, idx) => {
    const card = document.createElement("div");
    card.className = "occurrence-card";

    const stackTrace = hasValue(occ.stack_trace)
      ? String(occ.stack_trace)
      : "No stack trace available";

    const infoHtml = buildDiagnosticInfo(occ.info, occ.duration);

    const appVersion = hasValue(occ.app_version) ? String(occ.app_version) : "Unknown";
    const osVersion = hasValue(occ.os_version) ? String(occ.os_version) : "Unknown";
    const device = hasValue(occ.device) ? String(occ.device) : "Unknown";
    const sessionId = hasValue(occ.session_id) ? String(occ.session_id) : "Unknown";

    card.innerHTML = `
      <div class="occurrence-header">
        <div>
          <strong>${new Date(occ.timestamp).toLocaleString()}</strong>
          · v${escapeHtml(appVersion)}
        </div>
        <div>
          ${escapeHtml(osVersion)}
          · ${escapeHtml(device)}
          · Session: ${escapeHtml(sessionId)}
        </div>
      </div>

      <div class="occurrence-body ${idx === 0 ? "" : "hidden"}" id="occ-body-${idx}">
        <div class="stack-toolbar">
          <button class="btn btn-copy" type="button">Copy</button>
        </div>
        <div class="stack-trace">
          ${renderMarkdownCode(stackTrace)}
        </div>
        
        <div class="occurrence-footer-divider"></div>

        <div class="occurrence-footer-info">
          ${infoHtml}
        </div>
      </div>
    `;

    list.appendChild(card);

    card.querySelector<HTMLButtonElement>(".btn-copy")!.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(stackTrace);
      } catch (error) {
        console.error("Failed to copy stack trace:", error);
      }
    });

    card.querySelector(".occurrence-header")!.addEventListener("click", () => {
      document.getElementById(`occ-body-${idx}`)?.classList.toggle("hidden");
    });
  });

  document.getElementById("error-detail-view")!.classList.remove("hidden");
}