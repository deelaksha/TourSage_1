'use client';
import Link from 'next/link';
import { PostType } from '../app/types';

export default function PostCard({ post }: { post: PostType }) {
  return (
    <div className="p-4 border rounded shadow-sm mb-4 bg-white">
      <h2 className="text-xl font-semibold">{post.name}</h2>
      <p className="text-gray-600">{post.message}</p>
      <p className="text-sm text-gray-400">Lat: {post.latitude}, Lng: {post.longitude}</p>
      <Link href={`/posts/${post.id}`} className="mt-2 inline-block text-blue-500">Message Creator</Link>
    </div>
  );
}