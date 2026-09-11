import type { RawLog } from "@/models/rawLog";
import type { LogRepository } from "../logRepository";


const API_BASE_URL = import.meta.env.VITE_CLOUDFLARE_D1_API_URL;


if (!API_BASE_URL) {
  throw new Error(
    "VITE_CLOUDFLARE_D1_API_URL is not configured.",
  );
}

const LOG_CACHE_PREFIX = "diagnostic_logs:";
const APP_CACHE_KEY = "diagnostic_apps";

interface AppsResponse {
  apps: Array<{
    app_name_log: string;
    app_name: string;
  }>;
}

interface LogsResponse {
  logs: RawLog[];
  count: number;
}

export class CloudflareLogRepository implements LogRepository {
  async getApps(): Promise<string[]> {
    const cachedApps = this.getCachedApps();

    if (cachedApps.length > 0) {
      return cachedApps;
    }

    return this.refreshApps();
  }

  async getLogs(
    appNameLog: string,
    options?: {
      forceRefresh?: boolean;
    },
  ): Promise<RawLog[]> {
    const forceRefresh = options?.forceRefresh ?? false;
    const cacheKey = this.getLogCacheKey(appNameLog);

    const cachedLogs = this.getCachedLogs(appNameLog);

    // No local data yet.
    if (cachedLogs.length === 0) {
      const logs = await this.fetchLogs(appNameLog);

      this.saveCachedLogs(appNameLog, logs);

      return logs;
    }

    // Normal load uses the local cache.
    if (!forceRefresh) {
      return cachedLogs;
    }

    // Force refresh only downloads logs newer than
    // the newest log already stored locally.
    const latestTimestamp = this.getLatestTimestamp(cachedLogs);

    if (!latestTimestamp) {
      const logs = await this.fetchLogs(appNameLog);

      this.saveCachedLogs(appNameLog, logs);

      return logs;
    }

    const newLogs = await this.fetchLogs(
      appNameLog,
      latestTimestamp,
    );

    if (newLogs.length === 0) {
      return cachedLogs;
    }

    const mergedLogs = this.mergeLogs(
      cachedLogs,
      newLogs,
    );

    localStorage.setItem(
      cacheKey,
      JSON.stringify(mergedLogs),
    );

    return mergedLogs;
  }

  async refreshApps(): Promise<string[]> {
    const response = await fetch(
      `${API_BASE_URL}/apps`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load applications. HTTP ${response.status}`,
      );
    }

    const data =
      (await response.json()) as AppsResponse;

    const apps = data.apps.map(
      (app) => app.app_name_log,
    );

    localStorage.setItem(
      APP_CACHE_KEY,
      JSON.stringify(apps),
    );

    return apps;
  }

  async refreshLogs(
    appNameLog: string,
  ): Promise<{
    logs: RawLog[];
    newCount: number;
  }> {
    const cachedLogs =
      this.getCachedLogs(appNameLog);

    // First synchronization.
    if (cachedLogs.length === 0) {
      const logs =
        await this.fetchLogs(appNameLog);

      this.saveCachedLogs(appNameLog, logs);

      return {
        logs,
        newCount: logs.length,
      };
    }

    const latestTimestamp =
      this.getLatestTimestamp(cachedLogs);

    if (!latestTimestamp) {
      const logs =
        await this.fetchLogs(appNameLog);

      this.saveCachedLogs(appNameLog, logs);

      return {
        logs,
        newCount: logs.length,
      };
    }

    // Incremental synchronization.
    const newLogs =
      await this.fetchLogs(
        appNameLog,
        latestTimestamp,
      );

    if (newLogs.length === 0) {
      return {
        logs: cachedLogs,
        newCount: 0,
      };
    }

    const mergedLogs =
      this.mergeLogs(
        cachedLogs,
        newLogs,
      );

    this.saveCachedLogs(
      appNameLog,
      mergedLogs,
    );

    return {
      logs: mergedLogs,
      newCount: newLogs.length,
    };
  }

  private async fetchLogs(
    appNameLog: string,
    since?: string,
  ): Promise<RawLog[]> {
    const params = new URLSearchParams();

    params.set(
      "app_name_log",
      appNameLog,
    );

    if (since) {
      params.set("since", since);
    }

    params.set("limit", "5000");

    const response = await fetch(
      `${API_BASE_URL}/logs?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load logs. HTTP ${response.status}`,
      );
    }

    const data =
      (await response.json()) as LogsResponse;

    return data.logs;
  }

  private getCachedApps(): string[] {
    try {
      const value =
        localStorage.getItem(APP_CACHE_KEY);

      if (!value) {
        return [];
      }

      const apps =
        JSON.parse(value) as unknown;

      return Array.isArray(apps)
        ? apps.filter(
            (item): item is string =>
              typeof item === "string",
          )
        : [];
    } catch {
      return [];
    }
  }

  private getCachedLogs(
    appNameLog: string,
  ): RawLog[] {
    try {
      const value =
        localStorage.getItem(
          this.getLogCacheKey(appNameLog),
        );

      if (!value) {
        return [];
      }

      const logs =
        JSON.parse(value) as unknown;

      return Array.isArray(logs)
        ? (logs as RawLog[])
        : [];
    } catch {
      return [];
    }
  }

  private saveCachedLogs(
    appNameLog: string,
    logs: RawLog[],
  ): void {
    localStorage.setItem(
      this.getLogCacheKey(appNameLog),
      JSON.stringify(logs),
    );
  }

  private getLogCacheKey(
    appNameLog: string,
  ): string {
    return `${LOG_CACHE_PREFIX}${appNameLog}`;
  }

  private getLatestTimestamp(
    logs: RawLog[],
  ): string | null {
    if (logs.length === 0) {
      return null;
    }

    let latest: string | null = null;

    for (const log of logs) {
      if (
        typeof log.timestamp !== "string"
      ) {
        continue;
      }

      if (
        latest === null ||
        log.timestamp > latest
      ) {
        latest = log.timestamp;
      }
    }

    return latest;
  }

  private mergeLogs(
    existingLogs: RawLog[],
    newLogs: RawLog[],
  ): RawLog[] {
    const byId = new Map<string, RawLog>();

    for (const log of existingLogs) {
      byId.set(log.id, log);
    }

    for (const log of newLogs) {
      byId.set(log.id, log);
    }

    return Array.from(byId.values()).sort(
      (a, b) =>
        a.timestamp.localeCompare(
          b.timestamp,
        ),
    );
  }
}