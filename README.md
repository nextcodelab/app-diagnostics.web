# App Diagnostics Web
A lightweight, web-based diagnostics dashboard for viewing, analyzing, and monitoring application logs.
The dashboard supports multiple diagnostic backends:
* **CloudFlare D1**
*https://dash.cloudflare.com/{guid}/workers/d1*
* **Google Apps Script + Google Sheets**

* **Firebase Firestore**
*Firebase/Firestore/My-Storage/Database/collection/{colllection_name}*

This allows the application to work with the existing Google Sheets-based diagnostics system while also supporting a faster, scalable Firestore-based backend.
The project is built with **Vite + TypeScript** and is designed to work as a standalone web application. It can also be built into a self-contained HTML file for use inside a desktop application such as a WinUI-based application.
---
**## Current Production Backend
The diagnostics system is currently Cloudflare-first.
```text
WinUI / Flutter / Web Application
            │
            │ POST /api/logs
            ▼
Cloudflare Worker
app-diagnostics-api
            │
            ▼
Cloudflare D1
app-diagnostics-db
            ▲
            │
            │ GET /api/logs
            │ GET /api/apps
            │
App Diagnostics Web
```
The primary production API is:
```text
https://{cloudflare-account-domain}.workers.dev/api
```
Primary endpoints:
```text
POST /api/logs
GET  /api/apps
GET  /api/logs?app_name_log=<application>
```
The web dashboard uses the repository abstraction so that the UI remains independent from Cloudflare-specific implementation details.
---
Screenshots**
![App Diagnostics Screenshot](assets/screen.jpeg)
![App Diagnostics Screenshot 2](assets/screen2.jpeg)
---
# Purpose
`app-diagnostics.web` provides a centralized interface for analyzing application diagnostic logs without requiring the diagnostics logic to be implemented directly inside the desktop application.
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
**# Supported Backends
Primary backend: Cloudflare D1 + Cloudflare Workers.
Google Apps Script and Firebase Firestore are retained as legacy/alternative backends.**
The dashboard supports multiple backend implementations, with Cloudflare D1 + Cloudflare Workers as the primary implementation.
**## Cloudflare D1 + Cloudflare Workers
Cloudflare is the primary diagnostics backend. Cloudflare Workers provides the HTTP API and Cloudflare D1 provides the persistent SQL database.
```text
Application
     │
     │ diagnostic logs
     ▼
Cloudflare Worker API
     │
     ▼
Cloudflare D1
     │
     ▼
App Diagnostics Web
```
The production API exposes endpoints such as:
```text
GET  /api/apps
GET  /api/logs?app_name_log=shepherd-bible-windows
POST /api/logs
```
Applications submit diagnostic logs through the Worker API, while the dashboard retrieves application-specific logs through the same API.
Google Apps Script (Legacy) (Legacy/Alternative)**
The original backend uses Google Apps Script as an API layer over Google Sheets.
```text
Application
     │
     │ diagnostic logs
     ▼
Google Sheets
     │
     ▼
Google Apps Script
     │
     │ HTTP / JSON
     ▼
App Diagnostics Web
```
This backend is useful for existing applications that already submit their diagnostics to Google Sheets.
## Firebase Firestore (Legacy/Alternative) (Legacy/Alternative)
The Firestore backend stores diagnostic information directly in Firebase Cloud Firestore.
```text
Application
     │
     │ diagnostic logs
     ▼
Firebase Firestore
     │
     │ Firestore query
     ▼
App Diagnostics Web
```
Firestore is particularly useful when applications generate a larger number of diagnostic logs or when faster application-specific queries are required.
---
**# Cloudflare D1 Data Structure
The primary backend stores diagnostics in SQL tables such as `app_names` and `diagnostic_logs`.
```text
Cloudflare D1
│
├── app_names
│   ├── app_name_log
│   └── app_name
│
└── diagnostic_logs
    ├── id
    ├── app_name
    ├── app_name_log
    ├── timestamp
    ├── app_version
    ├── platform
    ├── level
    ├── type
    ├── message
    ├── stack_trace
    ├── device
    ├── os_version
    ├── user
    ├── session_id
    └── tag
```
`diagnostic_logs` stores individual diagnostic events, while `app_names` provides the registered application list.
---
Firestore Data Structure (Legacy)**
The Firestore backend uses a global diagnostic log collection together with an application-name collection.
```text
Firestore
│
├── diagnostic_logs
│   └── {logId}
│       ├── app_name
│       ├── app_name_log
│       ├── timestamp
│       ├── app_version
│       ├── platform
│       ├── level
│       ├── type
│       ├── message
│       ├── stack_trace
│       ├── device
│       ├── os_version
│       ├── user
│       ├── session_id
│       └── tag
│
└── app_names
    └── {appNameId}
        ├── app_name
        └── ...
```
### `diagnostic_logs`
`diagnostic_logs` stores individual application diagnostic events.
Each log is stored as a separate Firestore document, normally using an automatically generated document ID.
Example:
```text
diagnostic_logs/{logId}
```
The dashboard can query logs by `app_name` and retrieve only the logs required for the selected application.
For example:
```text
diagnostic_logs
    WHERE app_name == "shepherd bible"
    ORDER BY timestamp DESC
    LIMIT 50
```
This allows the dashboard to retrieve the latest logs for an application without downloading the entire global log collection.
### `app_name_log`
`app_names` stores application-name information used by the Firestore diagnostics system.
It can be used to maintain the list of registered applications and provide application information independently from individual diagnostic log documents.
Example:
```text
app_names/{appNameId}
```
The application list can therefore be loaded first, followed by application-specific diagnostic logs.
---
**# Cloudflare Query Flow
A typical request follows this flow:
```text
User selects application
        │
        ▼
Application name
        │
        ▼
Cloudflare Worker API
        │
        ▼
Cloudflare D1
        │
        ├── app_name_log filter
        ├── timestamp ordering
        └── result limit
        │
        ▼
RawLog[]
        │
        ▼
Log processing
        │
        ▼
Error grouping
        │
        ▼
Dashboard
```
The Worker API keeps database access out of the frontend and provides a stable HTTP/JSON boundary.
---
Firestore Query Flow (Legacy)**
A typical Firestore request follows this flow:
```text
User selects application
        │
        ▼
Application name
        │
        ▼
Firestore query
        │
        ▼
diagnostic_logs
        │
        ├── app_name filter
        ├── timestamp ordering
        └── result limit
        │
        ▼
RawLog[]
        │
        ▼
Log processing
        │
        ▼
Error grouping
        │
        ▼
Dashboard
```
The global `diagnostic_logs` collection is intentional. Logs from different applications can coexist in the same collection while queries retrieve only the documents belonging to the selected application.
---
# Architecture
The application uses a backend-independent frontend architecture.
```text
┌──────────────────────────────┐
│        Application           │
│     WinUI / Flutter / Web    │
└──────────────┬───────────────┘
               │
               │ writes diagnostic logs
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ Google       │  │ Firebase         │
│ Apps Script  │  │ Firestore        │
│ + Sheets     │  │                  │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       │ HTTP / JSON       │ Firestore
       │                   │ queries
       └─────────┬─────────┘
                 ▼
┌──────────────────────────────┐
│     app-diagnostics.web      │
│                              │
│      Vite + TypeScript       │
│                              │
│ API → Services → State       │
│                 ↓            │
│            Components        │
│                 ↓            │
│             Dashboard        │
└──────────────────────────────┘
```
The frontend does not depend directly on a storage implementation. Cloudflare Worker API is the primary production backend, while the repository abstraction allows legacy/alternative backends to remain available.
The backend can be selected through the application's configuration.
---
# Google Apps Script (Legacy) API
The frontend can communicate with a deployed **Google Apps Script Web App**.
The Apps Script acts as the backend/API layer between the dashboard and Google Sheets.
Example:
```text
GET /exec?action=apps
```
Returns the available applications.
A log request can contain the application or sheet name:
```text
GET /exec?fullname=shepherd%20bible-windows
```
The exact API parameters are defined by the Google Apps Script implementation.
## API Responsibilities
The Apps Script backend is responsible for:
1. Receiving HTTP requests
2. Determining the requested operation
3. Reading the appropriate Google Sheet
4. Converting spreadsheet rows into JSON
5. Returning the JSON response to the web application
The frontend is responsible for presentation, filtering, grouping, and visualization.
---
**# Cloudflare Backend
The Cloudflare repository communicates with the Cloudflare Worker API over HTTP/JSON.
Its responsibilities include:
Loading registered application names
Querying application diagnostic logs
Filtering logs by application name
Ordering logs by timestamp
Limiting returned results
Supporting incremental log retrieval using a timestamp cursor
Returning diagnostic data to the frontend
The Worker performs the actual D1 database access.
---
Firebase Firestore Backend (Legacy/Alternative)**
The Firestore backend communicates directly with Firebase services.
Its responsibilities include:
1. Loading registered application names
2. Querying application diagnostic logs
3. Filtering logs by application name
4. Ordering logs by timestamp
5. Limiting returned results
6. Returning diagnostic data to the frontend
The Firestore backend is designed around the global:
```text
diagnostic_logs
```
collection.
Application-specific retrieval is performed using the `app_name` field.
Example conceptual query:
```text
diagnostic_logs
    app_name == selectedApplication
    order by timestamp DESC
    limit N
```
This avoids loading unrelated applications' logs into the dashboard.
---
# Frontend Structure
The source code is organized by responsibility rather than placing all functionality in a single file.
```text
src/
│
├── api/
│   ├── appScriptApi.ts
│   ├── firebaseApi.ts
│   └── ...
│
├── charts/
│   └── chart.ts
│
├── components/
│   ├── appList.ts
│   ├── dashboard.ts
│   ├── detailView.ts
│   ├── events.ts
│   └── theme.ts
│
├── config/
│   └── config.ts
│
├── mock/
│   └── mockData.ts
│
├── models/
│   ├── errorGroup.ts
│   ├── processedLog.ts
│   └── rawLog.ts
│
├── services/
│   ├── errorGroupingService.ts
│   ├── filterService.ts
│   └── logService.ts
│
├── state/
│   └── appState.ts
│
├── utils/
│   └── htmHelper.ts
│
├── main.ts
├── index.html
├── counter.ts
└── style.css
```
---
# API Layer
## `src/api/appScriptApi.ts` || `firebaseApi.ts`
Responsible for communication with the configured diagnostics backend.
Depending on the selected backend, the API layer can communicate with:
* Google Apps Script
* Firebase Firestore
Typical operations include:
```ts
fetchApps()
```
and:
```ts
fetchLogs(appName)
```
The API layer should contain network/backend communication only.
It should not contain UI rendering or error-grouping logic.
---
# Models
The models describe the structure of diagnostic data.
## `rawLog.ts`
Represents a raw diagnostic log returned by a backend.
```ts
export interface RawLog {
  id: string;
  timestamp: string;
  app_name: string;
  app_name_log: string;
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
The model can be extended as additional diagnostic information is added.
---
# `processedLog.ts`
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
---
# `errorGroup.ts`
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
## `appList.ts`
Displays the list of applications available from the configured backend.
Applications may be loaded from:
* Google Apps Script
* Firestore `app_name_log`
## `dashboard.ts`
Displays the main diagnostics dashboard, including:
* Statistics
* Error groups
* Charts
* Filters
* Application information
## `detailView.ts`
Displays detailed information about a selected error, including:
* Error message
* Exception type
* Stack trace
* Occurrences
* Versions
* Sessions
* Device information
## `events.ts`
Contains UI event handlers and connects user actions to application services.
## `theme.ts`
Controls the application's light/dark theme.
---
# Charts
## `src/charts/chart.ts`
Contains chart-related functionality.
Charts can be used to visualize:
* Error occurrences over time
* Errors by application version
* Error frequency
* Other diagnostic statistics
Chart rendering is kept separate from dashboard logic.
---
# Mock Data
## `src/mock/mockData.ts`
Contains development/test data.
When a backend is unavailable or no backend is configured, mock data can be used to develop the dashboard without requiring a production backend.
This allows frontend development without modifying production diagnostic data.
---
**# Data Flow
Cloudflare D1 + Cloudflare Workers (Primary)**
**## Cloudflare D1 + Cloudflare Workers
Cloudflare is the primary diagnostics backend. Cloudflare Workers provides the HTTP API and Cloudflare D1 provides the persistent SQL database.
```text
Application
     │
     │ diagnostic logs
     ▼
Cloudflare Worker API
     │
     ▼
Cloudflare D1
     │
     ▼
App Diagnostics Web
```
The production API exposes endpoints such as:
```text
GET  /api/apps
GET  /api/logs?app_name_log=shepherd-bible-windows
POST /api/logs
```
Applications submit diagnostic logs through the Worker API, while the dashboard retrieves application-specific logs through the same API.
Google Apps Script (Legacy) (Legacy/Alternative)**
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
     appScriptApi.ts
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
## Firebase Firestore (Legacy/Alternative) (Legacy/Alternative)
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
     firebaseApi.ts
        │
        ▼
Firebase Firestore
        │
        ├── app_names
        │
        └── diagnostic_logs
                │
                │ app_name filter
                │ timestamp DESC
                │ limit
                ▼
          RawLog[]
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
# Backend Independence
The frontend is intentionally designed to keep backend-specific implementation separate from the dashboard.
The dashboard should work with a common diagnostic data model regardless of whether the source is:
```text
Google Apps Script
        or
Firebase Firestore
```
This makes it possible to migrate applications from legacy backends to Cloudflare without redesigning the dashboard UI.
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
* Backend-independent
* Suitable for desktop WebView integration
* Usable as a standalone web application
* Easy to extend with additional diagnostics
* Cloudflare-first production backend
Compatible with legacy Google Apps Script and Firebase Firestore backends
The frontend remains focused on **diagnostics visualization and analysis**, while backend implementations are responsible for **data retrieval and storage access**.
---
# Google Apps Script (Legacy)
The Google Apps Script backend is maintained separately from the frontend.
The Apps Script source used by the project is located in:
```text
src/api/appscript_code.js
```
The script can be edited and extended to add or customize Google Sheets-based diagnostics functionality.
---
# Repository
Repository:
```text
nextcodelab/app-diagnostics.web
```
This repository contains the web frontend only.
The CloudFlare D1 backend is maintained separately.
The Google Apps Script backend is maintained separately.
The Firebase Firestore backend is also maintained separately from the frontend UI and can be configured as an alternative diagnostics data source.