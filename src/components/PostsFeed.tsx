'use client';
import { useEffect, useState } from 'react';
import { fetchPosts } from '../firebase/firestore';
import PostCard from './PostCard';
import { PostType } from '../app/types';

export default function PostsFeed() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts()
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
        } else {
          setError('Invalid data received');
        }
      })
      .catch((err) => {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts');
      });
  }, []);

  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div>
      {posts.length === 0 ? (
        <div className="p-4 text-gray-500">No posts yet.</div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}
