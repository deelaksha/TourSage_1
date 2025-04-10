'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../../firebase/config'
import { collection, getDocs, query, doc, getDoc, setDoc, orderBy, where } from 'firebase/firestore'
import Header from '@/app/Header/page'

interface UserEntry {
  email: string
  displayName: string
  lastMessage?: string
  timestamp?: Date
  unread?: number
  status?: string
  photoURL?: string
}

export default function ChatListPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userList, setUserList] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email)
        setUserName(user.displayName || user.email?.split('@')[0] || 'User')

        // Save current user info to Firestore
        await setDoc(doc(db, 'users', user.email!), {
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          status: 'online',
          lastSeen: new Date(),
        }, { merge: true })

        await fetchUserList(user.email!)
        setLoading(false)
      } else {
        // Redirect to login if not authenticated
        router.push('/messaging/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchUserList = async (currentEmail: string) => {
    try {
      const messagesRef = collection(db, 'messages')
      const q = query(messagesRef)
      const snapshot = await getDocs(q)

      const uniqueEmails = new Map<string, { lastMessage: string; timestamp: Date }>()

      snapshot.forEach((doc) => {
        const data = doc.data()
        const timestamp = data.timestamp?.toDate() || new Date(0)
        
        if (data.sender === currentEmail) {
          // If we haven't seen this receiver yet, or this message is newer
          if (!uniqueEmails.has(data.receiver) || 
              timestamp > uniqueEmails.get(data.receiver)!.timestamp) {
            uniqueEmails.set(data.receiver, {
              lastMessage: data.message,
              timestamp
            })
          }
        } else if (data.receiver === currentEmail) {
          // If we haven't seen this sender yet, or this message is newer
          if (!uniqueEmails.has(data.sender) || 
              timestamp > uniqueEmails.get(data.sender)!.timestamp) {
            uniqueEmails.set(data.sender, {
              lastMessage: data.message,
              timestamp
            })
          }
        }
      })

      const emailList: UserEntry[] = []

      for (const [email, messageData] of uniqueEmails.entries()) {
        const userDoc = await getDoc(doc(db, 'users', email))
        let userData: UserEntry = { 
          email, 
          displayName: email,
          lastMessage: messageData.lastMessage,
          timestamp: messageData.timestamp,
          unread: Math.floor(Math.random() * 3) // Simulating unread count for demo
        }
        
        if (userDoc.exists()) {
          const data = userDoc.data()
          userData = {
            ...userData,
            displayName: data.displayName || email.split('@')[0] || 'Unknown User',
            status: data.status || 'offline',
            photoURL: data.photoURL
          }
        }
        
        emailList.push(userData)
      }

      // Sort by most recent message
      emailList.sort((a, b) => {
        return (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
      })

      setUserList(emailList)
    } catch (error) {
      console.error("Error fetching user list:", error)
    }
  }

  const handleClick = (email: string) => {
    router.push(`/messaging/chat/${encodeURIComponent(email)}`)
  }

  const handleNewChat = () => {
    // This would typically open a modal to select a new user
    router.push('/')
  }

  const filteredUserList = userList.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTimestamp = (date?: Date) => {
    if (!date) return ''
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date >= today) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (date >= yesterday) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <><Header /><div className="flex flex-col h-screen bg-gray-900 text-white">


      {/* Search Bar */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full bg-gray-700 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* User List */}
      <div
        className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-800"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%233f3f46' fill-opacity='0.1'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }}
      >
        {filteredUserList.length > 0 ? (
          <div className="divide-y divide-gray-700">
            {filteredUserList.map((user, index) => (
              <div
                key={index}
                className="p-4 hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => handleClick(user.email)}
              >
                <div className="flex items-center">
                  {/* Avatar */}
                  <div className="relative mr-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl font-bold text-white">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'} border-2 border-gray-800`}></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold truncate">{user.displayName}</h3>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatTimestamp(user.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {user.lastMessage || "No messages yet"}
                    </p>
                  </div>

                  {/* Notification Badge */}
                  {user.unread ? (
                    <div className="ml-2 bg-purple-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {user.unread}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-center">
              {searchQuery ? 'No conversations match your search' : 'Start messaging with a friend'}
            </p>
            <button
              onClick={handleNewChat}
              className="mt-4 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-full transition-colors"
            >
              Find a new conversation
            </button>
          </div>
        )}
      </div>


    </div></>
  )
}