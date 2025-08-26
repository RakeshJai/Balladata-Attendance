import React from 'react';
import { User, LogOut, Bell, Download } from 'lucide-react';
import { User as UserType } from '../types';
import { installPWA } from '../utils/pwa';

interface HeaderProps {
  user: UserType;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
  const handleInstallPWA = async () => {
    const installed = await installPWA();
    if (installed) {
      alert('App installed successfully!');
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">Baladatta Attendance</h1>
            </div>
            <div className="hidden sm:block">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Level {user.level}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleInstallPWA}
              className="hidden sm:inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Install App
            </button>

            <div className="flex items-center space-x-3">
              <img
                className="h-8 w-8 rounded-full"
                src={user.picture}
                alt={user.name}
              />
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="inline-flex items-center p-2 border border-transparent rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;