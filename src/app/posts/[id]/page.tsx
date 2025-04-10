'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPostById } from '../../../firebase/firestore';
import { PostType } from '../../types';

export default function PostDetailsPage() {
  const params = useParams();
  const postId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [post, setPost] = useState<PostType | null>(null);

  useEffect(() => {
    if (postId) {
      getPostById(postId).then((data) => {
        setPost(data as PostType);
      });
    }
  }, [postId]);

  if (!post) {
    return <div className="p-6 text-center">Loading post...</div>;
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{post.name}</h1>
      <p className="mb-4">{post.message}</p>
      <p className="text-sm text-gray-600">Posted by: {post.createdBy}</p>
      <p className="text-sm text-gray-600">Lat: {post.latitude} | Lng: {post.longitude}</p>
    </div>
  );
}
