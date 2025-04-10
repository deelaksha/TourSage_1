'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import Header from '@/app/Header/page';

interface Post {
  docId: string;
  title?: string;
  message?: string;
  name?: string;
  createdBy?: string;
  [key: string]: any;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Handle auth state and redirect to login if not authenticated
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Type-safe property access with optional chaining and fallbacks
        setCurrentUserName(user?.displayName || user?.email || 'User');
        setCurrentUserEmail(user?.email || null);
      } else {
        router.push('/messaging/login'); // Auto-redirect if user is not logged in
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
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
  }, [currentUserEmail]);

  // Safely handle the email parameter
  const openChatWithUser = (userEmail: string | undefined) => {
    if (userEmail) {
      router.push(`/messaging/chat/${encodeURIComponent(userEmail)}`);
    } else {
      console.error("Cannot open chat: no email provided");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Header />
      
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
              {posts.map((post, index) => (
                <div 
                  key={post.docId || `post-${index}`}
                  className="bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-700"
                >
                  <div className="p-5">
                    <h2 className="text-xl font-semibold mb-2 text-white">{post.title || 'Untitled'}</h2>
                    <p className="text-gray-300 mb-4 line-clamp-3">{post.message || 'No message content'}</p>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                          <span className="text-sm font-bold">
                            {post.name && typeof post.name === 'string' ? post.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                        <span className="ml-2 text-gray-400">{post.name || 'Anonymous'}</span>
                      </div>
                      
                      <button
                        onClick={() => post.createdBy ? openChatWithUser(post.createdBy) : null}
                        disabled={!post.createdBy}
                        className={`px-4 py-2 rounded-lg text-white font-medium transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50
                          ${post.createdBy 
                            ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600' 
                            : 'bg-gray-600 cursor-not-allowed'}`}
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
              <h3 className="text-xl font-medium text-gray-300">No posts available</h3>
              <p className="text-gray-400 mt-2">Check back later for new content</p>
            </div>
          )}
        </div>
      </main>

      
    </div>
  );
}