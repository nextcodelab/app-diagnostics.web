# App Diagnostics Web

A lightweight web-based diagnostics dashboard for viewing, analyzing, and monitoring application logs collected through **Google Apps Script**.

The project is built with **Vite + TypeScript** and is designed to work as a standalone web application. It can also be built into a self-contained HTML file for use inside a desktop application such as the WinUI-based application that consumes this diagnostics dashboard.

## Screenshots

![App Diagnostics Screenshot](https://github.com/nextcodelab/app-diagnostics.web/blob/main/assets/screen.jpeg?raw=true)

## Purpose

`app-diagnostics.web` provides a centralized interface for analyzing application error logs without requiring the diagnostics logic to be implemented directly inside the desktop application.

The dashboard can:

* Display applications available in the diagnostics backend
* Load logs for a selected application
* Group similar errors and exceptions
* Display error occurrence counts
* Identify affected sessions
* Compare application versions
* Detect possible regressions
* Filter logs by version and search terms
* Display error details and stack traces
* Visualize error activity over time
* Cache previously loaded data locally
* Work as a standalone built web application

The web application is intended primarily for **developer and application-maintenance diagnostics**.

---

## Architecture

The application uses a simple frontend/API architecture:

```text
┌──────────────────────────────┐
│        Application           │
│     (WinUI / Other Apps)     │
└──────────────┬───────────────┘
               │
               │ writes diagnostic logs
               ▼
┌──────────────────────────────┐
│       Google Sheets          │
│        Log Storage           │
└──────────────┬───────────────┘
               │
               │ Google Apps Script
               ▼
┌──────────────────────────────┐
│      Google Apps Script      │
│           API                │
│                              │
│  - List applications         │
│  - Return application logs   │
│  - Process request params    │
└──────────────┬───────────────┘
               │
               │ HTTP / JSON
               ▼
┌──────────────────────────────┐
│      app-diagnostics.web     │
│                              │
│      Vite + TypeScript       │
│                              │
│  API → Services → State      │
│                  ↓           │
│              Components      │
│                  ↓           │
│              Dashboard       │
└──────────────────────────────┘
```

---

# Google Apps Script API

The frontend communicates with a deployed **Google Apps Script Web App**.

The Apps Script acts as the backend/API layer between the dashboard and the diagnostic log storage.

The frontend does not directly access Google Sheets. Instead, requests are sent to the Apps Script endpoint and the API returns JSON data.

Example:

```text
GET /exec?action=apps
```

Returns the available applications.

A log request can contain the application/sheet name:

```text
GET /exec?fullname=shepherd%20bible-windows
```

The exact API parameters are defined by the Google Apps Script implementation.

### API responsibilities

The Apps Script backend is responsible for:

1. Receiving HTTP requests
2. Determining the requested operation
3. Reading the appropriate Google Sheet
4. Converting spreadsheet rows into JSON
5. Returning the JSON response to the web application

The frontend is responsible for presentation, filtering, grouping, and visualization.

---

# Frontend Structure

The source code is organized by responsibility rather than placing all functionality in a single file.

```text
src/
│
├── api/
│   └── logsApi.ts
│
├── charts/
│   └── chart.ts
│
├── components/
│   ├── appList.ts
│   ├── dashboard.ts
│   ├── detailView.ts
│   ├── events.ts
│   └── theme.ts
│
├── config/
│   └── config.ts
│
├── mock/
│   └── mockData.ts
│
├── models/
│   ├── errorGroup.ts
│   ├── processedLog.ts
│   └── rawLog.ts
│
├── services/
│   ├── errorGroupingService.ts
│   ├── filterService.ts
│   └── logService.ts
│
├── state/
│   └── appState.ts
│
├── utils/
│   └── htmHelper.ts
│
├── main.ts
├── index.ts
├── counter.ts
└── style.css
```

---

## API Layer

### `src/api/logsApi.ts`

Responsible for communication with the Google Apps Script backend.

It provides functions such as:

```ts
fetchApps()
```

and:

```ts
fetchLogs(sheetName)
```

The API layer should contain network communication only.

It should not contain UI rendering or error-grouping logic.

---

# Models

The models describe the structure of diagnostic data.

## `rawLog.ts`

Represents a raw log returned by the backend.

```ts
export interface RawLog {
  timestamp: string;
  app_name: string;
  platform: string;
  level: string;
  type: string;
  message: string;
  stack_trace: string;
  device: string;
  os_version: string;
  app_version: string;
  user: string;
  session_id: string;
  tag: string;
}
```

## `processedLog.ts`

Represents a log after it has been analyzed by the frontend.

Additional information can include:

* Exception type
* Main stack frame
* Error grouping key
* Shortened error message

```text
RawLog
   ↓
Log Processing
   ↓
ProcessedLog
```

## `errorGroup.ts`

Represents a collection of similar errors.

An error group can contain:

* Exception type
* Main stack frame
* Error message
* Occurrences
* Affected sessions
* Application versions
* Latest occurrence
* Regression information

This allows many individual log entries to be displayed as a single meaningful error.

---

# Services

The service layer contains the application's business logic.

## `logService.ts`

Responsible for:

* Loading logs
* Processing raw logs
* Extracting exception information
* Extracting useful stack frames
* Grouping related errors
* Sorting error groups
* Detecting regressions

The service transforms backend data into data that the dashboard can display.

---

## `filterService.ts`

Responsible for filtering processed logs.

Examples include:

```text
Application version
Search text
Error type
```

Filtering is kept separate from UI components so the same logic can be reused by different views.

---

## `errorGroupingService.ts`

Responsible for determining when multiple log entries represent the same underlying error.

For example:

```text
System.NullReferenceException
    at MyApp.Pages.ReaderPage.Load()

System.NullReferenceException
    at MyApp.Pages.ReaderPage.Load()

System.NullReferenceException
    at MyApp.Pages.ReaderPage.Load()
```

can become:

```text
NullReferenceException
ReaderPage.Load()

Occurrences: 3
```

---

# State

## `src/state/appState.ts`

Contains the application's current state.

The state includes information such as:

```text
Available applications
Current application
Loaded logs
Filtered logs
Error groups
Current theme
Chart instances
```

The goal is to keep application state separate from rendering logic.

---

# Components

The component layer controls the user interface.

### `appList.ts`

Displays the list of applications available from the backend.

### `dashboard.ts`

Displays the main diagnostics dashboard, including:

* Statistics
* Error groups
* Charts
* Filters
* Application information

### `detailView.ts`

Displays detailed information about a selected error, including:

* Error message
* Exception type
* Stack trace
* Occurrences
* Versions
* Sessions
* Device information

### `events.ts`

Contains UI event handlers and connects user actions to application services.

### `theme.ts`

Controls the application's light/dark theme.

---

# Charts

## `src/charts/chart.ts`

Contains chart-related functionality.

Charts can be used to visualize:

* Error occurrences over time
* Errors by application version
* Other diagnostic statistics

Chart rendering is kept separate from the dashboard logic.

---

# Mock Data

## `src/mock/mockData.ts`

Contains development/test data.

When the Google Apps Script API is unavailable or no API URL is configured, mock data can be used to develop the dashboard without requiring the backend.

This allows frontend development without modifying production diagnostic data.

---

# Data Flow

A typical request follows this flow:

```text
User selects application
          │
          ▼
      appList.ts
          │
          ▼
     logService.ts
          │
          ▼
       logsApi.ts
          │
          ▼
 Google Apps Script API
          │
          ▼
    Google Sheets
          │
          ▼
       JSON data
          │
          ▼
     logService.ts
          │
          ▼
    ProcessedLog[]
          │
          ▼
 errorGroupingService
          │
          ▼
    ErrorGroup[]
          │
          ▼
     appState.ts
          │
          ▼
     dashboard.ts
          │
          ▼
       Dashboard
```

---

# Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

Build the application:

```bash
npm run build
```

The production output is generated in:

```text
dist/
```

---

# Standalone HTML

The project uses `vite-plugin-singlefile` to generate a self-contained HTML application.

The production build can therefore embed the JavaScript and CSS directly into:

```text
dist/index.html
```

This is useful when the dashboard needs to be opened locally or loaded by another desktop application.

The project is configured with:

```ts
base: "./"
```

to support relative resources.

---

# Relationship With the WinUI Application

This project is intentionally maintained as a **separate repository** from the WinUI application.

```text
WinUI Application
│
├── Native application code
│
└── WebView / Web integration
          │
          ▼
    app-diagnostics.web
```

Separating the repositories keeps the frontend independent from the .NET project.

This allows the web dashboard to have its own:

* TypeScript codebase
* npm dependencies
* Vite configuration
* Git history
* Release cycle
* Development workflow

The WinUI application can consume the generated web output without the Vite source code being part of the .NET build.

---

# Design Goals

The project aims to remain:

* Lightweight
* Easy to maintain
* Modular
* Framework-independent on the backend
* Suitable for desktop WebView integration
* Usable as a standalone web application
* Easy to extend with additional diagnostics

The frontend should remain focused on **diagnostics visualization and analysis**, while Google Apps Script remains responsible for **data retrieval and backend access**.

---

# Repository

Repository:

`nextcodelab/app-diagnostics.web`

This repository contains the web frontend only. The Google Apps Script backend is maintained separately.
