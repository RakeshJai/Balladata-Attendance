/**
 * Baladatta Attendance - Central Store & Data Engine
 * Handles local persistence, deduplication of logs (latest submission wins),
 * default-to-absent retrieval logic, and demo seed data.
 */

const Store = (() => {
  const STORAGE_KEYS = {
    STUDENTS: 'baladatta_students_v2',
    LOGS: 'baladatta_logs_v2',
    CURRENT_LEVEL: 'baladatta_cur_level_v2',
    TEACHER: 'baladatta_teacher_name_v2'
  };

  const LEVELS = [
    { id: 'Level1', label: 'Nilai 1 (Level 1)' },
    { id: 'Level2', label: 'Nilai 2 (Level 2)' },
    { id: 'Level3', label: 'Nilai 3 (Level 3)' },
    { id: 'Level4', label: 'Nilai 4 (Level 4)' },
    { id: 'Level5', label: 'Nilai 5 (Level 5)' },
    { id: 'Level6', label: 'Nilai 6 (Level 6)' },
    { id: 'Volunteers', label: 'Volunteers' }
  ];

  // Default seed students per level for initial load or demo mode
  const DEFAULT_STUDENTS = {
    Level1: ['Aarav Kumar', 'Ananya Ramesh', 'Dhruv Patel', 'Kavya Sundaram', 'Madhavan Nair', 'Nila Selvan', 'Siddharth Iyer'],
    Level2: ['Aditi Venkatesh', 'Arjun Bala', 'Diya Natarajan', 'Ishaan Shankar', 'Maya Krishnan', 'Pranav Murugan', 'Tanvi Raj'],
    Level3: ['Abhinav Swaminathan', 'Harini Prakash', 'Karthik Raja', 'Meera Subramaniam', 'Rohan Sethuraman', 'Sneha Vijay'],
    Level4: ['Akash Chandran', 'Deepika Mani', 'Gautam Raghavan', 'Keerthana Anand', 'Naveen Kumar', 'Varun Joshi'],
    Level5: ['Aditya Narayan', 'Bhavana Ganesh', 'Dinesh Karthik', 'Pavithra Mohan', 'Sanjay Bharathi'],
    Level6: ['Anirudh Srinivasan', 'Harish Kalyan', 'Lavanya Sundar', 'Ritika Suresh', 'Vikramaditya'],
    Volunteers: ['Rakesh J.', 'Bala D.', 'Suresh K.', 'Priya N.', 'Kalyan M.']
  };

  // Helper to format Date object into YYYY-MM-DD
  function formatDate(d) {
    if (typeof d === 'string') {
      // If ISO or local string with date
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return d;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTodayString() {
    return formatDate(new Date());
  }

  // Load students from storage or seed
  function getStudentsMap() {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing stored students:', e);
      }
    }
    // Seed
    setStudentsMap(DEFAULT_STUDENTS);
    return JSON.parse(JSON.stringify(DEFAULT_STUDENTS));
  }

  function setStudentsMap(map) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(map));
  }

  function getStudentsForLevel(levelId) {
    const map = getStudentsMap();
    return map[levelId] || [];
  }

  function setStudentsForLevel(levelId, studentList) {
    const map = getStudentsMap();
    map[levelId] = studentList;
    setStudentsMap(map);
  }

  function addStudent(levelId, name) {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const current = getStudentsForLevel(levelId);
    if (current.includes(trimmed)) return false;
    current.push(trimmed);
    setStudentsForLevel(levelId, current);
    return true;
  }

  function renameStudent(levelId, oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return false;
    const current = getStudentsForLevel(levelId);
    const idx = current.indexOf(oldName);
    if (idx === -1) return false;
    current[idx] = trimmed;
    setStudentsForLevel(levelId, current);

    // Also update student name in existing logs
    const logs = getLogs();
    let updated = false;
    logs.forEach(log => {
      if (log.level === levelId && log.student === oldName) {
        log.student = trimmed;
        updated = true;
      }
    });
    if (updated) {
      saveLogs(logs);
    }
    return true;
  }

  function deleteStudent(levelId, name) {
    const current = getStudentsForLevel(levelId);
    const filtered = current.filter(s => s !== name);
    if (filtered.length === current.length) return false;
    setStudentsForLevel(levelId, filtered);
    return true;
  }

  // Attendance Logs Management
  // Log item shape: { date: 'YYYY-MM-DD', timestamp: ISO, teacher: string, student: string, status: 'Present'|'Absent', level: string }
  function getLogs() {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing stored logs:', e);
      }
    }
    return [];
  }

  function saveLogs(logs) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }

  /**
   * Appends attendance records to the log store.
   * If attendance submitted multiple times for same day for same person,
   * our retrieval & summary queries pick up the latest!
   */
  function appendLogs(newLogs) {
    const current = getLogs();
    const nowIso = new Date().toISOString();
    const enriched = newLogs.map(l => ({
      date: formatDate(l.date),
      timestamp: l.timestamp || nowIso,
      teacher: l.teacher || 'Teacher',
      student: l.student,
      status: l.status === 'Present' ? 'Present' : 'Absent',
      level: l.level
    }));
    current.push(...enriched);
    saveLogs(current);
  }

  /**
   * Retrieves latest attendance record for each student in a given level on a specific date.
   * Requirement 6: "If attendance submitted multiple times for same day for same person, it should pick up the latest."
   * Requirement 7: "Attendance default value should be no (Absent). If attendance existed for that day, should retrieve and show the value."
   * 
   * @param {string} levelId - e.g. 'Level1'
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @returns {Object} map of studentName -> 'Present'|'Absent'
   */
  function getAttendanceForDate(levelId, dateStr) {
    const normalizedDate = formatDate(dateStr);
    const students = getStudentsForLevel(levelId);
    const logs = getLogs();

    // Filter logs for this date and level
    const matchingLogs = logs.filter(l => l.level === levelId && formatDate(l.date) === normalizedDate);

    // Sort matching logs chronologically so later ones overwrite earlier ones
    matchingLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const result = {};

    // First default all students to 'Absent' (No) as per requirement 7
    students.forEach(student => {
      result[student] = 'Absent';
    });

    let hasExistingRecord = matchingLogs.length > 0;

    // Apply latest matching logs
    matchingLogs.forEach(log => {
      if (result.hasOwnProperty(log.student) || students.includes(log.student)) {
        result[log.student] = log.status;
      }
    });

    return {
      attendanceMap: result,
      hasExistingRecord: hasExistingRecord
    };
  }

  /**
   * Compute aggregate metrics and per-student summaries for the Dashboard.
   * Uses deduplication: only the latest record for a (student, date) is counted!
   */
  function getDashboardStats(selectedLevel = 'ALL', dateFilter = null) {
    const logs = getLogs();
    const studentsMap = getStudentsMap();

    // Map: studentKey (level + '::' + student) -> Map(date -> { status, timestamp })
    const studentDateMap = new Map();

    logs.forEach(log => {
      const logDate = formatDate(log.date);
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return;
      if (dateFilter && logDate !== dateFilter) return;

      const key = `${log.level}::${log.student}`;
      if (!studentDateMap.has(key)) {
        studentDateMap.set(key, new Map());
      }
      const dateRecords = studentDateMap.get(key);
      const existing = dateRecords.get(logDate);

      // Latest timestamp wins
      if (!existing || new Date(log.timestamp).getTime() >= new Date(existing.timestamp).getTime()) {
        dateRecords.set(logDate, {
          status: log.status,
          timestamp: log.timestamp,
          teacher: log.teacher,
          level: log.level,
          student: log.student
        });
      }
    });

    // Build student summary rows
    const studentSummaries = [];
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalSessionsLogged = 0;

    // Collect all known students in scope
    const targetLevels = selectedLevel === 'ALL' ? LEVELS.map(l => l.id) : [selectedLevel];

    targetLevels.forEach(levelId => {
      const students = studentsMap[levelId] || [];
      students.forEach(studentName => {
        const key = `${levelId}::${studentName}`;
        const dateRecords = studentDateMap.get(key) || new Map();

        let presentCount = 0;
        let absentCount = 0;
        const history = [];

        dateRecords.forEach((rec, dStr) => {
          if (rec.status === 'Present') {
            presentCount++;
          } else {
            absentCount++;
          }
          history.push({
            date: dStr,
            status: rec.status,
            teacher: rec.teacher,
            timestamp: rec.timestamp
          });
        });

        history.sort((a, b) => b.date.localeCompare(a.date));

        const totalDays = presentCount + absentCount;
        const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

        totalPresent += presentCount;
        totalAbsent += absentCount;

        studentSummaries.push({
          levelId: levelId,
          levelLabel: (LEVELS.find(l => l.id === levelId) || {}).label || levelId,
          studentName: studentName,
          presentCount: presentCount,
          absentCount: absentCount,
          totalDays: totalDays,
          percentage: percentage,
          history: history
        });
      });
    });

    // Sort by Level then Student Name
    studentSummaries.sort((a, b) => {
      if (a.levelId !== b.levelId) return a.levelId.localeCompare(b.levelId);
      return a.studentName.localeCompare(b.studentName);
    });

    const totalRecords = totalPresent + totalAbsent;
    const overallRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

    // Count unique dates in logs
    const allDates = new Set();
    logs.forEach(l => {
      if (selectedLevel === 'ALL' || l.level === selectedLevel) {
        allDates.add(formatDate(l.date));
      }
    });

    return {
      totalStudents: studentSummaries.length,
      totalPresent: totalPresent,
      totalAbsent: totalAbsent,
      totalSessions: allDates.size,
      overallAttendanceRate: overallRate,
      students: studentSummaries
    };
  }

  // Teacher name persistence
  function getTeacherName() {
    return localStorage.getItem(STORAGE_KEYS.TEACHER) || 'Teacher';
  }

  function setTeacherName(name) {
    localStorage.setItem(STORAGE_KEYS.TEACHER, name);
  }

  // Seed sample past dates to give immediate dashboard insights if empty
  function seedSampleHistoryIfEmpty() {
    const existing = getLogs();
    if (existing.length === 0) {
      const sampleLogs = [];
      const pastDates = [];
      const now = new Date();

      for (let i = 1; i <= 6; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 7)); // past 6 weeks (e.g. Sundays)
        pastDates.push(formatDate(d));
      }

      LEVELS.forEach(lvl => {
        const students = DEFAULT_STUDENTS[lvl.id] || [];
        pastDates.forEach(dStr => {
          students.forEach(st => {
            // 85% attendance seed
            const isPresent = Math.random() > 0.15;
            sampleLogs.push({
              date: dStr,
              timestamp: new Date(dStr + 'T10:00:00Z').toISOString(),
              teacher: 'Baladatta Teacher',
              student: st,
              status: isPresent ? 'Present' : 'Absent',
              level: lvl.id
            });
          });
        });
      });

      saveLogs(sampleLogs);
    }
  }

  return {
    LEVELS,
    formatDate,
    getTodayString,
    getStudentsForLevel,
    setStudentsForLevel,
    addStudent,
    renameStudent,
    deleteStudent,
    getLogs,
    saveLogs,
    appendLogs,
    getAttendanceForDate,
    getDashboardStats,
    getTeacherName,
    setTeacherName,
    seedSampleHistoryIfEmpty
  };
})();

// Export for window or modules
if (typeof window !== 'undefined') {
  window.Store = Store;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Store;
}
