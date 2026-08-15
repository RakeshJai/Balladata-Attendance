/**
 * Baladatta Tamil School Attendance - Main Application Controller
 * Inspired by Figma Mobile Education UI Kit (E-Sekula)
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

  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  let activeModalConfirmHandler = null;

  function showModal({ title, bodyHtml, confirmText = 'Confirm', confirmClass = 'btn-coral', cancelText = 'Cancel', onConfirm }) {
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
    confirmBtn.className = `btn-pill ${confirmClass}`;

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
        const teacher = Store.getTeacherName();
        AppUI.showToast(`Google Sheets connected as ${teacher}`, 'success');
        updateAuthUI(true);
        loadCurrentAttendance();
      },
      (err) => {
        AppUI.showToast('OAuth failed. Operating in local storage mode.', 'error');
      }
    );

    setupEventListeners();
    await loadCurrentAttendance();

    const teacher = Store.getTeacherName();
    const teacherDisplay = document.getElementById('teacherDisplay');
    if (teacherDisplay) teacherDisplay.textContent = teacher;

    registerServiceWorker();
  }

  function populateNilaiControls() {
    // 1. Dropdown (Requirement 5)
    const select = document.getElementById('nilaiSelect');
    if (select) {
      select.innerHTML = Store.LEVELS.map(lvl => `
        <option value="${lvl.id}" ${lvl.id === currentLevel ? 'selected' : ''}>
          ${lvl.label}
        </option>
      `).join('');
    }

    // 2. Horizontal Figma Category Chips
    const pillsRow = document.getElementById('levelPillsRow');
    if (pillsRow) {
      pillsRow.innerHTML = Store.LEVELS.map(lvl => `
        <button class="level-chip ${lvl.id === currentLevel ? 'active' : ''}" onclick="App.changeLevel('${lvl.id}')">
          ${lvl.label.split('(')[0].trim()}
        </button>
      `).join('');
    }
  }

  function setupDatePicker() {
    const dateInput = document.getElementById('attendanceDatePicker');
    if (dateInput) {
      dateInput.value = currentDate;
      dateInput.max = Store.formatDate(new Date(Date.now() + 86400000 * 30));
    }
  }

  function setupEventListeners() {
    // Nilai Select Change
    const nilaiSelect = document.getElementById('nilaiSelect');
    if (nilaiSelect) {
      nilaiSelect.addEventListener('change', (e) => {
        changeLevel(e.target.value);
      });
    }

    // Date Picker Change (Requirement 1)
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

    // Dual Submit Buttons (Requirement 2: Top & Bottom)
    const submitBtnTop = document.getElementById('submitBtnTop');
    const submitBtnBottom = document.getElementById('submitBtnBottom');
    if (submitBtnTop) submitBtnTop.addEventListener('click', submitCurrentAttendance);
    if (submitBtnBottom) submitBtnBottom.addEventListener('click', submitCurrentAttendance);

    // Mass Attendance Shortcuts
    const markAllPresentTop = document.getElementById('markAllPresentTop');
    const markAllAbsentTop = document.getElementById('markAllAbsentTop');
    if (markAllPresentTop) markAllPresentTop.addEventListener('click', () => markAll('Present'));
    if (markAllAbsentTop) markAllAbsentTop.addEventListener('click', () => markAll('Absent'));

    // Add Student (Requirement 3)
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

    // Segmented Navigation
    const navAttendanceTab = document.getElementById('navAttendanceTab');
    const navDashboardTab = document.getElementById('navDashboardTab');
    if (navAttendanceTab) navAttendanceTab.addEventListener('click', () => switchView('attendance'));
    if (navDashboardTab) navDashboardTab.addEventListener('click', () => switchView('dashboard'));

    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', () => {
        SheetsAPI.signIn();
      });
    }

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
      if (hasExistingRecord) {
        existingDateBadge.style.display = 'inline-flex';
        existingDateBadge.className = 'counter-chip saved';
        existingDateBadge.innerHTML = '✓ Saved Attendance';
      } else {
        existingDateBadge.style.display = 'inline-flex';
        existingDateBadge.className = 'counter-chip total';
        existingDateBadge.innerHTML = '● Fresh Date';
      }
    }

    let html = '';
    students.forEach((student, index) => {
      const status = currentAttendance[student] || 'Absent';
      const isPresent = status === 'Present';
      const cardClass = isPresent ? 'student-row-card is-present' : 'student-row-card is-absent';
      const initials = AppUI.getInitials(student);

      html += `
        <div class="${cardClass}" id="student-card-${index}">
          <div class="student-left-info">
            <div class="avatar-ring">
              ${initials}
            </div>
            <div class="student-name-meta">
              <span class="student-full-name">${AppUI.escapeHtml(student)}</span>
              <span class="student-tag-status" id="status-hint-${index}">
                ${isPresent ? '● Present (வந்தார்)' : '○ Absent (வரவில்லை)'}
              </span>
            </div>
          </div>

          <div class="student-right-actions">
            <!-- Edit / Delete Student (Requirement 3) -->
            <div class="student-crud-tools">
              <button class="crud-btn" title="Edit Student Name" onclick="StudentMgr.promptEditStudent('${AppUI.escapeHtml(student)}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="crud-btn delete" title="Delete Student" onclick="StudentMgr.promptDeleteStudent('${AppUI.escapeHtml(student)}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>

            <!-- Figma Segmented Dual Pill Switch [ Absent | Present ] -->
            <label class="figma-pill-switch" title="Toggle Present / Absent">
              <input type="checkbox" ${isPresent ? 'checked' : ''} onchange="App.toggleAttendance('${AppUI.escapeHtml(student)}', this.checked, ${index})">
              <span class="pill-option option-absent">Absent</span>
              <span class="pill-option option-present">Present</span>
            </label>
          </div>
        </div>
      `;
    });

    studentContainer.innerHTML = html;
  }

  function toggleAttendance(studentName, isChecked, index) {
    currentAttendance[studentName] = isChecked ? 'Present' : 'Absent';
    
    const card = document.getElementById(`student-card-${index}`);
    const hint = document.getElementById(`status-hint-${index}`);
    if (card) {
      card.className = isChecked ? 'student-row-card is-present' : 'student-row-card is-absent';
    }
    if (hint) {
      hint.innerHTML = isChecked ? '● Present (வந்தார்)' : '○ Absent (வரவில்லை)';
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
    AppUI.showToast(`Marked all ${status.toLowerCase()} for ${currentDate}`, 'info');
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
    const submitBtnTop = document.getElementById('submitBtnTop');
    const submitBtnBottom = document.getElementById('submitBtnBottom');
    const origTop = submitBtnTop ? submitBtnTop.innerHTML : '';
    const origBottom = submitBtnBottom ? submitBtnBottom.innerHTML : '';

    if (submitBtnTop) submitBtnTop.innerHTML = 'Saving...';
    if (submitBtnBottom) submitBtnBottom.innerHTML = 'Saving...';

    try {
      const teacher = Store.getTeacherName();
      const result = await SheetsAPI.submitAttendance(currentLevel, currentDate, currentAttendance, teacher);

      if (result.syncedWithSheet) {
        AppUI.showToast(`Attendance synced to Google Sheets for ${currentDate}!`, 'success');
      } else {
        AppUI.showToast(`Attendance saved locally for ${currentDate}.`, 'success');
      }

      const studentsList = Store.getStudentsForLevel(currentLevel);
      renderStudentList(studentsList, true);

      if (currentView === 'dashboard') {
        Dashboard.render();
      }
    } catch (err) {
      console.error('Submit error:', err);
      AppUI.showToast('Error saving attendance.', 'error');
    } finally {
      isSubmitting = false;
      if (submitBtnTop) submitBtnTop.innerHTML = origTop;
      if (submitBtnBottom) submitBtnBottom.innerHTML = origBottom;
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

    if (view === 'attendance') {
      if (attendanceView) attendanceView.style.display = 'block';
      if (dashboardView) dashboardView.style.display = 'none';
      if (navAttendance) navAttendance.classList.add('active');
      if (navDashboard) navDashboard.classList.remove('active');
      loadCurrentAttendance();
    } else {
      if (attendanceView) attendanceView.style.display = 'none';
      if (dashboardView) dashboardView.style.display = 'block';
      if (navAttendance) navAttendance.classList.remove('active');
      if (navDashboard) navDashboard.classList.add('active');
      Dashboard.init();
    }
  }

  function updateAuthUI(isSignedIn) {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (isSignedIn && googleLoginBtn) {
      googleLoginBtn.innerHTML = '✓ Sheets Connected';
      googleLoginBtn.style.color = 'var(--mint-text)';
      googleLoginBtn.style.background = 'var(--mint)';
      googleLoginBtn.style.borderColor = 'var(--mint)';
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
          .then(reg => console.log('SW Registered:', reg.scope))
          .catch(err => console.warn('SW Registration error:', err));
      });
    }
  }

  return {
    init,
    changeLevel,
    changeDate,
    toggleAttendance,
    markAll,
    submitCurrentAttendance,
    switchView
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
