"use client";

import { useRouter } from 'next/navigation';
import EventForm from '@/app/components/EventForm';

export default function CreateEventPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/events');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EventForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
} 