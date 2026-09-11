interface WebViewMessageEvent<T = unknown>
  extends MessageEvent<T> {}

interface WebView2 {
  postMessage(message: unknown): void;

  addEventListener(
    type: "message",
    listener: (
      event: WebViewMessageEvent,
    ) => void,
  ): void;

  removeEventListener(
    type: "message",
    listener: (
      event: WebViewMessageEvent,
    ) => void,
  ): void;
}

interface Chrome {
  webview?: WebView2;
}

declare global {
  interface Window {
    chrome?: Chrome;
  }
}

export {};