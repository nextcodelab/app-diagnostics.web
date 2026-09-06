import type { ProcessedLog } from "@/models/processedLog";
import type { ErrorGroup } from "@/models/errorGroup";
// --- State ---
export const State = {
  apps: [] as string[],
  currentSheetName: "",
  rawLogs: [] as ProcessedLog[],
  filteredLogs: [] as ProcessedLog[],
  groups: [] as ErrorGroup[],
  theme: "dark",
  charts: { timeline: null as any, versions: null as any },
};