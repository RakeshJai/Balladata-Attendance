/**
 * Baladatta Attendance – Neoclassical Indian Traditional Dashboard
 * Creative Architectural Visualizations:
 * 1. Sudarshana / Temple Mandapam Dial (Chakra Attendance Wheel SVG)
 * 2. Stepped Temple Pillar Comparative Class Charts (Adhishthana Pillars)
 * 3. Inscription-style Metric Plaques & Student History Ledgers
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
      <!-- Neoclassical Inscription Metric Plaques -->
      <div class="arch-metrics-grid">
        <div class="arch-metric-card">
          <div class="arch-metric-header">
            <span class="arch-metric-tag">வருகை விகிதம்</span>
            <span class="arch-metric-title">Overall Rate</span>
          </div>
          <div class="arch-metric-val rate">${stats.overallAttendanceRate}%</div>
          <div class="arch-metric-foot">${stats.totalPresent} Present · ${stats.totalAbsent} Absent</div>
        </div>

        <div class="arch-metric-card">
          <div class="arch-metric-header">
            <span class="arch-metric-tag">மாணவர் எண்ணிக்கை</span>
            <span class="arch-metric-title">Enrolled</span>
          </div>
          <div class="arch-metric-val">${stats.totalStudents}</div>
          <div class="arch-metric-foot">${selectedLevel === 'ALL' ? 'All 7 Classes' : selectedLevel}</div>
        </div>

        <div class="arch-metric-card">
          <div class="arch-metric-header">
            <span class="arch-metric-tag">வகுப்பு அமர்வுகள்</span>
            <span class="arch-metric-title">Sessions Logged</span>
          </div>
          <div class="arch-metric-val">${stats.totalSessions}</div>
          <div class="arch-metric-foot">Recorded school dates</div>
        </div>

        <div class="arch-metric-card">
          <div class="arch-metric-header">
            <span class="arch-metric-tag">பதிவுகள்</span>
            <span class="arch-metric-title">Total Records</span>
          </div>
          <div class="arch-metric-val" style="font-size: 1.5rem; display: flex; gap: 8px; align-items: baseline;">
            <span style="color: var(--sage);">${stats.totalPresent}<small style="font-size: 0.7rem; margin-left: 2px;">P</small></span>
            <span style="color: var(--ink-muted); font-size: 0.9rem;">/</span>
            <span style="color: var(--ink-secondary);">${stats.totalAbsent}<small style="font-size: 0.7rem; margin-left: 2px;">A</small></span>
          </div>
          <div class="arch-metric-foot">Deduplicated ledger</div>
        </div>
      </div>

      <!-- Creative Neoclassical Visualizations Grid -->
      <div class="arch-charts-grid">
        
        <!-- 1. Sudarshana / Temple Mandapam Dial (Chakra Attendance Wheel) -->
        <div class="arch-chart-box">
          <div class="arch-chart-heading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--terra);"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>
            <span>Sudarshana Attendance Dial</span>
          </div>
          <div class="chakra-dial-wrapper">
            ${renderChakraDialSvg(stats.totalPresent, stats.totalAbsent, stats.overallAttendanceRate)}
            <div class="chakra-legend">
              <div class="chakra-legend-row">
                <span class="chakra-dot sage"></span>
                <span>Present (வந்தார்): <strong>${stats.totalPresent}</strong> (${stats.overallAttendanceRate}%)</span>
              </div>
              <div class="chakra-legend-row">
                <span class="chakra-dot stone"></span>
                <span>Absent (வரவில்லை): <strong>${stats.totalAbsent}</strong> (${100 - stats.overallAttendanceRate}%)</span>
              </div>
              <div class="chakra-legend-note">
                Wheel represents total recorded student sessions across all dates.
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Stepped Dravidian Temple Pillar Performance Chart -->
        <div class="arch-chart-box">
          <div class="arch-chart-heading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--terra);"><rect x="4" y="2" width="16" height="4" rx="1"/><rect x="6" y="6" width="12" height="14"/><rect x="3" y="20" width="18" height="2"/></svg>
            <span>Class Pillar Performance</span>
          </div>
          <div class="temple-pillars-container">
            ${renderTemplePillarBars(allLevelStats)}
          </div>
        </div>

      </div>

      <!-- Search & Filter Ledger Bar -->
      <div class="arch-toolbar">
        <div class="arch-search-field">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="dashboardSearchInput" class="arch-input" placeholder="Search student name..." value="${AppUI.escapeHtml(searchQuery)}" oninput="Dashboard.setSearchQuery(this.value)" />
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <select class="arch-select" onchange="Dashboard.setFilterLevel(this.value)" aria-label="Filter by Nilai">
            <option value="ALL" ${selectedLevel === 'ALL' ? 'selected' : ''}>All Classes (அனைத்து வகுப்புகள்)</option>
            ${Store.LEVELS.map(l => `<option value="${l.id}" ${selectedLevel === l.id ? 'selected' : ''}>${l.label}</option>`).join('')}
          </select>

          <button class="btn-ghost-action" onclick="Dashboard.exportToCsv()" title="Export CSV Report" style="padding: 8px 14px; min-height: 38px; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Student Records Ledger -->
      <div id="dashboardCardsWrapper">
        ${getCardsHtml(stats.students)}
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Renders the traditional 12-ray Temple Chakra Dial with concentric ticks
   */
  function renderChakraDialSvg(present, absent, percentage) {
    const total = present + absent;
    const radius = 48;
    const circumference = 2 * Math.PI * radius; // ~301.59

    let presentStroke = 0;
    let absentStroke = 0;

    if (total > 0) {
      presentStroke = (present / total) * circumference;
      absentStroke = circumference - presentStroke;
    } else {
      absentStroke = circumference;
    }

    // Generate 12 radial architectural spoke markers
    const spokes = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * (Math.PI / 180);
      const x1 = 65 + 38 * Math.cos(angle);
      const y1 = 65 + 38 * Math.sin(angle);
      const x2 = 65 + 42 * Math.cos(angle);
      const y2 = 65 + 42 * Math.sin(angle);
      spokes.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(255,245,230,0.18)" stroke-width="1.5" />`);
    }

    return `
      <div class="chakra-dial-svg-wrap">
        <svg viewBox="0 0 130 130">
          <!-- Outer Decorative Inscription Ring -->
          <circle cx="65" cy="65" r="58" fill="none" stroke="rgba(255,245,230,0.08)" stroke-width="1" stroke-dasharray="3 3" />
          <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(194,102,58,0.25)" stroke-width="1" />
          
          <!-- Radial Spoke Lines -->
          ${spokes.join('')}

          <!-- Background Track -->
          <circle
            cx="65" cy="65" r="${radius}"
            fill="none"
            stroke="rgba(255,245,230,0.07)"
            stroke-width="10"
          />

          <!-- Active Present Arc (Sage Olive) -->
          <circle
            cx="65" cy="65" r="${radius}"
            fill="none"
            stroke="var(--sage)"
            stroke-width="10"
            stroke-dasharray="${presentStroke} ${absentStroke}"
            stroke-dashoffset="0"
            transform="rotate(-90 65 65)"
            stroke-linecap="butt"
          />

          <!-- Inner Mandala Ring -->
          <circle cx="65" cy="65" r="32" fill="#14110c" stroke="rgba(255,245,230,0.12)" stroke-width="1" />
        </svg>

        <!-- Center Typography -->
        <div class="chakra-dial-center">
          <div class="chakra-dial-rate">${percentage}%</div>
          <div class="chakra-dial-tamil">வருகை</div>
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
        tamilLabel: lvl.label.includes('(') ? lvl.label.split('(')[1].replace(')', '') : '',
        rate: stats.overallAttendanceRate,
        studentCount: stats.totalStudents
      };
    });
  }

  /**
   * Renders stepped Dravidian temple pillar comparison bars
   */
  function renderTemplePillarBars(levelStats) {
    return levelStats.map(lvl => `
      <div class="pillar-chart-row">
        <div class="pillar-label-group">
          <span class="pillar-class-name">${lvl.label}</span>
          ${lvl.tamilLabel ? `<span class="pillar-tamil-sub">${lvl.tamilLabel}</span>` : ''}
        </div>

        <div class="pillar-stepped-track">
          <div class="pillar-plinth-base"></div>
          <div class="pillar-fill-bar" style="width: ${lvl.rate}%;"></div>
          <div class="pillar-capital-cap"></div>
        </div>

        <div class="pillar-metric-tally">
          <span class="pillar-pct-val">${lvl.rate}%</span>
          <span class="pillar-students-count">${lvl.studentCount} std</span>
        </div>
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
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color: var(--terra); margin-bottom: 8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h3>No matching student records found</h3>
          <p style="font-size: 0.82rem;">Adjust the search query or class filter above.</p>
        </div>
      `;
    }

    return `
      <div class="arch-ledger-list">
        ${filtered.map(s => {
          const rateColor = s.percentage >= 80 ? 'var(--sage)' : 'var(--terra)';
          const initials = AppUI.getInitials(s.studentName);

          return `
            <div class="arch-ledger-row">
              <div class="arch-ledger-left">
                <div class="arch-avatar-seal">
                  ${initials}
                </div>
                <div class="arch-ledger-names">
                  <div class="arch-student-name">${AppUI.escapeHtml(s.studentName)}</div>
                  <div class="arch-student-sub">${AppUI.escapeHtml(s.levelId)} · ${s.totalDays} sessions</div>
                </div>
              </div>

              <div class="arch-ledger-right">
                <div class="arch-tally-chips">
                  <span class="arch-status-seal present">${s.presentCount} P</span>
                  <span class="arch-status-seal absent">${s.absentCount} A</span>
                </div>

                <div class="arch-rate-stepper">
                  <span class="arch-rate-num" style="color: ${rateColor};">${s.percentage}%</span>
                </div>

                <button class="arch-btn-history" onclick="Dashboard.showStudentHistory('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
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
        title: `${studentName} – Attendance Ledger`,
        bodyHtml: `<p style="color: var(--ink-secondary); text-align: center; padding: 24px;">No attendance sessions logged yet for this student.</p>`,
        confirmText: 'Close',
        cancelText: null
      });
      return;
    }

    const historyRows = student.history.map(h => {
      const isPresent = h.status === 'Present';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 6px; border-bottom: 1px solid var(--rule);">
          <div>
            <div style="font-weight: 600; color: var(--ink); font-size: 0.88rem;">${h.date}</div>
            <div style="font-size: 0.72rem; color: var(--ink-muted);">Teacher: ${AppUI.escapeHtml(h.teacher || 'Teacher')}</div>
          </div>
          <div>
            <span class="arch-status-seal ${isPresent ? 'present' : 'absent'}">
              ${isPresent ? '✓ வந்தார் (Present)' : '○ வரவில்லை (Absent)'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <div style="background: var(--surface); padding: 14px 16px; border-radius: 8px; border: 1px solid var(--rule-strong); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.74rem; color: var(--ink-muted); text-transform: uppercase;">Class:</span>
          <strong style="color: var(--ink); font-size: 0.88rem; margin-left: 4px;">${AppUI.escapeHtml(levelId)}</strong>
        </div>
        <div>
          <span style="font-size: 0.74rem; color: var(--ink-muted); text-transform: uppercase;">Rate:</span>
          <strong style="color: ${student.percentage >= 80 ? 'var(--sage)' : 'var(--terra)'}; font-size: 1.1rem; margin-left: 4px; font-family: var(--serif);">
            ${student.percentage}%
          </strong>
          <span style="font-size: 0.74rem; color: var(--ink-muted);">(${student.presentCount}/${student.totalDays})</span>
        </div>
      </div>
      <div style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
        ${historyRows}
      </div>
    `;

    AppUI.showModal({
      title: `${studentName} – Attendance History`,
      bodyHtml: bodyHtml,
      confirmText: 'Close',
      cancelText: null
    });
  }

  function exportToCsv() {
    const stats = Store.getDashboardStats(selectedLevel);
    if (!stats.students || stats.students.length === 0) {
      AppUI.showToast('No student records to export.', 'error');
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
