import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebaseConfig';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Calendar,
  ArrowLeft,
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  BarChart2,
  Clock,
  User,
  Filter,
  Download,
  Activity
} from 'lucide-react';
import { format, subDays, parseISO, differenceInDays, addDays } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

// Type definitions
interface TimeSlot {
  capacity: number;
  booked: number;
}

interface TimeSlots {
  [time: string]: TimeSlot;
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
  cancelledAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  cancelledBy?: string;
  rescheduledAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  rescheduledBy?: string;
}

interface SpecificService {
  name: string;
  tokenFee: number;
  availableDates: string[];
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

interface ChartDataItem {
  name: string;
  value: number;
  pv?: number;
  amt?: number;
  fill?: string;
}

interface UserStats {
  userId: string;
  bookingsCount: number;
  totalSpent: number;
  rescheduledCount: number;
  cancelledCount: number;
  lastBookingDate: string;
}

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId: string }>();
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(serviceId || null);
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedService, setSelectedService] = useState('');
  
  // Date filters
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([subDays(new Date(), 30), new Date()]);
  const [startDate, endDate] = dateRange;
  
  // Chart data
  const [bookingsByDate, setBookingsByDate] = useState<ChartDataItem[]>([]);
  const [bookingsByStatus, setBookingsByStatus] = useState<ChartDataItem[]>([]);
  const [bookingsByTime, setBookingsByTime] = useState<ChartDataItem[]>([]);
  const [occupancyData, setOccupancyData] = useState<ChartDataItem[]>([]);
  const [revenueData, setRevenueData] = useState<ChartDataItem[]>([]);
  const [topUsers, setTopUsers] = useState<UserStats[]>([]);
  
  // Analytics metrics
  const [totalBookings, setTotalBookings] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);
  const [cancelledBookings, setCancelledBookings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageBookingsPerDay, setAverageBookingsPerDay] = useState(0);
  const [rescheduledRate, setRescheduledRate] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const STATUS_COLORS = {
    'Confirmed': '#4CAF50',
    'Cancelled': '#F44336',
    'Completed': '#2196F3',
    'Pending': '#FFC107'
  };

  useEffect(() => {
    const fetchAdminServices = async () => {
      try {
        setLoading(true);
        if (user) {
          const servicesRef = collection(db, 'services');
          const servicesSnap = await getDocs(servicesRef);
          
          const adminServices: Service[] = [];
          
          servicesSnap.forEach(doc => {
            const serviceData = doc.data() as Omit<Service, 'id'>;
            
            if (serviceData.adminId && serviceData.adminId.includes(user.uid)) {
              adminServices.push({
                id: doc.id,
                ...serviceData
              });
            }
          });
          
          setServices(adminServices);
          
          if (!selectedServiceId && adminServices.length > 0) {
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
  }, [user, selectedServiceId]);

  useEffect(() => {
    const loadServiceDetails = async () => {
      if (!selectedServiceId) return;
      
      try {
        setLoading(true);
        
        const serviceRef = doc(db, 'services', selectedServiceId);
        const serviceSnap = await getDoc(serviceRef);
        
        if (serviceSnap.exists()) {
          const serviceData = { id: serviceSnap.id, ...serviceSnap.data() } as Service;
          
          const specificServicesRef = collection(db, `services/${serviceSnap.id}/specificServices`);
          const specificServicesSnap = await getDocs(specificServicesRef);

          const specificServicesData: { [key: string]: SpecificService } = {};
          specificServicesSnap.docs.forEach(doc => {
            specificServicesData[doc.id] = doc.data() as SpecificService;
          });

          setService({
            ...serviceData,
            specificServicesData
          });

          if (specificServicesSnap.docs.length > 0) {
            setSelectedService(specificServicesSnap.docs[0].id);
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

  // Fetch all bookings for the selected service
  useEffect(() => {
    const fetchAllBookings = async () => {
      if (!service) return;
      
      try {
        setLoading(true);
        const allBookingsData: Booking[] = [];
        
        // Fetch bookings for each specific service
        if (service.specificServicesData) {
          for (const [serviceName, _] of Object.entries(service.specificServicesData)) {
            const bookingsRef = collection(db, `services/${service.id}/specificServices/${serviceName}/bookings`);
            const bookingsSnap = await getDocs(bookingsRef);
            
            bookingsSnap.forEach(doc => {
              allBookingsData.push({ 
                id: doc.id,
                specificService: serviceName,
                ...doc.data() 
              } as Booking);
            });
          }
        }
        
        setAllBookings(allBookingsData);
        
        // If a specific service is selected, filter bookings
        if (selectedService) {
          const filteredBookings = allBookingsData.filter(
            booking => booking.specificService === selectedService
          );
          setBookings(filteredBookings);
        } else {
          setBookings(allBookingsData);
        }
        
      } catch (error) {
        console.error('Error fetching all bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllBookings();
  }, [service, selectedService]);

  // Apply date filter and update analytics
  useEffect(() => {
    if (!bookings.length) return;
    
    // Filter bookings by date range
    const filteredBookings = bookings.filter(booking => {
      const bookingDate = booking.date;
      return (!startDate || bookingDate >= format(startDate, 'yyyy-MM-dd')) && 
             (!endDate || bookingDate <= format(endDate, 'yyyy-MM-dd'));
    });

    // Update metrics
    setTotalBookings(filteredBookings.length);
    setCompletedBookings(filteredBookings.filter(b => b.status === 'Completed').length);
    setCancelledBookings(filteredBookings.filter(b => b.status === 'Cancelled').length);
    
    const revenue = filteredBookings
      .filter(b => b.status !== 'Cancelled')
      .reduce((sum, booking) => sum + booking.tokenFee, 0);
    setTotalRevenue(revenue);
    
    const rescheduled = filteredBookings.filter(b => b.wasRescheduled).length;
    setRescheduledRate(filteredBookings.length > 0 ? (rescheduled / filteredBookings.length) * 100 : 0);
    
    // Calculate average bookings per day
    if (startDate && endDate) {
      const days = differenceInDays(endDate, startDate) + 1;
      setAverageBookingsPerDay(days > 0 ? filteredBookings.length / days : 0);
    }
    
    // Generate chart data
    generateBookingsByDateChart(filteredBookings);
    generateBookingsByStatusChart(filteredBookings);
    generateBookingsByTimeChart(filteredBookings);
    generateOccupancyChart(filteredBookings);
    generateRevenueChart(filteredBookings);
    generateTopUsers(filteredBookings);
    
  }, [bookings, startDate, endDate]);

  // Generate charts data functions
  const generateBookingsByDateChart = (filteredBookings: Booking[]) => {
    if (!startDate || !endDate) return;
    
    const dateMap = new Map<string, number>();
    
    // Initialize all dates in the range
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      dateMap.set(dateStr, 0);
      currentDate = addDays(currentDate, 1);
    }
    
    // Count bookings per date
    filteredBookings.forEach(booking => {
      if (dateMap.has(booking.date)) {
        dateMap.set(booking.date, (dateMap.get(booking.date) || 0) + 1);
      }
    });
    
    // Convert to chart data format
    const chartData: ChartDataItem[] = Array.from(dateMap.entries()).map(([date, count]) => ({
      name: format(parseISO(date), 'MMM dd'),
      value: count
    }));
    
    // Sort by date
    chartData.sort((a, b) => {
      const dateA = parseISO(a.name);
      const dateB = parseISO(b.name);
      return dateA.getTime() - dateB.getTime();
    });
    
    setBookingsByDate(chartData);
  };

  const generateBookingsByStatusChart = (filteredBookings: Booking[]) => {
    const statusMap = new Map<string, number>();
    
    // Count bookings by status
    filteredBookings.forEach(booking => {
      const status = booking.status || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    
    // Convert to chart data
    const chartData: ChartDataItem[] = Array.from(statusMap.entries()).map(([status, count]) => ({
      name: status,
      value: count,
      fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#999'
    }));
    
    setBookingsByStatus(chartData);
  };

  const generateBookingsByTimeChart = (filteredBookings: Booking[]) => {
    const timeMap = new Map<string, number>();
    
    // Count bookings by time slot
    filteredBookings.forEach(booking => {
      const time = booking.time || 'Unknown';
      timeMap.set(time, (timeMap.get(time) || 0) + 1);
    });
    
    // Convert to chart data
    const chartData: ChartDataItem[] = Array.from(timeMap.entries())
      .map(([time, count]) => ({
        name: time,
        value: count
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    setBookingsByTime(chartData);
  };

  const generateOccupancyChart = async (filteredBookings: Booking[]) => {
    if (!service || !selectedService) return;
    
    try {
      const occupancyData: ChartDataItem[] = [];
      const dateSet = new Set<string>();
      
      // Get unique dates from bookings
      filteredBookings.forEach(booking => dateSet.add(booking.date));
      
      // For each date, calculate occupancy
      for (const dateString of dateSet) {
        const timeSlotsRef = doc(db, `services/${service.id}/specificServices/${selectedService}/timeSlots`, dateString);
        const timeSlotsSnap = await getDoc(timeSlotsRef);
        
        if (timeSlotsSnap.exists()) {
          const timeSlots = timeSlotsSnap.data() as TimeSlots;
          let totalCapacity = 0;
          let totalBooked = 0;
          
          Object.values(timeSlots).forEach(slot => {
            totalCapacity += slot.capacity;
            totalBooked += slot.booked;
          });
          
          const occupancyRate = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;
          
          occupancyData.push({
            name: format(parseISO(dateString), 'MMM dd'),
            value: Math.round(occupancyRate)
          });
        }
      }
      
      // Sort by date
      occupancyData.sort((a, b) => {
        const dateA = new Date(a.name);
        const dateB = new Date(b.name);
        return dateA.getTime() - dateB.getTime();
      });
      
      setOccupancyData(occupancyData);
      
      // Calculate overall occupancy rate
      if (occupancyData.length > 0) {
        const avgOccupancy = occupancyData.reduce((sum, item) => sum + item.value, 0) / occupancyData.length;
        setOccupancyRate(avgOccupancy);
      }
    } catch (error) {
      console.error('Error generating occupancy chart:', error);
    }
  };

  const generateRevenueChart = (filteredBookings: Booking[]) => {
    if (!startDate || !endDate) return;
    
    const revenueMap = new Map<string, number>();
    
    // Initialize all dates in the range
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      revenueMap.set(dateStr, 0);
      currentDate = addDays(currentDate, 1);
    }
    
    // Sum revenue per date
    filteredBookings
      .filter(b => b.status !== 'Cancelled')
      .forEach(booking => {
        if (revenueMap.has(booking.date)) {
          revenueMap.set(booking.date, (revenueMap.get(booking.date) || 0) + booking.tokenFee);
        }
      });
    
    // Convert to chart data
    const chartData: ChartDataItem[] = Array.from(revenueMap.entries()).map(([date, tokens]) => ({
      name: format(parseISO(date), 'MMM dd'),
      value: tokens
    }));
    
    // Sort by date
    chartData.sort((a, b) => {
      const dateA = parseISO(a.name);
      const dateB = parseISO(b.name);
      return dateA.getTime() - dateB.getTime();
    });
    
    setRevenueData(chartData);
  };

  const generateTopUsers = (filteredBookings: Booking[]) => {
    const userMap = new Map<string, UserStats>();
    
    // Process each booking to gather user statistics
    filteredBookings.forEach(booking => {
      const { userId, tokenFee, status, wasRescheduled, date } = booking;
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          bookingsCount: 0,
          totalSpent: 0,
          rescheduledCount: 0,
          cancelledCount: 0,
          lastBookingDate: ''
        });
      }
      
      const userStats = userMap.get(userId)!;
      userStats.bookingsCount += 1;
      
      if (status !== 'Cancelled') {
        userStats.totalSpent += tokenFee;
      }
      
      if (wasRescheduled) {
        userStats.rescheduledCount += 1;
      }
      
      if (status === 'Cancelled') {
        userStats.cancelledCount += 1;
      }
      
      // Update last booking date if this one is more recent
      if (!userStats.lastBookingDate || date > userStats.lastBookingDate) {
        userStats.lastBookingDate = date;
      }
    });
    
    // Convert to array and sort by total spent
    const sortedUsers = Array.from(userMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10); // Top 10 users
    
    setTopUsers(sortedUsers);
  };

  // Handle service change
  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newServiceId = e.target.value;
    setSelectedServiceId(newServiceId);
  };

  // Handle specific service change
  const handleSpecificServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedService(e.target.value);
    
    // Filter bookings for the selected specific service
    if (e.target.value) {
      const filteredBookings = allBookings.filter(
        booking => booking.specificService === e.target.value
      );
      setBookings(filteredBookings);
    } else {
      setBookings(allBookings);
    }
  };

  // Function to export data as CSV
  const exportDataAsCSV = () => {
    if (!bookings.length) return;
    
    // Filter bookings by date range
    const filteredBookings = bookings.filter(booking => {
      const bookingDate = booking.date;
      return (!startDate || bookingDate >= format(startDate, 'yyyy-MM-dd')) && 
             (!endDate || bookingDate <= format(endDate, 'yyyy-MM-dd'));
    });
    
    // Create CSV header
    let csv = 'Date,Time,User ID,Status,Token Fee,Rescheduled,Service\n';
    
    // Add each booking as a row
    filteredBookings.forEach(booking => {
      const row = [
        booking.date,
        booking.time,
        booking.userId,
        booking.status,
        booking.tokenFee,
        booking.wasRescheduled ? 'Yes' : 'No',
        booking.specificService || selectedService
      ].join(',');
      
      csv += row + '\n';
    });
    
    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `bookings_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                You are not an administrator for any services.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        </div>
        <div className="flex space-x-4">
          {services.length > 1 && (
            <select 
              className="px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={selectedServiceId || ''}
              onChange={handleServiceChange}
            >
              {services.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {service && (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {service.name} - Analytics
                </h2>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Category:</span>
                    <span className="ml-2 font-medium">{service.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Service:
                  </label>
                  <select
                    className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={selectedService}
                    onChange={handleSpecificServiceChange}
                  >
                    <option value="">All Services</option>
                    {service.specificServicesData && Object.keys(service.specificServicesData).map((serviceName) => (
                      <option key={serviceName} value={serviceName}>
                        {serviceName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Range:
                  </label>
                  <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => setDateRange(update)}
                    dateFormat="yyyy-MM-dd"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex flex-wrap space-x-8">
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  onClick={() => setActiveTab('overview')}
                >
                  <BarChartIcon className="h-5 w-5 inline-block mr-2" />
                  Overview
                </button>
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'bookings'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  onClick={() => setActiveTab('bookings')}
                >
                  <Users className="h-5 w-5 inline-block mr-2" />
                  Booking Analytics
                </button>
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'revenue'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  onClick={() => setActiveTab('revenue')}
                >
                  <DollarSign className="h-5 w-5 inline-block mr-2" />
                  Revenue
                </button>
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'customers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  onClick={() => setActiveTab('customers')}
                >
                  <User className="h-5 w-5 inline-block mr-2" />
                  Customer Insights
                </button>
                <button
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'export'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  onClick={() => setActiveTab('export')}
                >
                  <Download className="h-5 w-5 inline-block mr-2" />
                  Export Data
                </button>
              </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* KPI Cards */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                        <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bookings</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalBookings}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Avg. {averageBookingsPerDay.toFixed(1)} per day</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                        <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRevenue} tokens</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Avg. {totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(1) : '0'} tokens per booking
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full">
                        <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : '0'}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {completedBookings} completed / {totalBookings} total
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cancellation Rate</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : '0'}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {cancelledBookings} cancelled bookings
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Bookings by Date Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bookings by Date</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bookingsByDate}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3B82F6" name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Bookings by Status Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bookings by Status</h3>
                    <div className="h-80 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={bookingsByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {bookingsByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Occupancy Rate Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Occupancy Rate</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={occupancyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                          <Tooltip formatter={(value) => [`${value}%`, 'Occupancy']} />
                          <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Average Occupancy Rate: <span className="font-semibold">{occupancyRate.toFixed(1)}%</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Bookings by Time Slot */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bookings by Time Slot</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bookingsByTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8884d8" name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Booking Analytics Tab */}
            {activeTab === 'bookings' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* KPI Cards for Booking Analytics */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                        <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : '0'}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full">
                        <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rescheduled Rate</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{rescheduledRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cancellation Rate</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : '0'}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bookings by Date Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bookings by Date</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bookingsByDate}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3B82F6" name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Bookings by Status Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bookings by Status</h3>
                    <div className="h-80 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={bookingsByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {bookingsByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Revenue Tab */}
            {activeTab === 'revenue' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {/* KPI Cards for Revenue */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                        <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRevenue} tokens</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                        <BarChart2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Revenue per Booking</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(1) : '0'} tokens
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                        <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Daily Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {startDate && endDate ? (totalRevenue / (differenceInDays(endDate, startDate) + 1)).toFixed(1) : '0'} tokens
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Revenue</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} tokens`, 'Revenue']} />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="Revenue (tokens)" stroke="#10B981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            
            {/* Customer Insights Tab */}
            {activeTab === 'customers' && (
              <div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Customers</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            User ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Total Bookings
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Total Spent
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Rescheduled
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Cancelled
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Last Booking
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {topUsers.map((user, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {user.userId.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {user.bookingsCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {user.totalSpent} tokens
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {user.rescheduledCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {user.cancelledCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {format(parseISO(user.lastBookingDate), 'MMM dd, yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Export Data Tab */}
            {activeTab === 'export' && (
              <div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Data</h3>
                  
                  <div className="mb-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Export booking data for the selected date range as a CSV file.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Date Range:
                        </label>
                        <DatePicker
                          selectsRange={true}
                          startDate={startDate}
                          endDate={endDate}
                          onChange={(update) => setDateRange(update)}
                          dateFormat="yyyy-MM-dd"
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      
                      <button
                        onClick={exportDataAsCSV}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center sm:self-end"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Export to CSV
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">Export Contents:</h4>
                    <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
                      <li>Date and time of each booking</li>
                      <li>User ID</li>
                      <li>Booking status</li>
                      <li>Token fee</li>
                      <li>Whether the booking was rescheduled</li>
                      <li>Service name</li>
                    </ul>
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

export default AdminAnalytics;