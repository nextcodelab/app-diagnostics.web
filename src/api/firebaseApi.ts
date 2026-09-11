import type { RawLog } from "../models/rawLog";

const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let idToken = "";

const INITIAL_LOG_LIMIT = 5000;
const REFRESH_LOG_LIMIT = 5000;

interface FirebaseAuthResponse {
  idToken: string;
  refreshToken: string;
  localId: string;
  expiresIn: string;
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreField>;
}

interface FirestoreField {
  stringValue?: string;
  timestampValue?: string;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
}

interface FirestoreQueryResult {
  document?: FirestoreDocument;
}

interface FirestoreFilterValue {
  stringValue?: string;
  timestampValue?: string;
}

interface FirestoreFieldFilter {
  fieldFilter: {
    field: {
      fieldPath: string;
    };
    op: string;
    value: FirestoreFilterValue;
  };
}

/**
 * Authenticate anonymously with Firebase.
 */
async function authenticateFirebase(): Promise<boolean> {
  try {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        returnSecureToken: true,
      }),
    });

    const body = await response.text();

    if (!response.ok) {
      console.error("Firebase authentication failed:", response.status, body);

      return false;
    }

    const auth = JSON.parse(body) as FirebaseAuthResponse;

    if (!auth.idToken) {
      console.error("Firebase authentication failed: ID token missing.");

      return false;
    }

    idToken = auth.idToken;

    return true;
  } catch (error) {
    console.error("Firebase authentication exception:", error);

    return false;
  }
}

/**
 * Make sure we have an authenticated Firebase token.
 */
async function ensureAuthenticated(): Promise<boolean> {
  if (idToken) {
    return true;
  }

  return authenticateFirebase();
}

/**
 * Firestore REST GET request.
 */
async function firestoreGet<T>(url: string): Promise<T> {
  if (!(await ensureAuthenticated())) {
    throw new Error("Firebase authentication failed.");
  }

  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  // Token expired/rejected.
  if (response.status === 401) {
    idToken = "";

    if (!(await authenticateFirebase())) {
      throw new Error("Firebase re-authentication failed.");
    }

    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
  }

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Firestore request failed: HTTP ${response.status} - ${body}`,
    );
  }

  return JSON.parse(body) as T;
}

/**
 * Get all app names from:
 *
 * app_names
 *    └── document
 *          └── app_name_log
 */
export async function fetchApps(): Promise<string[]> {
  const url = `${FIRESTORE_BASE_URL}/app_names`;

  const result = await firestoreGet<FirestoreListResponse>(url);

  if (!result.documents) {
    return [];
  }

  return result.documents
    .map((document) => {
      const field = document.fields?.["app_name_log"];

      return field?.stringValue ?? "";
    })
    .filter((name) => name.trim().length > 0)
    .filter(
      (name, index, array) =>
        array.findIndex((x) => x.toLowerCase() === name.toLowerCase()) ===
        index,
    )
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Get logs for a specific app.
 *
 * Uses:
 * app_name_log == selectedApp
 *
 * and sorts newest timestamp first.
 */
export async function fetchLogs(
  appNameLog: string,
  options?: {
    since?: string;
    limit?: number;
  },
): Promise<RawLog[]> {
  if (!appNameLog.trim()) {
    return [];
  }

  if (!(await ensureAuthenticated())) {
    throw new Error("Firebase authentication failed.");
  }

  const since = options?.since;
  const limit =
    options?.limit ?? (since ? REFRESH_LOG_LIMIT : INITIAL_LOG_LIMIT);

  const url = `${FIRESTORE_BASE_URL.replace(
    "/documents",
    "",
  )}/documents:runQuery`;

  const filters: FirestoreFieldFilter[] = [
    {
      fieldFilter: {
        field: {
          fieldPath: "app_name_log",
        },

        op: "EQUAL",

        value: {
          stringValue: appNameLog,
        },
      },
    },
  ];

  /**
   * On refresh, only request records newer than
   * the newest locally cached record.
   */
  if (since) {
    filters.push({
      fieldFilter: {
        field: {
          fieldPath: "timestamp",
        },

        op: "GREATER_THAN",

        value: {
          timestampValue: since,
        },
      },
    });
  }

  const requestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: "diagnostic_logs",
        },
      ],

      where:
        filters.length === 1
          ? filters[0]
          : {
              compositeFilter: {
                op: "AND",
                filters,
              },
            },

      orderBy: [
        {
          field: {
            fieldPath: "timestamp",
          },

          direction: "ASCENDING",
        },
      ],

      limit,
    },
  };

  let response = await fetch(url, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify(requestBody),
  });

  if (response.status === 401) {
    idToken = "";

    if (!(await authenticateFirebase())) {
      throw new Error("Firebase re-authentication failed.");
    }

    response = await fetch(url, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify(requestBody),
    });
  }

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Firestore query failed: HTTP ${response.status} - ${body}`,
    );
  }

  const results = JSON.parse(body) as FirestoreQueryResult[];
  const logs = results
    .filter((result) => result.document)
    .map((result) => convertFirestoreDocument(result.document!));

  console.log("[Firestore] Fetch result", {
    appNameLog,
    since: since ?? null,
    returnedCount: logs.length,
    oldestTimestamp: logs[0]?.timestamp ?? null,
    newestTimestamp: logs[logs.length - 1]?.timestamp ?? null,
  });

  return results
    .filter((result) => result.document)
    .map((result) => convertFirestoreDocument(result.document!));
}

/**
 * Convert Firestore REST document to RawLog.
 */
function convertFirestoreDocument(document: FirestoreDocument): RawLog {
  const fields = document.fields ?? {};

  return {
    app_name: fields.app_name?.stringValue ?? "",

    app_name_log: fields.app_name_log?.stringValue ?? "",

    platform: fields.platform?.stringValue ?? "",

    level: fields.level?.stringValue ?? "",

    type: fields.type?.stringValue ?? "",

    message: fields.message?.stringValue ?? "",

    stack_trace: fields.stack_trace?.stringValue ?? "",

    device: fields.device?.stringValue ?? "",

    os_version: fields.os_version?.stringValue ?? "",

    app_version: fields.app_version?.stringValue ?? "",

    user: fields.user?.stringValue ?? "",

    session_id: fields.session_id?.stringValue ?? "",

    tag: fields.tag?.stringValue ?? "",

    timestamp: fields.timestamp?.timestampValue ?? "",
  };
}
