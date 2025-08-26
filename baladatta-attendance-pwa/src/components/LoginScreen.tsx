import React from 'react';
import { LogIn, BookOpen, Shield, Smartphone } from 'lucide-react';

interface LoginScreenProps {
  onSignIn: () => void;
  loading: boolean;
  error: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSignIn, loading, error }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Baladatta Attendance</h1>
            <p className="text-gray-600">Streamlined student attendance management</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Shield className="w-5 h-5 text-green-500" />
              <span>Secure Google authentication</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <span>Mobile-optimized PWA experience</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <BookOpen className="w-5 h-5 text-purple-500" />
              <span>Level-based access control</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={onSignIn}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <p className="mt-4 text-xs text-gray-500">
            Only registered teachers can access this application
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;