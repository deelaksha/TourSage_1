'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/firebase/firestore';
import LocationPicker from '@/components/LocationPicker';

export default function PostForm() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const router = useRouter();
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  const handleSubmit = async () => {
    if (!name || !message) return alert('Please fill in all fields.');
    if (!location || location.lat === 0 || location.lng === 0)
      return alert('Please pick a location before submitting');
  
    try {
      await createPost({
        name,
        message,
        latitude: location.lat,
        longitude: location.lng,
        createdBy: user.email,
        timestamp: new Date(),
      });
      router.push('/');
    } catch (error) {
      console.error('Post creation failed:', error);
      alert('Failed to create post. Try again.');
    }
  };
  
  return (
    <div className="p-4 max-w-md mx-auto">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="w-full mb-2 px-4 py-2 border rounded"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message"
        className="w-full mb-2 px-4 py-2 border rounded"
      />
      <LocationPicker onPick={(lat, lng) => setLocation({ lat, lng })} />
      <button
        onClick={handleSubmit}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Submit
      </button>
    </div>
  );
}
