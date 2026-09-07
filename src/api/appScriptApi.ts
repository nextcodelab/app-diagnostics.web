const APPSCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;


import type { RawLog } from "../models/rawLog";

export async function apiGet<T>(
  params: Record<string, string>
): Promise<T> {
  const url = new URL(APPSCRIPT_URL);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

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