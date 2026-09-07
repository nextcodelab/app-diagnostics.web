
import hljs from "highlight.js";

/**
 * Detect the most likely programming language/framework
 * represented by an error message, exception, or stack trace.
 *
 * The detector handles common native/mobile/web languages first,
 * then falls back to Highlight.js automatic detection.
 */
export function detectLanguage(text: string): string {
  if (!text?.trim()) {
    return "plaintext";
  }

  const value = text.trim();

  // ---------------------------------------------------------
  // C# / .NET / WinUI / UWP / Windows App SDK
  // ---------------------------------------------------------
  //
  // Important:
  // A WinUI exception does not necessarily contain "System."
  // Therefore we also recognize common .NET stack-trace patterns.
  //
  if (
    // .NET exception types
    /\bSystem\.[A-Za-z0-9_.]+Exception\b/.test(value) ||
    /\b[A-Za-z0-9_.]+Exception:\s*/.test(value) ||

    // .NET stack trace
    /\n\s*at\s+[A-Za-z0-9_.<>`]+\(/.test(value) ||
    /^\s*at\s+[A-Za-z0-9_.<>`]+\(/m.test(value) ||

    // Common .NET namespaces
    /\bSystem\./.test(value) ||
    /\bMicrosoft\.(UI|WinRT|Windows|Extensions)\./.test(value) ||

    // WinUI / UWP
    /\bMicrosoft\.UI\.Xaml\b/.test(value) ||
    /\bWindows\.UI\.Xaml\b/.test(value) ||
    /\bWindows\.ApplicationModel\b/.test(value) ||
    /\bWinRT\./.test(value) ||

    // Common C# exception formatting
    /\bTargetInvocationException\b/.test(value) ||
    /\bNullReferenceException\b/.test(value) ||
    /\bInvalidOperationException\b/.test(value) ||
    /\bUnauthorizedAccessException\b/.test(value) ||
    /\bArgumentException\b/.test(value) ||
    /\bInvalidCastException\b/.test(value) ||
    /\bFileNotFoundException\b/.test(value) ||
    /\bIOException\b/.test(value) ||
    /\bCOMException\b/.test(value) ||

    // C# compiler/runtime terminology
    /\bSystem\.Runtime\./.test(value) ||
    /\bSystem\.Reflection\./.test(value) ||
    /\bSystem\.IO\./.test(value)
  ) {
    return "csharp";
  }

  // ---------------------------------------------------------
  // Dart / Flutter
  // ---------------------------------------------------------
  if (
    // Flutter/Dart stack trace
    /^\s*#\d+\s+/m.test(value) ||

    // Common Dart stack frames
    /\bpackage:[a-zA-Z0-9_]+\/.+\.dart/.test(value) ||
    /\bdart:core\b/.test(value) ||
    /\b dart:async\b/.test(value) ||
    /\bdart:ui\b/.test(value) ||

    // Flutter framework
    /\bpackage:flutter\//.test(value) ||
    /\bpackage:flutter_test\//.test(value) ||
    /\bFlutterError\b/.test(value) ||
    /\bStateError\b/.test(value) ||
    /\bLateInitializationError\b/.test(value) ||
    /\bNoSuchMethodError\b/.test(value) ||
    /\bRangeError\b/.test(value)
  ) {
    return "dart";
  }

  // ---------------------------------------------------------
  // JavaScript
  // ---------------------------------------------------------
  if (
    /\bTypeError:\s*/.test(value) ||
    /\bReferenceError:\s*/.test(value) ||
    /\bSyntaxError:\s*/.test(value) ||
    /\bRangeError:\s*/.test(value) ||
    /\bEvalError:\s*/.test(value) ||
    /\bURIError:\s*/.test(value) ||
    /\bat\s+Object\./.test(value) ||
    /\bat\s+async\s+/.test(value) ||
    /\bat\s+[A-Za-z_$][\w$]*\s+\(/.test(value) ||
    /\bat\s+https?:\/\//.test(value)
  ) {
    return "javascript";
  }

  // ---------------------------------------------------------
  // TypeScript
  // ---------------------------------------------------------
  if (
    /\bTS\d{3,5}\b/.test(value) ||
    /\btsc\b.*\berror\b/i.test(value) ||
    /\bTypeScript\b/i.test(value)
  ) {
    return "typescript";
  }

  // ---------------------------------------------------------
  // Python
  // ---------------------------------------------------------
  if (
    /\bTraceback \(most recent call last\):/.test(value) ||
    /^\s*File ".*\.py", line \d+/m.test(value) ||
    /\b(?:IndentationError|ImportError|ModuleNotFoundError|KeyError|IndexError|AttributeError|ValueError|TypeError):/.test(
      value,
    )
  ) {
    return "python";
  }

  // ---------------------------------------------------------
  // Java / Kotlin
  // ---------------------------------------------------------
  if (
    /\bat\s+[a-zA-Z0-9_$]+\.[a-zA-Z0-9_$]+\([A-Za-z0-9_$]+\.java:\d+\)/.test(
      value,
    ) ||
    /\bjava\.[a-zA-Z0-9_.]+Exception\b/.test(value) ||
    /\bException in thread ["']/.test(value)
  ) {
    return "java";
  }

  if (
    /\bat\s+[a-zA-Z0-9_$]+\.[a-zA-Z0-9_$]+\([A-Za-z0-9_$]+\.kt:\d+\)/.test(
      value,
    ) ||
    /\bkotlin\.[a-zA-Z0-9_.]+Exception\b/.test(value)
  ) {
    return "kotlin";
  }

  // ---------------------------------------------------------
  // Rust
  // ---------------------------------------------------------
  if (
    /\bthread ['"].*['"] panicked at\b/.test(value) ||
    /\bpanicked at\b/.test(value) ||
    /\bcrates\/.*\.rs:\d+:\d+/.test(value) ||
    /^\s*\d+:\s+\d+\s+\|/m.test(value)
  ) {
    return "rust";
  }

  // ---------------------------------------------------------
  // Go
  // ---------------------------------------------------------
  if (
    /\bgoroutine \d+ \[/.test(value) ||
    /\bpanic:/.test(value) &&
      /\bgoroutine\b/.test(value) ||
    /\.go:\d+/.test(value)
  ) {
    return "go";
  }

  // ---------------------------------------------------------
  // C / C++
  // ---------------------------------------------------------
  if (
    /\bSegmentation fault\b/.test(value) ||
    /\bSIGSEGV\b/.test(value) ||
    /\bSIGABRT\b/.test(value) ||
    /\bstd::[a-zA-Z0-9_:]+/.test(value) ||
    /\b(?:libc|libstdc\+\+|libc\+\+)\b/.test(value) ||
    /\.(?:cpp|cc|cxx|hpp|h):\d+/.test(value)
  ) {
    return "cpp";
  }

  // ---------------------------------------------------------
  // Swift
  // ---------------------------------------------------------
  if (
    /\bFatal error:\s*/.test(value) ||
    /\bSwift\.[A-Za-z0-9_.]+/.test(value) ||
    /\bUIKit\b/.test(value) ||
    /\bFoundation\b/.test(value) &&
      /\bThread\b/.test(value)
  ) {
    return "swift";
  }

  // ---------------------------------------------------------
  // PHP
  // ---------------------------------------------------------
  if (
    /\bPHP (?:Fatal error|Warning|Notice):/.test(value) ||
    /\bFatal error:.*\.php:\d+/.test(value) ||
    /\.php:\d+/.test(value)
  ) {
    return "php";
  }

  // ---------------------------------------------------------
  // Ruby
  // ---------------------------------------------------------
  if (
    /\b[A-Z][A-Za-z0-9_:]*(?:Error|Exception):/.test(value) &&
    /\.rb:\d+/.test(value)
  ) {
    return "ruby";
  }

  // ---------------------------------------------------------
  // PowerShell
  // ---------------------------------------------------------
  if (
    /\bAt line:\d+ char:\d+/.test(value) ||
    /\bCategoryInfo\s*:/.test(value) ||
    /\bFullyQualifiedErrorId\s*:/.test(value) ||
    /\.ps1:\d+/.test(value)
  ) {
    return "powershell";
  }

  // ---------------------------------------------------------
  // SQL
  // ---------------------------------------------------------
  if (
    /\bSQLSTATE\b/i.test(value) ||
    /\b(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]+\bFROM\b/i.test(value) ||
    /\bSQLite(?:Exception| error)\b/i.test(value) ||
    /\bPostgreSQL\b/i.test(value) ||
    /\bMySQL\b/i.test(value)
  ) {
    return "sql";
  }

  // ---------------------------------------------------------
  // JSON
  // ---------------------------------------------------------
  if (
    (value.startsWith("{") && value.endsWith("}")) ||
    (value.startsWith("[") && value.endsWith("]"))
  ) {
    try {
      JSON.parse(value);
      return "json";
    } catch {
      // Not valid JSON; continue detection.
    }
  }

  // ---------------------------------------------------------
  // HTML / XML
  // ---------------------------------------------------------
  if (
    /^<!DOCTYPE\s+html/i.test(value) ||
    /<html[\s>]/i.test(value) ||
    /<\/(?:html|body|div|span|p)>/i.test(value)
  ) {
    return "xml";
  }

  // ---------------------------------------------------------
  // CSS
  // ---------------------------------------------------------
  if (
    /[.#]?[a-zA-Z][\w-]*\s*\{[\s\S]*:[\s\S]*;[\s\S]*\}/.test(value)
  ) {
    return "css";
  }

  // ---------------------------------------------------------
  // Markdown
  // ---------------------------------------------------------
  if (
    /^#{1,6}\s+/m.test(value) ||
    /```[\s\S]*```/.test(value) ||
    /^\s*[-*+]\s+/m.test(value) ||
    /\[[^\]]+\]\([^)]+\)/.test(value)
  ) {
    return "markdown";
  }

  // ---------------------------------------------------------
  // Highlight.js fallback
  // ---------------------------------------------------------
  const result = hljs.highlightAuto(value);

  return result.language ?? "plaintext";
}

