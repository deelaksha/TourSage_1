'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '../../../firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await signInWithGoogle();
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/');
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      {/* Background pattern overlay */}
      <div className="fixed inset-0 bg-gray-900 z-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="z-10 w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-xl shadow-xl border border-gray-700">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="mt-2 text-gray-400">Sign in to connect with others</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full px-6 py-3 flex items-center justify-center space-x-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-medium rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
          
          {error && (
            <div className="p-3 text-sm text-red-300 bg-red-900 bg-opacity-20 border border-red-800 rounded-lg">
              {error}
            </div>
          )}
        </div>
        
        <div className="pt-4 text-center border-t border-gray-700">
          <p className="text-sm text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
      
      <div className="mt-8 text-center text-gray-500 text-sm z-10">
        &copy; {new Date().getFullYear()} Your Messaging App
      </div>
    </div>
  );
}