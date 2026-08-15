# Baladatta Tamil School Attendance Portal (பாலதத்தா தமிழ்ப்பள்ளி வருகைப் பதிவு)

A modern, fast, and responsive Progressive Web App (PWA) designed for Tamil school teachers to record, manage, and analyze student attendance with Google Sheets integration and offline capabilities.

---

## ✨ Features & Capabilities

1. **Top Date Selector**:
   - Easily pick any date with standard calendar input, "Today" quick-jump, and Previous/Next day navigation.
   - Automatically detects and retrieves saved records for any selected date.

2. **Dual Action Submit (Top & Bottom)**:
   - Synchronized submit buttons at both top and bottom of the student list for effortless one-tap submission on mobile devices and desktop.
   - Quick "Mark All Present" / "Mark All Absent" shortcuts.

3. **Student Management (Add / Edit / Delete)**:
   - **Add**: Quickly add new students to any Nilai directly in the UI.
   - **Edit**: Rename student names with live updates across logs and sheets.
   - **Delete**: Remove students with confirmation dialog while preserving past historical records.

4. **Comprehensive Attendance Dashboard**:
   - Aggregate statistics: Overall Attendance Rate, Total Students, Recorded Sessions, and Present/Absent counts.
   - Per-student attendance analytics with color-coded percentage progress bars (Green ≥ 80%, Yellow 60–79%, Red < 60%).
   - **Student Drill-down**: Click "History" on any student to view every attended/missed session date and teacher log.
   - **Search & Nilai Filter**: Real-time student search and class filtering.
   - **CSV Export**: Download formatted attendance reports for school records.

5. **Nilai Selection Dropdown**:
   - Convenient dropdown to switch seamlessly between Nilai 1 through 6 and Volunteers (தொண்டர்கள்).

6. **Smart Deduplication**:
   - If attendance is submitted multiple times on the same date for the same student, the latest recorded entry is automatically used, ensuring accurate reporting and no duplicated counts.

7. **Default-to-Absent (No) Logic**:
   - Fresh attendance dates default all students to Absent (No).
   - Past recorded dates automatically retrieve and display previously saved values.

8. **Modern Responsive Design**:
   - High-contrast, elegant dark slate theme with warm saffron accents.
   - 100% responsive for smartphones, tablets, and desktop.
   - PWA support for offline caching and home-screen installation.

---

## 🚀 Getting Started

### Local Development / Testing
Simply open `index.html` in any modern web browser or run a lightweight local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js / npx
npx -y serve .
```

### Google Sheets Integration
The app connects to Google Sheets API v4 using OAuth 2.0:
- **Spreadsheet ID**: Configured in `js/sheets-api.js`
- **Tabs**: `Level1`, `Level2`, `Level3`, `Level4`, `Level5`, `Level6`, `Volunteers`, and `Logs`.
- If not signed in, all features operate seamlessly in **Offline / LocalStorage Mode**.