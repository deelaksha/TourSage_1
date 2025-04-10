'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { auth, db } from '../../../../firebase/config'
import { onAuthStateChanged, User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'

// Define types for messages and user data
interface Message {
  id: string
  sender: string
  receiver: string
  message: string
  timestamp: Timestamp | null
  participants: string[]
}

interface UserData {
  displayName?: string
  status?: string
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const otherUserEmail = decodeURIComponent(params.user as string)
  
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [otherUserName, setOtherUserName] = useState<string>('User')
  const [otherUserStatus, setOtherUserStatus] = useState<string>('offline')
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showEmoji, setShowEmoji] = useState<boolean>(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
      if (user && user.email) {
        setCurrentUser(user.email)
        await fetchOtherUserName(otherUserEmail)
        listenToMessages(user.email)
        setLoading(false)
      } else {
        router.push('/messaging/login')
      }
    })
    
    return () => unsubscribeAuth()
  }, [otherUserEmail, router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const fetchOtherUserName = async (email: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', email))
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData
        setOtherUserName(data.displayName || email)
        setOtherUserStatus(data.status || 'offline')
      } else {
        setOtherUserName(email)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const listenToMessages = (currentEmail: string) => {
    const messagesRef = collection(db, 'messages')
    const q = query(
      messagesRef,
      where('participants', 'array-contains', currentEmail),
      orderBy('timestamp')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Message))
        .filter(
          (msg) =>
            (msg.sender === currentEmail && msg.receiver === otherUserEmail) ||
            (msg.sender === otherUserEmail && msg.receiver === currentEmail)
        )

      setMessages(msgs)
    })

    return unsubscribe
  }

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return

    await addDoc(collection(db, 'messages'), {
      sender: currentUser,
      receiver: otherUserEmail,
      message: message.trim(),
      participants: [currentUser, otherUserEmail],
      timestamp: serverTimestamp(),
    })

    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg py-4 px-6 flex items-center border-b border-gray-700">
        <div className="relative mr-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold text-white">
            {otherUserName.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${otherUserStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'} border-2 border-gray-800`}></div>
        </div>
        <div>
          <h2 className="font-bold text-lg">{otherUserName}</h2>
          <p className="text-xs text-gray-400">{otherUserStatus}</p>
        </div>
        <button className="ml-auto text-gray-400 hover:text-purple-400 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-900 to-gray-800"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%233f3f46' fill-opacity='0.1'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }}
      >
        {messages.map((msg, idx) => {
          const isCurrentUser = msg.sender === currentUser
          const prevMessage = messages[idx - 1]
          const showDate = idx === 0 || (
            prevMessage?.timestamp && 
            msg.timestamp && 
            prevMessage.timestamp.toDate().toDateString() !== 
            msg.timestamp.toDate().toDateString()
          )
          
          return (
            <div key={msg.id}>
              {showDate && msg.timestamp && (
                <div className="flex justify-center my-4">
                  <span className="text-xs bg-gray-700 rounded-full px-4 py-1 text-gray-300">
                    {msg.timestamp.toDate().toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                {!isCurrentUser && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white mr-2 mt-1">
                    {otherUserName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div 
                  className={`max-w-xs md:max-w-md rounded-2xl py-2 px-4 ${
                    isCurrentUser 
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-br-none shadow-md' 
                      : 'bg-gray-700 rounded-bl-none shadow-md border border-gray-600'
                  }`}
                >
                  <div className="text-sm">{msg.message}</div>
                  <div className={`text-xs mt-1 ${isCurrentUser ? 'text-purple-200' : 'text-gray-400'} text-right`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center bg-gray-700 rounded-full p-1 shadow-inner">
          <button 
            className="p-2 rounded-full text-gray-400 hover:text-purple-400 focus:outline-none transition-colors"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="p-2 rounded-full text-gray-400 hover:text-purple-400 focus:outline-none transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none mx-2 py-2 h-10 max-h-32 overflow-auto text-white placeholder-gray-400"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              autoResizeTextarea()
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            className={`rounded-full p-2 focus:outline-none transition-all ${
              message.trim() 
                ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}