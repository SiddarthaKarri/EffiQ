import React, { useState, useEffect } from 'react';
import { AlertCircle, Shield, Navigation, Clock, User, MapPin } from 'lucide-react';
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from 'react-router-dom';

const EmergencyBookingPage = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [nearbyFacilities, setNearbyFacilities] = useState<string[]>([]);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [formData, setFormData] = useState({
    reason: '',
    details: '',
    contact: '',
    bookingFor: 'self',
  });

  // Fetch user data
  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
          setFormData(prev => ({
            ...prev,
            contact: docSnap.data().phone || ''
          }));
        }
      };
      fetchUserData();
    }
  }, [user]);

  // Mock facilities based on detected location and service type
  useEffect(() => {
    if (location && selectedService) {
      const mockFacilitiesMap = {
        'Fire': ['City Fire Station', 'Suburban Fire Department', 'Volunteer Fire Brigade'],
        'Medical': ['City General Hospital', 'Emergency Medical Center', 'Specialty Care Hospital', 'Community Health Center'],
        'Police': ['City Police Station', 'Highway Patrol', 'Local Precinct', 'Sheriff Department'],
        'Other': ['Emergency Response Team', 'Disaster Management', 'Civil Defense']
      };
      
      setNearbyFacilities(mockFacilitiesMap[selectedService as keyof typeof mockFacilitiesMap] || []);
    }
  }, [location, selectedService]);

  const handleServiceClick = (service: string) => {
    setSelectedService(service);
  };

  const handleLocationDetection = async () => {
    setLoadingLocation(true);
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setLoadingLocation(false);
      return;
    }
    
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoordinates({ lat, lng });
          
          // Reverse geocoding to get address from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setLocation(address);
          } catch (error) {
            // Fallback to coordinates if geocoding fails
            setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
          setLoadingLocation(false);
        },
        (error) => {
          alert(`Error getting location: ${error.message}`);
          setLoadingLocation(false);
        }
      );
    } catch (error) {
      alert("Failed to get your location");
      setLoadingLocation(false);
    }
  };

  const generateBookingReference = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `EMG-${result}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to book an emergency service");
      navigate("/login");
      return;
    }
    
    if (!selectedService || !location || !formData.reason || !formData.contact) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (!selectedFacility && nearbyFacilities.length > 0) {
      alert("Please select a facility");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Current date and time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Set fee based on bookingFor value
      const emergencyFee = formData.bookingFor === 'self' ? 100 : 0;
      
      // Create booking object
      const bookingRef = generateBookingReference();
      
      const bookingData = {
        service: selectedService,
        specificService: formData.reason,
        facility: selectedFacility || "Nearest Available",
        date: dateStr,
        time: timeStr,
        location: location,
        coordinates: coordinates,
        status: "In Progress",
        tokenFee: emergencyFee,
        referenceNumber: bookingRef,
        details: formData.details,
        contact: formData.contact,
        bookingFor: formData.bookingFor,
        timestamp: serverTimestamp(),
        userId: user.uid,
        emergency: true
      };
      
      // Add to bookings collection
      const bookingsCollectionRef = collection(db, "bookings");
      const newBookingRef = await addDoc(bookingsCollectionRef, bookingData);
      
      // Create a copy of booking data without serverTimestamp for arrayUnion
      const bookingDataForUser = {
        ...bookingData,
        id: newBookingRef.id,
        timestamp: new Date().toISOString() // Use string timestamp instead of serverTimestamp()
      };
      
      // Add to user's booking history
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        bookingHistory: arrayUnion(bookingDataForUser)
      });
      
      // Set booking details for confirmation screen
      setBookingDetails({
        ...bookingData,
        id: newBookingRef.id
      });
      
      setBookingComplete(true);
      setIsLoading(false);
    } catch (error: any) {
      alert(`Error booking emergency service: ${error.message}`);
      setIsLoading(false);
    }
  };

  const getEmergencyOptions = () => {
    switch (selectedService) {
      case 'Fire':
        return (
          <>
            <option value="">Select reason</option>
            <option value="lifeThreat">Life Threat</option>
            <option value="propertyThreat">Property Threat</option>
            <option value="gasLeak">Gas Leak</option>
            <option value="explosion">Explosion</option>
            <option value="other">Other</option>
          </>
        );
      case 'Medical':
        return (
          <>
            <option value="">Select reason</option>
            <option value="breathing">Breathing Problems</option>
            <option value="heartProblem">Heart Problem</option>
            <option value="bleeding">Severe Bleeding</option>
            <option value="injury">Major Injury</option>
            <option value="unconscious">Unconsciousness</option>
            <option value="pregnant">Pregnant Lady</option>
            <option value="other">Other</option>
          </>
        );
      case 'Police':
        return (
          <>
            <option value="">Select reason</option>
            <option value="theft">Theft</option>
            <option value="accident">Accident</option>
            <option value="violence">Violence</option>
            <option value="lifeThreat">Life Threat</option>
            <option value="suspicious">Suspicious Activity</option>
            <option value="other">Other</option>
          </>
        );
      default:
        return (
          <>
            <option value="">Select reason</option>
            <option value="natural">Natural Disaster</option>
            <option value="utility">Utility Emergency</option>
            <option value="other">Other</option>
          </>
        );
    }
  };

  // Booking confirmation screen
  if (bookingComplete && bookingDetails) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Emergency Service Booked
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Your emergency request has been submitted and is being processed with top priority
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-8">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                Reference Number: {bookingDetails.referenceNumber}
              </h3>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              Help is on the way. Expected response time: 5-15 minutes
            </p>
          </div>

          <div className="space-y-6 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Booking Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Service Type</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{bookingDetails.service} Emergency</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Specific Issue</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{bookingDetails.specificService}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Facility Assigned</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{bookingDetails.facility}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date & Time</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{bookingDetails.date} at {bookingDetails.time}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{bookingDetails.location}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  {bookingDetails.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Emergency Fee</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">₹{bookingDetails.tokenFee}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <button
              onClick={() => navigate("/profile")}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              View in Booking History
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Service selection screen
  if (!selectedService) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Emergency Services</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['Fire', 'Medical', 'Police', 'Other'].map((service) => (
              <div
                key={service}
                className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                onClick={() => handleServiceClick(service)}
              >
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 ml-3">{service} Emergency</h2>
                </div>
                <p className="text-red-800 dark:text-red-300 mt-2">Click to proceed with {service.toLowerCase()} emergency booking.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Booking form
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center mb-6">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 ml-3">
            {selectedService} Emergency Booking
          </h1>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-8">
          <p className="text-red-800 dark:text-red-300 text-sm">
            This form is for {selectedService.toLowerCase()} emergency situations only. Your request will be prioritized and processed immediately.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your location"
                required
              />
              <button
                type="button"
                onClick={handleLocationDetection}
                disabled={loadingLocation}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors flex items-center"
              >
                {loadingLocation ? (
                  <span>Detecting...</span>
                ) : (
                  <>
                    <Navigation className="h-5 w-5 mr-2" />
                    Detect GPS
                  </>
                )}
              </button>
            </div>
            {coordinates.lat !== 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Emergency Reason <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              >
                {getEmergencyOptions()}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Details
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="Provide additional details about the emergency"
                rows={3}
              ></textarea>
            </div>

            {nearbyFacilities.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nearest Facilities <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700"
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  required
                >
                  <option value="">Select facility</option>
                  {nearbyFacilities.map((facility, index) => (
                    <option key={index} value={facility}>
                      {facility}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Emergency Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="Enter your contact number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Booking For
              </label>
              <div className="flex items-center space-x-4">
                <div
                  className={`flex-1 border rounded-lg p-4 cursor-pointer ${
                    formData.bookingFor === 'self'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onClick={() => setFormData({ ...formData, bookingFor: 'self' })}
                >
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-500" />
                    <span>For Yourself</span>
                  </div>
                </div>
                <div
                  className={`flex-1 border rounded-lg p-4 cursor-pointer ${
                    formData.bookingFor === 'someoneElse'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onClick={() => setFormData({ ...formData, bookingFor: 'someoneElse' })}
                >
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-blue-500" />
                    <span>For Someone Else</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Priority Processing
                </h3>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Emergency bookings receive immediate attention with an estimated 80% reduction in wait time. 
                {formData.bookingFor === 'self' ? 
                  ' A token fee of ₹100 will be applied for emergency services.' : 
                  ' No token fee will be applied for emergency services booked for someone else.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Submit Emergency Request
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmergencyBookingPage;