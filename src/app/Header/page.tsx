'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../firebase/config'
import { onAuthStateChanged, signOut } from 'firebase/auth'

export default function Header() {
  const [userName, setUserName] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user?.displayName || 'User')
      } else {
        setUserName(null)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOut(auth)
      router.push('../messaging/login')
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="container mx-auto flex justify-between items-center px-4 py-4">
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => router.push('/')}
        >
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-xl">💬</span>
          </div>
          <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 text-transparent bg-clip-text">
            Find Chat
          </span>
        </div>

        <div className="flex items-center gap-4">
          {userName && (
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                <span className="text-sm font-bold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-gray-300 font-medium">
                Hello, {userName}
              </span>
            </div>
          )}

          {/* Create Post Button */}
          {userName && (
            <button
              onClick={() => router.push('/posts/create')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              + Create Post
            </button>
          )}

          {/* Logout Button */}
          {userName && (
  <>
    {/* Chat Menu Button */}
    <button
      onClick={() => router.push('/messaging/chat')}
      className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-medium rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
    >
      💬 Chat
    </button>

    {/* Create Post Button */}
    <button
      onClick={() => router.push('/posts/create')}
      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
    >
      + Create Post
    </button>

    {/* Logout Button */}
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-medium rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center space-x-1"
    >
      {isLoggingOut ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <>
          <span>Logout</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </>
      )}
    </button>
  </>
)}

        </div>
      </div>
    </header>
  )
}
