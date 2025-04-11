'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Header from '@/app/Header/page';

interface Event {
  docId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  textMessage?: string;
  voiceMessage?: string;
  images?: string[];
  createdBy: string;
  name?: string;
  [key: string]: any;
}

export default function EventDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, 'posts', params.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEvent({
            docId: docSnap.id,
            ...docSnap.data()
          });
        } else {
          setError('Event not found');
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        setError('Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">{error || 'Event not found'}</p>
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
              <h1 className="text-3xl font-bold text-white">{event.eventName}</h1>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
              >
                Back
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 text-gray-300">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Start: {new Date(event.startDate).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>End: {new Date(event.endDate).toLocaleString()}</span>
                </div>
              </div>

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
                    {event.images.map((image, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={image}
                          alt={`Event image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {event.name && typeof event.name === 'string' ? event.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{event.name || 'Anonymous'}</p>
                    <p className="text-gray-400 text-sm">{event.createdBy}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => router.push(`/messaging/chat/${encodeURIComponent(event.createdBy)}`)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 rounded-lg text-white font-medium"
                >
                  Chat with Organizer
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 