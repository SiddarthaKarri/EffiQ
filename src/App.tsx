import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute
import HomePage from "./pages/HomePage";
import BookingPage from "./pages/BookingPage";
import DashboardPage from "./pages/DashboardPage";
import QueueTrackingPage from "./pages/QueueTrackingPage";
import EmergencyBookingPage from "./pages/EmergencyBookingPage";
import AdminPanel from "./pages/AdminPanel";
import AdminAnalytics from "./pages/AdminAnalytics";
import Profile from "./pages/Profile";
import Login from "./pages/Login"; // Add Login Page
import Signup from "./pages/Signup"; // Add Signup Page
import PeakRushAnalysisPage from "./pages/PeakRushAnalysisPage";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebaseConfig";
import PublicRoute from "./components/PublicRoute"; // Import PublicRoute



function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />

        {/* 🔹 Public Routes (Accessible Only When Not Logged In) */}
        <Route element={<PublicRoute />}>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
        </Route>

        {/* 🔹 Protected Routes (Only for Logged-in Users) */}
        <Route element={<ProtectedRoute />}>
          <Route path="booking" element={<BookingPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="queue-tracking" element={<QueueTrackingPage />} />
          <Route path="emergency-booking" element={<EmergencyBookingPage />} />
          <Route path="peak-hours" element={<PeakRushAnalysisPage />} />
          {/* Add more protected routes here */}
          <Route path="profile" element={<Profile />} />
          <Route path="admin">
            <Route index element={<AdminPanel />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
