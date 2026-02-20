import React from 'react';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 transform transition-all hover:scale-105 hover:shadow-lg">
      <div className="text-blue-600 dark:text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
      <button className="mt-4 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
        Learn More →
      </button>
    </div>
  );
};

export default ServiceCard;