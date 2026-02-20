import React, { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  runTransaction,
  arrayRemove,
  addDoc
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Clock, Calendar, Building, List, AlertCircle } from "lucide-react";

const BookingPage = () => {
  const [user] = useAuthState(auth);
  const [categories] = useState(["Hospitals", "Restaurants"]);
  const [services, setServices] = useState<any[]>([]);
  const [specificServices, setSpecificServices] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [slotCapacity, setSlotCapacity] = useState<Record<string, number>>({});
  const [isRescheduled, setIsRescheduled] = useState(false);
  const [originalTimeSlot, setOriginalTimeSlot] = useState("");
  const [bookingSuccessful, setBookingSuccessful] = useState(false);

  const [formData, setFormData] = useState({
    category: "",
    service: "",
    specificService: "",
    date: "",
    time: "",
    tokenFee: 0,
  });

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

  // 🔹 Fetch Services Based on Category
  useEffect(() => {
    if (formData.category) {
      const fetchServices = async () => {
        const q = query(collection(db, "services"), where("category", "==", formData.category));
        const querySnapshot = await getDocs(q);
        const serviceList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(serviceList);
      };
      fetchServices();
    }
  }, [formData.category]);

  // 🔹 Handle Category Selection
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ category: e.target.value, service: "", specificService: "", date: "", time: "", tokenFee: 0 });
    setServices([]);
    setSpecificServices([]);
    setAvailableDates([]);
    setAvailableTimeSlots([]);
    setIsRescheduled(false);
  };

  // 🔹 Handle Service Selection
  const handleServiceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedService = e.target.value;
    setFormData((prev) => ({
      ...prev,
      service: selectedService,
      specificService: "",
      date: "",
      time: "",
      tokenFee: 0,
    }));

    // Find the selected service
    const serviceData = services.find((s) => s.name === selectedService);
    if (!serviceData) {
      setSpecificServices([]);
      setAvailableDates([]);
      setAvailableTimeSlots([]);
      return;
    }

    // Fetch the specificServices subcollection
    try {
      const specificServicesRef = collection(db, `services/${serviceData.id}/specificServices`);
      const querySnapshot = await getDocs(specificServicesRef);

      if (!querySnapshot.empty) {
        // Extract the names of the specific services
        const specificServicesList = querySnapshot.docs.map(doc => doc.id);
        setSpecificServices(specificServicesList);

        // Store the specific service data for later use
        const specificServicesData: Record<string, any> = {};
        querySnapshot.docs.forEach(doc => {
          specificServicesData[doc.id] = doc.data();
        });

        // Update the services state to include the specificServices data
        setServices(prevServices => {
          return prevServices.map(service => {
            if (service.id === serviceData.id) {
              return {
                ...service,
                specificServices: specificServicesData
              };
            }
            return service;
          });
        });
      } else {
        setSpecificServices([]);
      }
    } catch (error) {
      console.error("Error fetching specific services:", error);
      setSpecificServices([]);
    }

    setAvailableDates([]);
    setAvailableTimeSlots([]);
    setIsRescheduled(false);
  };

  // 🔹 Handle Specific Service Selection
  const handleSpecificServiceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSpecificService = e.target.value;
    setFormData((prev) => ({
      ...prev,
      specificService: selectedSpecificService,
      date: "",
      time: "",
      tokenFee: 0,
    }));

    const selectedService = services.find((s) => s.name === formData.service);
    if (selectedService) {
      const specificData = selectedService.specificServices[selectedSpecificService];
      const filteredDates = specificData.availableDates.filter((dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        return date >= today;
      });
      setAvailableDates(filteredDates);
      setAvailableTimeSlots([]);
    }
    setIsRescheduled(false);
  };

  // 🔹 Handle Date Selection
  const handleDateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = e.target.value;
    setFormData((prev) => ({
      ...prev,
      date: selectedDate,
      time: "",
      tokenFee: 0,
    }));

    // Get the service ID
    const serviceId = services.find(s => s.name === formData.service)?.id;
    if (!serviceId) return;

    // Fetch time slots from the appropriate document
    try {
      const timeSlotRef = doc(db, `services/${serviceId}/specificServices/${formData.specificService}/timeSlots/${selectedDate}`);
      const timeSlotDoc = await getDoc(timeSlotRef);

      if (timeSlotDoc.exists()) {
        const timeSlotData = timeSlotDoc.data();
        // Extract the time slot keys from the document
        const timeSlots = Object.keys(timeSlotData);

        // Sort time slots in a consistent manner
        const sortedTimeSlots = timeSlots.sort((a, b) => {
          // Convert time to 24-hour format for consistent sorting
          const convertTo24Hour = (time: string) => {
            const [t, period] = time.split(' ');
            let [hours, minutes] = t.split(':').map(Number);

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            return hours * 60 + (minutes || 0);
          };

          return convertTo24Hour(a) - convertTo24Hour(b);
        });

        setAvailableTimeSlots(sortedTimeSlots);
      } else {
        setAvailableTimeSlots([]);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setAvailableTimeSlots([]);
    }

    setIsRescheduled(false);
  };

  // 🔹 Handle Time Slot Selection & Show Token Fee
  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTime = e.target.value;
    setFormData((prev) => ({
      ...prev,
      time: selectedTime,
      tokenFee: services.find((s) => s.name === formData.service)?.specificServices[formData.specificService]?.tokenFee || 0,
    }));
    setIsRescheduled(false);

    // Fetch slot capacity when time slot is selected
    if (selectedTime) {
      fetchSlotCapacity(selectedTime);
    }
  };

  // 🔹 Fetch slot capacity for selected time
  const fetchSlotCapacity = async (selectedTime: string) => {
    try {
      const serviceId = services.find(s => s.name === formData.service)?.id;
      if (!serviceId) return;

      const slotRef = doc(db, `services/${serviceId}/specificServices/${formData.specificService}/timeSlots/${formData.date}`);
      const slotDoc = await getDoc(slotRef);

      if (slotDoc.exists()) {
        const slotData = slotDoc.data();
        // Check if the selectedTime exists in the document
        if (slotData[selectedTime]) {
          const capacity = slotData[selectedTime].capacity || 3;
          const booked = slotData[selectedTime].booked || 0;
          setSlotCapacity({ [selectedTime]: capacity - booked });
        } else {
          setSlotCapacity({ [selectedTime]: 3 }); // Default if time slot data not found
        }
      } else {
        // If doc doesn't exist, assume full capacity available
        setSlotCapacity({ [selectedTime]: 3 });
      }
    } catch (error) {
      console.error("Error fetching slot capacity:", error);
    }
  };

  // 🔹 Find next available time slot
  const findNextAvailableSlot = (currentTimeSlot: string): string | null => {
    const timeSlotIndex = availableTimeSlots.indexOf(currentTimeSlot);

    // If current slot is the last one, return null
    if (timeSlotIndex === availableTimeSlots.length - 1) {
      return null;
    }

    // Return the next available time slot
    return availableTimeSlots[timeSlotIndex + 1];
  };

  // 🔹 Notify users in queue about available slot
  const notifyUsersInQueue = async (serviceId: string, date: string, time: string) => {
    try {
      // Get the waiting list for this service/date/time
      const waitingListRef = collection(db, `services/${serviceId}/waitingList`);
      const q = query(waitingListRef,
        where("specificService", "==", formData.specificService),
        where("date", "==", date),
        where("originalTimeSlot", "==", time));

      const querySnapshot = await getDocs(q);

      // Notify the first 3 users in queue
      const usersToNotify = querySnapshot.docs.slice(0, 3);

      // Send notification to each user
      for (const userDoc of usersToNotify) {
        const userData = userDoc.data();
        const userRef = doc(db, "users", userData.userId);

        // Add notification to user's notifications collection
        const notificationRef = collection(userRef, "notifications");
        await addDoc(notificationRef, {
          type: "slot_available",
          message: `An earlier slot (${time} on ${date}) is now available for your booking at ${formData.service}!`,
          service: formData.service,
          specificService: formData.specificService,
          date: date,
          time: time,
          createdAt: new Date(),
          read: false
        });
      }
    } catch (error) {
      console.error("Error notifying users:", error);
    }
  };

  // 🔹 Update slot availability in Firestore
  const updateSlotAvailability = async (serviceId: string, date: string, time: string, increment: boolean) => {
    try {
      const slotRef = doc(db, `services/${serviceId}/specificServices/${formData.specificService}/timeSlots/${date}`);

      // Use a transaction to safely update the slot count
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);

        if (!slotDoc.exists()) {
          // Initialize the document if it doesn't exist
          transaction.set(slotRef, {
            [time]: { capacity: 3, booked: increment ? 1 : 0 }
          });
        } else {
          const slotData = slotDoc.data();
          const currentBooked = (slotData[time]?.booked || 0);
          const newBooked = increment ? currentBooked + 1 : currentBooked - 1;

          transaction.update(slotRef, {
            [`${time}.booked`]: newBooked
          });
        }
      });

      return true;
    } catch (error) {
      console.error("Error updating slot availability:", error);
      return false;
    }
  };

  // 🔹 Handle Booking Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to book.");
      return;
    }

    if (!formData.category || !formData.service || !formData.specificService || !formData.date || !formData.time) {
      alert("Please fill all the fields.");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      alert("User data not found.");
      return;
    }

    const userData = userSnap.data();
    const userBalance = userData.balance || 0;

    // 🔹 Check if user has enough balance
    if (userBalance < formData.tokenFee) {
      alert("Insufficient balance! Please add funds to continue.");
      return;
    }

    // Get the service ID
    const serviceId = services.find(s => s.name === formData.service)?.id;
    if (!serviceId) {
      alert("Service information not found.");
      return;
    }

    try {
      // Check if the selected slot is available
      // Check if the selected slot is available
      await fetchSlotCapacity(formData.time);
      const slotAvailable = slotCapacity[formData.time] > 0;

      let finalTimeSlot = formData.time;
      let finalDate = formData.date;

      // If the slot is full, find the next available slot
      if (!slotAvailable) {
        const nextSlot = findNextAvailableSlot(formData.time);

        if (nextSlot) {
          setOriginalTimeSlot(formData.time);
          finalTimeSlot = nextSlot;
          setIsRescheduled(true);

          // Update form data to reflect the new time
          setFormData(prev => ({
            ...prev,
            time: nextSlot
          }));
        } else {
          // If no next slot is available, add user to waiting list
          const waitingListRef = collection(db, `services/${serviceId}/waitingList`);
          await addDoc(waitingListRef, {
            userId: user.uid,
            category: formData.category,
            service: formData.service,
            specificService: formData.specificService,
            date: formData.date,
            originalTimeSlot: formData.time,
            createdAt: new Date()
          });

          alert("Sorry, all slots are full. You've been added to the waiting list and will be notified if a slot becomes available.");
          return;
        }
      }

      // 🔹 New booking data
      const newBooking = {
        userId: user.uid,
        category: formData.category,
        service: formData.service,
        specificService: formData.specificService,
        date: finalDate,
        time: finalTimeSlot,
        originalTimeSlot: isRescheduled ? formData.time : finalTimeSlot,
        wasRescheduled: isRescheduled,
        tokenFee: formData.tokenFee,
        status: "Confirmed",
        bookingDate: new Date(),
      };

      // Update user's balance and booking history
      await updateDoc(userRef, {
        balance: userBalance - formData.tokenFee, // Deduct token fee
        bookingHistory: arrayUnion(newBooking), // Add booking to history
      });

      // Add booking to specific service's bookings subcollection
      const specificServiceBookingsRef = collection(
        db,
        `services/${serviceId}/specificServices/${formData.specificService}/bookings`
      );
      await addDoc(specificServiceBookingsRef, newBooking);
      
      // Update slot availability
      await updateSlotAvailability(serviceId, finalDate, finalTimeSlot, true);

      // If this is a rescheduled booking, update the original slot availability
      if (isRescheduled) {
        await updateSlotAvailability(serviceId, formData.date, formData.time, false);

        // Notify users in queue about the newly available slot
        await notifyUsersInQueue(serviceId, formData.date, formData.time);
      }

      setBookingSuccessful(true);

      // Reset form after successful booking
      setTimeout(() => {
        setFormData({
          category: "",
          service: "",
          specificService: "",
          date: "",
          time: "",
          tokenFee: 0,
        });
        setIsRescheduled(false);
        setBookingSuccessful(false);
      }, 5000);

    } catch (error) {
      console.error("Error confirming booking:", error);
      alert("Booking failed! Try again.");
    }
  };

  // 🔹 Handle Rescheduling
  const handleReschedule = async (bookingId: string, originalTime: string, newTime: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const bookingHistory = userData.bookingHistory || [];

      // Find the booking to reschedule
      const bookingToReschedule = bookingHistory.find((b: any) => b.id === bookingId);

      if (!bookingToReschedule) return;

      // Update the slot availability for both slots
      await updateSlotAvailability(
        services.find(s => s.name === bookingToReschedule.service)?.id || "",
        bookingToReschedule.date,
        bookingToReschedule.time,
        false
      );

      await updateSlotAvailability(
        services.find(s => s.name === bookingToReschedule.service)?.id || "",
        bookingToReschedule.date,
        newTime,
        true
      );

      // Update the booking in the user's history
      const updatedBooking = {
        ...bookingToReschedule,
        time: newTime,
        originalTimeSlot: bookingToReschedule.time,
        wasRescheduled: true
      };

      await updateDoc(userRef, {
        bookingHistory: arrayRemove(bookingToReschedule)
      });

      await updateDoc(userRef, {
        bookingHistory: arrayUnion(updatedBooking)
      });

      // Notify users in queue about the newly available slot
      await notifyUsersInQueue(
        services.find(s => s.name === bookingToReschedule.service)?.id || "",
        bookingToReschedule.date,
        bookingToReschedule.time
      );

      alert("Booking rescheduled successfully!");
    } catch (error) {
      console.error("Error rescheduling booking:", error);
      alert("Rescheduling failed. Please try again.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Book Your Slot</h1>

        {bookingSuccessful && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-800 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              Booking Confirmed!
            </h3>
            {isRescheduled && (
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your requested time slot was full. We've automatically rescheduled you to the next available slot at {formData.time}.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 🔹 Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2"><Building className="inline-block h-4 w-4 mr-2" /> Select a Category</label>
            <select className="w-full px-4 py-2 border rounded-lg" value={formData.category} onChange={handleCategoryChange}>
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* 🔹 Service Selection */}
          {services.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2"><Building className="inline-block h-4 w-4 mr-2" /> Select a Service</label>
              <select className="w-full px-4 py-2 border rounded-lg" value={formData.service} onChange={handleServiceChange}>
                <option value="">Select a service</option>
                {services.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* 🔹 Specific Service Selection */}
          {specificServices.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2"><List className="inline-block h-4 w-4 mr-2" /> Select Specific Service</label>
              <select className="w-full px-4 py-2 border rounded-lg" value={formData.specificService} onChange={handleSpecificServiceChange}>
                <option value="">Select a specific service</option>
                {specificServices.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* 🔹 Date Selection */}
          {availableDates.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2"><Calendar className="inline-block h-4 w-4 mr-2" /> Select Date</label>
              <select className="w-full px-4 py-2 border rounded-lg" value={formData.date} onChange={handleDateChange}>
                <option value="">Select a date</option>
                {availableDates.map((date) => <option key={date} value={date}>{date}</option>)}
              </select>
            </div>
          )}

          {/* 🔹 Time Slot Selection */}
          {availableTimeSlots.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2"><Clock className="inline-block h-4 w-4 mr-2" /> Select Time Slot</label>
              <select className="w-full px-4 py-2 border rounded-lg" value={formData.time} onChange={handleTimeChange}>
                <option value="">Select a time slot</option>
                {availableTimeSlots.map((time) => <option key={time} value={time}>{time}</option>)}
              </select>

              {formData.time && slotCapacity[formData.time] === 0 && (
                <div className="mt-2 text-sm text-orange-600 dark:text-orange-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  This slot is full. You'll be automatically rescheduled to the next available slot.
                </div>
              )}

              {formData.time && slotCapacity[formData.time] > 0 && slotCapacity[formData.time] <= 1 && (
                <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Only {slotCapacity[formData.time]} slot remaining!
                </div>
              )}
            </div>
          )}

          {/* 🔹 Token Fee */
            formData.tokenFee > 0 && (
              <div className="text-center text-lg font-semibold text-blue-600 dark:text-blue-400">
                Token Fee: <span className="text-sm">₹</span>{formData.tokenFee}
              </div>
            )}

          {/* 🔹 User Balance */}
          {formData.tokenFee > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Your Balance: <span className="text-sm">₹</span>{userBalance}
            </div>
          )}

          {/* 🔹 Confirm Booking Button */}
          {formData.tokenFee > 0 && (
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={bookingSuccessful}
            >
              {bookingSuccessful ? "Booking Confirmed" : "Confirm Booking"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default BookingPage;