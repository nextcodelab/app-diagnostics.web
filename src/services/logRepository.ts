import type { RawLog } from "@/models/rawLog";

export interface LogRepository {
  getApps(): Promise<string[]>;

  getLogs(
    appNameLog: string,
    options?: {
      forceRefresh?: boolean;
    },
  ): Promise<RawLog[]>;

  refreshApps(): Promise<string[]>;

  refreshLogs(appNameLog: string): Promise<{
    logs: RawLog[];
    newCount: number;
  }>;
}