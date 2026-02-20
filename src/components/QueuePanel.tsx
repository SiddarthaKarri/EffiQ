import React, { useState, useEffect } from "react";
import { Users, Clock } from "lucide-react";

const services = {
  "City Hospital": { queueMin: 15, queueMax: 40, waitMin: 10, waitMax: 30, servedMin: 100, servedMax: 300 },
  "Fine Dining Restaurant": { queueMin: 5, queueMax: 20, waitMin: 5, waitMax: 20, servedMin: 50, servedMax: 150 },
  "Government Office": { queueMin: 10, queueMax: 35, waitMin: 15, waitMax: 40, servedMin: 80, servedMax: 250 },
} as const; // 🔹 This ensures TypeScript treats the keys as string literals

// 🔹 Define a type for services' keys
type ServiceType = keyof typeof services;

const getRandomValue = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const QueuePanel = () => {
  const [selectedService, setSelectedService] = useState<ServiceType>("City Hospital"); // 🔹 Define state with correct type
  const [queueData, setQueueData] = useState({ queue: 0, wait: 0, served: 0 });

  const updateQueueData = (service: ServiceType) => {
    const { queueMin, queueMax, waitMin, waitMax, servedMin, servedMax } = services[service];
    setQueueData({
      queue: getRandomValue(queueMin, queueMax),
      wait: getRandomValue(waitMin, waitMax),
      served: getRandomValue(servedMin, servedMax),
    });
  };

  useEffect(() => {
    updateQueueData(selectedService);
  }, [selectedService]);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Live Queue Status</h3>

            {/* Dropdown for Service Selection */}
            <select
              className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as ServiceType)}
            >
              {Object.keys(services).map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>

          {/* Queue Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">Current Queue</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{queueData.queue}</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                <span className="ml-2 text-sm text-green-600 dark:text-green-400">Average Wait Time</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{queueData.wait} min</p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <span className="ml-2 text-sm text-purple-600 dark:text-purple-400">Served Today</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{queueData.served}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QueuePanel;
