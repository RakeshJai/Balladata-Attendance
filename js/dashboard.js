/**
 * Baladatta Attendance - Attendance Analytics & Dashboard Module
 * Modern visual charts (Native SVG Donut & Level Comparison Bars) in Claude terracotta theme.
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
      <!-- High-Density Stat Cards -->
      <div class="dashboard-stats-grid">
        <div class="dashboard-stat-card">
          <div class="stat-title-row">
            <span>Attendance Rate</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--coral);"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div class="stat-number rate">${stats.overallAttendanceRate}%</div>
          <div class="stat-caption">${stats.totalPresent} Present / ${stats.totalPresent + stats.totalAbsent} Total</div>
        </div>

        <div class="dashboard-stat-card">
          <div class="stat-title-row">
            <span>Enrolled Students</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--text-secondary);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="stat-number">${stats.totalStudents}</div>
          <div class="stat-caption">${selectedLevel === 'ALL' ? 'All Nilais' : selectedLevel}</div>
        </div>

        <div class="dashboard-stat-card">
          <div class="stat-title-row">
            <span>Class Sessions</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--text-secondary);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="stat-number">${stats.totalSessions}</div>
          <div class="stat-caption">Recorded dates</div>
        </div>

        <div class="dashboard-stat-card">
          <div class="stat-title-row">
            <span>Present / Absent</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--text-muted);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
          </div>
          <div class="stat-number" style="font-size:1.5rem; display:flex; gap:8px; align-items:baseline;">
            <span style="color:var(--sage);">${stats.totalPresent} <small style="font-size:0.75rem;">P</small></span>
            <span style="color:var(--text-muted); font-size:1rem;">/</span>
            <span style="color:var(--slate);">${stats.totalAbsent} <small style="font-size:0.75rem;">A</small></span>
          </div>
          <div class="stat-caption">Deduplicated records</div>
        </div>
      </div>

      <!-- Modern Visual Charts Grid -->
      <div class="dashboard-charts-grid">
        
        <!-- 1. Donut Pie Chart: Attendance Split -->
        <div class="chart-card">
          <div class="chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--coral);"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            <span>Attendance Distribution</span>
          </div>
          <div class="chart-body-donut">
            ${renderDonutChart(stats.totalPresent, stats.totalAbsent, stats.overallAttendanceRate)}
            <div class="donut-legend">
              <div class="legend-item">
                <span class="legend-dot present"></span>
                <span>Present: <strong>${stats.totalPresent}</strong> (${stats.overallAttendanceRate}%)</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot absent"></span>
                <span>Absent: <strong>${stats.totalAbsent}</strong> (${100 - stats.overallAttendanceRate}%)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Bar Chart: Level-by-Level Comparison -->
        <div class="chart-card">
          <div class="chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--coral);"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Class Performance Comparison</span>
          </div>
          <div class="chart-body-bars">
            ${renderLevelBars(allLevelStats)}
          </div>
        </div>

      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="dashboard-toolbar">
        <div class="search-field-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="dashboardSearchInput" class="search-input" placeholder="Search student name..." value="${AppUI.escapeHtml(searchQuery)}" oninput="Dashboard.setSearchQuery(this.value)" />
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <select class="select-filter" onchange="Dashboard.setFilterLevel(this.value)" aria-label="Filter by Nilai">
            <option value="ALL" ${selectedLevel === 'ALL' ? 'selected' : ''}>All Nilais (அனைத்தும்)</option>
            ${Store.LEVELS.map(l => `<option value="${l.id}" ${selectedLevel === l.id ? 'selected' : ''}>${l.label}</option>`).join('')}
          </select>

          <button class="btn-ghost-action" onclick="Dashboard.exportToCsv()" title="Download Attendance CSV" style="padding: 8px 14px; display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Student Cards List -->
      <div id="dashboardCardsWrapper">
        ${getCardsHtml(stats.students)}
      </div>
    `;

    container.innerHTML = html;
  }

  function renderDonutChart(present, absent, percentage) {
    const total = present + absent;
    const radius = 45;
    const circumference = 2 * Math.PI * radius; // ~282.74

    let presentStroke = 0;
    let absentStroke = 0;

    if (total > 0) {
      presentStroke = (present / total) * circumference;
      absentStroke = circumference - presentStroke;
    } else {
      absentStroke = circumference;
    }

    return `
      <div class="donut-svg-wrap">
        <svg viewBox="0 0 120 120">
          <!-- Background ring (Absent) -->
          <circle
            cx="60" cy="60" r="${radius}"
            fill="transparent"
            stroke="var(--slate-border)"
            stroke-width="12"
          />
          <!-- Foreground ring (Present) -->
          <circle
            cx="60" cy="60" r="${radius}"
            fill="transparent"
            stroke="var(--sage)"
            stroke-width="12"
            stroke-dasharray="${presentStroke} ${absentStroke}"
            stroke-dashoffset="0"
            stroke-linecap="round"
            style="transition: stroke-dasharray 0.5s ease;"
          />
        </svg>
        <div class="donut-center-text">
          <div class="donut-center-pct">${percentage}%</div>
          <div class="donut-center-sub">Rate</div>
        </div>
      </div>
    `;
  }

  function calculateAllLevelsStats() {
    return Store.LEVELS.map(lvl => {
      const stats = Store.getDashboardStats(lvl.id);
      return {
        id: lvl.id,
        label: lvl.label.split('(')[0].trim(),
        rate: stats.overallAttendanceRate,
        studentsCount: stats.totalStudents
      };
    });
  }

  function renderLevelBars(levelStats) {
    return levelStats.map(lvl => `
      <div class="level-bar-row">
        <span class="level-bar-name" title="${lvl.label}">${lvl.label}</span>
        <div class="level-bar-track">
          <div class="level-bar-fill" style="width: ${lvl.rate}%;"></div>
        </div>
        <span class="level-bar-pct">${lvl.rate}%</span>
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
        <div class="empty-state-box">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); margin-bottom:8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h3>No matching students</h3>
          <p style="font-size:0.85rem;">Try adjusting your search or Nilai filter.</p>
        </div>
      `;
    }

    return `
      <div>
        ${filtered.map((s) => {
          const rateTier = s.percentage >= 80 ? 'high' : s.percentage >= 60 ? 'medium' : 'low';
          const initials = AppUI.getInitials(s.studentName);

          return `
            <div class="dash-card">
              <div class="dash-card-left">
                <div class="student-avatar" style="width:36px; height:36px; font-size:0.8rem;">
                  ${initials}
                </div>
                <div>
                  <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary);">${AppUI.escapeHtml(s.studentName)}</div>
                  <span class="dash-badge level">${AppUI.escapeHtml(s.levelId)}</span>
                </div>
              </div>

              <div class="dash-metrics">
                <span class="dash-badge present">${s.presentCount} Present</span>
                <span class="dash-badge absent">${s.absentCount} Absent</span>

                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="dash-progress-track">
                    <div class="dash-progress-fill ${rateTier}" style="width: ${s.percentage}%;"></div>
                  </div>
                  <span style="font-size:0.85rem; font-weight:700; color:var(--text-primary); min-width:36px; text-align:right;">
                    ${s.percentage}%
                  </span>
                </div>

                <button class="btn-ghost-action" style="padding:6px 12px; font-size:0.78rem;" onclick="Dashboard.showStudentHistory('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
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
        title: `${studentName} - History`,
        bodyHtml: `<p style="color:var(--text-secondary); text-align:center; padding:20px;">No sessions logged yet for this student.</p>`,
        confirmText: 'Close',
        cancelText: null
      });
      return;
    }

    const historyRows = student.history.map(h => {
      const isPresent = h.status === 'Present';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid var(--border-subtle);">
          <div>
            <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">${h.date}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Teacher: ${AppUI.escapeHtml(h.teacher || 'Teacher')}</div>
          </div>
          <div>
            <span class="dash-badge ${isPresent ? 'present' : 'absent'}">
              ${isPresent ? '✓ Present' : '✗ Absent'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface-subtle); padding:12px 16px; border-radius:var(--radius-md); margin-bottom:14px; border:1px solid var(--border-subtle);">
        <div>
          <span style="font-size:0.78rem; color:var(--text-muted);">Nilai:</span>
          <strong style="color:var(--text-primary); font-size:0.9rem; margin-left:4px;">${AppUI.escapeHtml(levelId)}</strong>
        </div>
        <div>
          <span style="font-size:0.78rem; color:var(--text-muted);">Attendance Rate:</span>
          <strong style="color:${student.percentage >= 80 ? 'var(--sage)' : 'var(--coral)'}; font-size:1.1rem; margin-left:4px;">
            ${student.percentage}%
          </strong>
          <span style="font-size:0.78rem; color:var(--text-muted);">(${student.presentCount}/${student.totalDays})</span>
        </div>
      </div>
      <div style="max-height:300px; overflow-y:auto; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
        ${historyRows}
      </div>
    `;

    AppUI.showModal({
      title: `${studentName} - History`,
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

    AppUI.showToast('Exported attendance CSV report.', 'success');
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
