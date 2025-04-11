'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPostById } from '../../../firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import Header from '@/app/Header/page';

interface Event {
  id: string;
  eventName: string;
  startDate: string;
  endDate: string;
  textMessage: string;
  voiceMessage: string;
  images: string[];
  latitude: number;
  longitude: number;
  createdBy: string;
  creatorName: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
  categories: string[];
}

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventId = params.id as string;
        const eventData = await getPostById(eventId);
        if (eventData) {
          setEvent(eventData as Event);
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params.id]);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Function to calculate distance in kilometers
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)} meters`;
    } else {
      const km = Math.floor(distance);
      const meters = Math.round((distance - km) * 1000);
      return `${km}km ${meters}m`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">Event not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <div className="fixed inset-0 bg-gray-900 z-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <main className="container mx-auto px-4 py-8 z-10 relative">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">{event?.eventName}</h1>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
              >
                Back
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center text-gray-400 text-sm">
                <span>Created by: {event?.creatorName || event?.createdBy?.split('@')[0] || 'User'}</span>
                <span className="mx-2">•</span>
                <span>From: {event ? new Date(event.startDate).toLocaleDateString() : ''}</span>
                <span className="mx-2">•</span>
                <span>To: {event ? new Date(event.endDate).toLocaleDateString() : ''}</span>
              </div>

              {/* Categories Section */}
              {event.categories && event.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.categories.map((category, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-600/20 text-purple-400 text-sm rounded-full"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}

              {event.textMessage && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h2 className="text-xl font-semibold mb-2 text-white">Description</h2>
                  <p className="text-gray-300 whitespace-pre-wrap">{event.textMessage}</p>
                </div>
              )}

              {event.voiceMessage && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h2 className="text-xl font-semibold mb-2 text-white">Voice Message</h2>
                  <audio controls className="w-full">
                    <source src={event.voiceMessage} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {event.images && event.images.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h2 className="text-xl font-semibold mb-4 text-white">Images</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {event.images.map((imageUrl, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={imageUrl}
                          alt={`Event image ${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-700 rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2 text-white">Location</h2>
                {userLocation && event?.latitude && event?.longitude ? (
                  <p className="text-gray-300 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {calculateDistance(userLocation.lat, userLocation.lng, event.latitude, event.longitude)} from you
                  </p>
                ) : (
                  <p className="text-gray-300">Location information available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 