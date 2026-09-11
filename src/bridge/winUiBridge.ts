import type { RawLog } from "@/models/rawLog";

export interface WinUiBridge {
  getApps(): Promise<string[]>;

  getLogs(
    appNameLog: string,
    forceRefresh: boolean,
  ): Promise<RawLog[]>;

  refreshApps(): Promise<string[]>;

  refreshLogs(appNameLog: string): Promise<{
    logs: RawLog[];
    newCount: number;
  }>;
}

export interface WinUiResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

class BrowserWinUiBridge implements WinUiBridge {
  async getApps(): Promise<string[]> {
    throw new Error(
      "WinUI bridge is not available in browser mode.",
    );
  }

  async getLogs(
    appNameLog: string,
    _forceRefresh: boolean,
  ): Promise<RawLog[]> {
    throw new Error(
      `WinUI bridge is not available. Requested: ${appNameLog}`,
    );
  }

  async refreshApps(): Promise<string[]> {
    throw new Error(
      "WinUI bridge is not available in browser mode.",
    );
  }

  async refreshLogs(
    appNameLog: string,
  ): Promise<{
    logs: RawLog[];
    newCount: number;
  }> {
    throw new Error(
      `WinUI bridge is not available. Requested: ${appNameLog}`,
    );
  }
}

export const winUiBridge: WinUiBridge =
  new BrowserWinUiBridge();
