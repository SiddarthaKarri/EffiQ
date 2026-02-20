import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Sun, Moon, Clock, Menu, X, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";

const Layout = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [user] = useAuthState(auth); // Get user authentication state

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navigation = [
    { name: "Home", path: "/" },
    { name: "Book a Slot", path: "/booking" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Queue Status", path: "/queue-tracking" },
    { name: "Emergency", path: "/emergency-booking" },
    {name: "Peak Hours", path: "/peak-hours"},
  ];

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "dark bg-gray-900" : "bg-gray-50"
      } transition-colors duration-200`}
    >
      <nav className="fixed w-full bg-white dark:bg-gray-800 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                  EffiQ
                </span>
              </Link>
              {/* Desktop Navigation */}
              <div className="hidden md:flex ml-10 space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`${
                      location.pathname === item.path
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    } px-3 py-2 text-sm font-medium transition-colors`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Side (Dark Mode + Auth Buttons) */}
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {/* Authentication Buttons */}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {user.displayName || "Profile"}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center transition"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Signup
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="ml-4 md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`${
                    location.pathname === item.path
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  } block px-3 py-2 rounded-md text-base font-medium transition-colors`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Page Content */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 shadow-sm mt-12">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>© 2025 EffiQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;