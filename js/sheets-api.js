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
    if (typeof gapi !== "undefined") {
      gapi.load("client", async () => {
        try {
          await gapi.client.init({
            discoveryDocs: CONFIG.DISCOVERY_DOCS
          });
          isGapiLoaded = true;
          console.log("Google Sheets API client initialized");
        } catch (e) {
          console.warn("GAPI init error:", e);
        }
      });
    }

    if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: async (resp) => {
          if (resp.error) {
            console.error("OAuth token error:", resp);
            if (onAuthError) onAuthError(resp);
            return;
          }
          isSignedIn = true;
          if (onAuthSuccess) onAuthSuccess(resp);
        }
      });
    }
  }

  function signIn() {
    if (!tokenClient) {
      console.warn("Token client not initialized yet. Checking offline/mock mode.");
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
      console.warn(`Error fetching students from Sheet (${levelId}):`, err);
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

        // Merge into local store
        Store.saveLogs(parsedLogs);
        return parsedLogs;
      }
    } catch (err) {
      console.warn("Error fetching logs from sheet:", err);
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
          range: `Logs!A1`,
          valueInputOption: "RAW",
          resource: { values: sheetRows }
        });

        // 2. Update status column B in the level's specific sheet
        const statusColumnValues = students.map(s => [attendanceMap[s] || "Absent"]);
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: CONFIG.SPREADSHEET_ID,
          range: `${levelId}!B2:B${students.length + 1}`,
          valueInputOption: "RAW",
          resource: { values: statusColumnValues }
        });

        return { success: true, syncedWithSheet: true };
      } catch (err) {
        console.error("Google Sheets submit error:", err);
        return { success: true, syncedWithSheet: false, error: err };
      }
    }

    return { success: true, syncedWithSheet: false };
  }

  /**
   * Sync full student list for a level to Google Sheet tab (used on add/edit/delete)
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
          valueInputOption: "RAW",
          resource: { values: rows }
        });
      }
      return true;
    } catch (err) {
      console.warn(`Error syncing student list to sheet for ${levelId}:`, err);
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
