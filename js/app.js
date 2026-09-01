/**
 * Baladatta Tamil School Attendance - Main Application Controller
 * Neoclassical Indian Traditional Architecture
 * Craftsman register rows, roll number indexing, and tactile status seals.
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

// Main Controller
const App = (() => {
  let currentLevel = 'Level1';
  let currentDate = Store.getTodayString();
  let currentAttendance = {};
  let currentView = 'attendance';
  let isSubmitting = false;

  async function init() {
    Store.seedSampleHistoryIfEmpty();
    populateNilaiControls();
    setupDatePicker();

    StudentMgr.init(currentLevel, onStudentDataChanged);

    SheetsAPI.initGoogleAuth(
      (resp) => {
        AppUI.showToast(`Google Sheets connected!`, 'success');
        updateAuthUI(true);
        loadCurrentAttendance();
      },
      (err) => {
        AppUI.showToast('OAuth sign-in cancelled or failed.', 'error');
        updateAuthUI(false);
      }
    );

    setupEventListeners();
    await loadCurrentAttendance();

    registerServiceWorker();
  }

  function populateNilaiControls() {
    const pillsRow = document.getElementById('levelPillsRow');
    if (pillsRow) {
      pillsRow.innerHTML = Store.LEVELS.map(lvl => {
        const label = lvl.id === 'Volunteers' ? 'Volunteers' : `Nilai ${lvl.id.replace('Level', '')}`;
        return `
          <button class="level-chip ${lvl.id === currentLevel ? 'active' : ''}" onclick="App.changeLevel('${lvl.id}')">
            <span>${label}</span>
          </button>
        `;
      }).join('');
    }
  }

  function setupDatePicker() {
    const dateInput = document.getElementById('attendanceDatePicker');
    if (dateInput) {
      dateInput.value = currentDate;
      dateInput.max = Store.formatDate(new Date(Date.now() + 86400000 * 60));
    }
  }

  function setupEventListeners() {
    const dateInput = document.getElementById('attendanceDatePicker');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        changeDate(e.target.value);
      });
    }

    const todayBtn = document.getElementById('dateTodayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        changeDate(Store.getTodayString());
      });
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

    // Navigation Tabs
    const navAttendanceTab = document.getElementById('navAttendanceTab');
    const navDashboardTab = document.getElementById('navDashboardTab');
    if (navAttendanceTab) navAttendanceTab.addEventListener('click', () => switchView('attendance'));
    if (navDashboardTab) navDashboardTab.addEventListener('click', () => switchView('dashboard'));

    // Google Login
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', () => {
        SheetsAPI.signIn();
      });
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
    loadCurrentAttendance();
  }

  function changeLevel(newLevelId) {
    currentLevel = newLevelId;
    StudentMgr.setLevel(currentLevel);
    populateNilaiControls();
    loadCurrentAttendance();
  }

  async function loadCurrentAttendance() {
    const studentContainer = document.getElementById('studentListContainer');
    if (!studentContainer) return;

    const students = await SheetsAPI.fetchStudentsFromSheet(currentLevel);
    const { attendanceMap, hasExistingRecord } = Store.getAttendanceForDate(currentLevel, currentDate);
    currentAttendance = attendanceMap;

    renderStudentList(students, hasExistingRecord);
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

      if (result.syncedWithSheet) {
        AppUI.showToast(`Attendance saved & synced to Google Sheets!`, 'success');
      } else if (result.offlineOnly) {
        AppUI.showToast(`Saved locally (offline mode).`, 'info');
      } else {
        AppUI.showToast(`Saved locally (Sheets: ${result.error?.message || 'Offline'})`, 'info');
      }

      const studentsList = Store.getStudentsForLevel(currentLevel);
      renderStudentList(studentsList, true);

      if (currentView === 'dashboard') {
        Dashboard.render();
      }
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
    loadCurrentAttendance();
    if (currentView === 'dashboard') {
      Dashboard.render();
    }
  }

  function switchView(view) {
    currentView = view;
    const attendanceView = document.getElementById('attendanceViewSection');
    const dashboardView = document.getElementById('dashboardViewSection');
    const navAttendance = document.getElementById('navAttendanceTab');
    const navDashboard = document.getElementById('navDashboardTab');
    const stickyBar = document.getElementById('stickyActionBar');
    const mainWrapper = document.querySelector('.main-wrapper');

    if (view === 'attendance') {
      if (attendanceView) attendanceView.style.display = 'block';
      if (dashboardView) dashboardView.style.display = 'none';
      if (navAttendance) navAttendance.classList.add('active');
      if (navDashboard) navDashboard.classList.remove('active');
      if (stickyBar) stickyBar.style.display = 'block';
      if (mainWrapper) mainWrapper.classList.remove('dashboard-wide');
      loadCurrentAttendance();
    } else {
      if (attendanceView) attendanceView.style.display = 'none';
      if (dashboardView) dashboardView.style.display = 'block';
      if (navAttendance) navAttendance.classList.remove('active');
      if (navDashboard) navDashboard.classList.add('active');
      if (stickyBar) stickyBar.style.display = 'none';
      if (mainWrapper) mainWrapper.classList.add('dashboard-wide');
      Dashboard.init();
    }
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
        if (btnText) btnText.textContent = 'Sync Sheets';
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
        navigator.serviceWorker.register('sw.js')
          .then(reg => {
            console.log('SW Registered:', reg.scope);
            reg.update();
          })
          .catch(err => console.warn('SW Registration error:', err));
      });
    }
  }

  return {
    init,
    changeLevel,
    changeDate,
    toggleAttendance,
    toggleAttendanceByIndex,
    markAll,
    submitCurrentAttendance,
    switchView
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
