'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { startPeriodicCleanup } from '../firebase/firestore';
import Header from '@/app/Header/page';
import Image from 'next/image';

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

        setPosts(filteredPosts);
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

  // Safely handle the email parameter
  const openChatWithUser = (userEmail: string | undefined) => {
    if (userEmail) {
      router.push(`/messaging/chat/${encodeURIComponent(userEmail)}`);
    } else {
      console.error("Cannot open chat: no email provided");
    }
  };

  const EventCard = ({ event }: { event: Event }) => {
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
      router.push(`/events/${event.id}`);
    };

    const handleChatClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsChatOpen(true);
      // Redirect to chat page instead of showing modal
      router.push(`/messaging/chat/${encodeURIComponent(event.createdBy)}`);
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
              alt={event.eventName}
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
            <h3 className="text-xl font-bold text-white">{event.eventName}</h3>
            <p className="text-gray-300 text-sm mt-1">
              {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-gray-300 line-clamp-2">{event.textMessage}</p>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {event.createdBy.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-gray-400 text-sm">{event.createdBy}</span>
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
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Header />
      
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-900 bg-opacity-90 border border-green-800 rounded-lg p-4 text-green-300 flex items-center gap-2 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Event created successfully!</span>
          </div>
        </div>
      )}

      {/* Background pattern overlay */}
      <div className="fixed inset-0 bg-gray-900 z-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <main className="flex-grow container mx-auto px-4 py-8 z-10 relative">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome{currentUserName ? `, ${currentUserName}` : ''} 👋
            </h1>
            <p className="text-gray-200 mt-2">
              {/* Connect with other users and start chatting */}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <EventCard 
                  key={post.docId} 
                  event={{
                    id: post.docId,
                    eventName: post.eventName || post.title || 'Untitled Event',
                    startDate: post.startDate || new Date().toISOString(),
                    endDate: post.endDate || new Date().toISOString(),
                    textMessage: post.textMessage || post.message || '',
                    voiceMessage: post.voiceMessage || '',
                    images: post.images || [],
                    latitude: post.latitude || 0,
                    longitude: post.longitude || 0,
                    createdBy: post.createdBy || 'Anonymous',
                    userId: post.userId || '',
                    createdAt: post.createdAt || new Date(),
                    updatedAt: post.updatedAt || new Date()
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
              <h3 className="text-xl font-medium text-gray-300">No events available</h3>
              <p className="text-gray-400 mt-2">Check back later for new events</p>
            </div>
          )}
        </div>
      </main>

      
    </div>
  );
}