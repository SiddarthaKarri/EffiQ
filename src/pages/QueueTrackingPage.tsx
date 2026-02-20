import React, { useState, useEffect } from 'react';
import { Bell, Users, Clock, AlertCircle, Calendar, RotateCcw, ArrowRight } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const QueueUpdatesPage = () => {
  // Auth state
  const [user] = useAuthState(auth);
  
  // State for notifications and user data
  const [notifications, setNotifications] = useState([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [waitingTime, setWaitingTime] = useState(0);
  const [totalAhead, setTotalAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current time
  const getCurrentTime = () => new Date();

  // Function to calculate time difference in minutes
  const getMinutesDifference = (time1, time2) => {
    return Math.round((time2 - time1) / (1000 * 60));
  };

  // Function to parse time string (e.g., "10:00 AM") to Date object
  const parseTimeString = (timeString, dateString) => {
    // Remove any quotes from strings
    const cleanTimeString = timeString.replace(/"/g, '');
    const cleanDateString = dateString.replace(/"/g, '');
    
    const [hourMinute, ampm] = cleanTimeString.split(' ');
    let [hours, minutes] = hourMinute.split(':').map(Number);
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    // Create date object with the provided date and time
    const dateObj = new Date(cleanDateString);
    dateObj.setHours(hours, minutes, 0, 0);
    
    return dateObj;
  };

  // Fetch user data and queue information
  useEffect(() => {
    if (!user) return;
    
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user document from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnapshot = await getDoc(userDocRef);
        
        if (!userDocSnapshot.exists()) {
          setError("User not found");
          setLoading(false);
          return;
        }
        
        const userData = userDocSnapshot.data();
        const bookingHistory = userData.bookingHistory || [];
        
        // Find upcoming appointment(s)
        const now = getCurrentTime();
        const upcoming = bookingHistory.find(booking => {
          // Clean date and time strings
          const date = booking.date.replace(/"/g, '');
          const time = booking.time.replace(/"/g, '');
          
          // Parse booking date and time
          const bookingDateTime = parseTimeString(time, date);
          
          // Check if the booking is in the future and confirmed
          return bookingDateTime > now && booking.status === "Confirmed";
        });
        
        if (upcoming) {
          setUpcomingAppointment(upcoming);
          
          // Get service ID for fetching queue data
          const serviceId = upcoming.serviceId || upcoming.seviceId || 
                           upcoming.service.toLowerCase().replace(/\s+/g, '-');
          
          // Clean strings
          const specificService = upcoming.specificService.replace(/"/g, '');
          const date = upcoming.date.replace(/"/g, '');
          const time = upcoming.time.replace(/"/g, '');
          
          // Fetch queue data for this specific service, date and time
          const timeSlotRef = doc(
            db, 
            'services', 
            serviceId, 
            'specificServices', 
            specificService, 
            'timeSlots',
            date
          );
          
          const timeSlotSnapshot = await getDoc(timeSlotRef);
          
          let queueData = {
            position: 1,
            totalAhead: 0,
            estimatedWaitTime: 0,
            timeSlotCapacity: 1,
            bookedInTimeSlot: 1
          };
          
          if (timeSlotSnapshot.exists()) {
            const timeSlotData = timeSlotSnapshot.data();
            const timeSlot = timeSlotData[time.replace(/"/g, '')];
            
            if (timeSlot) {
              // Calculate queue position based on booking time and current time
              const bookedCount = timeSlot.booked || 1;
              const capacity = timeSlot.capacity || 1;
              
              // For simplicity, we'll assume a linear distribution of patients 
              // over the time slot and calculate position based on that
              const bookingDateTime = parseTimeString(time, date);
              const minutesToAppointment = getMinutesDifference(now, bookingDateTime);
              let position = 1;
              
              if (minutesToAppointment > 0) {
                // Simulate a position in queue
                position = Math.min(Math.ceil(bookedCount / 2), bookedCount);
                
                // Total ahead is position - 1
                const ahead = position - 1;
                
                queueData = {
                  position: position,
                  totalAhead: ahead,
                  estimatedWaitTime: ahead * 15, // Assume 15 minutes per person
                  timeSlotCapacity: capacity,
                  bookedInTimeSlot: bookedCount
                };
              }
            }
          }
          
          // Update state with queue data
          setQueuePosition(queueData.position);
          setTotalAhead(queueData.totalAhead);
          setWaitingTime(queueData.estimatedWaitTime);
          
          // Generate notifications based on upcoming appointment and queue data
          generateNotifications(upcoming, queueData);
          
          // Set up listener for rescheduling events
          setupReschedulingListener(upcoming, serviceId, specificService);
        } else {
          setUpcomingAppointment(null);
          setNotifications([]);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load queue data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
    
    // Set up notification refreshing every minute for time-based notifications
    const refreshInterval = setInterval(() => {
      if (upcomingAppointment) {
        checkForTimeBasedNotifications(upcomingAppointment);
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(refreshInterval);
      // Clean up any other listeners
    };
  }, [user]);

  // Set up a listener for rescheduling events
  const setupReschedulingListener = (appointment, serviceId, specificService) => {
    if (!appointment || !serviceId || !specificService) return;

    // Create a reference to the booking document
    const bookingsQuery = query(
      collection(db, 'services', serviceId, 'specificServices', specificService, 'bookings'),
      where('userId', '==', user.uid),
      where('date', '==', appointment.date.replace(/"/g, '')),
      where('time', '==', appointment.time.replace(/"/g, ''))
    );

    // Set up a real-time listener
    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const bookingData = change.doc.data();
          
          // Check if the booking has been rescheduled
          if (bookingData.wasRescheduled) {
            // Add a rescheduling notification
            const rescheduleNotification = {
              id: 'reschedule-' + Date.now(),
              type: 'warning',
              icon: <RotateCcw className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
              message: `Your appointment has been rescheduled from ${bookingData.originalTime} to ${bookingData.time} on ${bookingData.date}`,
              time: 'Just now'
            };
            
            setNotifications(prev => [rescheduleNotification, ...prev]);
            
            // Update the appointment data
            setUpcomingAppointment(prev => ({
              ...prev,
              time: bookingData.time,
              date: bookingData.date,
              wasRescheduled: true,
              originalTime: bookingData.originalTime,
              originalDate: bookingData.originalDate,
              rescheduledBy: bookingData.rescheduledBy,
              rescheduledAt: bookingData.rescheduledAt
            }));
          }
          
          // Check if an emergency has been added
          if (bookingData.emergencyAdded) {
            const emergencyNotification = {
              id: 'emergency-' + Date.now(),
              type: 'warning',
              icon: <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
              message: 'Emergency case added to priority queue. Your estimated wait time has increased.',
              time: 'Just now'
            };
            
            setNotifications(prev => [emergencyNotification, ...prev]);
            
            // Update waiting time (add 15 minutes for emergency case)
            setWaitingTime(prev => prev + 15);
          }
        }
      });
    });

    // Return the unsubscribe function to be called on cleanup
    return unsubscribe;
  };

  // Generate notifications based on appointment and queue data
  const generateNotifications = (appointment, queueData) => {
    const newNotifications = [];
    const now = getCurrentTime();
    
    // Add rescheduling notification if appointment was rescheduled
    if (appointment.wasRescheduled) {
      newNotifications.push({
        id: 'reschedule-' + Date.now(),
        type: 'warning',
        icon: <RotateCcw className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
        message: `Your appointment has been rescheduled from ${appointment.originalTime} to ${appointment.time} on ${appointment.date}`,
        time: 'Just now'
      });
    }
    
    // Add queue position notification
    if (queueData.totalAhead > 0) {
      newNotifications.push({
        id: 'queue-' + Date.now(),
        type: 'info',
        icon: <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        message: `${queueData.totalAhead} people ahead of you in the queue`,
        time: 'Just updated'
      });
    }
    
    // Add wait time update
    newNotifications.push({
      id: 'wait-' + Date.now(),
      type: 'info',
      icon: <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      message: `Estimated waiting time: ${queueData.estimatedWaitTime} minutes`,
      time: 'Just updated'
    });
    
    // Check for first-time notifications based on appointment time
    checkForTimeBasedNotifications(appointment, newNotifications);
    
    setNotifications(newNotifications);
  };
  
  // Check for time-based notifications (like reminders before appointment)
  const checkForTimeBasedNotifications = (appointment, existingNotifications = null) => {
    const now = getCurrentTime();
    
    // Parse appointment date and time
    const appointmentDateTime = parseTimeString(
      appointment.time.replace(/"/g, ''),
      appointment.date.replace(/"/g, '')
    );
    
    // If appointment is today
    if (appointmentDateTime.toDateString() === now.toDateString()) {
      const minutesUntilAppointment = getMinutesDifference(now, appointmentDateTime);
      
      // Reminder 20 minutes before appointment
      if (minutesUntilAppointment <= 20 && minutesUntilAppointment > 15) {
        const reminderNotification = {
          id: 'reminder-20-' + Date.now(),
          type: 'info',
          icon: <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
          message: `Your appointment is in ${minutesUntilAppointment} minutes`,
          time: 'Just now'
        };
        
        if (existingNotifications) {
          existingNotifications.push(reminderNotification);
        } else {
          setNotifications(prev => [reminderNotification, ...prev]);
        }
      }
    }
  };

  // Calculate queue progress percentage
  const calculateQueueProgress = () => {
    if (totalAhead === 0) return 100;
    const total = totalAhead + 1;
    const progress = ((total - queuePosition) / total) * 100;
    return Math.round(progress);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading queue information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Queue Updates</h1>

      {upcomingAppointment ? (
        <>
          {/* Upcoming Appointment Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center mb-6">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Upcoming Appointment</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Service</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {upcomingAppointment.service} - {upcomingAppointment.specificService.replace(/"/g, '')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date & Time</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {upcomingAppointment.date.replace(/"/g, '')} at {upcomingAppointment.time.replace(/"/g, '')}
                </p>
              </div>
            </div>

            {/* Live Status Tracker */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Live Queue Status</h3>
              
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Queue Progress</span>
                  <span>{calculateQueueProgress()}%</span>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${calculateQueueProgress()}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <Users className="h-5 w-5 mr-2" />
                    <span>Your Position</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{queuePosition}{getOrdinalSuffix(queuePosition)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <Clock className="h-5 w-5 mr-2" />
                    <span>Estimated Wait</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{waitingTime} min</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center text-purple-600 dark:text-purple-400">
                    <Users className="h-5 w-5 mr-2" />
                    <span>Total Ahead</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalAhead}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Queue Updates</h2>
            </div>
            
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start p-4 rounded-lg ${
                      notification.type === 'warning'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                        : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}
                  >
                    {notification.icon || (
                      notification.type === 'warning' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      ) : (
                        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      )
                    )}
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-medium ${
                        notification.type === 'warning'
                          ? 'text-yellow-800 dark:text-yellow-300'
                          : 'text-blue-800 dark:text-blue-300'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No new notifications</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Upcoming Appointments</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">You don't have any appointments scheduled in the queue.</p>
          <button className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Book an Appointment <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
};

export default QueueUpdatesPage;