'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { startPeriodicCleanup } from '../firebase/firestore';
import Header from '@/app/Header/page';
import Image from 'next/image';
import EventMap from './components/EventMap';

interface Post {
  docId: string;
  eventName?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  textMessage?: string;
  message?: string;
  voiceMessage?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  createdBy?: string;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
  distance?: string;
  [key: string]: any;
}

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
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Initialize periodic cleanup
    startPeriodicCleanup();

    // Check for success parameter
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      // Remove the success parameter from URL
      router.replace('/');
      // Hide success message after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else {
        // Type-safe property access with optional chaining and fallbacks
        setCurrentUserName(user?.displayName || user?.email || 'User');
        setCurrentUserEmail(user?.email || null);
      }
    });

    const fetchPosts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'posts'));
        const postList: Post[] = querySnapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data()
        }));

        // Filter out posts only if we have current user email
        const filteredPosts = currentUserEmail
          ? postList.filter((post) => post.createdBy && post.createdBy !== currentUserEmail)
          : postList;

        // Calculate distances if user location is available
        const postsWithDistances = userLocation
          ? filteredPosts.map(post => ({
              ...post,
              distance: post.latitude && post.longitude
                ? calculateDistance(userLocation.lat, userLocation.lng, post.latitude, post.longitude)
                : undefined
            }))
          : filteredPosts;

        setPosts(postsWithDistances);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch posts regardless of user email status
    fetchPosts();

    return () => unsubscribe();
  }, [router, searchParams]);

  // Function to calculate distance
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers

    // Format distance
    if (distance < 1) {
      return `${Math.round(distance * 1000)} meters`;
    } else {
      const km = Math.floor(distance);
      const meters = Math.round((distance - km) * 1000);
      return `${km}km ${meters}m`;
    }
  };

  // Get user's current location
  useEffect(() => {
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

  // Update posts with distances when user location changes
  useEffect(() => {
    if (userLocation) {
      setPosts(prevPosts => 
        prevPosts.map(post => ({
          ...post,
          distance: post.latitude && post.longitude
            ? calculateDistance(userLocation.lat, userLocation.lng, post.latitude, post.longitude)
            : undefined
        }))
      );
    }
  }, [userLocation]);

  // Safely handle the email parameter
  const openChatWithUser = (userEmail: string | undefined) => {
    if (userEmail) {
      router.push(`/messaging/chat/${encodeURIComponent(userEmail)}`);
    } else {
      console.error("Cannot open chat: no email provided");
    }
  };

  const EventCard = ({ event }: { event: Post }) => {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);

    const handleCardClick = (e: React.MouseEvent) => {
      // Prevent navigation if clicking on the chat button
      if ((e.target as HTMLElement).closest('button')) {
        return;
      }
      router.push(`/events/${event.docId}`);
    };

    const handleChatClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsChatOpen(true);
      // Redirect to chat page instead of showing modal
      router.push(`/messaging/chat/${encodeURIComponent(event.createdBy || '')}`);
    };

    // Check if current user is the event creator
    const isEventCreator = currentUserEmail === event.createdBy;

    return (
      <div 
        className="bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        <div className="relative h-48">
          {event.images && event.images.length > 0 && !imageError ? (
            <Image
              src={event.images[0]}
              alt={event.eventName || 'Untitled Event'}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">No Image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-xl font-bold text-white">{event.eventName || 'Untitled Event'}</h3>
            <p className="text-gray-300 text-sm mt-1">
              {new Date(event.startDate || '').toLocaleDateString()} - {new Date(event.endDate || '').toLocaleDateString()}
            </p>
            {event.distance && (
              <p className="text-gray-300 text-sm mt-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.distance} away
              </p>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-gray-300 line-clamp-2">{event.textMessage || event.message || ''}</p>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {event.createdBy?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <span className="text-gray-400 text-sm">{event.createdBy || 'Anonymous'}</span>
            </div>
            
            {!isEventCreator && (
              <button
                onClick={handleChatClick}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors duration-300"
              >
                Chat
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Post created successfully!
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        {/* Map Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Event Locations</h2>
          <EventMap 
            events={posts.map(post => ({
              id: post.docId,
              eventName: post.eventName || 'Unnamed Event',
              latitude: post.latitude || 0,
              longitude: post.longitude || 0,
              createdBy: post.createdBy || 'Anonymous',
              imageUrl: post.images?.[0] || null,
              distance: post.distance
            }))}
          />
        </div>

        {/* Events Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <EventCard key={post.docId} event={post} />
          ))}
        </div>
      </div>
    </div>
  );
}