import React from 'react';
import { User, UserCheck, UserX, Clock } from 'lucide-react';
import { Student } from '../types';

interface StudentListProps {
  students: Student[];
  attendance: Record<string, 'present' | 'absent' | 'late'>;
  onAttendanceChange: (studentId: string, status: 'present' | 'absent' | 'late') => void;
  loading: boolean;
}

const StudentList: React.FC<StudentListProps> = ({
  students,
  attendance,
  onAttendanceChange,
  loading
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="flex space-x-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-8 w-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
        <p className="text-gray-500">Students will appear here once loaded from Google Sheets</p>
      </div>
    );
  }

  const getStatusButton = (status: 'present' | 'absent' | 'late', studentId: string) => {
    const currentStatus = attendance[studentId];
    const isActive = currentStatus === status;
    
    const statusConfig = {
      present: {
        icon: UserCheck,
        label: 'Present',
        activeClass: 'bg-green-600 text-white',
        inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
      },
      absent: {
        icon: UserX,
        label: 'Absent',
        activeClass: 'bg-red-600 text-white',
        inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
      },
      late: {
        icon: Clock,
        label: 'Late',
        activeClass: 'bg-orange-600 text-white',
        inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <button
        onClick={() => onAttendanceChange(studentId, status)}
        className={`flex items-center space-x-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
          isActive ? config.activeClass : config.inactiveClass
        }`}
      >
        <Icon className="w-3 h-3" />
        <span className="hidden sm:inline">{config.label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {students.map((student) => (
        <div key={student.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">{student.name}</h3>
                <p className="text-xs text-gray-500">Roll: {student.rollNumber}</p>
              </div>
            </div>

            <div className="flex space-x-2">
              {getStatusButton('present', student.id)}
              {getStatusButton('absent', student.id)}
              {getStatusButton('late', student.id)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentList;