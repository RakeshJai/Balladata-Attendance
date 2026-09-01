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
  let currentDate = Store.getTodayString();
  let currentAttendance = {};
  let currentScreen = 'auth'; // 'auth' | 'attendance' | 'success' | 'analytics'
  let isSubmitting = false;

  async function init() {
    Store.seedSampleHistoryIfEmpty();
    setupDatePickers();

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
    if (SheetsAPI.isSignedIn()) {
      updateAuthUI(true);
      navigateTo('attendance');
    } else {
      navigateTo('auth');
    }

    registerServiceWorker();
  }

  function setupDatePickers() {
    const dateInput = document.getElementById('attendanceDatePicker');
    const maxDate = Store.formatDate(new Date(Date.now() + 86400000 * 60));

    if (dateInput) {
      dateInput.value = currentDate;
      dateInput.max = maxDate;
    }
  }

  function setupEventListeners() {
    // Attendance View Date picker
    const dateInput = document.getElementById('attendanceDatePicker');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => changeDate(e.target.value));
    }
    const todayBtn = document.getElementById('dateTodayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => changeDate(Store.getTodayString()));
    }
    const prevDateBtn = document.getElementById('prevDateBtn');
    const nextDateBtn = document.getElementById('nextDateBtn');
    if (prevDateBtn) prevDateBtn.addEventListener('click', () => stepDate(-1));
    if (nextDateBtn) nextDateBtn.addEventListener('click', () => stepDate(1));

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

  function stepDate(daysDelta) {
    const parsed = new Date(currentDate + 'T00:00:00');
    parsed.setDate(parsed.getDate() + daysDelta);
    const newDateStr = Store.formatDate(parsed);
    changeDate(newDateStr);
  }

  function changeDate(newDateStr) {
    if (!newDateStr) return;
    currentDate = Store.formatDate(newDateStr);

    const dateInput = document.getElementById('attendanceDatePicker');
    if (dateInput) dateInput.value = currentDate;

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
    if (rosterTitle) rosterTitle.textContent = `${classLabel} (${students.length} students)`;

    if (!studentContainer) return;

    const fetchedStudents = await SheetsAPI.fetchStudentsFromSheet(currentLevel);
    const { attendanceMap, hasExistingRecord } = Store.getAttendanceForDate(currentLevel, currentDate);
    currentAttendance = attendanceMap;

    renderStudentList(fetchedStudents, hasExistingRecord);
    updateStatsPills();
  }

  function renderStudentList(students, hasExistingRecord) {
    const studentContainer = document.getElementById('studentListContainer');
    const emptyState = document.getElementById('emptyStudentState');
    const existingDateBadge = document.getElementById('existingDateBadge');

    if (!students || students.length === 0) {
      studentContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (existingDateBadge) existingDateBadge.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    if (existingDateBadge) {
      existingDateBadge.style.display = 'inline-flex';
      if (hasExistingRecord) {
        existingDateBadge.className = 'date-status-badge saved';
        existingDateBadge.innerHTML = 'Saved Session';
      } else {
        existingDateBadge.className = 'date-status-badge fresh';
        existingDateBadge.innerHTML = 'Fresh Session';
      }
    }

    let html = '';
    students.forEach((student, index) => {
      const status = currentAttendance[student] || 'Absent';
      const isPresent = status === 'Present';
      const cardClass = isPresent ? 'student-card is-present' : 'student-card';
      const rollNumber = String(index + 1).padStart(2, '0');

      html += `
        <div class="${cardClass}" id="student-card-${index}" onclick="App.toggleAttendanceByIndex(${index})">
          <div class="student-info">
            <div class="student-avatar" id="avatar-${index}">
              ${rollNumber}
            </div>
            <div class="student-meta">
              <span class="student-name">${AppUI.escapeHtml(student)}</span>
              <span class="student-status-hint" id="status-hint-${index}">
                ${isPresent ? 'Present' : 'Absent'}
              </span>
            </div>
          </div>

          <div class="student-card-actions" onclick="event.stopPropagation()">
            <div class="crud-btn-group">
              <button class="btn-icon-subtle" title="Edit Student Name" onclick="StudentMgr.promptEditStudent('${AppUI.escapeHtml(student)}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon-subtle delete" title="Delete Student" onclick="StudentMgr.promptDeleteStudent('${AppUI.escapeHtml(student)}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>

            <button class="attendance-toggle-btn" id="toggle-btn-${index}" onclick="App.toggleAttendance('${AppUI.escapeHtml(student)}', ${index})">
              ${isPresent ? 'Present' : 'Absent'}
            </button>
          </div>
        </div>
      `;
    });

    studentContainer.innerHTML = html;
  }

  function toggleAttendanceByIndex(index) {
    const students = Store.getStudentsForLevel(currentLevel);
    if (students && students[index]) {
      toggleAttendance(students[index], index);
    }
  }

  function toggleAttendance(studentName, index) {
    const current = currentAttendance[studentName] || 'Absent';
    const next = current === 'Present' ? 'Absent' : 'Present';
    currentAttendance[studentName] = next;

    const isPresent = next === 'Present';
    const card = document.getElementById(`student-card-${index}`);
    const hint = document.getElementById(`status-hint-${index}`);
    const btn = document.getElementById(`toggle-btn-${index}`);

    if (card) {
      card.className = isPresent ? 'student-card is-present' : 'student-card';
    }
    if (hint) {
      hint.innerHTML = isPresent ? 'Present' : 'Absent';
    }
    if (btn) {
      btn.innerHTML = isPresent ? 'Present' : 'Absent';
    }

    updateStatsPills();
  }

  function markAll(status) {
    const isPresent = status === 'Present';
    const students = Object.keys(currentAttendance);
    students.forEach(s => {
      currentAttendance[s] = status;
    });

    const studentsList = Store.getStudentsForLevel(currentLevel);
    renderStudentList(studentsList, true);
    updateStatsPills();
    AppUI.showToast(`Marked all as ${status.toLowerCase()}`, 'info');
  }

  function updateStatsPills() {
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
    const students = Object.keys(currentAttendance);
    if (students.length === 0) {
      AppUI.showToast('No students to submit attendance for.', 'error');
      return;
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
      const result = await SheetsAPI.submitAttendance(currentLevel, currentDate, currentAttendance, teacher);

      const statuses = Object.values(currentAttendance);
      const presentCount = statuses.filter(s => s === 'Present').length;
      const absentCount = statuses.filter(s => s === 'Absent').length;
      const totalCount = statuses.length;
      const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

      // Update Screen 3 elements
      const classLabel = currentLevel === 'Volunteers' ? 'Volunteers' : `Nilai ${currentLevel.replace('Level', '')}`;
      const successClassDateText = document.getElementById('successClassDateText');
      const successPresentCount = document.getElementById('successPresentCount');
      const successAbsentCount = document.getElementById('successAbsentCount');
      const successRateVal = document.getElementById('successRateVal');
      const successSyncMessage = document.getElementById('successSyncMessage');

      if (successClassDateText) successClassDateText.textContent = `Successfully recorded for ${classLabel} · ${currentDate}`;
      if (successPresentCount) successPresentCount.textContent = presentCount;
      if (successAbsentCount) successAbsentCount.textContent = absentCount;
      if (successRateVal) successRateVal.textContent = `${rate}%`;

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
    toggleAttendance,
    toggleAttendanceByIndex,
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
