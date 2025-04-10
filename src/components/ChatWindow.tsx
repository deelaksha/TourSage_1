import { MessageType } from '../app/types';

export default function ChatWindow({ messages, currentUser }: { messages: MessageType[]; currentUser: string }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`p-2 rounded-md max-w-xs ${msg.sender === currentUser ? 'bg-blue-200 ml-auto' : 'bg-gray-200'}`}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
}