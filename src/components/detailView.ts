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
function highlightStackTrace(text: string): string {
  const normalizedText = text.replace(/\u00A0/g, " ");

  return normalizedText
    .split("\n")
    .map((line) => {
      // --------------------------------------------------
      // Inner exception separator
      // --------------------------------------------------

      if (/^\s*---.*---\s*$/.test(line)) {
        return `<span class="hljs-comment">${escapeHtml(line)}</span>`;
      }

      // --------------------------------------------------
      // Tokenizer
      // --------------------------------------------------

      const tokenRegex =
        /(\[ErrorCode:[^\]]+\])|((?:[A-Za-z]:\\|\/)[^()\s]+?\.(?:onnx|dll|exe|cs|cshtml|xaml|json|db|sqlite|txt)(?::line\s+\d+)?)|(\b(?:System|Microsoft|Windows|UniversalProject|KokoroSharp)(?:\.[A-Za-z_][\w<>`+]*)+)|(\b[A-Za-z_][\w<>`]*(?:Exception|Error)\b)|(\bat\b|\bin\b)|(\b[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+)(?=\()|(\b(?:String|Int32|Int64|Boolean|Object|Action|Task|SessionOptions|SessionOptions|PrePackedWeightsContainer)\b)|(`[^`]+`)/g;

      let result = "";
      let lastIndex = 0;

      let match: RegExpExecArray | null;

      while ((match = tokenRegex.exec(line)) !== null) {
        result += escapeHtml(line.slice(lastIndex, match.index));

        const token = match[0];

        // --------------------------------------------------
        // 1. Error code
        // [ErrorCode:InvalidProtobuf]
        // --------------------------------------------------

        if (match[1]) {
          result += `<span class="hljs-meta">${escapeHtml(token)}</span>`;
        }

        // --------------------------------------------------
        // 2. File path
        // C:\Users\...\kokoro.onnx
        // --------------------------------------------------

        else if (match[2]) {
          result += `<span class="hljs-string">${escapeHtml(token)}</span>`;
        }

        // --------------------------------------------------
        // 3. Namespace / fully-qualified type
        // Microsoft.ML.OnnxRuntime.OnnxRuntimeException
        // KokoroSharp.Core.KokoroModel
        // --------------------------------------------------

        else if (match[3]) {
          result += `<span class="hljs-title class_">${escapeHtml(token)}</span>`;
        }

        // --------------------------------------------------
        // 4. Exception / Error
        // System.AggregateException
        // OnnxRuntimeException
        // --------------------------------------------------

        else if (match[4]) {
          result += `<span class="hljs-title class_">${escapeHtml(token)}</span>`;
        }

        // --------------------------------------------------
        // 5. Stack trace keywords
        // at
        // in
        // --------------------------------------------------

        else if (match[5]) {
          result += `<span class="hljs-keyword">${escapeHtml(token)}</span>`;
        }

        // --------------------------------------------------
        // 6. Function / method
        // InferenceSession.Init
        // GetResultCore
        // SetupNaturalVoice
        // --------------------------------------------------

        else if (match[6]) {
          result += `<span class="hljs-title function_">${escapeHtml(token)}</span>`;
        }

        // --------------------------------------------------
        // 7. C# types
        // String
        // SessionOptions
        // Action
        // Task
        // --------------------------------------------------

        else if (match[7]) {
          result += `<span class="hljs-title class_">${escapeHtml(token)}</span>`;
        }

        // --------------------------------------------------
        // 8. Backtick parameters
        // Action`1
        // --------------------------------------------------

        else if (match[8]) {
          result += `<span class="hljs-meta">${escapeHtml(token)}</span>`;
        }

        else {
          result += escapeHtml(token);
        }

        lastIndex = tokenRegex.lastIndex;
      }

      result += escapeHtml(line.slice(lastIndex));

      return result;
    })
    .join("\n");
}
// --------------------------------------------------
// Render stack trace as Markdown code
// --------------------------------------------------

function renderMarkdownCode(text: string): string {
  const highlighted = highlightStackTrace(text);

  return `
    <pre><code class="hljs language-stacktrace">${highlighted}</code></pre>
  `;
}
// --------------------------------------------------
// Detail View
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
      Affected versions:
      ${escapeHtml(Array.from(group.versions).join(", "))}
    </span>
  `;

  const list = document.getElementById("detail-occurrences-list")!;

  list.innerHTML = "";

  // ------------------------------------------------
  // Sort newest first
  // ------------------------------------------------

  const sortedOccurrences = [...group.occurrences].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // ------------------------------------------------
  // Render occurrences
  // ------------------------------------------------

  sortedOccurrences.forEach((occ, idx) => {
    const card = document.createElement("div");

    card.className = "occurrence-card";

    const stackTrace = occ.stack_trace || "No stack trace available";

    card.innerHTML = `
      <div class="occurrence-header">
        <div>
          <strong>
            ${new Date(occ.timestamp).toLocaleString()}
          </strong>
          · v${escapeHtml(String(occ.app_version))}
        </div>

        <div>
          ${escapeHtml(String(occ.os_version))}
          · ${escapeHtml(String(occ.device))}
          · Session: ${escapeHtml(String(occ.session_id))}
        </div>
      </div>

      <div
        class="occurrence-body ${idx === 0 ? "" : "hidden"}"
        id="occ-body-${idx}"
      >
        <div class="stack-toolbar">
          <button class="btn btn-copy">
            Copy
          </button>
        </div>

        <div class="stack-trace">
          ${renderMarkdownCode(stackTrace)}
        </div>
      </div>
    `;

    list.appendChild(card);

    // ------------------------------------------------
    // Copy
    // ------------------------------------------------

    card.querySelector(".btn-copy")!.addEventListener("click", async (e) => {
      e.stopPropagation();

      try {
        await navigator.clipboard.writeText(stackTrace);
      } catch (error) {
        console.error("Failed to copy stack trace:", error);
      }
    });

    // ------------------------------------------------
    // Expand / Collapse
    // ------------------------------------------------

    card.querySelector(".occurrence-header")!.addEventListener("click", () => {
      document.getElementById(`occ-body-${idx}`)?.classList.toggle("hidden");
    });
  });

  // ------------------------------------------------
  // Show detail view
  // ------------------------------------------------

  document.getElementById("error-detail-view")!.classList.remove("hidden");
}
