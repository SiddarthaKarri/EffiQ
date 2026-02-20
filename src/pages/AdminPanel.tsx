import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc, setDoc, query, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebaseConfig';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  BarChart,
  Users,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  Info,
  ArrowRight,
  Building
} from 'lucide-react';

// Type definitions for improved type safety
interface TimeSlot {
  capacity: number;
  booked: number;
}

interface TimeSlots {
  [time: string]: TimeSlot;
}

interface SpecificService {
  name: string;
  tokenFee: number;
  availableDates: string[];
}

interface Booking {
  id: string;
  userId: string;
  category: string;
  service?: string;
  specificService?: string;
  date: string;
  time: string;
  originalTimeSlot?: string;
  wasRescheduled: boolean;
  tokenFee: number;
  status: string;
  bookingDate: {
    _seconds: number;
    _nanoseconds: number;
  };
}

interface Service {
  id: string;
  name: string;
  category: string;
  description?: string;
  location?: {
    _latitude: number;
    _longitude: number;
  };
  adminId: string[]; // Array of admin user IDs
  specificServicesData?: {
    [serviceName: string]: SpecificService;
  };
}

const AdminDashboard = () => {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('bookings');

  // Schedule management states
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlots>({});
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [slotCapacity, setSlotCapacity] = useState(3);
  const [tokenFee, setTokenFee] = useState(0);

  // Booking management states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Filter states
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all services where user is an admin
  useEffect(() => {
    const fetchAdminServices = async () => {
      try {
        setLoading(true);
        if (user) {
          // Query to find all services where the user's ID is in adminIds array
          const servicesRef = collection(db, 'services');
          const servicesSnap = await getDocs(servicesRef);
          
          // Filter services where current user is an admin
          const adminServices: Service[] = [];
          
          servicesSnap.forEach(doc => {
            const serviceData = doc.data() as Omit<Service, 'id'>;
            
            // Check if the service has adminIds array and if the current user is included
            if (serviceData.adminId && serviceData.adminId.includes(user.uid)) {
              adminServices.push({
                id: doc.id,
                ...serviceData
              });
            }
          });
          
          setServices(adminServices);
          
          // If there's only one service, select it automatically
          if (adminServices.length === 1) {
            setSelectedServiceId(adminServices[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching admin services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminServices();
  }, [user]);

  // Load selected service details
  useEffect(() => {
    const loadServiceDetails = async () => {
      if (!selectedServiceId) return;
      
      try {
        setLoading(true);
        
        const serviceRef = doc(db, 'services', selectedServiceId);
        const serviceSnap = await getDoc(serviceRef);
        
        if (serviceSnap.exists()) {
          const serviceData = { id: serviceSnap.id, ...serviceSnap.data() } as Service;
          
          // Fetch the specificServices collection
          const specificServicesRef = collection(db, `services/${serviceSnap.id}/specificServices`);
          const specificServicesSnap = await getDocs(specificServicesRef);

          // Extract services from the collection
          const specificServicesData: { [key: string]: SpecificService } = {};
          specificServicesSnap.docs.forEach(doc => {
            specificServicesData[doc.id] = doc.data() as SpecificService;
          });

          // Set the service with the specificServices collection data
          setService({
            ...serviceData,
            specificServicesData
          });

          // Set the first service as selected if any exist
          if (specificServicesSnap.docs.length > 0) {
            setSelectedService(specificServicesSnap.docs[0].id);
            setTokenFee(specificServicesSnap.docs[0].data().tokenFee || 0);
          }
        }
      } catch (error) {
        console.error('Error loading service details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServiceDetails();
  }, [selectedServiceId]);

  useEffect(() => {
    if (service && selectedService) {
      fetchTimeSlots();
      fetchBookings();
    }
  }, [service, selectedService, selectedDate]);

  const fetchTimeSlots = async () => {
    try {
      if (!service || !selectedService) return;

      const dateString = selectedDate.toISOString().split('T')[0];
      const timeSlotsRef = doc(db, `services/${service.id}/specificServices/${selectedService}/timeSlots`, dateString);
      const timeSlotsSnap = await getDoc(timeSlotsRef);

      if (timeSlotsSnap.exists()) {
        setTimeSlots(timeSlotsSnap.data() as TimeSlots);
      } else {
        setTimeSlots({});
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      if (!service || !selectedService) return;

      const bookingsRef = collection(db, `services/${service.id}/specificServices/${selectedService}/bookings`);
      const bookingsSnap = await getDocs(bookingsRef);
      const bookingsList = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(bookingsList);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchAvailableSlots = async (date: Date) => {
    try {
      if (!service || !selectedService) return;

      const dateString = date.toISOString().split('T')[0];
      const timeSlotsRef = doc(db, `services/${service.id}/specificServices/${selectedService}/timeSlots`, dateString);
      const timeSlotsSnap = await getDoc(timeSlotsRef);

      if (timeSlotsSnap.exists()) {
        const slots = timeSlotsSnap.data() as TimeSlots;
        const available = Object.keys(slots).filter(time =>
          slots[time].booked < slots[time].capacity
        );
        setAvailableSlots(available);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const handleAddTimeSlot = async () => {
    try {
      if (!service || !selectedService || !newTimeSlot) return;

      const dateString = selectedDate.toISOString().split('T')[0];
      const timeSlotsRef = doc(db, `services/${service.id}/specificServices/${selectedService}/timeSlots`, dateString);

      // Check if there are any time slots for this date
      const timeSlotsSnap = await getDoc(timeSlotsRef);
      let currentSlots = {};

      if (timeSlotsSnap.exists()) {
        currentSlots = timeSlotsSnap.data();
      }

      // Add the new time slot
      await setDoc(timeSlotsRef, {
        ...currentSlots,
        [newTimeSlot]: {
          capacity: slotCapacity,
          booked: 0
        }
      });

      // Also add this date to available dates if not already there
      const specificServiceRef = doc(db, `services/${service.id}/specificServices`, selectedService);
      const specificServiceSnap = await getDoc(specificServiceRef);

      if (specificServiceSnap.exists()) {
        const serviceData = specificServiceSnap.data();
        const availableDates = serviceData.availableDates || [];

        if (!availableDates.includes(dateString)) {
          await updateDoc(specificServiceRef, {
            availableDates: [...availableDates, dateString]
          });
        }
      }

      setNewTimeSlot('');
      fetchTimeSlots();
    } catch (error) {
      console.error('Error adding time slot:', error);
    }
  };

  const handleUpdateTokenFee = async () => {
    try {
      if (!service || !selectedService) return;

      const specificServiceRef = doc(db, `services/${service.id}/specificServices`, selectedService);
      await updateDoc(specificServiceRef, {
        tokenFee: tokenFee
      });

      alert('Token fee updated successfully!');
    } catch (error) {
      console.error('Error updating token fee:', error);
    }
  };

  const handleDeleteTimeSlot = async (timeSlot: string) => {
    try {
      if (!service || !selectedService) return;

      const dateString = selectedDate.toISOString().split('T')[0];
      const timeSlotsRef = doc(db, `services/${service.id}/specificServices/${selectedService}/timeSlots`, dateString);

      const timeSlotsSnap = await getDoc(timeSlotsRef);
      if (timeSlotsSnap.exists()) {
        const currentSlots = timeSlotsSnap.data() as TimeSlots;

        // Check if there are bookings for this slot
        if (currentSlots[timeSlot].booked > 0) {
          const confirm = window.confirm(`This time slot has ${currentSlots[timeSlot].booked} bookings. Deleting it will affect these bookings. Are you sure?`);
          if (!confirm) return;
        }

        // Delete the time slot
        const { [timeSlot]: removed, ...updatedSlots } = currentSlots;
        await setDoc(timeSlotsRef, updatedSlots);

        fetchTimeSlots();
      }
    } catch (error) {
      console.error('Error deleting time slot:', error);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      if (!service || !selectedService) return;

      const confirm = window.confirm('Are you sure you want to cancel this booking?');
      if (!confirm) return;

      const bookingRef = doc(db, `services/${service.id}/specificServices/${selectedService}/bookings`, bookingId);
      const bookingSnap = await getDoc(bookingRef);

      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data() as Booking;

        // Update booking status
        await updateDoc(bookingRef, {
          status: 'Cancelled',
          cancelledBy: 'admin',
          cancelledAt: new Date()
        });

        // Decrement booked count in time slot
        const timeSlotsRef = doc(db, `services/${service.id}/specificServices/${selectedService}/timeSlots`, bookingData.date);
        const timeSlotsSnap = await getDoc(timeSlotsRef);

        if (timeSlotsSnap.exists()) {
          const timeSlots = timeSlotsSnap.data() as TimeSlots;
          if (timeSlots[bookingData.time]) {
            await updateDoc(timeSlotsRef, {
              [bookingData.time + '.booked']: Math.max(0, timeSlots[bookingData.time].booked - 1)
            });
          }
        }

        fetchBookings();
        fetchTimeSlots();
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const handleRescheduleBooking = async () => {
    try {
      if (!selectedBooking || !rescheduleDate || !rescheduleTime) return;

      const dateString = rescheduleDate.toISOString().split('T')[0];

      // Check if the slot has capacity
      const timeSlotsRef = doc(db, `services/${service!.id}/specificServices/${selectedService}/timeSlots`, dateString);
      const timeSlotsSnap = await getDoc(timeSlotsRef);

      if (timeSlotsSnap.exists()) {
        const timeSlots = timeSlotsSnap.data() as TimeSlots;
        if (!timeSlots[rescheduleTime] || timeSlots[rescheduleTime].booked >= timeSlots[rescheduleTime].capacity) {
          alert('This time slot is already fully booked.');
          return;
        }

        // Update the booking
        const bookingRef = doc(db, `services/${service!.id}/specificServices/${selectedService}/bookings`, selectedBooking.id);
        await updateDoc(bookingRef, {
          date: dateString,
          time: rescheduleTime,
          wasRescheduled: true,
          originalTimeSlot: selectedBooking.time,
          originalDate: selectedBooking.date,
          rescheduledBy: 'admin',
          rescheduledAt: new Date()
        });

        // Decrement booked count in original time slot
        const originalSlotRef = doc(db, `services/${service!.id}/specificServices/${selectedService}/timeSlots`, selectedBooking.date);
        const originalSlotSnap = await getDoc(originalSlotRef);

        if (originalSlotSnap.exists()) {
          const originalSlots = originalSlotSnap.data() as TimeSlots;
          if (originalSlots[selectedBooking.time]) {
            await updateDoc(originalSlotRef, {
              [selectedBooking.time + '.booked']: Math.max(0, originalSlots[selectedBooking.time].booked - 1)
            });
          }
        }

        // Increment booked count in new time slot
        await updateDoc(timeSlotsRef, {
          [rescheduleTime + '.booked']: (timeSlots[rescheduleTime]?.booked || 0) + 1
        });

        setSelectedBooking(null);
        setRescheduleDate(null);
        setRescheduleTime('');
        fetchBookings();
        fetchTimeSlots();
      }
    } catch (error) {
      console.error('Error rescheduling booking:', error);
    }
  };

  const getFilteredBookings = () => {
    return bookings.filter(booking => {
      // Filter by date
      if (dateFilter && booking.date !== dateFilter.toISOString().split('T')[0]) {
        return false;
      }

      // Filter by status
      if (statusFilter !== 'all' && booking.status !== statusFilter) {
        return false;
      }

      // Filter by search query (user ID)
      if (searchQuery && !booking.userId.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                You need to be logged in to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                You are not an administrator for any services. Please contact the system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Service selection screen when user manages multiple services
  if (services.length > 1 && !selectedServiceId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Select Service to Manage</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <div 
              key={service.id} 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setSelectedServiceId(service.id)}
            >
              <div className="flex items-center mb-4">
                <Building className="h-8 w-8 mr-3 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{service.name}</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                  <span className="text-sm text-blue-700 dark:text-blue-300">Category:</span>
                  <span className="ml-2 font-medium">{service.category}</span>
                </div>
                {service.description && (
                  <p className="text-gray-600 dark:text-gray-300">{service.description}</p>
                )}
                <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Manage Service
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <div className="flex space-x-4">
          {services.length > 1 && (
            <select 
              className="px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={selectedServiceId || ''}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              {services.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          )}
          <Link
            to="/admin/analytics"
            className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <BarChart className="h-5 w-5 mr-2" />
            View Analytics
            <ArrowRight className="h-5 w-5 ml-1" />
          </Link>
        </div>
      </div>

      {service && (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {service.name}
            </h2>
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                <span className="text-sm text-blue-700 dark:text-blue-300">Category:</span>
                <span className="ml-2 font-medium">{service.category}</span>
              </div>
              {service.description && (
                <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg">
                  <span className="text-sm text-purple-700 dark:text-purple-300">Description:</span>
                  <span className="ml-2 font-medium">{service.description}</span>
                </div>
              )}
            </div>

            {/* Service Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Specific Service:
              </label>
              <select
                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  const specificService = service.specificServicesData?.[e.target.value];
                  if (specificService) {
                    setTokenFee(specificService.tokenFee || 0);
                  }
                }}
              >
                {service.specificServicesData && Object.keys(service.specificServicesData).map((serviceName) => (
                  <option key={serviceName} value={serviceName}>
                    {serviceName}
                  </option>
                ))}
              </select>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex space-x-8">
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'bookings'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  onClick={() => setActiveTab('bookings')}
                >
                  <Users className="h-5 w-5 inline-block mr-2" />
                  Bookings
                </button>
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'schedule'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  onClick={() => setActiveTab('schedule')}
                >
                  <Calendar className="h-5 w-5 inline-block mr-2" />
                  Schedule
                </button>
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  onClick={() => setActiveTab('settings')}
                >
                  <DollarSign className="h-5 w-5 inline-block mr-2" />
                  Pricing
                </button>
              </nav>
            </div>

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div>
                <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Date:
                    </label>
                    <DatePicker
                      selected={dateFilter}
                      onChange={(date) => setDateFilter(date)}
                      dateFormat="yyyy-MM-dd"
                      className="px-4 py-2 border rounded-lg"
                      isClearable
                      placeholderText="Select date..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Status:
                    </label>
                    <select
                      className="px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search by User ID:
                    </label>
                    <input
                      type="text"
                      className="px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter user ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Bookings Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          User ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Fee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {getFilteredBookings().length > 0 ? (
                        getFilteredBookings().map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {booking.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {booking.time}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {booking.userId.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                booking.status === 'Confirmed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : booking.status === 'Cancelled'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {booking.tokenFee} tokens
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              <div className="flex space-x-2">
                                {booking.status === 'Confirmed' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedBooking(booking);
                                        setRescheduleDate(null);
                                        setRescheduleTime('');
                                      }}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Reschedule"
                                    >
                                      <Edit className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleCancelBooking(booking.id)}
                                      className="text-red-600 hover:text-red-800"
                                      title="Cancel"
                                    >
                                      <XCircle className="h-5 w-5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setSelectedBooking(booking)}
                                  className="text-gray-600 hover:text-gray-800"
                                  title="View Details"
                                >
                                  <Info className="h-5 w-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            No bookings found matching the filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Booking Details / Reschedule Modal */}
                {selectedBooking && (
                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        {rescheduleDate ? 'Reschedule Booking' : 'Booking Details'}
                      </h3>
                      
                      {!rescheduleDate ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">User ID</p>
                              <p className="font-medium">{selectedBooking.userId}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Service</p>
                              <p className="font-medium">{selectedBooking.specificService || selectedService}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                              <p className="font-medium">{selectedBooking.date}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                              <p className="font-medium">{selectedBooking.time}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                              <p className="font-medium">{selectedBooking.status}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Token Fee</p>
                              <p className="font-medium">{selectedBooking.tokenFee} tokens</p>
                            </div>
                            {selectedBooking.wasRescheduled && (
                              <>
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Original Time Slot</p>
                                  <p className="font-medium">{selectedBooking.originalTimeSlot}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Rescheduled</p>
                                  <p className="font-medium">Yes</p>
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="flex justify-end space-x-4 mt-6">
                            {selectedBooking.status === 'Confirmed' && (
                              <>
                                <button
                                  onClick={() => {
                                    setRescheduleDate(new Date());
                                    fetchAvailableSlots(new Date());
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => handleCancelBooking(selectedBooking.id)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                  Cancel Booking
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setSelectedBooking(null)}
                              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Select New Date:
                              </label>
                              <DatePicker
                                selected={rescheduleDate}
                                onChange={(date) => {
                                  setRescheduleDate(date);
                                  if (date) fetchAvailableSlots(date);
                                }}
                                dateFormat="yyyy-MM-dd"
                                className="w-full px-4 py-2 border rounded-lg"
                                minDate={new Date()}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Select New Time:
                              </label>
                              <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                value={rescheduleTime}
                                onChange={(e) => setRescheduleTime(e.target.value)}
                              >
                                <option value="">Select a time...</option>
                                {availableSlots.map(slot => (
                                  <option key={slot} value={slot}>{slot}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex justify-end space-x-4 mt-6">
                            <button
                              onClick={handleRescheduleBooking}
                              disabled={!rescheduleTime}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                              Confirm Reschedule
                            </button>
                            <button
                              onClick={() => {
                                setRescheduleDate(null);
                                setRescheduleTime('');
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Date:
                  </label>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date || new Date())}
                    dateFormat="yyyy-MM-dd"
                    className="px-4 py-2 border rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Time Slot</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Time:
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g. 9:00 AM"
                          value={newTimeSlot}
                          onChange={(e) => setNewTimeSlot(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Capacity:
                        </label>
                        <input
                          type="number"
                          className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                          value={slotCapacity}
                          onChange={(e) => setSlotCapacity(parseInt(e.target.value))}
                        />
                      </div>
                      <button
                        onClick={handleAddTimeSlot}
                        disabled={!newTimeSlot}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                      >
                        Add Time Slot
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Current Time Slots</h3>
                    {Object.keys(timeSlots).length > 0 ? (
                      <div className="space-y-3">
                        {Object.keys(timeSlots).sort().map((time) => (
                          <div key={time} className="flex justify-between items-center bg-white dark:bg-gray-700 p-3 rounded-lg shadow">
                            <div>
                              <span className="font-medium">{time}</span>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {timeSlots[time].booked} / {timeSlots[time].capacity} booked
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteTimeSlot(time)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">
                        No time slots available for this date.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'settings' && (
              <div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Token Fee Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Token Fee Amount:
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        value={tokenFee}
                        onChange={(e) => setTokenFee(parseInt(e.target.value))}
                      />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        This is the number of tokens that will be charged for each booking.
                      </p>
                    </div>
                    <button
                      onClick={handleUpdateTokenFee}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Update Token Fee
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;