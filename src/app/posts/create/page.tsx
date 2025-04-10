'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '../../../firebase/firestore';
import LocationPicker from '../../../components/LocationPicker';

export default function CreatePostPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Safely access localStorage only on client side
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });

  const handleSubmit = async () => {
    if (!name || !message || !title) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!location || location.lat === 0 || location.lng === 0) {
      setError('Please pick a location before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await createPost({
        name,
        title,
        message,
        latitude: location.lat,
        longitude: location.lng,
        createdBy: user.email,
        timestamp: new Date(),
      });
      
      router.push('/');
    } catch (error) {
      console.error('Post creation failed:', error);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Background pattern overlay */}
      <div className="fixed inset-0 bg-gray-900 z-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-lg p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Create a New Post
            </h1>
            <p className="text-gray-200 mt-1">Share your thoughts with the community</p>
          </div>
          
          <div className="bg-gray-800 rounded-b-lg shadow-xl border border-gray-700 p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-900 bg-opacity-20 border border-red-800 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Your Name*</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-300">Post Title*</label>
              <input
                id="title"
                type="text"
                placeholder="Give your post a title"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="message" className="block text-sm font-medium text-gray-300">Message*</label>
              <textarea
                id="message"
                placeholder="What would you like to share?"
                rows={5}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Location*</label>
              <div className="bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
                <LocationPicker onPick={(lat, lng) => setLocation({ lat, lng })} />
              </div>
              <p className="text-xs text-gray-400">
                {location.lat !== 0 && location.lng !== 0 
                  ? `Selected: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` 
                  : 'Click on the map to select your location'}
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors duration-300"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !name || !title || !message || location.lat === 0}
                className={`px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50
                  ${(!name || !title || !message || location.lat === 0)
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600'}`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Publish Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}