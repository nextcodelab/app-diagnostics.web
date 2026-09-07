// ============================================================================
// MOCK DATA (Automatically used if API_URL is unset)

import type { RawLog } from "@/models/rawLog";

// ============================================================================
export const mockAppList = ["shepherd bible-windows", "myapp-android"];
export const mockLogs: RawLog[] = [
  {
    timestamp: "2026-09-06T10:32:00.000Z",
    app_name: "shepherd bible",
    app_name_log: "shepherd bible-windows",
    platform: "windows",
    level: "crash",
    type: "NullReferenceException",
    message: "Object reference not set to an instance of an object.",
    stack_trace:
      "System.NullReferenceException: Object reference not set to an instance of an object.\n   at UniversalProject.UWP.Pages.ReaderPage.LoadCompare()\n   at UniversalProject.UWP.Pages.ReaderPage.ReaderPage_Loaded(Object sender, RoutedEventArgs e)",
    device: "DESKTOP-XXXX",
    os_version: "Windows 10 19045",
    app_version: "4.8.2",
    user: "",
    session_id: "sess_001",
    tag: "",
  },
  {
    timestamp: "2026-09-06T09:15:00.000Z",
    app_name: "shepherd bible",
    app_name_log: "shepherd bible-windows",
    platform: "windows",
    level: "error",
    type: "SQLiteException",
    message: "unable to open database file",
    stack_trace:
      "SQLite.SQLiteException: unable to open database file\n   at SQLite.SQLiteCommand.ExecuteNonQuery()\n   at SQLite.SQLiteConnection.Execute()\n   at Engine.Notebooks.BibleNotesHelper.Init()",
    device: "DESKTOP-YYYY",
    os_version: "Windows 11",
    app_version: "4.8.2",
    user: "",
    session_id: "sess_002",
    tag: "",
  },
  {
    timestamp: "2026-09-05T14:20:00.000Z",
    app_name: "shepherd bible",
    app_name_log: "shepherd bible-windows",
    platform: "windows",
    level: "error",
    type: "COMException",
    message: "Error 0x800706BA",
    stack_trace:
      "System.Runtime.InteropServices.COMException (0x800706BA)\n   at WinRT.ExceptionHelpers.ThrowExceptionForHR()\n   at UniversalProject.WinUI.Program.StartProcess()",
    device: "DESKTOP-ZZZZ",
    os_version: "Windows 10 19045",
    app_version: "4.8.1",
    user: "",
    session_id: "sess_003",
    tag: "",
  },
  // Extra entries to test grouping and counting...
  ...Array(10)
    .fill(null)
    .map((_, i) => ({
      timestamp: `2026-09-0${Math.max(1, 6 - i)}T00:00:00.000Z`,
      app_name: "shepherd bible",
      app_name_log: "shepherd bible-windows",
      platform: "windows",
      level: "crash",
      type: "NullReferenceException",
      message: "Object reference not set to an instance of an object.",
      stack_trace:
        "System.NullReferenceException: Object reference not set to an instance of an object.\n   at UniversalProject.UWP.Pages.ReaderPage.LoadCompare()",
      device: `DESKTOP-00${i}`,
      os_version: "Windows 10 19045",
      app_version: "4.8.2",
      user: "",
      session_id: `sess_10${i}`,
      tag: "",
    })),
];
