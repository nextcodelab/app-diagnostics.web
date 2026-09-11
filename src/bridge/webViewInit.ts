import type { WinUiResponse } from "./winUiBridge";

const pending = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }
>();

function handleWinUiMessage(event: MessageEvent) {
  const response = event.data as WinUiResponse;

  const request = pending.get(response.id);

  if (!request) {
    return;
  }

  pending.delete(response.id);

  if (response.success) {
    request.resolve(response.data);
  } else {
    request.reject(new Error(response.error ?? "WinUI request failed."));
  }
}

export function initializeWebViewBridge() {
  if (!window.chrome?.webview) {
    console.log("[WinUI Bridge] WebView2 not available.");

    return false;
  }

  window.chrome.webview.addEventListener("message", handleWinUiMessage);

  console.log("[WinUI Bridge] WebView2 initialized.");

  return true;
}

export { pending };
