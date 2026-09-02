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
  let volunteerHoursMin = null; // inclusive lower bound for Volunteers (null = no filter)
  let volunteerHoursMax = null; // inclusive upper bound for Volunteers (null = no filter)

  function init() {
    activeStudentView = null;
    searchQuery = '';
    volunteerHoursMin = null;
    volunteerHoursMax = null;
    render();
  }

  function setFilterLevel(level) {
    selectedLevel = level;
    // Reset volunteer hours filter when leaving Volunteers (optional: keep but hide)
    if (level !== 'Volunteers') {
      // keep values but not applied; uncomment to reset:
      // volunteerHoursMin = null;
      // volunteerHoursMax = null;
    }
    render();
  }

  function setSearchQuery(query) {
    searchQuery = (query || '').toLowerCase().trim();
    renderLedgerOnly();
    if (selectedLevel === 'Volunteers') updateVolunteerHoursSummary();
  }

  function setVolunteerHoursFilter(minVal, maxVal) {
    const parse = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = parseInt(v, 10);
      return isNaN(n) || n < 0 ? null : n;
    };
    volunteerHoursMin = parse(minVal);
    volunteerHoursMax = parse(maxVal);
    // swap if min > max
    if (volunteerHoursMin !== null && volunteerHoursMax !== null && volunteerHoursMin > volunteerHoursMax) {
      const tmp = volunteerHoursMin;
      volunteerHoursMin = volunteerHoursMax;
      volunteerHoursMax = tmp;
      // reflect swap in UI inputs
      const minEl = document.getElementById('volHoursMin');
      const maxEl = document.getElementById('volHoursMax');
      if (minEl) minEl.value = volunteerHoursMin;
      if (maxEl) maxEl.value = volunteerHoursMax;
    }
    renderLedgerOnly();
    updateVolunteerHoursSummary();
  }

  function clearVolunteerHoursFilter() {
    volunteerHoursMin = null;
    volunteerHoursMax = null;
    const minEl = document.getElementById('volHoursMin');
    const maxEl = document.getElementById('volHoursMax');
    if (minEl) minEl.value = '';
    if (maxEl) maxEl.value = '';
    renderLedgerOnly();
    updateVolunteerHoursSummary();
  }

  function isVolunteerHoursFiltered() {
    return volunteerHoursMin !== null || volunteerHoursMax !== null;
  }

  function passesVolunteerHoursFilter(student) {
    if (selectedLevel !== 'Volunteers') return true;
    if (!student.isVolunteer) return true;
    if (volunteerHoursMin !== null && student.volunteerHours < volunteerHoursMin) return false;
    if (volunteerHoursMax !== null && student.volunteerHours > volunteerHoursMax) return false;
    return true;
  }

  function updateVolunteerHoursSummary() {
    const summaryEl = document.getElementById('volHoursFilterSummary');
    const plaqueValEl = document.querySelector('.dash-metric-plaque.volunteer-hours .dash-metric-value');
    if (!summaryEl && !plaqueValEl) return;
    const stats = Store.getDashboardStats(selectedLevel);
    let filtered = stats.students.filter(passesVolunteerHoursFilter);
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.studentName.toLowerCase().includes(searchQuery) ||
        s.levelLabel.toLowerCase().includes(searchQuery)
      );
    }
    const totalFilteredHours = filtered.reduce((sum, s) => sum + (s.volunteerHours || 0), 0);
    if (summaryEl) {
      if (!isVolunteerHoursFiltered()) {
        summaryEl.textContent = `${filtered.length} volunteers · ${stats.totalVolunteerHours} total hours (1 hr per Present week)`;
      } else {
        const rangeTxt = `${volunteerHoursMin !== null ? volunteerHoursMin : '0'}–${volunteerHoursMax !== null ? volunteerHoursMax : '∞'} hrs`;
        summaryEl.textContent = `${filtered.length} matching volunteers · ${totalFilteredHours} hours in range (${rangeTxt})`;
      }
    }
    // Keep the Hours metric plaque in sync with filtered result for immediate feedback
    if (plaqueValEl) {
      plaqueValEl.textContent = isVolunteerHoursFiltered() ? totalFilteredHours : stats.totalVolunteerHours;
      plaqueValEl.title = isVolunteerHoursFiltered() ? 'Filtered hours in range' : 'Total hours (1 hr per Present week)';
    }
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
      const rightMain = s.isVolunteer ? `${s.volunteerHours} hrs` : `${s.percentage}%`;
      const rightSub = s.isVolunteer ? `${s.volunteerHours} hours \u00B7 ${s.percentage}%` : `${s.presentCount}/${s.totalDays} sessions`;
      return `
        <div class="lookup-item" onclick="Dashboard.openPersonalDashboard('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
          <div class="lookup-item-left">
            <span class="lookup-item-name">${AppUI.escapeHtml(s.studentName)}</span>
            <span class="lookup-item-class">${AppUI.escapeHtml(s.levelLabel)}</span>
          </div>
          <div class="lookup-item-right">
            <span class="lookup-item-rate" style="color: ${rateColor};">${rightMain}</span>
            <span class="lookup-item-sub">${rightSub}</span>
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
        ${selectedLevel === 'Volunteers' ? `
        <div class="dash-metric-plaque volunteer-hours">
          <span class="dash-metric-label">Volunteer Hours</span>
          <span class="dash-metric-value" style="color: var(--terra);">${stats.totalVolunteerHours}</span>
          <span class="dash-metric-sub">1 hr per Present week · total</span>
        </div>` : ''}
      </div>

      ${selectedLevel === 'Volunteers' ? `
      <!-- Volunteer Hours Range Filter -->
      <div class="dash-section-card volunteer-hours-filter-card">
        <div class="vol-hours-filter-header">
          <h3 class="dash-section-title" style="margin-bottom:0;">Filter by Volunteer Hours</h3>
          <span class="vol-hours-hint">Each Present week = 1 hour</span>
        </div>
        <div class="vol-hours-filter-row">
          <div class="vol-hours-input-group">
            <label for="volHoursMin" class="vol-hours-label">Min hours</label>
            <input type="number" id="volHoursMin" class="vol-hours-input" placeholder="0" min="0" value="${volunteerHoursMin !== null ? volunteerHoursMin : ''}" oninput="Dashboard.setVolunteerHoursFilter(this.value, document.getElementById('volHoursMax') ? document.getElementById('volHoursMax').value : '')" />
          </div>
          <span class="vol-hours-sep">—</span>
          <div class="vol-hours-input-group">
            <label for="volHoursMax" class="vol-hours-label">Max hours</label>
            <input type="number" id="volHoursMax" class="vol-hours-input" placeholder="∞" min="0" value="${volunteerHoursMax !== null ? volunteerHoursMax : ''}" oninput="Dashboard.setVolunteerHoursFilter(document.getElementById('volHoursMin') ? document.getElementById('volHoursMin').value : '', this.value)" />
          </div>
          <button class="dash-export-btn vol-hours-clear-btn" onclick="Dashboard.clearVolunteerHoursFilter()" title="Clear hours filter">Clear</button>
        </div>
        <div id="volHoursFilterSummary" class="vol-hours-summary">
          ${(() => {
            const filtered = stats.students.filter(s => {
              if (volunteerHoursMin !== null && s.volunteerHours < volunteerHoursMin) return false;
              if (volunteerHoursMax !== null && s.volunteerHours > volunteerHoursMax) return false;
              return true;
            });
            const totalFilteredHours = filtered.length > 0 ? filtered.reduce((sum, s) => sum + s.volunteerHours, 0) : 0;
            if (volunteerHoursMin === null && volunteerHoursMax === null) {
              return filtered.length + ' volunteers \u00B7 ' + stats.totalVolunteerHours + ' total hours (1 hr per Present week)';
            } else {
              const rangeTxt = (volunteerHoursMin !== null ? volunteerHoursMin : '0') + '\u2013' + (volunteerHoursMax !== null ? volunteerHoursMax : '\u221E') + ' hrs';
              return filtered.length + ' matching volunteers \u00B7 ' + totalFilteredHours + ' hours in range (' + rangeTxt + ')';
            }
          })()}
        </div>
      </div>` : ''}

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
    const fallback = {
      studentName: studentName,
      levelLabel: levelId,
      percentage: 0,
      presentCount: 0,
      absentCount: 0,
      totalDays: 0,
      volunteerHours: 0,
      isVolunteer: levelId === 'Volunteers',
      history: []
    };
    const student = stats.students.find(s => s.studentName === studentName) || fallback;
    // Ensure volunteer helpers present even on fallback
    if (student.volunteerHours === undefined) student.volunteerHours = levelId === 'Volunteers' ? student.presentCount : 0;
    if (student.isVolunteer === undefined) student.isVolunteer = levelId === 'Volunteers';

    const rateColor = student.percentage >= 80 ? 'var(--sage)' : 'var(--terra)';
    const isVol = student.isVolunteer;

    // --- Streaks: current (consecutive from newest) and longest ---
    let currentStreak = 0, longestStreak = 0, tempStreak = 0;
    // history is newest-first (desc), so iterate from 0
    for (let i = 0; i < student.history.length; i++) {
      const h = student.history[i];
      const isPres = h.status === 'Present' || (isVol && h.hours > 0);
      if (isPres) {
        tempStreak++;
        if (i === currentStreak) currentStreak = tempStreak; // only count from start until first break
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
        if (i < currentStreak + 1) {
          // break in current streak - stop extending current
          // keep currentStreak as is (already counted)
        }
        // longest already tracked
      }
      // Fix currentStreak if break occurred after counting: if first entry is absent, currentStreak stays 0
      if (i === 0 && !isPres) currentStreak = 0;
      if (i > 0 && student.history[i-1].status !== 'Present' && !(isVol && student.history[i-1].hours > 0) && isPres) {
        // This is not part of current streak (current streak only from newest), so don't update
      }
    }
    // Simpler correct current streak: count from newest until first absent
    currentStreak = 0;
    for (const h of student.history) {
      const isPres = h.status === 'Present' || (isVol && h.hours > 0);
      if (isPres) currentStreak++;
      else break;
    }
    // Longest streak recompute across sorted ascending (oldest first) for clarity
    const ascHistory = [...student.history].sort((a,b)=> a.date.localeCompare(b.date));
    let run = 0;
    longestStreak = 0;
    for (const h of ascHistory) {
      const isPres = h.status === 'Present' || (isVol && h.hours > 0);
      if (isPres) { run++; longestStreak = Math.max(longestStreak, run); }
      else run = 0;
    }

    // --- Class averages for comparison ---
    const classStats = Store.getDashboardStats(levelId);
    const classAvgRate = classStats.overallAttendanceRate;
    const classAvgHours = isVol && classStats.totalStudents > 0 ? Math.round((classStats.totalVolunteerHours / classStats.totalStudents) * 10) / 10 : 0;
    const rateDelta = student.percentage - classAvgRate;
    const hoursDelta = isVol ? Math.round((student.volunteerHours - classAvgHours) * 10) / 10 : 0;

    // --- Last 8 weeks trend (oldest -> newest among last 8) ---
    const last8 = [...student.history].sort((a,b)=> a.date.localeCompare(b.date)).slice(-8);
    // Pad to 8 with empty if less than 8 weeks
    const trendBars = last8.length > 0 ? last8.map(h => {
      const isPres = h.status === 'Present' || (isVol && h.hours > 0);
      const hrs = isVol ? (h.hours || 0) : (isPres ? 1 : 0);
      const heightPct = isVol ? Math.max(12, (hrs / 8) * 100) : (isPres ? 100 : 18);
      const barColor = isPres ? (isVol ? 'var(--terra)' : 'var(--sage)') : 'var(--surface-raised)';
      const barBorder = isPres ? 'none' : '1px solid var(--rule)';
      const labelDate = new Date(h.date + 'T00:00:00');
      const label = labelDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const tooltip = isVol ? `${label} · ${hrs} hr${hrs!==1?'s':''}` : `${label} · ${h.status}`;
      return `
        <div class="trend-bar-wrap" title="${tooltip}">
          <div class="trend-bar" style="height:${heightPct}%; background:${barColor}; border:${barBorder};"></div>
          <span class="trend-label">${label}</span>
          ${isVol && hrs > 0 ? `<span class="trend-hours-label">${hrs}h</span>` : ''}
        </div>
      `;
    }).join('') : `<p class="dash-empty" style="padding:12px;">Not enough history for trend</p>`;

    // --- Monthly breakdown ---
    const monthMap = new Map();
    for (const h of student.history) {
      const d = new Date(h.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthMap.has(key)) monthMap.set(key, { label, present:0, total:0, hours:0 });
      const entry = monthMap.get(key);
      entry.total++;
      const isPres = h.status === 'Present' || (isVol && h.hours > 0);
      if (isPres) entry.present++;
      if (isVol) entry.hours += h.hours || 0;
    }
    const monthlyRows = [...monthMap.entries()].sort((a,b)=> b[0].localeCompare(a[0])).map(([key, m]) => {
      const pct = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
      return `
        <div class="monthly-row">
          <span class="monthly-label">${m.label}</span>
          <span class="monthly-stats">${m.present}/${m.total} · ${pct}%</span>
          ${isVol ? `<span class="monthly-hours">${m.hours} hrs</span>` : ''}
          <div class="monthly-bar-track"><div class="monthly-bar-fill" style="width:${pct}%;"></div></div>
        </div>
      `;
    }).join('') || `<p class="dash-empty">No monthly data</p>`;

    const historyRows = student.history && student.history.length > 0 ? student.history.map(h => {
      const isPres = h.status === 'Present' || (isVol && h.hours > 0);
      const hrs = h.hours !== undefined ? h.hours : (isPres ? 1 : 0);
      const displayDate = Store.formatWeekDisplay ? Store.formatWeekDisplay(h.date) : h.date;
      const rangeSub = Store.formatWeekRange ? Store.formatWeekRange(h.date).split('·')[0].trim() : '';
      return `
        <div class="personal-history-row">
          <div class="personal-history-date">
            <span class="p-date-main">${AppUI.escapeHtml(displayDate)}</span>
            <span class="p-date-sub">${AppUI.escapeHtml(rangeSub)} · Recorded by ${AppUI.escapeHtml(h.teacher || 'Teacher')}</span>
          </div>
          <div class="personal-history-status">
            ${isVol ? `<span class="vol-hours-audit-badge ${isPres ? 'has-hours' : ''}">${hrs} hr${hrs!==1?'s':''}</span>` : ''}
            <span class="personal-status-pill ${isPres ? 'present' : 'absent'}">
              ${isVol ? (isPres ? hrs + ' hrs' : 'Absent') : (isPres ? '✓ Present' : 'Absent')}
            </span>
          </div>
        </div>
      `;
    }).join('') : `<p class="dash-empty">No attendance sessions logged for this person yet.</p>`;

    const atRiskBadge = student.percentage < 60 ? `<span class="at-risk-badge critical">At risk</span>` : student.percentage < 75 ? `<span class="at-risk-badge warning">Needs attention</span>` : `<span class="at-risk-badge good">On track</span>`;

    return `
      <div class="personal-dashboard-view">
        <!-- Top Back Navigation -->
        <div class="personal-nav-bar">
          <button class="btn-back-hub" onclick="Dashboard.backToOverview()">
            <span>← Back to All Analytics</span>
          </button>
          <span class="personal-level-badge">${AppUI.escapeHtml(student.levelLabel)} ${atRiskBadge}</span>
        </div>

        <!-- Student Profile Header Card -->
        <div class="personal-profile-card">
          <div class="personal-avatar">
            ${AppUI.getInitials(student.studentName)}
          </div>
          <div class="personal-meta">
            <h2 class="personal-name">${AppUI.escapeHtml(student.studentName)}</h2>
            <p class="personal-sub">${AppUI.escapeHtml(student.levelLabel)} · Total ${student.totalDays} weeks${isVol ? ' · ' + student.volunteerHours + ' volunteer hours' : ''} · ${student.percentage}% rate</p>
          </div>
        </div>

        <!-- Personal Metric Plaques -->
        <div class="dash-metrics-row">
          <div class="dash-metric-plaque">
            <span class="dash-metric-label">Attendance Rate</span>
            <span class="dash-metric-value" style="color: ${rateColor};">${student.percentage}%</span>
            <span class="dash-metric-sub">${student.presentCount} of ${student.totalDays} weeks · ${rateDelta >=0 ? '+' : ''}${rateDelta}% vs class avg ${classAvgRate}%</span>
          </div>
          ${isVol ? `
          <div class="dash-metric-plaque volunteer-hours">
            <span class="dash-metric-label">Volunteer Hours</span>
            <span class="dash-metric-value" style="color: var(--terra);">${student.volunteerHours}</span>
            <span class="dash-metric-sub">${hoursDelta >=0 ? '+' : ''}${hoursDelta} vs avg ${classAvgHours} hrs · 0–8 per week</span>
          </div>` : `
          <div class="dash-metric-plaque">
            <span class="dash-metric-label">Present Weeks</span>
            <span class="dash-metric-value" style="color: var(--sage);">${student.presentCount}</span>
            <span class="dash-metric-sub">Attended · ${rateDelta >=0 ? '+' : ''}${rateDelta}% vs avg</span>
          </div>`}
          <div class="dash-metric-plaque">
            <span class="dash-metric-label">Current Streak</span>
            <span class="dash-metric-value" style="color: ${currentStreak >=3 ? 'var(--sage)' : currentStreak>0 ? 'var(--terra)' : 'var(--ink-muted)'};">${currentStreak}</span>
            <span class="dash-metric-sub">${currentStreak} week${currentStreak!==1?'s':''} · longest ${longestStreak}</span>
          </div>
          <div class="dash-metric-plaque">
            <span class="dash-metric-label">Absent Weeks</span>
            <span class="dash-metric-value" style="color: var(--terra);">${student.absentCount}</span>
            <span class="dash-metric-sub">Missed · ${student.totalDays} total</span>
          </div>
        </div>

        <!-- Class Comparison Bar -->
        <div class="dash-section-card">
          <h3 class="dash-section-title">Class Comparison</h3>
          <div class="comparison-bars">
            <div class="comparison-row">
              <span class="comparison-label">${AppUI.escapeHtml(student.studentName)}</span>
              <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${student.percentage}%; background:${rateColor};"></div></div>
              <span class="dash-bar-pct" style="color:${rateColor};">${student.percentage}%</span>
            </div>
            <div class="comparison-row muted">
              <span class="comparison-label">Class avg (${AppUI.escapeHtml(student.levelLabel)})</span>
              <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${classAvgRate}%; background:var(--ink-muted);"></div></div>
              <span class="dash-bar-pct" style="color:var(--ink-muted);">${classAvgRate}%</span>
            </div>
            ${isVol ? `
            <div class="comparison-row">
              <span class="comparison-label">Hours vs avg</span>
              <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.min(100, (student.volunteerHours / Math.max(1, classAvgHours*2))*100)}%; background:var(--terra);"></div></div>
              <span class="dash-bar-pct" style="color:var(--terra);">${student.volunteerHours} / ${classAvgHours} avg</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Last 8 Weeks Trend (Elegant Graph) -->
        <div class="dash-section-card">
          <h3 class="dash-section-title">Last 8 Weeks Trend</h3>
          <div class="trend-graph">
            ${trendBars}
          </div>
          <p class="trend-legend">Each bar = 1 Sunday week · ${isVol ? 'height = hours (0–8)' : 'filled = Present'}</p>
        </div>

        <!-- Monthly Breakdown -->
        <div class="dash-section-card">
          <h3 class="dash-section-title">Monthly Breakdown</h3>
          <div class="monthly-breakdown-list">
            ${monthlyRows}
          </div>
        </div>

        <!-- Attendance History Log Trail (with hours audit for volunteers) -->
        <div class="dash-section-card">
          <h3 class="dash-section-title">Weekly History Log ${isVol ? '<span style=\"font-weight:400; color:var(--ink-muted); font-size:0.75rem;\">· audit: +1/-1 per week in attendance deck</span>' : ''}</h3>
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
    // Volunteer hours range filter (only when Volunteers view)
    if (selectedLevel === 'Volunteers' && isVolunteerHoursFiltered()) {
      filtered = filtered.filter(passesVolunteerHoursFilter);
    }

    if (filtered.length === 0) {
      const emptyHint = selectedLevel === 'Volunteers' && isVolunteerHoursFiltered()
        ? 'No volunteers match the hours filter. Try adjusting the min/max hours.'
        : 'No student records found.';
      return `<p class="dash-empty">${emptyHint}</p>`;
    }

    return filtered.map(s => {
      const rateColor = s.percentage >= 80 ? 'var(--sage)' : 'var(--terra)';
      const isVol = s.isVolunteer;
      // For Volunteers: show hours badge (Present = hours) and keep P/A pills; for students keep existing
      const hoursBadge = isVol ? `<span class="dash-pill volunteer-hours" title="1 hour per Present week">${s.volunteerHours} hrs</span>` : '';
      const subText = isVol
        ? `${AppUI.escapeHtml(s.levelLabel)} \u00B7 ${s.volunteerHours} hrs (${s.presentCount}/${s.totalDays} weeks)`
        : `${AppUI.escapeHtml(s.levelLabel)} \u00B7 ${s.totalDays} sessions`;
      return `
        <div class="dash-ledger-row" onclick="Dashboard.openPersonalDashboard('${AppUI.escapeHtml(s.levelId)}', '${AppUI.escapeHtml(s.studentName)}')">
          <div class="dash-ledger-name">
            <span class="dash-ledger-student">${AppUI.escapeHtml(s.studentName)}</span>
            <span class="dash-ledger-sub">${subText}</span>
          </div>
          <div class="dash-ledger-stats">
            ${hoursBadge}
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

    // Apply same filters as ledger view (search + volunteer hours range)
    let exportStudents = stats.students;
    if (searchQuery) {
      exportStudents = exportStudents.filter(s => 
        s.studentName.toLowerCase().includes(searchQuery) ||
        s.levelLabel.toLowerCase().includes(searchQuery)
      );
    }
    if (selectedLevel === 'Volunteers' && isVolunteerHoursFiltered()) {
      exportStudents = exportStudents.filter(passesVolunteerHoursFilter);
    }

    const isVolView = selectedLevel === 'Volunteers';
    const isAllView = selectedLevel === 'ALL';
    const hasVolunteersInExport = exportStudents.some(s => s.isVolunteer);
    const includeHours = isVolView || (isAllView && hasVolunteersInExport);

    const headerBase = 'Level,Student Name,Present Days,Absent Days,Total Days,Attendance Rate';
    const header = includeHours ? headerBase + ',Volunteer Hours (1 hr per Present week)\n' : headerBase + '\n';
    let csvContent = 'data:text/csv;charset=utf-8,' + header;
    exportStudents.forEach(s => {
      const safeName = String(s.studentName).replace(/"/g, '""');
      const safeLevel = String(s.levelLabel).replace(/"/g, '""');
      const baseRow = `"${safeLevel}","${safeName}",${s.presentCount},${s.absentCount},${s.totalDays},"${s.percentage}%"`;
      if (includeHours) {
        const hours = s.isVolunteer ? s.volunteerHours : '';
        csvContent += baseRow + ',' + hours + '\n';
      } else {
        csvContent += baseRow + '\n';
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const hoursSuffix = isVolunteerHoursFiltered() ? '_hrs-' + (volunteerHoursMin !== null ? volunteerHoursMin : '0') + '-' + (volunteerHoursMax !== null ? volunteerHoursMax : 'max') : '';
    link.setAttribute('download', `baladatta_attendance_${selectedLevel}${hoursSuffix}_${Store.getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    AppUI.showToast('CSV export started' + (isVolunteerHoursFiltered() ? ' (filtered by hours)' : ''), 'success');
  }

  return {
    init,
    render,
    setFilterLevel,
    setSearchQuery,
    handleLookupInput,
    openPersonalDashboard,
    backToOverview,
    exportToCsv,
    setVolunteerHoursFilter,
    clearVolunteerHoursFilter
  };
})();

if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
}
