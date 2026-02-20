import React, { useEffect, useState } from 'react';
import { Clock, Calendar, CheckCircle, X, RefreshCw } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayRemove, increment, query, collection, where, getDocs, deleteDoc, QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from "../firebaseConfig";

const DashboardPage = () => {
  const [user] = useAuthState(auth);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBooking, setActiveBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  // 🔹 Fetch User Balance
  useEffect(() => {
    if (user) {
      const fetchBalance = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserBalance(userSnap.data().balance || 0);
        }
      };
      fetchBalance();
    }
  }, [user]);
  useEffect(() => {
    const fetchUserBookings = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);

        // Get user data to access booking history
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          console.error('User document not found');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const userBookings = userData.bookingHistory || [];

        // Format bookings with additional information
        const formattedBookings = userBookings.map((booking, index) => {
          // Convert booking date string to Date object
          const bookingDate = new Date(booking.date.replace(/"/g, ''));
          const bookingTime = booking.time.replace(/"/g, '');

          // Current date for comparison
          const currentDate = new Date();

          // Format date strings for comparison (YYYY-MM-DD)
          const formattedBookingDate = bookingDate.toISOString().split('T')[0];
          const formattedCurrentDate = currentDate.toISOString().split('T')[0];

          // Parse booking time
          const [hourMinute, ampm] = bookingTime.split(' ');
          let [hours, minutes] = hourMinute.split(':');
          hours = parseInt(hours);

          // Convert to 24-hour format
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;

          // Create booking time Date object for today
          const bookingDateTime = new Date(currentDate);
          bookingDateTime.setHours(hours, parseInt(minutes), 0);

          // A booking is active if:
          // 1. The booking date is in the future, OR
          // 2. The booking date is today AND the booking time is in the future
          const isActive =
            bookingDate > currentDate ||
            (formattedBookingDate === formattedCurrentDate && bookingDateTime > currentDate);

          return {
            id: index,
            originalBooking: booking,
            service: booking.service,
            specificService: booking.specificService,
            serviceId: booking.serviceId || extractServiceId(booking.service),
            time: bookingTime,
            date: formattedBookingDate,
            status: isActive ? "Active" : "Completed",
            waitTime: isActive ? calculateWaitTime(booking) : "0 mins",
            queuePosition: isActive ? calculateQueuePosition(booking) : null
          };
        });

        // Find active bookings and sort them by date and time
        const activeBookings = formattedBookings
          .filter(booking => booking.status === "Active")
          .sort((a, b) => {
            // Compare dates first
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            if (dateA.getTime() !== dateB.getTime()) {
              return dateA - dateB;
            }

            // If dates are the same, compare times
            return convertTimeToMinutes(a.time) - convertTimeToMinutes(b.time);
          });

        // Set first active booking for main display
        setActiveBooking(activeBookings[0] || null);
        setBookings(formattedBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBookings();
  }, [user]);

  // Helper function to extract service ID from service name
  const extractServiceId = (serviceName) => {
    // Convert service name to kebab-case (lowercase with hyphens)
    return serviceName.toLowerCase().replace(/\s+/g, '-');
  };

  // Helper function to convert time (10:30 AM) to minutes since midnight
  const convertTimeToMinutes = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (hours === 12) {
      hours = modifier === 'AM' ? 0 : 12;
    } else if (modifier === 'PM') {
      hours += 12;
    }

    return hours * 60 + minutes;
  };

  // Helper function to calculate estimated wait time based on booked slots
  const calculateWaitTime = (booking) => {
    const position = calculateQueuePosition(booking);
    if (!position) return "0 mins";

    // Assuming each person takes about 15 minutes
    return `${position * 15} mins`;
  };

  // Helper function to calculate position in queue
  const calculateQueuePosition = (booking) => {
    // In a real app, you would query the service's queue data
    // For demo purposes, return a simple estimate (1-5)
    return Math.floor(Math.random() * 5) + 1;
  };

  // Helper function to handle booking cancellation
  const handleCancelBooking = async (bookingIndex) => {
    if (!user?.uid) return;

    const confirmCancel = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmCancel) return;
    try {
      setCancellingId(bookingIndex);

      const bookingToCancel = bookings[bookingIndex].originalBooking;
      const bookingInfo = bookings[bookingIndex];

      // Clean up date and time formats (remove quotes if present)
      const date = bookingToCancel.date.replace(/"/g, '');
      const time = bookingToCancel.time.replace(/"/g, '');
      const serviceId = bookingInfo.serviceId || extractServiceId(bookingToCancel.service);
      const specificService = bookingToCancel.specificService.replace(/"/g, '');

      // Get the token fee for the booking (assuming it's stored in the booking or service)
      const tokenFee = bookingToCancel.tokenFee || 10; // Default to 10 if not specified

      // 1. Update user document to remove this booking and increment balance
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        bookingHistory: arrayRemove(bookingToCancel),
        balance: increment(tokenFee) // Increment balance by token fee
      });

      // 2. Update the time slot to decrease booked count
      const timeSlotRef = doc(
        db,
        'services',
        serviceId,
        'specificServices',
        specificService,
        'timeSlots',
        date
      );

      try {
        // Get the time slot document first to verify it exists
        const timeSlotDoc = await getDoc(timeSlotRef);

        if (timeSlotDoc.exists()) {
          // Update the booked count using increment(-1)
          await updateDoc(timeSlotRef, {
            [`${time}.booked`]: increment(-1)
          });
          // console.log(`Successfully updated time slot booking count for ${date} at ${time}`);
        } else {
          console.warn(`Time slot document not found for ${date} at service ${serviceId}/${specificService}`);
        }
      } catch (timeSlotError) {
        console.error('Error updating time slot:', timeSlotError);
      }
      // 3. Remove the specific booking document from the bookings subcollection
      const bookingsQuery = query(
        collection(db, 'services', serviceId, 'specificServices', specificService, 'bookings'),
        where('userId', '==', user.uid),
        where('date', '==', date),
        where('time', '==', time)
      );

      const bookingSnapshot = await getDocs(bookingsQuery);
      bookingSnapshot.forEach(async (bookingDoc: QueryDocumentSnapshot) => {
        await deleteDoc(bookingDoc.ref);
        // console.log(`Deleted booking document: ${bookingDoc.id}`);
      });
      // 3. Update local state
      const updatedBookings = bookings.filter((_, index) => index !== bookingIndex);
      setBookings(updatedBookings);

      // 4. Update active booking if needed
      if (activeBooking && activeBooking.id === bookingIndex) {
        const newActiveBooking = updatedBookings.find(b => b.status === "Active");
        setActiveBooking(newActiveBooking || null);
      }

      // 5. Update local user balance
      setUserBalance(prevBalance => prevBalance + tokenFee);

      // Notify user of successful cancellation and balance refund
      alert(`Booking cancelled successfully! ${tokenFee} tokens have been refunded to your balance.`);

    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  // In a real app, this would open a modal to select a new time/date
  const handleRescheduleBooking = async (bookingIndex) => {
    if (!user?.uid) return;

    try {
      setReschedulingId(bookingIndex);
      const bookingToReschedule = bookings[bookingIndex].originalBooking;

      // Navigate to BookingPage with pre-filled data for rescheduling
      // This assumes you have a routing mechanism
      // If using React Router, you might do:
      // navigate('/book', { 
      //   state: { 
      //     reschedulingBooking: bookingToReschedule 
      //   } 
      // });

      // Alternatively, you can open a modal or use a state to trigger rescheduling
      alert(`Rescheduling ${bookingToReschedule.service} - ${bookingToReschedule.specificService}`);
    } catch (error) {
      console.error('Error initiating reschedule:', error);
      alert('Failed to initiate rescheduling. Please try again.');
    } finally {
      setReschedulingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Add user balance display */}
      <div className="mb-4 text-right">
        <span className="text-gray-600 dark:text-gray-400">
          Your Balance: {userBalance} tokens
        </span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Your Dashboard</h1>
      {/* Active Queue Status */}
      {activeBooking ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Active Queue Status: {activeBooking.service} - {activeBooking.specificService}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center text-blue-600 dark:text-blue-400">
                <Clock className="h-5 w-5 mr-2" />
                <span>Current Position</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {activeBooking.queuePosition}
                {getOrdinalSuffix(activeBooking.queuePosition)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center text-green-600 dark:text-green-400">
                <Clock className="h-5 w-5 mr-2" />
                <span>Estimated Wait</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{activeBooking.waitTime}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center text-purple-600 dark:text-purple-400">
                <Calendar className="h-5 w-5 mr-2" />
                <span>Appointment Time</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{activeBooking.time}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activeBooking.date}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">No Active Bookings</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have any active bookings at the moment.</p>
        </div>
      )}

      {/* Bookings List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Bookings</h2>
          {bookings.length > 0 ? (
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
                      <p className="text-sm text-gray-700 dark:text-gray-300">{booking.specificService}</p>
                      <div className="flex space-x-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{booking.date}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{booking.time}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {booking.status === "Active" && (
                      <>
                        <button
                          className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400"
                          onClick={() => handleRescheduleBooking(booking.id)}
                          disabled={reschedulingId === booking.id}
                        >
                          <RefreshCw className={`h-5 w-5 ${reschedulingId === booking.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${booking.status === "Active"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">You haven't made any bookings yet.</p>
          )}
        </div>
      </div>
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

export default DashboardPage;