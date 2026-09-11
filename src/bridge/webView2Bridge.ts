import type { RawLog } from "@/models/rawLog";
import type { WinUiBridge } from "./winUiBridge";

interface WinUiResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

class WebView2Bridge implements WinUiBridge {
  private readonly pending =
    new Map<string, PendingRequest>();

  constructor() {
    window.addEventListener(
      "winui-message",
      this.handleMessage,
    );
  }

  async getApps(): Promise<string[]> {
    return this.request<string[]>(
      "getApps",
      null,
    );
  }

  async getLogs(
    appNameLog: string,
    forceRefresh: boolean,
  ): Promise<RawLog[]> {
    return this.request<RawLog[]>(
      "getLogs",
      {
        appNameLog,
        forceRefresh,
      },
    );
  }

  async refreshApps(): Promise<string[]> {
    return this.request<string[]>(
      "refreshApps",
      null,
    );
  }

  async refreshLogs(
    appNameLog: string,
  ): Promise<{
    logs: RawLog[];
    newCount: number;
  }> {
    return this.request(
      "refreshLogs",
      {
        appNameLog,
      },
    );
  }

  private request<T>(
    method: string,
    data: unknown,
  ): Promise<T> {
    const id = crypto.randomUUID();

    return new Promise<T>(
      (resolve, reject) => {
        this.pending.set(id, {
          resolve: resolve as (
            value: unknown,
          ) => void,
          reject,
        });

        window.chrome?.webview?.postMessage({
          id,
          method,
          data,
        });
      },
    );
  }

  private handleMessage = (
    event: Event,
  ) => {
    const customEvent =
      event as CustomEvent<
        WinUiResponse
      >;

    const response =
      customEvent.detail;

    const request =
      this.pending.get(response.id);

    if (!request) {
      return;
    }

    this.pending.delete(response.id);

    if (response.success) {
      request.resolve(
        response.data,
      );
    } else {
      request.reject(
        new Error(
          response.error ??
            "WinUI request failed.",
        ),
      );
    }
  };
}

export const webView2Bridge =
  new WebView2Bridge();