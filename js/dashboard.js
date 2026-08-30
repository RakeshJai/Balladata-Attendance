/**
 * Baladatta Attendance - Attendance Analytics & Dashboard Module
 * Ultra-Minimalist Claude Dark Analytics
 */

const Dashboard = (() => {
  let selectedLevel = 'ALL';
  let searchQuery = '';

  function init() {
    render();
  }

  function setFilterLevel(level) {
    selectedLevel = level;
    render();
  }

  function setSearchQuery(query) {
    searchQuery = (query || '').toLowerCase().trim();
    renderCardsOnly();
  }

  function render() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    const stats = Store.getDashboardStats(selectedLevel);
    const allLevelStats = calculateAllLevelsStats();

    let html = `
      <!-- Hero Attendance & Donut Section -->
      <div class="dash-hero-grid">
        <div class="dash-rate-box">
          <div class="dash-rate-huge">${stats.overallAttendanceRate}%</div>
          <div class="dash-rate-sub">
            <strong>${stats.totalPresent}</strong> present out of <strong>${stats.totalPresent + stats.totalAbsent}</strong> sessions across <strong>${stats.totalStudents}</strong> students
          </div>
        </div>

        <div class="dash-donut-container">
          ${renderDonutSvg(stats.totalPresent, stats.totalAbsent, stats.overallAttendanceRate)}
          <div class="dash-donut-legend">
            <div class="legend-row">
              <span class="legend-dot-sage"></span>
              <span>Present: <strong>${stats.totalPresent}</strong> (${stats.overallAttendanceRate}%)</span>
            </div>
            <div class="legend-row">
              <span class="legend-dot-gray"></span>
              <span>Absent: <strong>${stats.totalAbsent}</strong> (${100 - stats.overallAttendanceRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Class Breakdown Bar Section -->
      <div class="level-breakdown-wrap">
        <div class="section-sub-heading">Class Attendance Rates</div>
        ${renderLevelBars(allLevelStats)}
      </div>

      <!-- Search & Filters -->
      <div class="dash-search-row">
        <input type="text" class="dash-search-input" placeholder="Filter student by name..." value="${AppUI.escapeHtml(searchQuery)}" oninput="Dashboard.setSearchQuery(this.value)" />

        <div style="display:flex; align-items:center; gap:8px;">
          <select class="dash-filter-select" onchange="Dashboard.setFilterLevel(this.value)" aria-label="Filter class">
            <option value="ALL" ${selectedLevel === 'ALL' ? 'selected' : ''}>All Classes</option>
            ${Store.LEVELS.map(l => `<option value="${l.id}" ${selectedLevel === l.id ? 'selected' : ''}>${l.label.split('(')[0].trim()}</option>`).join('')}
          </select>

          <button class="csv-btn" onclick="Dashboard.exportToCsv()" title="Export CSV">Export CSV</button>
        </div>
      </div>

      <!-- Student List -->
      <div id="dashboardCardsWrapper">
        ${getCardsHtml(stats.students)}
      </div>
    `;

    container.innerHTML = html;
  }

  function renderDonutSvg(present, absent, percentage) {
    const total = present + absent;
    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.76

    let presentStroke = 0;
    let absentStroke = 0;

    if (total > 0) {
      presentStroke = (present / total) * circumference;
      absentStroke = circumference - presentStroke;
    } else {
      absentStroke = circumference;
    }

    return `
      <svg class="dash-donut-svg" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="${radius}"
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.1)"
          stroke-width="10"
        />
        <circle
          cx="50" cy="50" r="${radius}"
          fill="transparent"
          stroke="var(--sage)"
          stroke-width="10"
          stroke-dasharray="${presentStroke} ${absentStroke}"
          stroke-dashoffset="0"
          stroke-linecap="round"
        />
      </svg>
    `;
  }

  function calculateAllLevelsStats() {
    return Store.LEVELS.map(lvl => {
      const stats = Store.getDashboardStats(lvl.id);
      return {
        id: lvl.id,
        label: lvl.label.split('(')[0].trim(),
        rate: stats.overallAttendanceRate
      };
    });
  }

  function renderLevelBars(levelStats) {
    return levelStats.map(lvl => `
      <div class="level-bar-item">
        <span class="level-bar-label">${lvl.label}</span>
        <div class="level-bar-track">
          <div class="level-bar-fill" style="width: ${lvl.rate}%;"></div>
        </div>
        <span class="level-bar-val">${lvl.rate}%</span>
      </div>
    `).join('');
  }

  function renderCardsOnly() {
    const wrapper = document.getElementById('dashboardCardsWrapper');
    if (!wrapper) return;
    const stats = Store.getDashboardStats(selectedLevel);
    wrapper.innerHTML = getCardsHtml(stats.students);
  }

  function getCardsHtml(students) {
    let filtered = students;
    if (searchQuery) {
      filtered = filtered.filter(s => s.studentName.toLowerCase().includes(searchQuery));
    }

    if (filtered.length === 0) {
      return `
        <div class="empty-placeholder">
          <p>No matching students</p>
        </div>
      `;
    }

    return `
      <div>
        ${filtered.map(s => {
          const rateColor = s.percentage >= 80 ? 'var(--sage-text)' : 'var(--coral)';
          return `
            <div class="dash-student-row">
              <div class="dash-student-meta">
                <span class="dash-level-tag">${AppUI.escapeHtml(s.levelId)}</span>
                <span style="font-weight:600; color:var(--text);">${AppUI.escapeHtml(s.studentName)}</span>
              </div>

              <div class="dash-stats-meta">
                <span style="color:var(--text-dim); font-size:0.8rem;">${s.presentCount}/${s.totalDays}</span>
                <span class="dash-rate-text" style="color:${rateColor};">${s.percentage}%</span>
                <button class="action-link" style="font-size:0.75rem;" onclick="Dashboard.showStudentHistory('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
                  History
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function showStudentHistory(levelId, studentName) {
    const stats = Store.getDashboardStats(levelId);
    const student = stats.students.find(s => s.studentName === studentName);

    if (!student || !student.history || student.history.length === 0) {
      AppUI.showModal({
        title: `${studentName}`,
        bodyHtml: `<p style="color:var(--text-dim); text-align:center; padding:20px;">No sessions logged yet.</p>`,
        confirmText: 'Close',
        cancelText: null
      });
      return;
    }

    const historyRows = student.history.map(h => {
      const isPresent = h.status === 'Present';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
          <div>
            <div style="font-weight:600; color:var(--text); font-size:0.875rem;">${h.date}</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">${AppUI.escapeHtml(h.teacher || 'Teacher')}</div>
          </div>
          <div>
            <span style="font-size:0.78rem; font-weight:600; color:${isPresent ? 'var(--sage-text)' : 'var(--text-dim)'};">
              ${isPresent ? '✓ Present' : 'Absent'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; margin-bottom:12px; border-bottom:1px solid var(--border);">
        <span style="font-size:0.8rem; color:var(--text-dim);">${AppUI.escapeHtml(levelId)}</span>
        <span style="font-size:1.1rem; font-weight:700; color:${student.percentage >= 80 ? 'var(--sage-text)' : 'var(--coral)'};">
          ${student.percentage}% <small style="font-size:0.75rem; color:var(--text-dim);">(${student.presentCount}/${student.totalDays})</small>
        </span>
      </div>
      <div>${historyRows}</div>
    `;

    AppUI.showModal({
      title: `${studentName}`,
      bodyHtml: bodyHtml,
      confirmText: 'Close',
      cancelText: null
    });
  }

  function exportToCsv() {
    const stats = Store.getDashboardStats(selectedLevel);
    if (!stats.students || stats.students.length === 0) {
      AppUI.showToast('No student data to export.', 'error');
      return;
    }

    const headers = ['Nilai', 'Student Name', 'Total Sessions', 'Present Count', 'Absent Count', 'Attendance Percentage'];
    const csvRows = [headers.join(',')];

    stats.students.forEach(s => {
      const row = [
        `"${s.levelId}"`,
        `"${s.studentName.replace(/"/g, '""')}"`,
        s.totalDays,
        s.presentCount,
        s.absentCount,
        `"${s.percentage}%"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const dateStr = Store.getTodayString();
    link.setAttribute('download', `Baladatta_Attendance_${selectedLevel}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    AppUI.showToast('Exported CSV report.', 'success');
  }

  return {
    init,
    render,
    setFilterLevel,
    setSearchQuery,
    showStudentHistory,
    exportToCsv
  };
})();

if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
}
