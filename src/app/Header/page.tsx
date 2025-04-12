'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../../firebase/config'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore'

export default function Header() {
  const [userName, setUserName] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user?.displayName || 'User')
        // Clean up previous listener if it exists
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
        }
        // Set up new real-time listener for unread messages
        unsubscribeRef.current = setupUnreadMessagesListener(user.uid)
      } else {
        setUserName(null)
        setUnreadCount(0)
        // Clean up listener when user logs out
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
          unsubscribeRef.current = null
        }
      }
    })

    // Clean up auth listener and message listener on component unmount
    return () => {
      unsubscribe()
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  const setupUnreadMessagesListener = (userId: string) => {
    const messagesRef = collection(db, 'messages')
    const q = query(
      messagesRef,
      where('receiverId', '==', userId),
      where('read', '==', false)
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Only update if there are actual unread messages
      const count = snapshot.size
      if (count !== unreadCount) {
        setUnreadCount(count)
      }
    }, (error) => {
      console.error('Error listening to unread messages:', error)
      setUnreadCount(0)
    })

    return unsubscribe
  }

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
            Tour Sages
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

          {/* Chat Icon with Badge */}
          {userName && (
            <div className="relative w-12 h-12 flex items-center justify-center">
              <button
                onClick={() => router.push('/messaging/chat')}
                className="w-full h-full flex items-center justify-center text-gray-300 hover:text-white transition-colors duration-300"
                title="Messages"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>
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
          )}
        </div>
      </div>
    </header>
  )
}
