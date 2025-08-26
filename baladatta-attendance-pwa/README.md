# Baladatta Student Attendance PWA

A lightweight, zero-cost Progressive Web Application for student attendance tracking at Baladatta School.

## 🚀 Features

- **Zero Operational Cost**: Completely free to run using Google Sheets and GitHub Pages
- **PWA Experience**: Installable mobile app-like interface
- **Secure Authentication**: Google OAuth 2.0 for teacher login
- **Level-Based Access**: 5 teacher levels with restricted access
- **Offline Capable**: Works without internet connection
- **Push Notifications**: Real-time attendance submission alerts
- **Mobile-First Design**: Optimized for smartphones and tablets

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Google Sheets API (zero-cost data storage)
- **Authentication**: Google OAuth 2.0
- **Hosting**: GitHub Pages (free static hosting)
- **PWA**: Service Worker + Web App Manifest

## 📱 Installation

### For Teachers (End Users)
1. Visit the app URL on your mobile device
2. Tap "Install App" or use browser's "Add to Home Screen"
3. Sign in with your authorized Google account
4. Start marking attendance!

### For Developers

1. **Clone the repository**
   ```bash
   git clone https://github.com/bavanandam/baladatta-student-attendance.git
   cd baladatta-student-attendance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google Sheets API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable Google Sheets API and Google Drive API
   - Create credentials (API key and OAuth 2.0 client ID)

4. **Configure the application**
   
   Update `src/App.tsx` with your credentials:
   ```typescript
   const GOOGLE_SHEETS_CONFIG = {
     spreadsheetId: 'YOUR_GOOGLE_SHEETS_ID',
     apiKey: 'YOUR_API_KEY',
     clientId: 'YOUR_CLIENT_ID'
   };
   ```

   Update teacher emails in `src/hooks/useAuth.ts`:
   ```typescript
   const TEACHER_LEVELS: Record<string, number> = {
     'teacher1@baladatta.edu': 1,
     'teacher2@baladatta.edu': 2,
     // ... add your actual teacher emails
   };
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## 📊 Google Sheets Setup

Create a Google Sheets document with the following structure:

### Student Data Sheets
- `Level1` - Student list for Level 1
- `Level2` - Student list for Level 2
- `Level3` - Student list for Level 3
- `Level4` - Student list for Level 4
- `Level5` - Student list for Level 5

Each sheet should have columns:
| A | B | C |
|---|---|---|
| Student Name | Roll Number | Level |

### Attendance Data Sheets
- `Level1_Attendance` - Attendance records for Level 1
- `Level2_Attendance` - Attendance records for Level 2
- `Level3_Attendance` - Attendance records for Level 3
- `Level4_Attendance` - Attendance records for Level 4
- `Level5_Attendance` - Attendance records for Level 5

Each attendance sheet will have columns:
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Date | Roll Number | Student Name | Status | Teacher Name | Teacher ID | Timestamp | Level |

## 🚀 Deployment

### GitHub Pages (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings
   - Navigate to Pages section
   - Select source as "GitHub Actions"
   - The app will be available at `https://bavanandam.github.io/baladatta-student-attendance`

3. **Automatic Deployment**
   - Every push to main branch triggers automatic deployment
   - No manual build or deployment steps required

## 💰 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Google Sheets | ✅ Free | Up to 15GB storage |
| Google OAuth 2.0 | ✅ Free | Up to 100 test users |
| GitHub Pages | ✅ Free | Static hosting with HTTPS |
| **Total** | **$0/month** | **Completely free!** |

## 🔒 Security Features

- **OAuth 2.0 Authentication**: Secure Google sign-in
- **Level-Based Access Control**: Teachers can only access their assigned level
- **HTTPS Encryption**: All data transmission encrypted
- **No Sensitive Data Storage**: Only attendance records stored in Google Sheets

## 📱 PWA Features

- **Installable**: Add to home screen on mobile devices
- **Offline Support**: Works without internet connection
- **Push Notifications**: Attendance submission confirmations
- **App-like Experience**: Full-screen, native feel
- **Auto-updates**: Automatic updates when new version is deployed

## 🎨 Design Features

- **Mobile-First**: Optimized for smartphones and tablets
- **Touch-Friendly**: Large buttons and intuitive gestures
- **Modern UI**: Clean, professional interface
- **Responsive**: Works on all screen sizes
- **Accessibility**: Screen reader compatible

## 🔧 Development

### Project Structure
```
baladatta-attendance-pwa/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── App.tsx
├── package.json
└── README.md
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email bavanandam@baladatta.edu or create an issue in the GitHub repository.

## 🙏 Acknowledgments

- Google for providing free APIs and authentication
- GitHub for free hosting
- React and Tailwind CSS communities
- Lucide React for beautiful icons

---

**Built with ❤️ for Baladatta School**