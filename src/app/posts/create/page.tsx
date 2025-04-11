'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '../../../firebase/firestore';
import LocationPicker from '../../../components/LocationPicker';

export default function CreatePostPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [textMessage, setTextMessage] = useState('');
  const [voiceMessage, setVoiceMessage] = useState<Blob | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Client-side only code
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
    setIsLoading(false);
  }, [router]);

  const startRecording = async () => {
    try {
      // Stop any existing recording first
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }

      // Clean up previous recording
      if (voiceMessage) {
        URL.revokeObjectURL(URL.createObjectURL(voiceMessage));
        setVoiceMessage(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setVoiceMessage(audioBlob);
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      
      // Check each image size
      const oversizedImages = newImages.filter(file => file.size > 1024 * 1024); // 1MB in bytes
      
      if (oversizedImages.length > 0) {
        setError(`The following images exceed 1MB limit: ${oversizedImages.map(img => img.name).join(', ')}`);
        return;
      }
      
      setImages([...images, ...newImages]);
      setError(null);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError('Start date cannot be in the past');
      return;
    }

    // If end date is already set and is before the new start date, clear it
    if (endDate && new Date(endDate) < selectedDate) {
      setEndDate('');
    }

    setStartDate(e.target.value);
    setError(null);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const startDateObj = new Date(startDate);

    if (selectedDate < startDateObj) {
      setError('End date must be after start date');
      return;
    }

    setEndDate(e.target.value);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!user || !user.email) {
      setError('Please log in to create an event');
      router.push('/login');
      return;
    }

    if (!eventName || !startDate || !endDate || (!textMessage && !voiceMessage)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!location || location.lat === 0 || location.lng === 0) {
      setError('Please pick a location before submitting.');
      return;
    }

    const totalSize = images.reduce((total, file) => total + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      setError('Total size of all images cannot exceed 10MB');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      const postData = {
        eventName,
        startDate,
        endDate,
        textMessage,
        voiceMessage,
        images,
        latitude: location.lat,
        longitude: location.lng,
        createdBy: user.email,
        userId: user.uid,
      };

      await createPost(postData);
      // Redirect to home page with success parameter
      router.push('/?success=true');
    } catch (error: any) {
      console.error('Post creation failed:', error);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to create events. Please log in again.');
        router.push('/login');
      } else if (error.code === 'unauthenticated') {
        setError('Please log in to create an event');
        router.push('/login');
      } else {
        setError('Failed to create post. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
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

  if (!user) {
    return null; // Will be redirected by useEffect
  }

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
              Create a New Event
            </h1>
            <p className="text-gray-200 mt-1">Share your event with the community</p>
          </div>
          
          <div className="bg-gray-800 rounded-b-lg shadow-xl border border-gray-700 p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-900 bg-opacity-20 border border-red-800 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-900 bg-opacity-20 border border-green-800 rounded-lg text-green-300 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="eventName" className="block text-sm font-medium text-gray-300">Event Name*</label>
              <input
                id="eventName"
                type="text"
                placeholder="Enter event name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-300">Start Date*</label>
                <input
                  id="startDate"
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  value={startDate}
                  onChange={handleStartDateChange}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-300">End Date*</label>
                <input
                  id="endDate"
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  value={endDate}
                  onChange={handleEndDateChange}
                  min={startDate || new Date().toISOString().slice(0, 16)}
                  disabled={!startDate}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="textMessage" className="block text-sm font-medium text-gray-300">Text Message</label>
              <textarea
                id="textMessage"
                placeholder="What would you like to share?"
                rows={5}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 resize-none"
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Voice Message</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-4 py-2 rounded-lg ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  } text-white transition-colors duration-300`}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                {voiceMessage && (
                  <audio controls className="flex-1">
                    <source src={URL.createObjectURL(voiceMessage)} type="audio/wav" />
                  </audio>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Upload Images
                <span className="text-xs text-gray-400 ml-2">(Max 1MB per image, 10MB total)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
              />
              {images.length > 0 && (
                <div className="mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            const newImages = [...images];
                            newImages.splice(index, 1);
                            setImages(newImages);
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                          {(image.size / 1024).toFixed(1)}KB
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Total size: {(images.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)}MB
                  </div>
                </div>
              )}
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
                disabled={isSubmitting || !eventName || !startDate || !endDate || (!textMessage && !voiceMessage) || location.lat === 0}
                className={`px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50
                  ${(!eventName || !startDate || !endDate || (!textMessage && !voiceMessage) || location.lat === 0)
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
                    <span>Publish Event</span>
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