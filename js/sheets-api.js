/**
 * Baladatta Attendance - Google Sheets API & OAuth Integration
 * Robust OAuth 2.0 via Google Identity Services & GAPI Client v4.
 */

const SheetsAPI = (() => {
  const CONFIG = {
    CLIENT_ID: "1062324886633-brv79jb9smbkrpd9iuvtj5galvhbqfqh.apps.googleusercontent.com",
    SPREADSHEET_ID: "1qnNF6HZXxWksMjJ-Z06Ovk64CWMvXFHeTieaTi8xZ5M",
    SCOPES: "https://www.googleapis.com/auth/spreadsheets",
    DISCOVERY_DOCS: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    STORAGE_TOKEN_KEY: "baladatta_oauth_token_v1",
    STORAGE_EXPIRY_KEY: "baladatta_oauth_expiry_v1"
  };

  let tokenClient = null;
  let isGapiLoaded = false;
  let isSignedIn = false;
  let authSuccessCallback = null;
  let authErrorCallback = null;

  /**
   * Safe script loader / poller to ensure GAPI and GIS are fully ready.
   */
  function initGoogleAuth(onAuthSuccess, onAuthError) {
    authSuccessCallback = onAuthSuccess;
    authErrorCallback = onAuthError;

    checkAndInitLibraries();
  }

  function checkAndInitLibraries(retryCount = 0) {
    const hasGapi = typeof gapi !== "undefined";
    const hasGis = typeof google !== "undefined" && google.accounts && google.accounts.oauth2;

    if (hasGapi && !isGapiLoaded) {
      gapi.load("client", async () => {
        try {
          await gapi.client.init({
            discoveryDocs: CONFIG.DISCOVERY_DOCS
          });
          isGapiLoaded = true;
          console.log("[SheetsAPI] GAPI client initialized");
          restorePersistedSession();
        } catch (e) {
          console.warn("[SheetsAPI] GAPI init error:", e);
        }
      });
    }

    if (hasGis && !tokenClient) {
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CONFIG.CLIENT_ID,
          scope: CONFIG.SCOPES,
          callback: async (resp) => {
            if (resp.error) {
              console.error("[SheetsAPI] OAuth error:", resp);
              if (authErrorCallback) authErrorCallback(resp);
              return;
            }

            // CRITICAL FIX: Pass the token to GAPI client so requests are authenticated
            if (typeof gapi !== "undefined" && gapi.client) {
              gapi.client.setToken(resp);
            }

            isSignedIn = true;
            persistToken(resp);

            if (authSuccessCallback) authSuccessCallback(resp);
          }
        });
        console.log("[SheetsAPI] GIS Token Client initialized");
      } catch (err) {
        console.warn("[SheetsAPI] Token client init error:", err);
      }
    }

    // If external scripts are still downloading, retry every 300ms up to 20 times (6s)
    if ((!isGapiLoaded || !tokenClient) && retryCount < 20) {
      setTimeout(() => checkAndInitLibraries(retryCount + 1), 300);
    }
  }

  function persistToken(tokenResp) {
    try {
      if (tokenResp && tokenResp.access_token) {
        const expiresIn = parseInt(tokenResp.expires_in, 10) || 3500;
        const expiryTime = Date.now() + (expiresIn * 1000) - 60000; // 1 min buffer
        sessionStorage.setItem(CONFIG.STORAGE_TOKEN_KEY, JSON.stringify(tokenResp));
        sessionStorage.setItem(CONFIG.STORAGE_EXPIRY_KEY, String(expiryTime));
      }
    } catch (e) {
      console.warn("[SheetsAPI] Session token storage failed:", e);
    }
  }

  function restorePersistedSession() {
    try {
      const rawToken = sessionStorage.getItem(CONFIG.STORAGE_TOKEN_KEY);
      const rawExpiry = sessionStorage.getItem(CONFIG.STORAGE_EXPIRY_KEY);

      if (rawToken && rawExpiry) {
        const expiry = parseInt(rawExpiry, 10);
        if (Date.now() < expiry) {
          const tokenObj = JSON.parse(rawToken);
          if (typeof gapi !== "undefined" && gapi.client) {
            gapi.client.setToken(tokenObj);
            isSignedIn = true;
            console.log("[SheetsAPI] Restored active OAuth session from storage");
            if (authSuccessCallback) authSuccessCallback(tokenObj);
            return true;
          }
        } else {
          sessionStorage.removeItem(CONFIG.STORAGE_TOKEN_KEY);
          sessionStorage.removeItem(CONFIG.STORAGE_EXPIRY_KEY);
        }
      }
    } catch (e) {
      console.warn("[SheetsAPI] Restoring session failed:", e);
    }
    return false;
  }

  function signIn() {
    if (!tokenClient) {
      console.warn("[SheetsAPI] Token client not ready yet. Retrying initialization...");
      checkAndInitLibraries();
      setTimeout(() => {
        if (tokenClient) {
          tokenClient.requestAccessToken({ prompt: "consent" });
        } else {
          alert("Google Sign-In is still loading. Please check your internet connection or try again in a few seconds.");
        }
      }, 500);
      return false;
    }

    // Request access token (opens Google OAuth popup)
    tokenClient.requestAccessToken({ prompt: "" });
    return true;
  }

  function getIsSignedIn() {
    return isSignedIn;
  }

  /**
   * Fetches students from Google Sheet tab for a level.
   * If not connected or error, falls back to Store.
   */
  async function fetchStudentsFromSheet(levelId) {
    if (!isSignedIn || !isGapiLoaded) {
      return Store.getStudentsForLevel(levelId);
    }
    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${levelId}!A2:A`
      });
      const rows = response.result.values ? response.result.values.flat().filter(Boolean) : [];
      if (rows.length > 0) {
        Store.setStudentsForLevel(levelId, rows);
        return rows;
      }
      return Store.getStudentsForLevel(levelId);
    } catch (err) {
      console.warn(`[SheetsAPI] Error fetching students from Sheet (${levelId}):`, err);
      return Store.getStudentsForLevel(levelId);
    }
  }

  /**
   * Fetches historical logs from 'Logs' tab.
   */
  async function fetchLogsFromSheet() {
    if (!isSignedIn || !isGapiLoaded) {
      return Store.getLogs();
    }
    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `Logs!A2:F`
      });
      const rows = response.result.values || [];
      if (rows.length > 0) {
        const parsedLogs = rows.map(r => ({
          date: r[0] || "",
          teacher: r[1] || "",
          student: r[2] || "",
          status: r[3] || "Absent",
          level: r[4] || "",
          timestamp: r[5] || (r[0] ? new Date(r[0]).toISOString() : new Date().toISOString())
        })).filter(l => l.student && l.date);

        Store.saveLogs(parsedLogs);
        return parsedLogs;
      }
    } catch (err) {
      console.warn("[SheetsAPI] Error fetching logs from sheet:", err);
    }
    return Store.getLogs();
  }

  /**
   * Submits attendance for a given level and date.
   * Updates local store immediately AND appends to Google Sheets Logs tab.
   */
  async function submitAttendance(levelId, dateStr, attendanceMap, teacherName) {
    const students = Object.keys(attendanceMap);
    const nowIso = new Date().toISOString();
    const formattedDate = Store.formatDate(dateStr);

    const logEntries = students.map(student => ({
      date: formattedDate,
      timestamp: nowIso,
      teacher: teacherName,
      student: student,
      status: attendanceMap[student] || "Absent",
      level: levelId
    }));

    // Always update local store first (immediate offline reactivity)
    Store.appendLogs(logEntries);

    if (isSignedIn && isGapiLoaded) {
      try {
        // 1. Append rows to Logs tab
        const sheetRows = logEntries.map(l => [
          l.date,
          l.teacher,
          l.student,
          l.status,
          l.level,
          l.timestamp
        ]);

        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId: CONFIG.SPREADSHEET_ID,
          range: `Logs!A:F`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          resource: { values: sheetRows }
        });

        // 2. Update status column in the level's specific sheet (Col A = Name, Col B = Status)
        const statusColumnValues = students.map(s => [attendanceMap[s] || "Absent"]);
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: CONFIG.SPREADSHEET_ID,
          range: `${levelId}!B2:B${students.length + 1}`,
          valueInputOption: "USER_ENTERED",
          resource: { values: statusColumnValues }
        });

        return { success: true, syncedWithSheet: true };
      } catch (err) {
        console.error("[SheetsAPI] Google Sheets submit error:", err);
        return { success: true, syncedWithSheet: false, error: err };
      }
    }

    return { success: true, syncedWithSheet: false, offlineOnly: true };
  }

  /**
   * Sync full student list for a level to Google Sheet tab (on add/edit/delete)
   */
  async function syncStudentListToSheet(levelId, studentList) {
    if (!isSignedIn || !isGapiLoaded) return false;
    try {
      // Clear column A first
      await gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${levelId}!A2:A100`
      });

      if (studentList.length > 0) {
        const rows = studentList.map(s => [s]);
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: CONFIG.SPREADSHEET_ID,
          range: `${levelId}!A2:A${studentList.length + 1}`,
          valueInputOption: "USER_ENTERED",
          resource: { values: rows }
        });
      }
      return true;
    } catch (err) {
      console.warn(`[SheetsAPI] Error syncing student list to sheet for ${levelId}:`, err);
      return false;
    }
  }

  return {
    CONFIG,
    initGoogleAuth,
    signIn,
    getIsSignedIn,
    fetchStudentsFromSheet,
    fetchLogsFromSheet,
    submitAttendance,
    syncStudentListToSheet
  };
})();

if (typeof window !== "undefined") {
  window.SheetsAPI = SheetsAPI;
}
