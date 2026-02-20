import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Clock, Users, Guitar as Hospital, Utensils, Building2, AlertCircle, ChevronRight } from 'lucide-react';
import QueuePanel from '../components/QueuePanel';
import ServiceCard from '../components/ServiceCard';

const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Smart Queue Management
              <span className="text-blue-600 dark:text-blue-400"> Made Simple</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Skip the wait. Book your slot in advance and track real-time queue status.
            </p>
            <Link
              to="/booking"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transform transition hover:scale-105"
            >
              Book a Slot
            </Link>
          </div>
        </div>
      </section>

      {/* Real-time Queue Panel */}
      <QueuePanel />

      {/* Service Categories */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard
              icon={<Hospital className="h-8 w-8" />}
              title="Hospitals"
              description="Skip hospital queues and get priority medical attention"
            />
            <ServiceCard
              icon={<Utensils className="h-8 w-8" />}
              title="Restaurants"
              description="Reserve your table and avoid waiting in line"
            />
            <ServiceCard
              icon={<Building2 className="h-8 w-8" />}
              title="Government Offices"
              description="Schedule appointments for official documentation"
            />
          </div>
        </div>
      </section>

      {/* Emergency Booking CTA */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 ml-3">Emergency Fast-Track</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Need immediate attention? Use our priority-based fast-track booking for emergencies.
            </p>
            <Link
              to="/emergency-booking"
              className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Book Emergency Slot
              <ChevronRight className="h-5 w-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>
      {/* Admin Panel */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Panel</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/admin">
          <ServiceCard
            icon={<Sun className="h-8 w-8" />}
            title="Dashboard"
            description="Monitor real-time queue status and analytics"
          />
        </Link>
        <Link to="/admin/analytics">
          <ServiceCard
            icon={<Clock className="h-8 w-8" />}
            title="Queue Tracking"
            description="Track queue status and manage customer flow"
          />
        </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;