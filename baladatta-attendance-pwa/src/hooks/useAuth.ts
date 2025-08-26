import { useState, useEffect } from 'react';
import { User } from '../types';
import GoogleSheetsAPI from '../utils/googleSheets';

const TEACHER_LEVELS: Record<string, number> = {
  'teacher1@baladatta.edu': 1,
  'teacher2@baladatta.edu': 2,
  'teacher3@baladatta.edu': 3,
  'teacher4@baladatta.edu': 4,
  'teacher5@baladatta.edu': 5,
};

const useAuth = (sheetsAPI: GoogleSheetsAPI) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      await sheetsAPI.initialize();
      checkAuthStatus();
    } catch (err) {
      setError('Failed to initialize authentication');
      setLoading(false);
    }
  };

  const checkAuthStatus = () => {
    const authInstance = (window as any).gapi?.auth2?.getAuthInstance();
    if (authInstance) {
      const isSignedIn = authInstance.isSignedIn.get();
      if (isSignedIn) {
        const googleUser = authInstance.currentUser.get();
        const profile = googleUser.getBasicProfile();
        const email = profile.getEmail();
        
        if (TEACHER_LEVELS[email]) {
          const userData: User = {
            id: profile.getId(),
            email: email,
            name: profile.getName(),
            picture: profile.getImageUrl(),
            level: TEACHER_LEVELS[email]
          };
          setUser(userData);
        } else {
          setError('Unauthorized: You are not registered as a teacher');
        }
      }
    }
    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const profile = await sheetsAPI.signIn();
      const email = profile.getEmail();
      
      if (TEACHER_LEVELS[email]) {
        const userData: User = {
          id: profile.getId(),
          email: email,
          name: profile.getName(),
          picture: profile.getImageUrl(),
          level: TEACHER_LEVELS[email]
        };
        setUser(userData);
      } else {
        setError('Unauthorized: You are not registered as a teacher');
        await sheetsAPI.signOut();
      }
    } catch (err) {
      setError('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await sheetsAPI.signOut();
      setUser(null);
    } catch (err) {
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user
  };
};

export default useAuth;