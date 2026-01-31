# Effiq

A modern service booking and management platform built with React, TypeScript, and Firebase.

## Features

- 🔐 **User Authentication** - Secure login and signup with Firebase Authentication
- 📅 **Service Booking** - Browse and book various services
- 📊 **Dashboard** - User dashboard for managing bookings and profile
- 🎨 **Modern UI** - Built with Tailwind CSS for a responsive, modern interface
- ⚡ **Real-time Updates** - Powered by Firebase Firestore for real-time data synchronization

## Tech Stack

- **Frontend**: React 17 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Backend**: Firebase
  - Authentication
  - Firestore Database
  - Hosting
- **Build Tool**: React Scripts (Create React App)

## Project Structure

```
effiq/
├── public/              # Static files
├── src/
│   ├── components/      # Reusable React components
│   ├── context/         # React Context providers (Auth)
│   ├── firebase/        # Firebase configuration and services
│   ├── pages/           # Page components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── SignUp.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Services.tsx
│   │   ├── ServiceDetails.tsx
│   │   ├── BookingPage.tsx
│   │   └── BookingSuccess.tsx
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main App component
│   └── index.tsx        # Entry point
├── firebase.json        # Firebase configuration
├── firestore.indexes.json
├── package.json
└── tailwind.config.js
```

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm or yarn
- Firebase CLI (for deployment)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd effiq
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore Database
4. Copy your Firebase configuration
5. Update `src/firebase/config.ts` with your Firebase credentials

```typescript
// src/firebase/config.ts
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Run the Development Server

```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Firebase Deployment

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase (if not already done)

```bash
firebase init
```

### 3. Build and Deploy

```bash
npm run build
firebase deploy
```

## Features Overview

### Authentication
- User registration with email and password
- Secure login system
- Protected routes and user sessions

### Service Booking
- Browse available services
- View detailed service information
- Book services with custom parameters
- Booking confirmation page

### Dashboard
- View booking history
- Manage user profile
- Access personalized content

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support or questions, please open an issue in the repository.

---

Built with ❤️ using React and Firebase
