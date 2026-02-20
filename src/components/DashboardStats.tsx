import React from 'react';
import { Clock, Calendar, CheckCircle } from 'lucide-react';

const DashboardStats = () => {
  const bookings = [
    {
      id: 1,
      service: "General Hospital",
      time: "10:30 AM",
      status: "Active",
      waitTime: "25 mins"
    },
    {
      id: 2,
      service: "Passport Office",
      time: "2:15 PM",
      status: "Completed",
      waitTime: "15 mins"
    }
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Your Dashboard</h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Bookings</h3>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center">
                    {booking.status === "Active" ? (
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{booking.service}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{booking.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${booking.status === "Active" 
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      }`}>
                      {booking.status}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Wait: {booking.waitTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardStats;