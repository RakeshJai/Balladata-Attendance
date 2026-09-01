/**
 * Baladatta Attendance – Analytics & Personal Student Dashboard
 * Neoclassical Indian traditional aesthetic.
 * Features: School-wide overview metrics, class bars, student lookup autocomplete,
 * and individual student personal dashboards.
 */

const Dashboard = (() => {
  let selectedLevel = 'ALL';
  let searchQuery = '';
  let activeStudentView = null; // null or { levelId, studentName }

  function init() {
    activeStudentView = null;
    searchQuery = '';
    render();
  }

  function setFilterLevel(level) {
    selectedLevel = level;
    render();
  }

  function setSearchQuery(query) {
    searchQuery = (query || '').toLowerCase().trim();
    renderLedgerOnly();
  }

  function handleLookupInput(val) {
    const query = (val || '').toLowerCase().trim();
    const dropdown = document.getElementById('lookupSuggestionsDropdown');
    if (!dropdown) return;

    if (!query) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    const allStats = Store.getDashboardStats('ALL');
    const matches = allStats.students.filter(s => 
      s.studentName.toLowerCase().includes(query) ||
      s.levelLabel.toLowerCase().includes(query)
    ).slice(0, 8);

    if (matches.length === 0) {
      dropdown.style.display = 'block';
      dropdown.innerHTML = `<div class="lookup-empty">No matching students or volunteers found</div>`;
      return;
    }

    dropdown.style.display = 'block';
    dropdown.innerHTML = matches.map(s => {
      const rateColor = s.percentage >= 80 ? 'var(--sage)' : 'var(--terra)';
      return `
        <div class="lookup-item" onclick="Dashboard.openPersonalDashboard('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
          <div class="lookup-item-left">
            <span class="lookup-item-name">${AppUI.escapeHtml(s.studentName)}</span>
            <span class="lookup-item-class">${AppUI.escapeHtml(s.levelLabel)}</span>
          </div>
          <div class="lookup-item-right">
            <span class="lookup-item-rate" style="color: ${rateColor};">${s.percentage}%</span>
            <span class="lookup-item-sub">${s.presentCount}/${s.totalDays} sessions</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function openPersonalDashboard(levelId, studentName) {
    activeStudentView = { levelId, studentName };
    render();
  }

  function backToOverview() {
    activeStudentView = null;
    searchQuery = '';
    render();
  }

  function render() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    if (activeStudentView) {
      container.innerHTML = renderPersonalDashboardHtml(activeStudentView.levelId, activeStudentView.studentName);
      return;
    }

    const stats = Store.getDashboardStats(selectedLevel);
    const allLevelStats = calculateAllLevelsStats();

    container.innerHTML = `
      <!-- Student & Volunteer Lookup Search Bar with Autocomplete -->
      <div class="dash-lookup-card">
        <div class="lookup-input-wrap">
          <svg class="lookup-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            type="text" 
            id="analyticsStudentLookup" 
            class="analytics-lookup-input" 
            placeholder="Search student or volunteer for personal dashboard..." 
            oninput="Dashboard.handleLookupInput(this.value)"
            autocomplete="off" 
          />
          <div id="lookupSuggestionsDropdown" class="lookup-dropdown" style="display: none;"></div>
        </div>
      </div>

      <!-- School-Wide Metric Plaques -->
      <div class="dash-metrics-row">
        <div class="dash-metric-plaque">
          <span class="dash-metric-label">Attendance Rate</span>
          <span class="dash-metric-value accent">${stats.overallAttendanceRate}%</span>
          <span class="dash-metric-sub">${stats.totalPresent} present · ${stats.totalAbsent} absent</span>
        </div>
        <div class="dash-metric-plaque">
          <span class="dash-metric-label">Enrolled</span>
          <span class="dash-metric-value">${stats.totalStudents}</span>
          <span class="dash-metric-sub">${selectedLevel === 'ALL' ? 'All classes' : selectedLevel}</span>
        </div>
        <div class="dash-metric-plaque">
          <span class="dash-metric-label">Sessions Logged</span>
          <span class="dash-metric-value">${stats.totalSessions}</span>
          <span class="dash-metric-sub">Recorded dates</span>
        </div>
      </div>

      <!-- Class Comparison Performance Bars -->
      <div class="dash-section-card">
        <h3 class="dash-section-title">Class Performance</h3>
        <div class="dash-bars-list">
          ${allLevelStats.map(lvl => `
            <div class="dash-bar-row" onclick="Dashboard.setFilterLevel('${lvl.id}')" style="cursor: pointer;" title="Filter by ${lvl.label}">
              <span class="dash-bar-label">${lvl.label}</span>
              <div class="dash-bar-track">
                <div class="dash-bar-fill" style="width: ${Math.max(lvl.rate, 4)}%;"></div>
              </div>
              <span class="dash-bar-pct">${lvl.rate}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Student Ledger Table -->
      <div class="dash-section-card">
        <div class="dash-ledger-header">
          <h3 class="dash-section-title">Student Records</h3>
          <div class="dash-ledger-controls">
            <input type="text" placeholder="Filter list..." class="dash-search-input" value="${AppUI.escapeHtml(searchQuery)}" oninput="Dashboard.setSearchQuery(this.value)" />
            <select class="dash-filter-select" onchange="Dashboard.setFilterLevel(this.value)">
              <option value="ALL" ${selectedLevel === 'ALL' ? 'selected' : ''}>All Classes</option>
              ${Store.LEVELS.map(l => `<option value="${l.id}" ${selectedLevel === l.id ? 'selected' : ''}>${l.label}</option>`).join('')}
            </select>
            <button class="dash-export-btn" onclick="Dashboard.exportToCsv()" title="Export CSV">Export CSV</button>
          </div>
        </div>
        <div id="dashLedgerContainer">
          ${renderLedgerHtml(stats.students)}
        </div>
      </div>
    `;

    // Click outside to close lookup dropdown
    document.addEventListener('click', (e) => {
      const lookupWrap = document.querySelector('.lookup-input-wrap');
      const dropdown = document.getElementById('lookupSuggestionsDropdown');
      if (dropdown && lookupWrap && !lookupWrap.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  function renderPersonalDashboardHtml(levelId, studentName) {
    const stats = Store.getDashboardStats(levelId);
    const student = stats.students.find(s => s.studentName === studentName) || {
      studentName: studentName,
      levelLabel: levelId,
      percentage: 0,
      presentCount: 0,
      absentCount: 0,
      totalDays: 0,
      history: []
    };

    const rateColor = student.percentage >= 80 ? 'var(--sage)' : 'var(--terra)';
    const historyRows = student.history && student.history.length > 0 ? student.history.map(h => {
      const isPres = h.status === 'Present';
      return `
        <div class="personal-history-row">
          <div class="personal-history-date">
            <span class="p-date-main">${h.date}</span>
            <span class="p-date-sub">Recorded by ${AppUI.escapeHtml(h.teacher || 'Teacher')}</span>
          </div>
          <div class="personal-history-status">
            <span class="personal-status-pill ${isPres ? 'present' : 'absent'}">
              ${isPres ? '✓ Present' : 'Absent'}
            </span>
          </div>
        </div>
      `;
    }).join('') : `<p class="dash-empty">No attendance sessions logged for this person yet.</p>`;

    return `
      <div class="personal-dashboard-view">
        <!-- Top Back Navigation -->
        <div class="personal-nav-bar">
          <button class="btn-back-hub" onclick="Dashboard.backToOverview()">
            <span>← Back to All Analytics</span>
          </button>
          <span class="personal-level-badge">${AppUI.escapeHtml(student.levelLabel)}</span>
        </div>

        <!-- Student Profile Header Card -->
        <div class="personal-profile-card">
          <div class="personal-avatar">
            ${AppUI.getInitials(student.studentName)}
          </div>
          <div class="personal-meta">
            <h2 class="personal-name">${AppUI.escapeHtml(student.studentName)}</h2>
            <p class="personal-sub">${AppUI.escapeHtml(student.levelLabel)} · Total ${student.totalDays} sessions</p>
          </div>
        </div>

        <!-- 3 Personal Metric Plaques -->
        <div class="dash-metrics-row">
          <div class="dash-metric-plaque">
            <span class="dash-metric-label">Attendance Rate</span>
            <span class="dash-metric-value" style="color: ${rateColor};">${student.percentage}%</span>
            <span class="dash-metric-sub">${student.presentCount} of ${student.totalDays} sessions</span>
          </div>
          <div class="dash-metric-plaque">
            <span class="dash-metric-label">Present Sessions</span>
            <span class="dash-metric-value" style="color: var(--sage);">${student.presentCount}</span>
            <span class="dash-metric-sub">Attended</span>
          </div>
          <div class="dash-metric-plaque">
            <span class="dash-metric-label">Absent Sessions</span>
            <span class="dash-metric-value" style="color: var(--terra);">${student.absentCount}</span>
            <span class="dash-metric-sub">Missed</span>
          </div>
        </div>

        <!-- Attendance History Log Trail -->
        <div class="dash-section-card">
          <h3 class="dash-section-title">Session History Log</h3>
          <div class="personal-history-list">
            ${historyRows}
          </div>
        </div>
      </div>
    `;
  }

  function calculateAllLevelsStats() {
    return Store.LEVELS.map(lvl => {
      const s = Store.getDashboardStats(lvl.id);
      return {
        id: lvl.id,
        label: lvl.id === 'Volunteers' ? 'Volunteers' : `Nilai ${lvl.id.replace('Level', '')}`,
        rate: s.overallAttendanceRate,
        studentCount: s.totalStudents
      };
    });
  }

  function renderLedgerOnly() {
    const el = document.getElementById('dashLedgerContainer');
    if (!el) return;
    const stats = Store.getDashboardStats(selectedLevel);
    el.innerHTML = renderLedgerHtml(stats.students);
  }

  function renderLedgerHtml(students) {
    let filtered = students;
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.studentName.toLowerCase().includes(searchQuery) ||
        s.levelLabel.toLowerCase().includes(searchQuery)
      );
    }

    if (filtered.length === 0) {
      return `<p class="dash-empty">No student records found.</p>`;
    }

    return filtered.map(s => {
      const rateColor = s.percentage >= 80 ? 'var(--sage)' : 'var(--terra)';
      return `
        <div class="dash-ledger-row" onclick="Dashboard.openPersonalDashboard('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
          <div class="dash-ledger-name">
            <span class="dash-ledger-student">${AppUI.escapeHtml(s.studentName)}</span>
            <span class="dash-ledger-sub">${AppUI.escapeHtml(s.levelLabel)} · ${s.totalDays} sessions</span>
          </div>
          <div class="dash-ledger-stats">
            <span class="dash-pill present">${s.presentCount}P</span>
            <span class="dash-pill absent">${s.absentCount}A</span>
            <span class="dash-ledger-rate" style="color: ${rateColor};">${s.percentage}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function exportToCsv() {
    const stats = Store.getDashboardStats(selectedLevel);
    if (!stats.students || stats.students.length === 0) {
      AppUI.showToast('No student data to export.', 'info');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Level,Student Name,Present Days,Absent Days,Total Days,Attendance Rate\n';
    stats.students.forEach(s => {
      csvContent += `"${s.levelLabel}","${s.studentName}",${s.presentCount},${s.absentCount},${s.totalDays},"${s.percentage}%"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `baladatta_attendance_${selectedLevel}_${Store.getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    AppUI.showToast('CSV export started', 'success');
  }

  return {
    init,
    render,
    setFilterLevel,
    setSearchQuery,
    handleLookupInput,
    openPersonalDashboard,
    backToOverview,
    exportToCsv
  };
})();

if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
}
