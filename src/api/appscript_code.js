/***********************
 * POST LOG (WRITE)
 ***********************/

function getSheetName(data) {
  const app_name = (data.app || data.app_name || "unknown_app").toLowerCase();
  const platform = (data.platform || "unknown_platform").toLowerCase();
  const sheet_name = `${app_name}-${platform}`;
  return sheet_name;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");

    const app_name = (data.app_name || "unknown_app").toLowerCase();
    const platform = (data.platform || "unknown_platform").toLowerCase();

    const sheet_name = getSheetName(data);

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const sheet = getOrCreateLogSheet(ss, sheet_name, app_name, platform);

    const row = [
      new Date(),
      app_name,
      platform,
      data.level || "info",
      data.type || "log",
      data.message || "",
      data.stack_trace || "",
      data.device || "",
      data.os_version || "",
      data.app_version || "",
      data.user || "",
      data.session_id || "",
      data.tag || "",
    ];

    sheet.appendRow(row);
    const level = data.level || "info";
    applyLogColor(sheet, sheet.getLastRow(), level);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString(),
    });
  }
}

/***********************
 * GET LOGS (READ)
 ***********************/

function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();

  // Special case: return all sheet names
  if (action === "apps") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets().map((s) => s.getName());
    return jsonResponse(sheets);
  }

  // If fullname is provided, use it directly
  let sheet_name;
  if (e.parameter.fullname) {
    sheet_name = e.parameter.fullname;
  } else {
    // Fallback: build from app + platform
    sheet_name = getSheetName({
      app: e.parameter.app,
      platform: e.parameter.platform,
    });
  }

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name);

  if (!sheet) {
    return jsonResponse({
      success: false,
      error: "sheet_not_found: " + sheet_name,
    });
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResponse([]);
  }

  const headers = data[0];
  const rows = data.slice(1);

  const result = rows.map((row) => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });

  return jsonResponse(result);
}

//--------------------------
/***********************
 * CONFIG + HELPERS
 ***********************/

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/***********************
 * HEADER CREATION
 ***********************/

function getOrCreateLogSheet(ss, sheet_name, app_name, platform) {
  let sheet = ss.getSheetByName(sheet_name);

  if (!sheet) {
    sheet = ss.insertSheet(sheet_name);
  }

  const headers = [
    "timestamp",
    "app_name",
    "platform",
    "level",
    "type",
    "message",
    "stack_trace",
    "device",
    "os_version",
    "app_version",
    "user",
    "session_id",
    "tag",
  ];

  const last_row = sheet.getLastRow();

  // =========================
  // CREATE HEADERS (NEW SHEET)
  // =========================
  if (last_row === 0) {
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold"); // ✅ FIXED HERE
    sheet.setFrozenRows(1);
    return sheet;
  }

  // =========================
  // VALIDATE EXISTING HEADERS
  // =========================
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];

  let fix = false;

  for (let i = 0; i < headers.length; i++) {
    if (existing[i] !== headers[i]) {
      fix = true;
      break;
    }
  }

  if (fix) {
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold"); // ✅ FIXED HERE TOO
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function applyLogColor(sheet, row, level) {
  let color = null;

  switch ((level || "").toLowerCase()) {
    case "info":
      color = "#E3F2FD"; // light blue
      break;

    case "warning":
      color = "#FFF8E1"; // light yellow
      break;

    case "error":
      color = "#FFEBEE"; // light red
      break;

    case "crash":
      color = "#B71C1C"; // deep red
      break;

    case "debug":
      color = "#ECEFF1"; // light gray
      break;

    default:
      color = "#FFFFFF";
  }

  const lastCol = sheet.getLastColumn();

  sheet.getRange(row, 1, 1, lastCol).setBackground(color);
}

/***********************
 * TEST FUNCTION
 ***********************/

function testDoPost_error() {
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        app_name: "myapp",
        platform: "android",
        level: "info",
        type: "null_reference",
        message: "Object reference not set",
        stack_trace: "MainPage.cs:42\nLogin.cs:18",
        device: "Pixel 6",
        os_version: "Android 14",
        app_version: "1.0.0",
        user: "test_user",
        session_id: "sess_001",
        tag: "login",
      }),
    },
  };

  var response = doPost(mockEvent);
  Logger.log(response.getContent());
}
function testDoGet() {
  const e = {
    parameter: {
      app: "Battery Alarm & Analytics",
      platform: "windows",
    },
  };

  const sheet_name = getSheetName({
    app_name: e.parameter.app_name,
    platform: e.parameter.platform,
  });

  Logger.log("Looking for sheet: " + sheet_name);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets().map((s) => s.getName());
  Logger.log("Available sheets: " + JSON.stringify(allSheets));

  const sheet = ss.getSheetByName(sheet_name);
  if (!sheet) {
    Logger.log("Sheet not found: " + sheet_name);
    return;
  }

  Logger.log("Found sheet: " + sheet.getName());
}

function testAppsDoGet() {
  const e = {
    parameter: {
      action: "apps",
    },
  };

  // Call your doGet with the simulated event
  const result = doGet(e);

  // Log the JSON output
  Logger.log("Result: " + result.getContent());
}

function deleteOldRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  var num = 185;
  if (lastRow >= num) {
    // Delete rows 1 through 3000
    sheet.deleteRows(1, num);
  } else {
    // If fewer than 3000 rows exist, just clear them all
    sheet.deleteRows(1, lastRow);
  }
}
