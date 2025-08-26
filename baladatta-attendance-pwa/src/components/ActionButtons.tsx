import React from 'react';
import { Send, Users, UserX, RefreshCw } from 'lucide-react';

interface ActionButtonsProps {
  onSubmit: () => void;
  onMarkAllPresent: () => void;
  onMarkAllAbsent: () => void;
  onRefresh: () => void;
  submitting: boolean;
  loading: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSubmit,
  onMarkAllPresent,
  onMarkAllAbsent,
  onRefresh,
  submitting,
  loading
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <button
          onClick={onMarkAllPresent}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Users className="w-4 h-4" />
          <span>Mark All Present</span>
        </button>

        <button
          onClick={onMarkAllAbsent}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UserX className="w-4 h-4" />
          <span>Mark All Absent</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Students</span>
        </button>

        <button
          onClick={onSubmit}
          disabled={submitting || loading}
          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{submitting ? 'Submitting...' : 'Submit Attendance'}</span>
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;