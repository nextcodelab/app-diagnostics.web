import { State } from "../state/appState";
import { groupLogs } from "./logService";
import { renderDashboard } from "@/components/dashboard";

// Semantic version parser for regressions check (e.g. "4.8.2" > "4.8.1")

export function applyFilters() {
  const search = (
    document.getElementById("search-input") as HTMLInputElement
  ).value.toLowerCase();
  const version = (
    document.getElementById("filter-version") as HTMLSelectElement
  ).value;

  State.filteredLogs = State.rawLogs.filter((log) => {
    const matchVersion = version === "all" || log.app_version === version;
    const matchSearch =
      !search ||
      log.type?.toLowerCase().includes(search) ||
      log.message?.toLowerCase().includes(search) ||
      log.stack_trace?.toLowerCase().includes(search) ||
      log.mainStackFrame?.toLowerCase().includes(search);
    return matchVersion && matchSearch;
  });

  State.groups = groupLogs(State.filteredLogs);
  renderDashboard();
}
