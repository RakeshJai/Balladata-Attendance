import React from 'react';
import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { AttendanceStats } from '../types';

interface AttendanceStatsProps {
  stats: AttendanceStats | null;
}

const AttendanceStatsComponent: React.FC<AttendanceStatsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statItems = [
    {
      icon: Users,
      label: 'Total',
      value: stats.totalStudents,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      icon: UserCheck,
      label: 'Present',
      value: stats.present,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      icon: UserX,
      label: 'Absent',
      value: stats.absent,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      icon: Clock,
      label: 'Late',
      value: stats.late,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Today's Overview</h2>
        <div className="text-2xl font-bold text-blue-600">{stats.percentage}%</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="text-center">
              <div className={`inline-flex items-center justify-center w-10 h-10 ${item.bgColor} rounded-full mb-2`}>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-gray-100 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${stats.percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default AttendanceStatsComponent;