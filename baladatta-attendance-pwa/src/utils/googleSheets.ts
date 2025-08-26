import { AttendanceRecord, Student, GoogleSheetsConfig } from '../types';

class GoogleSheetsAPI {
  private config: GoogleSheetsConfig;
  private gapi: any;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client:auth2', () => {
            this.gapi = window.gapi;
            this.gapi.client.init({
              apiKey: this.config.apiKey,
              clientId: this.config.clientId,
              discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
              scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile'
            }).then(resolve).catch(reject);
          });
        };
        script.onerror = reject;
        document.head.appendChild(script);
      } else {
        this.gapi = window.gapi;
        resolve();
      }
    });
  }

  async signIn(): Promise<any> {
    const authInstance = this.gapi.auth2.getAuthInstance();
    const user = await authInstance.signIn();
    return user.getBasicProfile();
  }

  async signOut(): Promise<void> {
    const authInstance = this.gapi.auth2.getAuthInstance();
    await authInstance.signOut();
  }

  async getStudents(level: number): Promise<Student[]> {
    try {
      const range = `Level${level}!A2:C`;
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: range,
      });

      const values = response.result.values || [];
      return values.map((row: string[], index: number) => ({
        id: `${level}-${index + 1}`,
        name: row[0] || '',
        rollNumber: row[1] || '',
        level: level
      }));
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }

  async submitAttendance(records: AttendanceRecord[]): Promise<boolean> {
    try {
      const level = records[0]?.level;
      if (!level) return false;

      const range = `Level${level}_Attendance!A:H`;
      const values = records.map(record => [
        record.date,
        record.rollNumber,
        record.studentName,
        record.status,
        record.teacherName,
        record.teacherId,
        record.timestamp,
        record.level
      ]);

      await this.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      return true;
    } catch (error) {
      console.error('Error submitting attendance:', error);
      return false;
    }
  }

  async getAttendanceHistory(level: number, date: string): Promise<AttendanceRecord[]> {
    try {
      const range = `Level${level}_Attendance!A2:H`;
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: range,
      });

      const values = response.result.values || [];
      return values
        .filter((row: string[]) => row[0] === date && parseInt(row[7]) === level)
        .map((row: string[], index: number) => ({
          id: `${level}-${date}-${index}`,
          studentId: row[1],
          rollNumber: row[1],
          studentName: row[2],
          date: row[0],
          status: row[3] as 'present' | 'absent' | 'late',
          teacherName: row[4],
          teacherId: row[5],
          timestamp: row[6],
          level: parseInt(row[7])
        }));
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      return [];
    }
  }
}

export default GoogleSheetsAPI;