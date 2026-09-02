/**
 * Baladatta Tamil School Attendance - Main Application Controller
 * Claude Warm Dark Mode & Animated Nilai Tabs Architecture
 */

const AppUI = (() => {
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getInitials(name) {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  let activeModalConfirmHandler = null;

  function showModal({ title, bodyHtml, confirmText = 'Confirm', confirmClass = 'btn-primary', cancelText = 'Cancel', onConfirm }) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');

    if (!overlay || !titleEl || !bodyEl) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;

    if (cancelText) {
      cancelBtn.style.display = 'inline-flex';
      cancelBtn.textContent = cancelText;
    } else {
      cancelBtn.style.display = 'none';
    }

    confirmBtn.textContent = confirmText;
    confirmBtn.className = confirmClass;

    activeModalConfirmHandler = async () => {
      if (onConfirm) {
        const shouldClose = await onConfirm();
        if (shouldClose !== false) {
          closeModal();
        }
      } else {
        closeModal();
      }
    };

    overlay.classList.add('active');
  }

  function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
    activeModalConfirmHandler = null;
  }

  return {
    escapeHtml,
    getInitials,
    showToast,
    showModal,
    closeModal,
    handleConfirm: () => {
      if (activeModalConfirmHandler) activeModalConfirmHandler();
    }
  };
})();

// Main Controller with Animated Tabs Architecture
const App = (() => {
  let currentLevel = 'Level1';
  let currentDate = Store.getSundayString(Store.getTodayString());
  let currentAttendance = {};
  let currentVolunteerHours = {}; // for Volunteers: student -> 0-8 hours
  let currentScreen = 'auth'; // 'auth' | 'attendance' | 'success' | 'analytics'
  let isSubmitting = false;

  async function init() {
    Store.seedSampleHistoryIfEmpty();
    setupWeeklyPicker();

    StudentMgr.init(currentLevel, onStudentDataChanged);

    SheetsAPI.initGoogleAuth(
      (resp) => {
        AppUI.showToast(`Google Sheets connected!`, 'success');
        updateAuthUI(true);
        if (currentScreen === 'auth') {
          navigateTo('attendance');
        } else {
          refreshCurrentScreen();
        }
      },
      (err) => {
        updateAuthUI(false);
      }
    );

    setupEventListeners();

    // Check if user is already signed in or has stored token
    if ((SheetsAPI.isSignedIn || SheetsAPI.getIsSignedIn).call(SheetsAPI)) {
      updateAuthUI(true);
      navigateTo('attendance');
    } else {
      navigateTo('auth');
    }

    registerServiceWorker();
  }

  function setupWeeklyPicker() {
    renderWeeklyPicker();
    const dateInput = document.getElementById('weeklyDatePicker');
    if (dateInput) {
      const maxDate = Store.formatDate(new Date(Date.now() + 86400000 * 60));
      dateInput.max = maxDate;
      dateInput.value = currentDate;
    }
  }

  function renderWeeklyPicker() {
    const displayText = document.getElementById('weeklyDisplayText');
    const rangeSub = document.getElementById('weeklyRangeSub');
    const dateInput = document.getElementById('weeklyDatePicker');
    if (displayText) displayText.textContent = Store.formatWeekDisplay(currentDate);
    if (rangeSub) rangeSub.textContent = Store.formatWeekRange(currentDate);
    if (dateInput) dateInput.value = currentDate;
  }

  function setupEventListeners() {
    // Weekly Picker (Sunday-based)
    const weeklyDateInput = document.getElementById('weeklyDatePicker');
    if (weeklyDateInput) {
      weeklyDateInput.addEventListener('change', (e) => changeDate(e.target.value));
    }
    const weeklyDisplayBtn = document.getElementById('weeklyDisplayBtn');
    if (weeklyDisplayBtn && weeklyDateInput) {
      weeklyDisplayBtn.addEventListener('click', () => {
        if (weeklyDateInput.showPicker) weeklyDateInput.showPicker();
        else weeklyDateInput.click();
      });
    }
    const todayWeekBtn = document.getElementById('todayWeekBtn');
    if (todayWeekBtn) {
      todayWeekBtn.addEventListener('click', () => changeDate(Store.getSundayString(Store.getTodayString())));
    }
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => stepWeek(-1));
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => stepWeek(1));

    // Submit Attendance Button
    const submitBtn = document.getElementById('submitAttendanceBtn');
    if (submitBtn) submitBtn.addEventListener('click', submitCurrentAttendance);

    // Mass Attendance Shortcuts
    const markAllPresentBtn = document.getElementById('markAllPresentBtn');
    const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');
    if (markAllPresentBtn) markAllPresentBtn.addEventListener('click', () => markAll('Present'));
    if (markAllAbsentBtn) markAllAbsentBtn.addEventListener('click', () => markAll('Absent'));

    // Add Student
    const addStudentBtn = document.getElementById('addStudentBtn');
    const newStudentInput = document.getElementById('newStudentInput');
    if (addStudentBtn && newStudentInput) {
      addStudentBtn.addEventListener('click', () => StudentMgr.handleAddStudent(newStudentInput));
      newStudentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          StudentMgr.handleAddStudent(newStudentInput);
        }
      });
    }

    // Google Login Buttons
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', () => SheetsAPI.signIn());
    }

    const authGateGoogleBtn = document.getElementById('authGateGoogleBtn');
    if (authGateGoogleBtn) {
      authGateGoogleBtn.addEventListener('click', () => SheetsAPI.signIn());
    }

    // Modal Events
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalCloseIcon = document.getElementById('modalCloseIcon');
    if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', AppUI.handleConfirm);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', AppUI.closeModal);
    if (modalCloseIcon) modalCloseIcon.addEventListener('click', AppUI.closeModal);

    window.addEventListener('online', updateOnlineBanner);
    window.addEventListener('offline', updateOnlineBanner);
    updateOnlineBanner();
  }

  /**
   * Multi-Screen Navigator
   */
  function navigateTo(screenName, params = {}) {
    currentScreen = screenName;

    const screens = {
      auth: document.getElementById('screenAuth'),
      attendance: document.getElementById('screenAttendance'),
      success: document.getElementById('screenSuccess'),
      analytics: document.getElementById('screenAnalytics')
    };

    const stickyBar = document.getElementById('stickyActionBar');
    const mainWrapper = document.querySelector('.main-wrapper');

    // Hide all screens
    Object.values(screens).forEach(s => {
      if (s) s.classList.remove('active');
    });

    // Toggle wide mode for analytics
    if (mainWrapper) {
      if (screenName === 'analytics') {
        mainWrapper.classList.add('dashboard-wide');
      } else {
        mainWrapper.classList.remove('dashboard-wide');
      }
    }

    // Toggle sticky action bar (only visible during attendance taking)
    if (stickyBar) {
      stickyBar.style.display = screenName === 'attendance' ? 'block' : 'none';
    }

    // Activate requested screen
    const target = screens[screenName];
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Screen specific initializers
    if (screenName === 'attendance') {
      if (params.level) {
        currentLevel = params.level;
        StudentMgr.setLevel(currentLevel);
      }
      renderNilaiTabs();
      loadCurrentAttendance();
    } else if (screenName === 'analytics') {
      Dashboard.init();
    }
  }

  function stepWeek(weeksDelta) {
    const newDateStr = Store.addWeeks(currentDate, weeksDelta);
    changeDate(newDateStr);
  }

  // Back-compat alias
  function stepDate(daysDelta) {
    // Interpret as weeks if called from old code
    stepWeek(daysDelta);
  }

  function changeDate(newDateStr) {
    if (!newDateStr) return;
    currentDate = Store.getSundayString(Store.formatDate(newDateStr));

    renderWeeklyPicker();

    renderNilaiTabs();
    if (currentScreen === 'attendance') {
      loadCurrentAttendance();
    }
  }

  /**
   * Renders the Animated Tabs Bar for Nilai Classes
   */
  function renderNilaiTabs() {
    const tabsBar = document.getElementById('animatedTabsBar');
    const teacherGreetingEl = document.getElementById('hubTeacherGreeting');

    if (teacherGreetingEl) {
      const teacherName = Store.getTeacherName() || 'Teacher';
      teacherGreetingEl.textContent = `Welcome back, ${teacherName}`;
    }

    if (!tabsBar) return;

    const html = Store.LEVELS.map(lvl => {
      const label = lvl.id === 'Volunteers' ? 'Volunteers' : `Nilai ${lvl.id.replace('Level', '')}`;
      const isActive = lvl.id === currentLevel;
      const { hasExistingRecord } = Store.getAttendanceForDate(lvl.id, currentDate);

      return `
        <button class="animated-tab-btn ${isActive ? 'active' : ''} ${hasExistingRecord ? 'recorded' : ''}" 
                onclick="App.selectNilaiTab('${lvl.id}')"
                title="${label}">
          <span class="animated-tab-dot"></span>
          <span>${label}</span>
        </button>
      `;
    }).join('');

    tabsBar.innerHTML = html;
  }

  /**
   * Switches to a different Nilai tab with smooth animation
   */
  function selectNilaiTab(levelId) {
    if (currentLevel === levelId) return;

    currentLevel = levelId;
    StudentMgr.setLevel(currentLevel);

    // Re-render tabs to update active state
    renderNilaiTabs();

    // Trigger tab content entrance animation
    const tabContent = document.getElementById('animatedTabContent');
    if (tabContent) {
      tabContent.classList.remove('animated-tab-content');
      void tabContent.offsetWidth; // Trigger reflow
      tabContent.classList.add('animated-tab-content');
    }

    loadCurrentAttendance();
  }

  async function loadCurrentAttendance() {
    const studentContainer = document.getElementById('studentListContainer');
    const rosterTitle = document.getElementById('rosterClassNameTitle');

    const classLabel = currentLevel === 'Volunteers' ? 'Volunteers' : `Nilai ${currentLevel.replace('Level', '')}`;
    const students = Store.getStudentsForLevel(currentLevel);
    if (rosterTitle) {
      const weekLabel = Store.formatWeekDisplay(currentDate);
      rosterTitle.textContent = `${classLabel} (${students.length}) · ${weekLabel}`;
    }

    if (!studentContainer) return;

    const fetchedStudents = await SheetsAPI.fetchStudentsFromSheet(currentLevel);
    const { attendanceMap, hoursMap, hasExistingRecord } = Store.getAttendanceForDate(currentLevel, currentDate);
    currentAttendance = attendanceMap;
    if (currentLevel === 'Volunteers') {
      currentVolunteerHours = hoursMap || {};
      // Ensure all students have entry
      fetchedStudents.forEach(s => {
        if (currentVolunteerHours[s] === undefined) currentVolunteerHours[s] = currentAttendance[s] === 'Present' ? 1 : 0;
        if (currentAttendance[s] === undefined) currentAttendance[s] = currentVolunteerHours[s] > 0 ? 'Present' : 'Absent';
      });
    } else {
      currentVolunteerHours = {};
    }

    renderStudentList(fetchedStudents, hasExistingRecord);
    updateStatsPills();
  }

  function renderStudentList(students, hasExistingRecord) {
    const studentContainer = document.getElementById('studentListContainer');
    const emptyState = document.getElementById('emptyStudentState');

    if (!students || students.length === 0) {
      studentContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const isVolView = currentLevel === 'Volunteers';
    let html = '';
    students.forEach((student, index) => {
      const rollNumber = String(index + 1).padStart(2, '0');
      const safeName = AppUI.escapeHtml(student);
      if (isVolView) {
        const hours = typeof currentVolunteerHours[student] === 'number' ? currentVolunteerHours[student] : (currentAttendance[student] === 'Present' ? 1 : 0);
        const isPresent = hours > 0;
        const cardClass = isPresent ? 'student-tile is-present' : 'student-tile';
        const minusDisabled = hours <= 0 ? 'disabled' : '';
        const plusDisabled = hours >= 8 ? 'disabled' : '';
        html += `
        <div class="${cardClass}" id="student-card-${index}" onclick="App.adjustVolunteerHours('${safeName}', ${index}, 1)">
          <div class="tile-content">
            <span class="tile-roll">${rollNumber}</span>
            <span class="tile-name">${safeName}</span>
          </div>

          <div class="tile-right" onclick="event.stopPropagation()">
            <div class="tile-crud">
              <button class="btn-icon-subtle" title="Edit Student" onclick="StudentMgr.promptEditStudent('${safeName}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon-subtle delete" title="Delete Student" onclick="StudentMgr.promptDeleteStudent('${safeName}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>

            <div class="vol-hours-stepper" id="vol-stepper-${index}">
              <button class="vol-hours-btn minus" ${minusDisabled} onclick="App.adjustVolunteerHours('${safeName}', ${index}, -1)" title="Remove 1 hour">−</button>
              <span class="vol-hours-display ${isPresent ? 'has-hours' : ''}" id="vol-hours-display-${index}">${hours} hr${hours !== 1 ? 's' : ''}</span>
              <button class="vol-hours-btn plus" ${plusDisabled} onclick="App.adjustVolunteerHours('${safeName}', ${index}, 1)" title="Add 1 hour">+</button>
            </div>
          </div>
        </div>
      `;
      } else {
        const status = currentAttendance[student] || 'Absent';
        const isPresent = status === 'Present';
        const cardClass = isPresent ? 'student-tile is-present' : 'student-tile';
        html += `
        <div class="${cardClass}" id="student-card-${index}" onclick="App.toggleAttendanceByIndex(${index})">
          <div class="tile-content">
            <span class="tile-roll">${rollNumber}</span>
            <span class="tile-name">${safeName}</span>
          </div>

          <div class="tile-right" onclick="event.stopPropagation()">
            <div class="tile-crud">
              <button class="btn-icon-subtle" title="Edit Student" onclick="StudentMgr.promptEditStudent('${safeName}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon-subtle delete" title="Delete Student" onclick="StudentMgr.promptDeleteStudent('${safeName}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>

            <button class="tile-pill-btn" id="toggle-btn-${index}" onclick="App.toggleAttendance('${safeName}', ${index})">
              ${isPresent ? '✓ Present' : 'Absent'}
            </button>
          </div>
        </div>
      `;
      }
    });

    studentContainer.innerHTML = html;
  }

  function toggleAttendanceByIndex(index) {
    const students = Store.getStudentsForLevel(currentLevel);
    if (students && students[index]) {
      if (currentLevel === 'Volunteers') {
        adjustVolunteerHours(students[index], index, 1);
      } else {
        toggleAttendance(students[index], index);
      }
    }
  }

  function toggleAttendance(studentName, index) {
    if (currentLevel === 'Volunteers') {
      // For volunteers, toggle between 0 and 1 hr
      const currentHours = typeof currentVolunteerHours[studentName] === 'number' ? currentVolunteerHours[studentName] : (currentAttendance[studentName] === 'Present' ? 1 : 0);
      const nextHours = currentHours > 0 ? 0 : 1;
      adjustVolunteerHours(studentName, index, nextHours - currentHours);
      return;
    }
    const current = currentAttendance[studentName] || 'Absent';
    const next = current === 'Present' ? 'Absent' : 'Present';
    currentAttendance[studentName] = next;

    const isPresent = next === 'Present';
    const card = document.getElementById(`student-card-${index}`);
    const btn = document.getElementById(`toggle-btn-${index}`);

    if (card) {
      card.className = isPresent ? 'student-tile is-present' : 'student-tile';
    }
    if (btn) {
      btn.innerHTML = isPresent ? '✓ Present' : 'Absent';
    }

    updateStatsPills();
  }

  function adjustVolunteerHours(studentName, index, delta) {
    const currentHours = typeof currentVolunteerHours[studentName] === 'number' ? currentVolunteerHours[studentName] : 0;
    let nextHours = currentHours + delta;
    // If delta is not +/-1 but absolute jump (for toggle), handle; already computed correctly
    nextHours = Math.max(0, Math.min(8, nextHours));
    if (nextHours === currentHours) return;

    currentVolunteerHours[studentName] = nextHours;
    currentAttendance[studentName] = nextHours > 0 ? 'Present' : 'Absent';

    const card = document.getElementById(`student-card-${index}`);
    const display = document.getElementById(`vol-hours-display-${index}`);
    const stepper = document.getElementById(`vol-stepper-${index}`);
    const isPresent = nextHours > 0;

    if (card) card.className = isPresent ? 'student-tile is-present' : 'student-tile';
    if (display) {
      display.textContent = `${nextHours} hr${nextHours !== 1 ? 's' : ''}`;
      display.className = `vol-hours-display ${isPresent ? 'has-hours' : ''}`;
    }
    if (stepper) {
      const minusBtn = stepper.querySelector('.vol-hours-btn.minus');
      const plusBtn = stepper.querySelector('.vol-hours-btn.plus');
      if (minusBtn) minusBtn.disabled = nextHours <= 0;
      if (plusBtn) plusBtn.disabled = nextHours >= 8;
    }

    updateStatsPills();
  }

  function markAll(status) {
    const studentsList = Store.getStudentsForLevel(currentLevel);
    if (currentLevel === 'Volunteers') {
      const targetHours = status === 'Present' ? 1 : 0;
      studentsList.forEach(s => {
        currentVolunteerHours[s] = targetHours;
        currentAttendance[s] = targetHours > 0 ? 'Present' : 'Absent';
      });
      renderStudentList(studentsList, true);
      updateStatsPills();
      AppUI.showToast(`Marked all as ${status.toLowerCase()} (${targetHours} hr)`, 'info');
      return;
    }
    studentsList.forEach(s => {
      currentAttendance[s] = status;
    });
    // Ensure currentVolunteerHours cleared for non-vol view
    renderStudentList(studentsList, true);
    updateStatsPills();
    AppUI.showToast(`Marked all as ${status.toLowerCase()}`, 'info');
  }

  function updateStatsPills() {
    const isVolView = currentLevel === 'Volunteers';
    if (isVolView) {
      const hoursVals = Object.values(currentVolunteerHours);
      const presentCount = hoursVals.filter(h => h > 0).length;
      const absentCount = hoursVals.filter(h => h === 0).length;
      const totalCount = hoursVals.length;
      const totalHours = hoursVals.reduce((sum, h) => sum + (h || 0), 0);
      const presentEls = document.querySelectorAll('.stat-present-count');
      const absentEls = document.querySelectorAll('.stat-absent-count');
      const totalEls = document.querySelectorAll('.stat-total-count');
      presentEls.forEach(el => el.textContent = `${presentCount} Present · ${totalHours} hrs`);
      absentEls.forEach(el => el.textContent = `${absentCount} Absent`);
      totalEls.forEach(el => el.textContent = `${totalCount} Total`);
      return;
    }
    const statuses = Object.values(currentAttendance);
    const presentCount = statuses.filter(s => s === 'Present').length;
    const absentCount = statuses.filter(s => s === 'Absent').length;
    const totalCount = statuses.length;

    const presentEls = document.querySelectorAll('.stat-present-count');
    const absentEls = document.querySelectorAll('.stat-absent-count');
    const totalEls = document.querySelectorAll('.stat-total-count');

    presentEls.forEach(el => el.textContent = `${presentCount} Present`);
    absentEls.forEach(el => el.textContent = `${absentCount} Absent`);
    totalEls.forEach(el => el.textContent = `${totalCount} Total`);
  }

  async function submitCurrentAttendance() {
    if (isSubmitting) return;
    const isVolSubmit = currentLevel === 'Volunteers';
    const students = isVolSubmit ? Object.keys(currentVolunteerHours) : Object.keys(currentAttendance);
    // Fallback to roster if map empty (e.g., fresh load)
    const rosterForSubmit = Store.getStudentsForLevel(currentLevel);
    const submitKeys = students.length > 0 ? students : rosterForSubmit;
    if (submitKeys.length === 0) {
      AppUI.showToast('No students to submit attendance for.', 'error');
      return;
    }
    // Ensure maps include all roster students
    if (isVolSubmit) {
      rosterForSubmit.forEach(s => {
        if (currentVolunteerHours[s] === undefined) currentVolunteerHours[s] = 0;
        if (currentAttendance[s] === undefined) currentAttendance[s] = currentVolunteerHours[s] > 0 ? 'Present' : 'Absent';
      });
    } else {
      rosterForSubmit.forEach(s => {
        if (currentAttendance[s] === undefined) currentAttendance[s] = 'Absent';
      });
    }

    isSubmitting = true;
    const submitBtn = document.getElementById('submitAttendanceBtn');
    const origHtml = submitBtn ? submitBtn.innerHTML : '';

    if (submitBtn) {
      submitBtn.innerHTML = `<span>Saving...</span>`;
      submitBtn.disabled = true;
    }

    try {
      const teacher = Store.getTeacherName();
      let result;
      if (isVolSubmit) {
        result = await SheetsAPI.submitAttendance(currentLevel, currentDate, currentAttendance, teacher, currentVolunteerHours);
      } else {
        result = await SheetsAPI.submitAttendance(currentLevel, currentDate, currentAttendance, teacher);
      }

      let presentCount, absentCount, totalCount, rate, totalHours;
      if (isVolSubmit) {
        const hoursVals = Object.values(currentVolunteerHours);
        presentCount = hoursVals.filter(h => h > 0).length;
        absentCount = hoursVals.filter(h => h === 0).length;
        totalCount = hoursVals.length;
        totalHours = hoursVals.reduce((sum, h) => sum + (h || 0), 0);
        rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      } else {
        const statuses = Object.values(currentAttendance);
        presentCount = statuses.filter(s => s === 'Present').length;
        absentCount = statuses.filter(s => s === 'Absent').length;
        totalCount = statuses.length;
        rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      }

      // Update Screen 3 elements
      const classLabel = currentLevel === 'Volunteers' ? 'Volunteers' : `Nilai ${currentLevel.replace('Level', '')}`;
      const weekRangeText = Store.formatWeekRange(currentDate);
      const successClassDateText = document.getElementById('successClassDateText');
      const successPresentCount = document.getElementById('successPresentCount');
      const successAbsentCount = document.getElementById('successAbsentCount');
      const successRateVal = document.getElementById('successRateVal');
      const successSyncMessage = document.getElementById('successSyncMessage');

      if (successClassDateText) {
        if (isVolSubmit) {
          successClassDateText.textContent = `Successfully recorded for ${classLabel} · ${Store.formatWeekDisplay(currentDate)} · ${totalHours} total hours`;
        } else {
          successClassDateText.textContent = `Successfully recorded for ${classLabel} · ${Store.formatWeekDisplay(currentDate)}`;
        }
      }
      if (successPresentCount) successPresentCount.textContent = isVolSubmit ? totalHours + ' hrs' : presentCount;
      if (successAbsentCount) successAbsentCount.textContent = absentCount;
      if (successRateVal) successRateVal.textContent = isVolSubmit ? presentCount + '/' + totalCount + ' weeks' : `${rate}%`;

      if (successSyncMessage) {
        if (result.syncedWithSheet) {
          successSyncMessage.textContent = 'Saved & Synced to Google Sheets';
        } else if (result.offlineOnly) {
          successSyncMessage.textContent = 'Saved locally (Offline Mode)';
        } else {
          successSyncMessage.textContent = `Saved locally (Sheets: Offline)`;
        }
      }

      renderNilaiTabs();
      AppUI.showToast(`Attendance saved!`, 'success');

      // Seamlessly transition to Screen 3 (Confirmation Screen)
      navigateTo('success');
    } catch (err) {
      console.error('[App] Submit error:', err);
      AppUI.showToast('Error saving attendance.', 'error');
    } finally {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.innerHTML = origHtml;
        submitBtn.disabled = false;
      }
    }
  }

  function onStudentDataChanged() {
    renderNilaiTabs();
    if (currentScreen === 'attendance') {
      loadCurrentAttendance();
    } else if (currentScreen === 'analytics') {
      Dashboard.render();
    }
  }

  function refreshCurrentScreen() {
    renderNilaiTabs();
    if (currentScreen === 'attendance') loadCurrentAttendance();
    if (currentScreen === 'analytics') Dashboard.render();
  }

  function updateAuthUI(isSignedIn) {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const btnText = document.getElementById('googleLoginBtnText');
    if (googleLoginBtn) {
      if (isSignedIn) {
        googleLoginBtn.classList.add('connected');
        if (btnText) btnText.textContent = 'Sheets Connected';
      } else {
        googleLoginBtn.classList.remove('connected');
        if (btnText) btnText.textContent = 'Sign in with Google';
      }
    }
  }

  function updateOnlineBanner() {
    const banner = document.getElementById('offlineBanner');
    if (banner) {
      banner.style.display = navigator.onLine ? 'none' : 'block';
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.warn('[SW] Registration failed:', err);
        });
      });
    }
  }

  return {
    init,
    navigateTo,
    selectNilaiTab,
    changeDate,
    stepWeek,
    stepDate,
    toggleAttendance,
    toggleAttendanceByIndex,
    adjustVolunteerHours,
    markAll,
    submitCurrentAttendance
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

if (typeof window !== 'undefined') {
  window.App = App;
  window.AppUI = AppUI;
}
