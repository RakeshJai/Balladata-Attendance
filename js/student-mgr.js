/**
 * Baladatta Attendance - Student Management Module
 * Handles Add, Edit name, and Delete student operations with modals & sheet sync.
 */

const StudentMgr = (() => {
  let activeLevel = 'Level1';
  let onStudentListChangedCallback = null;

  function init(level, onStudentListChanged) {
    activeLevel = level;
    onStudentListChangedCallback = onStudentListChanged;
  }

  function setLevel(level) {
    activeLevel = level;
  }

  /**
   * Add new student
   */
  async function handleAddStudent(nameInput) {
    const rawName = nameInput ? nameInput.value : '';
    const trimmed = (rawName || '').trim();
    if (!trimmed) {
      AppUI.showToast('Please enter a student name.', 'error');
      if (nameInput) nameInput.focus();
      return false;
    }

    const students = Store.getStudentsForLevel(activeLevel);
    if (students.map(s => s.toLowerCase()).includes(trimmed.toLowerCase())) {
      AppUI.showToast(`"${trimmed}" is already in this Nilai.`, 'error');
      return false;
    }

    const success = Store.addStudent(activeLevel, trimmed);
    if (success) {
      if (nameInput) nameInput.value = '';
      AppUI.showToast(`Added "${trimmed}" to ${activeLevel}`, 'success');

      // Sync with Google Sheets if signed in
      const updatedList = Store.getStudentsForLevel(activeLevel);
      SheetsAPI.syncStudentListToSheet(activeLevel, updatedList);

      if (onStudentListChangedCallback) {
        onStudentListChangedCallback();
      }
      return true;
    }
    return false;
  }

  /**
   * Open Edit Name Modal
   */
  function promptEditStudent(currentName) {
    const modalHtml = `
      <div class="toolbar-group">
        <label class="toolbar-label" for="editStudentInput">Student Full Name</label>
        <input type="text" id="editStudentInput" class="add-student-field" value="${AppUI.escapeHtml(currentName)}" style="width:100%" />
      </div>
    `;

    AppUI.showModal({
      title: 'Edit Student Name',
      bodyHtml: modalHtml,
      confirmText: 'Save Changes',
      confirmClass: 'btn-coral',
      onConfirm: async () => {
        const input = document.getElementById('editStudentInput');
        const newName = input ? input.value.trim() : '';

        if (!newName) {
          AppUI.showToast('Student name cannot be empty.', 'error');
          return false;
        }

        if (newName === currentName) {
          return true; // No change
        }

        const students = Store.getStudentsForLevel(activeLevel);
        if (students.filter(s => s !== currentName).map(s => s.toLowerCase()).includes(newName.toLowerCase())) {
          AppUI.showToast(`A student with name "${newName}" already exists.`, 'error');
          return false;
        }

        const renamed = Store.renameStudent(activeLevel, currentName, newName);
        if (renamed) {
          AppUI.showToast(`Renamed to "${newName}"`, 'success');
          const updatedList = Store.getStudentsForLevel(activeLevel);
          SheetsAPI.syncStudentListToSheet(activeLevel, updatedList);

          if (onStudentListChangedCallback) {
            onStudentListChangedCallback();
          }
          return true;
        }
        return false;
      }
    });

    // Auto-focus input
    setTimeout(() => {
      const input = document.getElementById('editStudentInput');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  /**
   * Open Delete Student Confirmation Modal
   */
  function promptDeleteStudent(studentName) {
    const modalHtml = `
      <p style="color: var(--text-primary); font-size: 0.95rem; margin-bottom: 8px;">
        Are you sure you want to remove <strong>${AppUI.escapeHtml(studentName)}</strong> from <strong>${activeLevel}</strong>?
      </p>
      <p style="color: var(--text-muted); font-size: 0.8125rem;">
        Existing historical attendance logs for this student will be retained in reports.
      </p>
    `;

    AppUI.showModal({
      title: 'Remove Student',
      bodyHtml: modalHtml,
      confirmText: 'Yes, Remove',
      confirmClass: 'btn-coral',
      onConfirm: async () => {
        const deleted = Store.deleteStudent(activeLevel, studentName);
        if (deleted) {
          AppUI.showToast(`Removed "${studentName}"`, 'info');
          const updatedList = Store.getStudentsForLevel(activeLevel);
          SheetsAPI.syncStudentListToSheet(activeLevel, updatedList);

          if (onStudentListChangedCallback) {
            onStudentListChangedCallback();
          }
          return true;
        }
        return false;
      }
    });
  }

  return {
    init,
    setLevel,
    handleAddStudent,
    promptEditStudent,
    promptDeleteStudent
  };
})();

if (typeof window !== 'undefined') {
  window.StudentMgr = StudentMgr;
}
