import React, { useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import AttendanceStatsComponent from './components/AttendanceStats';
import StudentList from './components/StudentList';
import ActionButtons from './components/ActionButtons';
import useAuth from './hooks/useAuth';
import useAttendance from './hooks/useAttendance';
import GoogleSheetsAPI from './utils/googleSheets';
import { registerServiceWorker, requestNotificationPermission, showNotification } from './utils/pwa';

// Configuration - Replace with your actual values
const GOOGLE_SHEETS_CONFIG = {
  spreadsheetId: 'SHEETS_API', // Replace with your Google Sheets ID
  apiKey: 'YOUR_API_KEY', // Replace with your Google API key
  clientId: 'YOUR_CLIENT_ID' // Replace with your Google OAuth client ID
};

const sheetsAPI = new GoogleSheetsAPI(GOOGLE_SHEETS_CONFIG);

function App() {
  const { user, loading: authLoading, error: authError, signIn, signOut, isAuthenticated } = useAuth(sheetsAPI);
  const {
    students,
    attendance,
    stats,
    loading: attendanceLoading,
    submitting,
    updateAttendance,
    submitAttendance,
    markAllPresent,
    markAllAbsent,
    refreshStudents
  } = useAttendance(sheetsAPI, user?.level || 0);

  useEffect(() => {
    // Initialize PWA features
    registerServiceWorker();
    requestNotificationPermission();
  }, []);

  const handleSubmitAttendance = async () => {
    if (!user) return;

    const success = await submitAttendance(user.id, user.name);
    if (success) {
      showNotification(
        'Attendance Submitted',
        `Attendance for Level ${user.level} has been successfully submitted.`
      );
    } else {
      alert('Failed to submit attendance. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onSignIn={signIn}
        loading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user!} onSignOut={signOut} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Level {user!.level} Attendance
          </h1>
          <p className="text-gray-600">
            Mark attendance for your students - {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-6">
          <AttendanceStatsComponent stats={stats} />
          
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Students</h2>
            </div>
            <div className="p-6">
              <StudentList
                students={students}
                attendance={attendance}
                onAttendanceChange={updateAttendance}
                loading={attendanceLoading}
              />
            </div>
          </div>

          <ActionButtons
            onSubmit={handleSubmitAttendance}
            onMarkAllPresent={markAllPresent}
            onMarkAllAbsent={markAllAbsent}
            onRefresh={refreshStudents}
            submitting={submitting}
            loading={attendanceLoading}
          />
        </div>
      </main>
    </div>
  );
}

export default App;