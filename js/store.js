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
    { id: 'Level0', label: 'Nilai 0 (Level 0)' },
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
    Level0: ['Aadhya Ramesh', 'Dev Karthik', 'Inba Selvam', 'Kavin Kumar', 'Prisha Nair', 'Sai Pranav'],
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

  // Weekly helpers — Sunday defines the week (Tamil school weekly)
  function getSundayString(dateStr) {
    const d = new Date((dateStr || getTodayString()) + 'T00:00:00');
    if (isNaN(d.getTime())) return formatDate(new Date());
    const day = d.getDay(); // 0=Sunday
    d.setDate(d.getDate() - day);
    return formatDate(d);
  }

  function getWeekRange(sundayStr) {
    const sunday = new Date(sundayStr + 'T00:00:00');
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    return { start: formatDate(sunday), end: formatDate(saturday) };
  }

  function formatWeekDisplay(sundayStr) {
    const d = new Date(sundayStr + 'T00:00:00');
    const opts = { month: 'short', day: 'numeric', year: 'numeric' };
    return 'Week of ' + d.toLocaleDateString('en-US', opts);
  }

  function formatWeekRange(sundayStr) {
    const { start, end } = getWeekRange(sundayStr);
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    const sFmt = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const eFmt = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (sameMonth) {
      return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' \u2013 ' + e.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' }) + ' \u00B7 Sunday week';
    }
    return sFmt + ' \u2013 ' + eFmt + ' \u00B7 Sunday week';
  }

  function addWeeks(dateStr, weeksDelta) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + weeksDelta * 7);
    return formatDate(d);
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

    // ponytail: clean up orphaned attendance logs for deleted student
    const logs = getLogs();
    const cleaned = logs.filter(l => !(l.level === levelId && l.student === name));
    if (cleaned.length !== logs.length) {
      saveLogs(cleaned);
    }
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
   * For Volunteers, hours 0-8 is stored (1 hr per Present week default).
   */
  function appendLogs(newLogs) {
    const current = getLogs();
    const nowIso = new Date().toISOString();
    const enriched = newLogs.map(l => {
      const isVol = l.level === 'Volunteers';
      const normalizedDate = getSundayString(formatDate(l.date));
      let hours = l.hours;
      let status = l.status;
      if (isVol) {
        if (typeof hours !== 'number') {
          // Back-compat: Present=1, Absent=0
          hours = status === 'Present' ? 1 : (typeof status === 'number' ? Math.max(0, Math.min(8, status)) : 0);
        }
        hours = Math.max(0, Math.min(8, Math.round(hours)));
        status = hours > 0 ? 'Present' : 'Absent';
      } else {
        // Non-volunteers: normalize status, hours derived for consistency
        status = status === 'Present' ? 'Present' : 'Absent';
        hours = status === 'Present' ? 1 : 0;
      }
      return {
        date: normalizedDate,
        timestamp: l.timestamp || nowIso,
        teacher: l.teacher || 'Teacher',
        student: l.student,
        status: status,
        hours: hours,
        level: l.level
      };
    });
    current.push(...enriched);
    saveLogs(current);
  }

  /**
   * Retrieves latest attendance record for each student in a given level on a specific date.
   * Weekly Sunday-normalized. For Volunteers, returns hours 0-8 per student.
   * Requirement 6: "If attendance submitted multiple times for same day for same person, it should pick up the latest."
   * Requirement 7: "Attendance default value should be no (Absent). If attendance existed for that day, should retrieve and show the value."
   * 
   * @param {string} levelId - e.g. 'Level1'
   * @param {string} dateStr - 'YYYY-MM-DD' (any day in week, normalized to Sunday)
   * @returns {Object} { attendanceMap: student->'Present'|'Absent', hoursMap: student->0-8, hasExistingRecord }
   */
  function getAttendanceForDate(levelId, dateStr) {
    const normalizedDate = getSundayString(formatDate(dateStr));
    const students = getStudentsForLevel(levelId);
    const logs = getLogs();
    const isVol = levelId === 'Volunteers';

    // Filter logs for this week (Sunday-normalized) and level
    const matchingLogs = logs.filter(l => l.level === levelId && getSundayString(formatDate(l.date)) === normalizedDate);

    // Sort matching logs chronologically so later ones overwrite earlier ones
    matchingLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const result = {};
    const hoursResult = {};

    // First default all students to 'Absent' (No) / 0 hrs as per requirement 7
    students.forEach(student => {
      result[student] = 'Absent';
      hoursResult[student] = 0;
    });

    let hasExistingRecord = matchingLogs.length > 0;

    // Apply latest matching logs
    matchingLogs.forEach(log => {
      if (result.hasOwnProperty(log.student) || students.includes(log.student)) {
        result[log.student] = log.status || (log.hours > 0 ? 'Present' : 'Absent');
        if (isVol) {
          let h = typeof log.hours === 'number' ? log.hours : (log.status === 'Present' ? 1 : 0);
          hoursResult[log.student] = Math.max(0, Math.min(8, h));
        } else {
          hoursResult[log.student] = result[log.student] === 'Present' ? 1 : 0;
        }
      }
    });

    return {
      attendanceMap: result,
      hoursMap: hoursResult,
      hasExistingRecord: hasExistingRecord
    };
  }

  /**
   * Compute aggregate metrics and per-student summaries for the Dashboard.
   * Weekly Sunday-normalized. For Volunteers, hours 0-8 per week (1 hr default per Present).
   * Uses deduplication: only the latest record for a (student, date) is counted!
   */
  function getDashboardStats(selectedLevel = 'ALL', dateFilter = null) {
    const logs = getLogs();
    const studentsMap = getStudentsMap();
    const normalizedFilter = dateFilter ? getSundayString(formatDate(dateFilter)) : null;

    // Map: studentKey (level + '::' + student) -> Map(date -> { status, hours, timestamp })
    const studentDateMap = new Map();

    logs.forEach(log => {
      const logDate = getSundayString(formatDate(log.date));
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return;
      if (normalizedFilter && logDate !== normalizedFilter) return;

      const key = `${log.level}::${log.student}`;
      if (!studentDateMap.has(key)) {
        studentDateMap.set(key, new Map());
      }
      const dateRecords = studentDateMap.get(key);
      const existing = dateRecords.get(logDate);

      // Latest timestamp wins
      if (!existing || new Date(log.timestamp).getTime() >= new Date(existing.timestamp).getTime()) {
        const isVol = log.level === 'Volunteers';
        let hours = typeof log.hours === 'number' ? log.hours : (log.status === 'Present' ? 1 : 0);
        if (isVol) hours = Math.max(0, Math.min(8, hours));
        dateRecords.set(logDate, {
          status: log.status || (hours > 0 ? 'Present' : 'Absent'),
          hours: hours,
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
    let totalVolunteerHours = 0;

    // Collect all known students in scope
    const targetLevels = selectedLevel === 'ALL' ? LEVELS.map(l => l.id) : [selectedLevel];

    targetLevels.forEach(levelId => {
      const students = studentsMap[levelId] || [];
      const isVolunteerLevel = levelId === 'Volunteers';
      students.forEach(studentName => {
        const key = `${levelId}::${studentName}`;
        const dateRecords = studentDateMap.get(key) || new Map();

        let presentCount = 0;
        let absentCount = 0;
        let volunteerHours = 0;
        const history = [];

        dateRecords.forEach((rec, dStr) => {
          const isPresent = rec.status === 'Present' || (isVolunteerLevel && rec.hours > 0);
          if (isPresent) {
            presentCount++;
          } else {
            absentCount++;
          }
          if (isVolunteerLevel) {
            volunteerHours += Math.max(0, Math.min(8, rec.hours || 0));
          }
          history.push({
            date: dStr,
            status: rec.status,
            hours: isVolunteerLevel ? rec.hours : (rec.status === 'Present' ? 1 : 0),
            teacher: rec.teacher,
            timestamp: rec.timestamp
          });
        });

        history.sort((a, b) => b.date.localeCompare(a.date));

        const totalDays = presentCount + absentCount;
        const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;
        if (isVolunteerLevel) totalVolunteerHours += volunteerHours;
        else volunteerHours = 0;

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
          volunteerHours: volunteerHours,
          isVolunteer: isVolunteerLevel,
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
      totalVolunteerHours: totalVolunteerHours,
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
        d.setDate(d.getDate() - (i * 7)); // past 6 weeks
        pastDates.push(getSundayString(formatDate(d)));
      }

      LEVELS.forEach(lvl => {
        const students = DEFAULT_STUDENTS[lvl.id] || [];
        const isVol = lvl.id === 'Volunteers';
        pastDates.forEach(dStr => {
          students.forEach(st => {
            // 85% attendance seed
            const isPresent = Math.random() > 0.15;
            if (isVol) {
              let hours = 0;
              if (isPresent) {
                // 70% 1hr, 25% 2hrs, 5% 3hrs to demo variable hours
                const r = Math.random();
                if (r < 0.7) hours = 1;
                else if (r < 0.95) hours = 2;
                else hours = 3;
              }
              sampleLogs.push({
                date: dStr,
                timestamp: new Date(dStr + 'T10:00:00Z').toISOString(),
                teacher: 'Baladatta Teacher',
                student: st,
                status: hours > 0 ? 'Present' : 'Absent',
                hours: hours,
                level: lvl.id
              });
            } else {
              sampleLogs.push({
                date: dStr,
                timestamp: new Date(dStr + 'T10:00:00Z').toISOString(),
                teacher: 'Baladatta Teacher',
                student: st,
                status: isPresent ? 'Present' : 'Absent',
                hours: isPresent ? 1 : 0,
                level: lvl.id
              });
            }
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
    getSundayString,
    getWeekRange,
    formatWeekDisplay,
    formatWeekRange,
    addWeeks,
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
