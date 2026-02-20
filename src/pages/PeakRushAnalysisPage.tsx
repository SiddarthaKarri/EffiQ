import React, { useEffect, useState } from 'react';
import { Search, MapPin, Clock, ChevronRight, LineChart, ArrowUpRight, Calendar, Users, ShoppingBag, CloudRain, History, Star, Navigation } from 'lucide-react';
import { collection, query, getDocs, getDoc, where, orderBy, limit } from 'firebase/firestore';
import { db } from "../firebaseConfig";

interface Mall {
  id: string;
  name: string;
  location: string;
  image: string;
  averageWaitTime: number;
  currentCrowdLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface PeakHourData {
  hour: number;
  crowdLevel: number;
  waitTimeMinutes: number;
  day: string;
}

interface HistoricalData {
  date: string;
  day: string;
  hour: number;
  visitors: number;
  purchases: number;
  averageStayMinutes: number;
  weatherCondition: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  date: string;
}

interface WeekdayData {
  day: string;
  averageCrowdLevel: number;
  peakHour: number;
}

// Mall Map Component
const MallMap = ({ latitude, longitude, name }: { latitude: number; longitude: number; name: string }) => {
  useEffect(() => {
    // Create map only on client-side
    if (typeof window !== 'undefined') {
      const mapContainer = document.getElementById('mall-map');
      
      if (mapContainer) {
        // Clear previous content
        mapContainer.innerHTML = '';
        
        // Create map placeholder with location pin
        const mapContent = document.createElement('div');
        mapContent.style.position = 'relative';
        mapContent.style.width = '100%';
        mapContent.style.height = '100%';
        
        // Create coordinates display
        const coordsDisplay = document.createElement('div');
        coordsDisplay.style.position = 'absolute';
        coordsDisplay.style.top = '10px';
        coordsDisplay.style.right = '10px';
        coordsDisplay.style.background = 'rgba(255,255,255,0.8)';
        coordsDisplay.style.padding = '5px';
        coordsDisplay.style.borderRadius = '4px';
        coordsDisplay.style.zIndex = '1';
        coordsDisplay.style.fontSize = '12px';
        coordsDisplay.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        
        // Create location pin
        const pin = document.createElement('div');
        pin.style.position = 'absolute';
        pin.style.top = '50%';
        pin.style.left = '50%';
        pin.style.transform = 'translate(-50%, -50%)';
        
        const pinDot = document.createElement('div');
        pinDot.style.width = '20px';
        pinDot.style.height = '20px';
        pinDot.style.backgroundColor = '#ef4444';
        pinDot.style.borderRadius = '50%';
        pinDot.style.position = 'relative';
        
        const pinTail = document.createElement('div');
        pinTail.style.position = 'absolute';
        pinTail.style.bottom = '0';
        pinTail.style.left = '50%';
        pinTail.style.transform = 'translateX(-50%) translateY(100%)';
        pinTail.style.width = '0';
        pinTail.style.height = '0';
        pinTail.style.borderLeft = '8px solid transparent';
        pinTail.style.borderRight = '8px solid transparent';
        pinTail.style.borderTop = '12px solid #ef4444';
        
        pinDot.appendChild(pinTail);
        pin.appendChild(pinDot);
        
        // Create location name display
        const nameDisplay = document.createElement('div');
        nameDisplay.style.position = 'absolute';
        nameDisplay.style.bottom = '10px';
        nameDisplay.style.left = '10px';
        nameDisplay.style.background = 'rgba(255,255,255,0.8)';
        nameDisplay.style.padding = '5px';
        nameDisplay.style.borderRadius = '4px';
        nameDisplay.style.fontWeight = 'bold';
        nameDisplay.textContent = name;
        
        // Append all elements
        mapContent.appendChild(coordsDisplay);
        mapContent.appendChild(pin);
        mapContent.appendChild(nameDisplay);
        mapContainer.appendChild(mapContent);
        
        // Set a map-like background
        mapContainer.style.backgroundImage = `url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${longitude},${latitude},13,0/600x400@2x?access_token=pk.placeholder')`;
        mapContainer.style.backgroundSize = 'cover';
        mapContainer.style.backgroundPosition = 'center';
      }
    }
  }, [latitude, longitude, name]);

  return (
    <div id="mall-map" className="h-48 w-full rounded-lg overflow-hidden">
      {/* Map will be rendered here by the useEffect */}
    </div>
  );
};

const PeakRushAnalysisPage = () => {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [filteredMalls, setFilteredMalls] = useState<Mall[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMall, setSelectedMall] = useState<Mall | null>(null);
  const [peakHourData, setPeakHourData] = useState<PeakHourData[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [weekdayData, setWeekdayData] = useState<WeekdayData[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'historical' | 'reviews' | 'weekly'>('today');
  const [currentDay, setCurrentDay] = useState<string>('');

  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setCurrentDay(days[new Date().getDay()]);

    const fetchMalls = async () => {
      try {
        setLoading(true);
        const mallsRef = collection(db, 'malls');
        const mallsSnapshot = await getDocs(mallsRef);

        const mallsList: Mall[] = [];

        if (!mallsSnapshot.empty) {
          mallsSnapshot.forEach((document) => {
            const data = document.data();

            if (data &&
              typeof data.name === 'string' &&
              typeof data.location === 'string' &&
              typeof data.averageWaitTime === 'number' &&
              typeof data.currentCrowdLevel === 'string') {

              const mall: Mall = {
                id: document.id,
                name: data.name,
                location: data.location,
                image: data.image || "/api/placeholder/400/200",
                averageWaitTime: data.averageWaitTime,
                currentCrowdLevel: data.currentCrowdLevel as 'Low' | 'Moderate' | 'High' | 'Very High'
              };

              // Add coordinates if available
              if (data.coordinates &&
                typeof data.coordinates.latitude === 'number' &&
                typeof data.coordinates.longitude === 'number') {
                mall.coordinates = {
                  latitude: data.coordinates.latitude,
                  longitude: data.coordinates.longitude
                };
              }

              mallsList.push(mall);
            }
          });
        }

        setMalls(mallsList);
        setFilteredMalls(mallsList);
      } catch (error) {
        console.error('Error fetching malls:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMalls();
  }, []);

  useEffect(() => {
    // Filter malls based on search query
    if (searchQuery.trim() === '') {
      setFilteredMalls(malls);
    } else {
      const filtered = malls.filter(mall =>
        mall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mall.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMalls(filtered);
    }
  }, [searchQuery, malls]);

  const handleMallSelect = async (mall: Mall) => {
    setSelectedMall(mall);

    try {
      // Fetch peak hour data for the selected mall for the current day
      const peakHoursRef = collection(db, 'malls', mall.id, 'peakHours');
      const dayQuery = query(
        peakHoursRef,
        where('day', '==', currentDay),
        orderBy('hour', 'asc')
      );

      const peakHoursSnapshot = await getDocs(dayQuery);

      const peakHoursData: PeakHourData[] = [];
      if (!peakHoursSnapshot.empty) {
        peakHoursSnapshot.forEach((doc) => {
          const data = doc.data();
          peakHoursData.push({
            hour: data.hour,
            crowdLevel: data.crowdLevel,
            waitTimeMinutes: data.waitTimeMinutes || Math.round(data.crowdLevel * 2.5), // Estimate if not available
            day: data.day
          });
        });
      }
      setPeakHourData(peakHoursData);

      // Fetch historical data
      const historicalRef = collection(db, 'malls', mall.id, 'historicalData');
      const historicalQuery = query(
        historicalRef,
        orderBy('date', 'desc'),
        limit(10)
      );

      const historicalSnapshot = await getDocs(historicalQuery);

      const historicalDataList: HistoricalData[] = [];
      if (!historicalSnapshot.empty) {
        historicalSnapshot.forEach((doc) => {
          const data = doc.data();
          historicalDataList.push({
            date: data.date,
            day: data.day,
            hour: data.hour,
            visitors: data.visitors,
            purchases: data.purchases,
            averageStayMinutes: data.averageStayMinutes,
            weatherCondition: data.weatherCondition
          });
        });
      }
      setHistoricalData(historicalDataList);

      // Fetch reviews
      const reviewsRef = collection(db, 'malls', mall.id, 'reviews');
      const reviewsQuery = query(
        reviewsRef,
        orderBy('date', 'desc'),
        limit(5)
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);

      const reviewsList: Review[] = [];
      if (!reviewsSnapshot.empty) {
        reviewsSnapshot.forEach((doc) => {
          const data = doc.data();
          reviewsList.push({
            id: doc.id,
            rating: data.rating,
            comment: data.comment,
            userName: data.userName,
            date: data.date
          });
        });
      }
      setReviews(reviewsList);

      // Fetch weekly data
      const weekdayDataList: WeekdayData[] = [];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      for (const day of days) {
        const dayQuery = query(
          peakHoursRef,
          where('day', '==', day)
        );

        const daySnapshot = await getDocs(dayQuery);

        if (!daySnapshot.empty) {
          // Calculate average crowd level for this day
          let totalCrowdLevel = 0;
          let peakHour = 0;
          let peakCrowdLevel = 0;

          daySnapshot.forEach((doc) => {
            const data = doc.data();
            totalCrowdLevel += data.crowdLevel;

            if (data.crowdLevel > peakCrowdLevel) {
              peakCrowdLevel = data.crowdLevel;
              peakHour = data.hour;
            }
          });

          weekdayDataList.push({
            day,
            averageCrowdLevel: totalCrowdLevel / daySnapshot.size,
            peakHour
          });
        }
      }

      setWeekdayData(weekdayDataList);

    } catch (error) {
      console.error('Error fetching mall data:', error);
      setPeakHourData([]);
      setHistoricalData([]);
      setReviews([]);
      setWeekdayData([]);
    }
  };

  const getCrowdLevelColor = (level: string | number) => {
    if (typeof level === 'string') {
      switch (level) {
        case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'Moderate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
        case 'High': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
        case 'Very High': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      }
    } else {
      // For numerical crowd levels (1-10)
      if (level <= 3) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      if (level <= 6) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      if (level <= 8) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0 || hour === 24) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  const getBestTimeToVisit = () => {
    if (!peakHourData.length) return 'N/A';

    // Find the hour with the lowest crowd level
    const bestTime = peakHourData.reduce((best, current) =>
      current.crowdLevel < best.crowdLevel ? current : best
    );

    return formatHour(bestTime.hour);
  };

  const getPeakHours = () => {
    if (!peakHourData.length) return 'N/A';

    // Find hours with crowd level > 7 (on a scale of 1-10)
    const peakHours = peakHourData
      .filter(hour => hour.crowdLevel >= 7)
      .map(hour => formatHour(hour.hour))
      .join(', ');

    return peakHours || 'No significant peak hours';
  };

  const getAverageRating = () => {
    if (!reviews.length) return 'N/A';

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / reviews.length).toFixed(1);
  };

  const getConversionRate = () => {
    if (!historicalData.length) return 'N/A';

    const totalVisitors = historicalData.reduce((sum, data) => sum + data.visitors, 0);
    const totalPurchases = historicalData.reduce((sum, data) => sum + data.purchases, 0);

    return totalVisitors > 0 ? `${((totalPurchases / totalVisitors) * 100).toFixed(1)}%` : '0%';
  };

  const getAverageStayDuration = () => {
    if (!historicalData.length) return 'N/A';

    const totalStayTime = historicalData.reduce((sum, data) => sum + data.averageStayMinutes, 0);
    return `${Math.round(totalStayTime / historicalData.length)} mins`;
  };

  const getWeatherImpact = () => {
    if (!historicalData.length) return 'N/A';

    // Group by weather condition
    const weatherGroups: Record<string, { visitors: number, count: number }> = {};

    historicalData.forEach(data => {
      if (!weatherGroups[data.weatherCondition]) {
        weatherGroups[data.weatherCondition] = { visitors: 0, count: 0 };
      }

      weatherGroups[data.weatherCondition].visitors += data.visitors;
      weatherGroups[data.weatherCondition].count += 1;
    });

    // Find weather with highest average visitors
    let bestWeather = '';
    let highestAvg = 0;

    Object.entries(weatherGroups).forEach(([weather, stats]) => {
      const avg = stats.visitors / stats.count;
      if (avg > highestAvg) {
        highestAvg = avg;
        bestWeather = weather;
      }
    });

    return bestWeather || 'No significant impact';
  };

  const renderTodayTab = () => {
    return (
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <LineChart className="h-5 w-5 mr-2" />
          Today's Crowd Forecast
        </h3>

        {peakHourData.length > 0 ? (
          <div className="space-y-3">
            {peakHourData.map((hourData) => (
              <div key={hourData.hour} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {formatHour(hourData.hour)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Wait: ~{hourData.waitTimeMinutes} mins
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${hourData.crowdLevel <= 3 ? 'bg-green-500' :
                        hourData.crowdLevel <= 6 ? 'bg-yellow-500' :
                          hourData.crowdLevel <= 8 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                    style={{ width: `${hourData.crowdLevel * 10}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No forecast data available</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            AI Prediction Insights
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Based on historical data and current trends, this mall is expected to experience
            {selectedMall?.currentCrowdLevel === 'High' || selectedMall?.currentCrowdLevel === 'Very High'
              ? ' high traffic throughout the afternoon'
              : ' moderate traffic with peak hours around lunch and evening'
            }.
            Plan your visit accordingly to minimize wait times.
          </p>
        </div>
      </div>
    );
  };

  const renderHistoricalTab = () => {
    return (
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <History className="h-5 w-5 mr-2" />
          Historical Analytics
        </h3>

        {historicalData.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Average Stay Duration</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{getAverageStayDuration()}</p>
              </div>
              <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Conversion Rate</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{getConversionRate()}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Weather Impact</h4>
              <div className="flex items-center">
                <CloudRain className="h-6 w-6 text-blue-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Highest Traffic During</p>
                  <p className="text-gray-600 dark:text-gray-300">{getWeatherImpact()}</p>
                </div>
              </div>
            </div>

            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-2">Recent Historical Data</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visitors</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purchases</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weather</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                  {historicalData.map((data, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{data.date}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{formatHour(data.hour)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{data.visitors}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{data.purchases}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{data.weatherCondition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No historical data available</p>
          </div>
        )}
      </div>
    );
  };

  const renderReviewsTab = () => {
    return (
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2" />
          Customer Reviews
        </h3>

        {reviews.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{getAverageRating()}</div>
                <div className="ml-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${parseFloat(getAverageRating()) >= star
                            ? 'text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                          }`}
                        fill={parseFloat(getAverageRating()) >= star ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Based on {reviews.length} reviews</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{review.userName.charAt(0)}</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{review.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{review.date}</p>
                      </div>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${review.rating >= star
                              ? 'text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                            }`}
                          fill={review.rating >= star ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No reviews available</p>
          </div>
        )}
      </div>
    );
  };

  const renderWeeklyTab = () => {
    return (
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Weekly Patterns
        </h3>

        {weekdayData.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Crowd Levels by Day</h4>

              <div className="space-y-3">
                {weekdayData.sort((a, b) => {
                  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  return days.indexOf(a.day) - days.indexOf(b.day);
                }).map((data) => (
                  <div key={data.day} className="flex items-center">
                    <div className="w-24 text-sm text-gray-600 dark:text-gray-300">{data.day}</div>
                    <div className="flex-1 mx-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${data.averageCrowdLevel <= 3 ? 'bg-green-500' :
                              data.averageCrowdLevel <= 6 ? 'bg-yellow-500' :
                                data.averageCrowdLevel <= 8 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                          style={{ width: `${data.averageCrowdLevel * 10}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-sm text-gray-500 dark:text-gray-400 text-right">
                      {data.averageCrowdLevel.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Peak Hours by Day</h4>

              <div className="space-y-3">
                {weekdayData.sort((a, b) => {
                  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  return days.indexOf(a.day) - days.indexOf(b.day);
                }).map((data) => (
                  <div key={data.day} className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{data.day}</div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {formatHour(data.peakHour)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Weekly Insights
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Based on the data, the lowest crowd levels are typically on
                {weekdayData.length > 0
                  ? ` ${weekdayData.reduce((min, day) => day.averageCrowdLevel < min.averageCrowdLevel ? day : min).day}`
                  : ' weekdays'
                }.
                For a more pleasant shopping experience, consider visiting during weekday mornings.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No weekly pattern data available</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container px-4 mx-auto max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Mall Peak Rush Analysis</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Find the best time to visit your favorite shopping centers and avoid the crowds.
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Search malls by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nearby Malls</h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : filteredMalls.length > 0 ? (
            <div className="space-y-4">
              {filteredMalls.map((mall) => (
                <div
                  key={mall.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedMall?.id === mall.id
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                    }`}
                  onClick={() => handleMallSelect(mall)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{mall.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span>{mall.location}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        ~{mall.averageWaitTime} min wait
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getCrowdLevelColor(mall.currentCrowdLevel)}`}>
                      {mall.currentCrowdLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No malls found matching your search.</p>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          {selectedMall ? (
            <div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                {/* Show map at the top when coordinates are available */}
                {selectedMall.coordinates ? (
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                    <MallMap
                      latitude={selectedMall.coordinates.latitude}
                      longitude={selectedMall.coordinates.longitude}
                      name={selectedMall.name}
                    />
                  </div>
                ) : null}

                {/* Always show the mall image */}
                <div className="h-64 bg-gray-200 dark:bg-gray-700 relative">
                  <img
                    src={selectedMall.image}
                    alt={selectedMall.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedMall.name}</h2>
                      <div className="flex items-center text-gray-600 dark:text-gray-300 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{selectedMall.location}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCrowdLevelColor(selectedMall.currentCrowdLevel)}`}>
                      {selectedMall.currentCrowdLevel} Traffic
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="flex items-center">
                        <Navigation className="text-blue-500 h-5 w-5 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Best Time to Visit</h3>
                      </div>
                      <p className="text-xl font-semibold text-blue-600 dark:text-blue-400 mt-1">{getBestTimeToVisit()}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                      <div className="flex items-center">
                        <Users className="text-orange-500 h-5 w-5 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Peak Hours</h3>
                      </div>
                      <p className="text-xl font-semibold text-orange-600 dark:text-orange-400 mt-1">{getPeakHours()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'today'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    onClick={() => setActiveTab('today')}
                  >
                    Today
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'weekly'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    onClick={() => setActiveTab('weekly')}
                  >
                    Weekly
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'historical'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    onClick={() => setActiveTab('historical')}
                  >
                    Analytics
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'reviews'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    onClick={() => setActiveTab('reviews')}
                  >
                    Reviews
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                {activeTab === 'today' && renderTodayTab()}
                {activeTab === 'historical' && renderHistoricalTab()}
                {activeTab === 'reviews' && renderReviewsTab()}
                {activeTab === 'weekly' && renderWeeklyTab()}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center h-96">
              <div className="text-gray-400 mb-4">
                <ShoppingBag size={64} />
              </div>
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Mall</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Choose a mall from the list to view crowd analysis and find the best time to visit.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeakRushAnalysisPage;