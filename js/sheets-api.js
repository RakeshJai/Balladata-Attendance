/**
 * Baladatta Attendance - Google Sheets API & OAuth Integration
 * Connects with Google Sheets API v4 for real-time cloud persistence.
 */

const SheetsAPI = (() => {
  const CONFIG = {
    CLIENT_ID: "1062324886633-brv79jb9smbkrpd9iuvtj5galvhbqfqh.apps.googleusercontent.com",
    SPREADSHEET_ID: "1qnNF6HZXxWksMjJ-Z06Ovk64CWMvXFHeTieaTi8xZ5M",
    SCOPES: "https://www.googleapis.com/auth/spreadsheets",
    DISCOVERY_DOCS: ["https://sheets.googleapis.com/$discovery/rest?version=v4"]
  };

  let tokenClient = null;
  let isGapiLoaded = false;
  let isSignedIn = false;
  let currentUserEmail = "";

  function initGoogleAuth(onAuthSuccess, onAuthError) {
    function checkAndInit() {
      if (typeof gapi !== "undefined" && !isGapiLoaded) {
        gapi.load("client", async () => {
          try {
            await gapi.client.init({
              discoveryDocs: CONFIG.DISCOVERY_DOCS
            });
            isGapiLoaded = true;
            console.log("[SheetsAPI] Google Sheets API client initialized");

            // Restore cached session if valid
            const savedToken = sessionStorage.getItem("baladatta_oauth_token");
            const tokenExpiry = sessionStorage.getItem("baladatta_oauth_expiry");
            if (savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry, 10)) {
              gapi.client.setToken({ access_token: savedToken });
              isSignedIn = true;
              if (onAuthSuccess) onAuthSuccess({ access_token: savedToken });
            }
          } catch (e) {
            console.warn("[SheetsAPI] GAPI init error:", e);
          }
        });
      }

      if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2 && !tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CONFIG.CLIENT_ID,
          scope: CONFIG.SCOPES,
          callback: async (resp) => {
            if (resp.error) {
              console.error("[SheetsAPI] OAuth token error:", resp);
              if (onAuthError) onAuthError(resp);
              return;
            }
            // CRITICAL: Must pass token to gapi.client so requests are authorized
            if (typeof gapi !== "undefined" && gapi.client) {
              gapi.client.setToken(resp);
            }
            if (resp.access_token) {
              sessionStorage.setItem("baladatta_oauth_token", resp.access_token);
              const expiresIn = (resp.expires_in || 3599) * 1000;
              sessionStorage.setItem("baladatta_oauth_expiry", String(Date.now() + expiresIn));
            }
            isSignedIn = true;
            if (onAuthSuccess) onAuthSuccess(resp);
          }
        });
      }
    }

    checkAndInit();
    const pollInterval = setInterval(() => {
      if (isGapiLoaded && tokenClient) {
        clearInterval(pollInterval);
      } else {
        checkAndInit();
      }
    }, 500);
    setTimeout(() => clearInterval(pollInterval), 10000);
  }

  function signIn() {
    if (!tokenClient) {
      console.warn("[SheetsAPI] Token client not ready yet.");
      return false;
    }
    tokenClient.requestAccessToken({ prompt: "consent" });
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
   * Format in sheet: [Date, Teacher, Student, Status, Level, Timestamp]
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
   * Updates local store AND appends to Google Sheets Logs tab.
   */
  async function submitAttendance(levelId, dateStr, attendanceMap, teacherName) {
    const students = Object.keys(attendanceMap);
    const nowIso = new Date().toISOString();

    // 1. Save locally in Store (offline-first)
    const newLogs = students.map(studentName => ({
      date: dateStr,
      teacher: teacherName || Store.getTeacherName(),
      student: studentName,
      status: attendanceMap[studentName] || "Absent",
      level: levelId,
      timestamp: nowIso
    }));

    Store.saveLogs(newLogs);

    // 2. If online and authenticated with Google Sheets, sync to cloud
    if (isSignedIn && isGapiLoaded && navigator.onLine) {
      try {
        const sheetRows = newLogs.map(log => [
          log.date,
          log.teacher,
          log.student,
          log.status,
          log.level,
          log.timestamp
        ]);

        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId: CONFIG.SPREADSHEET_ID,
          range: `Logs!A:F`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          resource: { values: sheetRows }
        });

        // Update status column B in the level's specific sheet
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
   * Sync full student list for a level to Google Sheet tab (used on add/edit/delete)
   */
  async function syncStudentListToSheet(levelId, studentList) {
    if (!isSignedIn || !isGapiLoaded) return false;
    try {
      const rows = studentList.map(name => [name]);
      await gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: `${levelId}!A2:A100`
      });

      if (rows.length > 0) {
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
    initGoogleAuth,
    signIn,
    getIsSignedIn,
    fetchStudentsFromSheet,
    fetchLogsFromSheet,
    submitAttendance,
    syncStudentListToSheet,
    CONFIG
  };
})();

if (typeof window !== "undefined") {
  window.SheetsAPI = SheetsAPI;
}
