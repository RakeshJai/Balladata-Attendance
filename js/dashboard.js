/**
 * Baladatta Attendance – Simplified Analytics Dashboard
 * Matches the flat neoclassical Indian traditional aesthetic.
 * Three sections: Metric plaques, class comparison bars, student ledger.
 */

const Dashboard = (() => {
  let selectedLevel = 'ALL';
  let searchQuery = '';

  function init() { render(); }

  function setFilterLevel(level) {
    selectedLevel = level;
    render();
  }

  function setSearchQuery(query) {
    searchQuery = (query || '').toLowerCase().trim();
    renderLedgerOnly();
  }

  function render() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    const stats = Store.getDashboardStats(selectedLevel);
    const allLevelStats = calculateAllLevelsStats();

    container.innerHTML = `
      <!-- Metric Plaques -->
      <div class="dash-metrics-row">
        <div class="dash-metric-plaque">
          <span class="dash-metric-label">Attendance Rate</span>
          <span class="dash-metric-value accent">${stats.overallAttendanceRate}%</span>
          <span class="dash-metric-sub">${stats.totalPresent} present · ${stats.totalAbsent} absent</span>
        </div>
        <div class="dash-metric-plaque">
          <span class="dash-metric-label">Students Enrolled</span>
          <span class="dash-metric-value">${stats.totalStudents}</span>
          <span class="dash-metric-sub">${selectedLevel === 'ALL' ? 'All classes' : selectedLevel}</span>
        </div>
        <div class="dash-metric-plaque">
          <span class="dash-metric-label">Sessions Logged</span>
          <span class="dash-metric-value">${stats.totalSessions}</span>
          <span class="dash-metric-sub">Recorded dates</span>
        </div>
      </div>

      <!-- Class Comparison Bars -->
      <div class="dash-section-card">
        <h3 class="dash-section-title">Class Performance</h3>
        <div class="dash-bars-list">
          ${allLevelStats.map(lvl => `
            <div class="dash-bar-row">
              <span class="dash-bar-label">${lvl.label}</span>
              <div class="dash-bar-track">
                <div class="dash-bar-fill" style="width: ${Math.max(lvl.rate, 4)}%;"></div>
              </div>
              <span class="dash-bar-pct">${lvl.rate}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Student Ledger -->
      <div class="dash-section-card">
        <div class="dash-ledger-header">
          <h3 class="dash-section-title">Student Records</h3>
          <div class="dash-ledger-controls">
            <input type="text" placeholder="Search..." class="dash-search-input" value="${AppUI.escapeHtml(searchQuery)}" oninput="Dashboard.setSearchQuery(this.value)" />
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
      filtered = filtered.filter(s => s.studentName.toLowerCase().includes(searchQuery));
    }

    if (filtered.length === 0) {
      return `<p class="dash-empty">No student records found.</p>`;
    }

    return filtered.map(s => {
      const rateColor = s.percentage >= 80 ? 'var(--sage)' : 'var(--terra)';
      return `
        <div class="dash-ledger-row" onclick="Dashboard.showStudentHistory('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
          <div class="dash-ledger-name">
            <span class="dash-ledger-student">${AppUI.escapeHtml(s.studentName)}</span>
            <span class="dash-ledger-sub">${AppUI.escapeHtml(s.levelId)} · ${s.totalDays} sessions</span>
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

  function showStudentHistory(levelId, studentName) {
    const stats = Store.getDashboardStats(levelId);
    const student = stats.students.find(s => s.studentName === studentName);

    if (!student || !student.history || student.history.length === 0) {
      AppUI.showModal({
        title: `${studentName}`,
        bodyHtml: `<p style="color: var(--ink-secondary); text-align: center; padding: 24px;">No sessions logged yet.</p>`,
        confirmText: 'Close', cancelText: null
      });
      return;
    }

    const rows = student.history.map(h => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 4px; border-bottom:1px solid var(--rule);">
        <div>
          <div style="font-weight:600; font-size:0.86rem;">${h.date}</div>
          <div style="font-size:0.7rem; color:var(--ink-muted);">${AppUI.escapeHtml(h.teacher || 'Teacher')}</div>
        </div>
        <span class="dash-pill ${h.status === 'Present' ? 'present' : 'absent'}">${h.status}</span>
      </div>
    `).join('');

    AppUI.showModal({
      title: `${studentName} – ${student.percentage}%`,
      bodyHtml: `<div style="max-height:300px; overflow-y:auto;">${rows}</div>`,
      confirmText: 'Close', cancelText: null
    });
  }

  function exportToCsv() {
    const stats = Store.getDashboardStats(selectedLevel);
    if (!stats.students || stats.students.length === 0) {
      AppUI.showToast('No records to export.', 'error');
      return;
    }

    const headers = ['Class', 'Student', 'Sessions', 'Present', 'Absent', 'Rate'];
    const csvRows = [headers.join(',')];
    stats.students.forEach(s => {
      csvRows.push([`"${s.levelId}"`, `"${s.studentName.replace(/"/g, '""')}"`, s.totalDays, s.presentCount, s.absentCount, `"${s.percentage}%"`].join(','));
    });

    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    link.download = `Baladatta_Attendance_${selectedLevel}_${Store.getTodayString()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    AppUI.showToast('CSV exported.', 'success');
  }

  return { init, render, setFilterLevel, setSearchQuery, showStudentHistory, exportToCsv };
})();

if (typeof window !== 'undefined') window.Dashboard = Dashboard;
