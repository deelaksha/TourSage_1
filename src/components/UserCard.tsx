'use client';
import Link from 'next/link';

interface UserCardProps {
  email: string;
}

export default function UserCard({ email }: UserCardProps) {
  return (
    <Link 
      href={`/messaging/chat/${encodeURIComponent(email)}`}
      className="flex items-center p-3 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
        {email.charAt(0).toUpperCase()}
      </div>
      <div className="ml-3">
        <p className="font-medium text-gray-900">{email}</p>
        <p className="text-sm text-gray-500">Click to chat</p>
      </div>
    </Link>
  );
}