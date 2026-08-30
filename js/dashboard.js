/**
 * Baladatta Attendance - Attendance Analytics & Dashboard Module
 * Faithful to Figma Mobile Education UI Kit (E-Sekula) Cards & Pastel Blocks
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

    let html = `
      <!-- Figma Style 4 Pastel Stat Cards (Coral, Cream, Mint, Peach) -->
      <div class="figma-stats-grid">
        <div class="figma-stat-card coral">
          <div class="stat-header-line">
            <span>Attendance Rate</span>
            <svg class="indian-motif" viewBox="0 0 32 24" aria-hidden="true"><use href="#motif-lotus" /></svg>
          </div>
          <div class="stat-huge-number">${stats.overallAttendanceRate}%</div>
          <div class="stat-sub-text">${stats.totalPresent} Present / ${stats.totalPresent + stats.totalAbsent} Total</div>
        </div>

        <div class="figma-stat-card cream">
          <div class="stat-header-line">
            <span>Enrolled Students</span>
            <svg class="indian-motif" viewBox="0 0 24 24" aria-hidden="true"><use href="#motif-mandala" /></svg>
          </div>
          <div class="stat-huge-number">${stats.totalStudents}</div>
          <div class="stat-sub-text">${selectedLevel === 'ALL' ? 'All Nilais' : selectedLevel}</div>
        </div>

        <div class="figma-stat-card mint">
          <div class="stat-header-line">
            <span>Class Sessions</span>
            <svg class="indian-motif" viewBox="0 0 24 24" aria-hidden="true"><use href="#motif-diya" /></svg>
          </div>
          <div class="stat-huge-number">${stats.totalSessions}</div>
          <div class="stat-sub-text">Recorded dates</div>
        </div>

        <div class="figma-stat-card peach">
          <div class="stat-header-line">
            <span>Present / Absent</span>
            <svg class="indian-motif" viewBox="0 0 24 24" aria-hidden="true"><use href="#motif-diamond" /></svg>
          </div>
          <div class="stat-huge-number" style="font-size: 1.6rem; display:flex; gap:8px; align-items:center;">
            <span>${stats.totalPresent} <small style="font-size:0.75rem;">P</small></span>
            <span style="opacity:0.4;">/</span>
            <span>${stats.totalAbsent} <small style="font-size:0.75rem;">A</small></span>
          </div>
          <div class="stat-sub-text">Deduplicated latest records</div>
        </div>
      </div>

      <!-- Search & Nilai Filter Bar -->
      <div class="dashboard-controls-bar">
        <div class="search-pill-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="dashboardSearchInput" class="search-pill-input" placeholder="Search student name..." value="${AppUI.escapeHtml(searchQuery)}" oninput="Dashboard.setSearchQuery(this.value)" />
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <div class="pill-select-wrapper" style="width: auto; min-width: 170px;">
            <select class="pill-select" style="padding-top:8px; padding-bottom:8px; font-size:0.85rem;" onchange="Dashboard.setFilterLevel(this.value)">
              <option value="ALL" ${selectedLevel === 'ALL' ? 'selected' : ''}>All Nilais (அனைத்தும்)</option>
              ${Store.LEVELS.map(l => `<option value="${l.id}" ${selectedLevel === l.id ? 'selected' : ''}>${l.label}</option>`).join('')}
            </select>
            <div class="select-arrow-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          <button class="btn-outline-pill motif-button" onclick="Dashboard.exportToCsv()" title="Download Attendance CSV" style="padding: 8px 16px;">
            <svg class="motif-button-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#motif-diya" /></svg>
            Export CSV
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
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); margin-bottom:8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h3><svg class="empty-motif" viewBox="0 0 32 24" aria-hidden="true"><use href="#motif-lotus" /></svg>No matching students</h3>
          <p style="font-size:0.85rem;">Try adjusting your search or Nilai filter.</p>
        </div>
      `;
    }

    return `
      <div class="dashboard-cards-container">
        ${filtered.map((s, idx) => {
          const rateTier = s.percentage >= 80 ? 'high' : s.percentage >= 60 ? 'medium' : 'low';
          const initials = AppUI.getInitials(s.studentName);

          return `
            <div class="dash-student-card">
              <div class="dash-student-info">
                <div class="avatar-ring" style="width:38px; height:38px; font-size:0.85rem; color:var(--cream); background:var(--bg-surface-elevated);">
                  ${initials}
                </div>
                <div>
                  <div style="font-size:1rem; font-weight:800; color:var(--text-primary);">${AppUI.escapeHtml(s.studentName)}</div>
                  <span class="dash-pill-stat level">${AppUI.escapeHtml(s.levelId)}</span>
                </div>
              </div>

              <div class="dash-metrics-group">
                <span class="dash-pill-stat present">${s.presentCount} Present</span>
                <span class="dash-pill-stat absent">${s.absentCount} Absent</span>

                <div class="dash-progress-wrap">
                  <div class="dash-bar-track">
                    <div class="dash-bar-fill ${rateTier}" style="width: ${s.percentage}%;"></div>
                  </div>
                  <span style="font-size:0.85rem; font-weight:800; color:var(--text-primary); min-width:36px; text-align:right;">
                    ${s.percentage}%
                  </span>
                </div>

                <button class="btn-outline-pill motif-button" style="padding:6px 14px; font-size:0.8rem;" onclick="Dashboard.showStudentHistory('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
                  <svg class="motif-button-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#motif-mandala" /></svg>
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
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border-main);">
          <div>
            <div style="font-weight:800; color:var(--text-primary); font-size:0.95rem;">${h.date}</div>
            <div style="font-size:0.775rem; color:var(--text-secondary);">Teacher: ${AppUI.escapeHtml(h.teacher || 'Teacher')}</div>
          </div>
          <div>
            <span class="counter-chip ${isPresent ? 'present' : 'absent'}" style="font-size:0.75rem; padding:4px 12px;">
              ${isPresent ? '✓ Present' : '✗ Absent'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface-elevated); padding:14px 18px; border-radius:var(--radius-card); margin-bottom:16px; border:1px solid var(--border-main);">
        <div>
          <span style="font-size:0.8rem; color:var(--text-secondary);">Nilai:</span>
          <strong style="color:var(--text-primary);">${AppUI.escapeHtml(levelId)}</strong>
        </div>
        <div>
          <span style="font-size:0.8rem; color:var(--text-secondary);">Attendance:</span>
          <strong style="color:${student.percentage >= 80 ? 'var(--mint)' : 'var(--primary)'}; font-size:1.15rem; margin-left:4px;">
            ${student.percentage}%
          </strong>
          <span style="font-size:0.8rem; color:var(--text-secondary);">(${student.presentCount}/${student.totalDays})</span>
        </div>
      </div>
      <div style="max-height:350px; overflow-y:auto; border:1px solid var(--border-main); border-radius:var(--radius-card);">
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
