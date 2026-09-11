import type { RawLog } from "@/models/rawLog";
import { fetchApps, fetchLogs } from "../api/firebaseApi";
import type { LogRepository } from "./logRepository";

const APP_LIST_CACHE_KEY = "appDiagnostics.appList";
const LOG_CACHE_PREFIX = "appDiagnostics.logs.";

function getLogsCacheKey(appNameLog: string): string {
  return `${LOG_CACHE_PREFIX}${appNameLog}`;
}

export class FirebaseLogRepository implements LogRepository {
  async getApps(): Promise<string[]> {
    const cachedApps = this.getCachedApps();

    if (cachedApps && cachedApps.length > 0) {
      return cachedApps;
    }

    const apps = await fetchApps();

    this.cacheApps(apps);

    return apps;
  }

  async getLogs(
    appNameLog: string,
    options?: {
      forceRefresh?: boolean;
    },
  ): Promise<RawLog[]> {
    let cachedLogs = this.getCachedLogs(appNameLog);

    if (cachedLogs === null || cachedLogs.length === 0) {
      cachedLogs = await fetchLogs(appNameLog);

      this.cacheLogs(appNameLog, cachedLogs);

      return cachedLogs;
    }

    if (options?.forceRefresh) {
      const latestTimestamp = this.getLatestTimestamp(cachedLogs);

      const newLogs = await fetchLogs(appNameLog, {
        since: latestTimestamp,
      });

      if (newLogs.length > 0) {
        cachedLogs = this.appendLogs(cachedLogs, newLogs);

        this.cacheLogs(appNameLog, cachedLogs);
      }
    }

    return cachedLogs;
  }

  async refreshApps(): Promise<string[]> {
    const apps = await fetchApps();

    this.cacheApps(apps);

    return apps;
  }
  // Minimize Firestore reads:
  // - First load: fetch the initial log set.
  // - Subsequent refreshes: query only logs newer than the
  //   latest timestamp already stored locally.
  // This avoids repeatedly reading the entire log collection.

  async refreshLogs(appNameLog: string): Promise<{
    logs: RawLog[];
    newCount: number;
  }> {
    let cachedLogs = this.getCachedLogs(appNameLog);

    if (cachedLogs === null || cachedLogs.length === 0) {
      cachedLogs = await fetchLogs(appNameLog);

      this.cacheLogs(appNameLog, cachedLogs);

      return {
        logs: cachedLogs,
        newCount: cachedLogs.length,
      };
    }

    const latestTimestamp = this.getLatestTimestamp(cachedLogs);

    const newLogs = await fetchLogs(appNameLog, {
      since: latestTimestamp,
    });

    if (newLogs.length > 0) {
      cachedLogs = this.appendLogs(cachedLogs, newLogs);

      this.cacheLogs(appNameLog, cachedLogs);
    }

    return {
      logs: cachedLogs,
      newCount: newLogs.length,
    };
  }

  private getCachedApps(): string[] | null {
    try {
      const cached = localStorage.getItem(APP_LIST_CACHE_KEY);

      if (!cached) {
        return null;
      }

      const apps = JSON.parse(cached);

      return Array.isArray(apps) ? apps : null;
    } catch (error) {
      console.warn("Failed to read app list cache:", error);

      return null;
    }
  }

  private getCachedLogs(appNameLog: string): RawLog[] | null {
    try {
      const cached = localStorage.getItem(getLogsCacheKey(appNameLog));

      if (!cached) {
        return null;
      }

      const logs = JSON.parse(cached);

      return Array.isArray(logs) ? logs : null;
    } catch (error) {
      console.warn(`Failed to read logs cache for ${appNameLog}:`, error);

      return null;
    }
  }

  private cacheApps(apps: string[]): void {
    localStorage.setItem(APP_LIST_CACHE_KEY, JSON.stringify(apps));
  }

  private cacheLogs(appNameLog: string, logs: RawLog[]): void {
    localStorage.setItem(getLogsCacheKey(appNameLog), JSON.stringify(logs));
  }

  private getLatestTimestamp(logs: RawLog[]): string | undefined {
    let latest: string | undefined;

    for (const log of logs) {
      if (!log.timestamp) {
        continue;
      }

      if (
        !latest ||
        new Date(log.timestamp).getTime() > new Date(latest).getTime()
      ) {
        latest = log.timestamp;
      }
    }

    return latest;
  }

  private appendLogs(existingLogs: RawLog[], newLogs: RawLog[]): RawLog[] {
    if (newLogs.length === 0) {
      return existingLogs;
    }

    return [...existingLogs, ...newLogs];
  }
}
