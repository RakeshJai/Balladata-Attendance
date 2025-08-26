export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  level: number;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  level: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  teacherId: string;
  teacherName: string;
  level: number;
  timestamp: string;
}

export interface AttendanceStats {
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  clientId: string;
}