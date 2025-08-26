import { useState, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStats } from '../types';
import GoogleSheetsAPI from '../utils/googleSheets';

const useAttendance = (sheetsAPI: GoogleSheetsAPI, level: number) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  useEffect(() => {
    if (level) {
      loadStudents();
    }
  }, [level]);

  useEffect(() => {
    calculateStats();
  }, [attendance, students]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const studentData = await sheetsAPI.getStudents(level);
      setStudents(studentData);
      
      // Initialize attendance with all students marked as absent
      const initialAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
      studentData.forEach(student => {
        initialAttendance[student.id] = 'absent';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const submitAttendance = async (teacherId: string, teacherName: string): Promise<boolean> => {
    setSubmitting(true);
    try {
      const records: AttendanceRecord[] = students.map(student => ({
        id: `${Date.now()}-${student.id}`,
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        date: new Date().toISOString().split('T')[0],
        status: attendance[student.id] || 'absent',
        teacherId,
        teacherName,
        level,
        timestamp: new Date().toISOString()
      }));

      const success = await sheetsAPI.submitAttendance(records);
      if (success) {
        // Reset attendance after successful submission
        const resetAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
        students.forEach(student => {
          resetAttendance[student.id] = 'absent';
        });
        setAttendance(resetAttendance);
      }
      return success;
    } catch (error) {
      console.error('Error submitting attendance:', error);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const calculateStats = () => {
    const totalStudents = students.length;
    if (totalStudents === 0) {
      setStats(null);
      return;
    }

    const present = Object.values(attendance).filter(status => status === 'present').length;
    const absent = Object.values(attendance).filter(status => status === 'absent').length;
    const late = Object.values(attendance).filter(status => status === 'late').length;
    const percentage = Math.round((present / totalStudents) * 100);

    setStats({
      totalStudents,
      present,
      absent,
      late,
      percentage
    });
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
    students.forEach(student => {
      newAttendance[student.id] = 'present';
    });
    setAttendance(newAttendance);
  };

  const markAllAbsent = () => {
    const newAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
    students.forEach(student => {
      newAttendance[student.id] = 'absent';
    });
    setAttendance(newAttendance);
  };

  return {
    students,
    attendance,
    stats,
    loading,
    submitting,
    updateAttendance,
    submitAttendance,
    markAllPresent,
    markAllAbsent,
    refreshStudents: loadStudents
  };
};

export default useAttendance;