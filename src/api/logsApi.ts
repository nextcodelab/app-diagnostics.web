import { apiGet } from "./api";
import type { RawLog } from "../models/rawLog";

export function fetchApps(): Promise<string[]> {
  return apiGet<string[]>({
    action: "apps",
  });
}

export function fetchLogs(sheetName: string): Promise<RawLog[]> {
  return apiGet<RawLog[]>({
    fullname: sheetName,
  });
}