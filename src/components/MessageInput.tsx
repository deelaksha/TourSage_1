'use client';
import { useState } from 'react';

interface Props {
  onSend: (text: string) => void;
}

export default function MessageInput({ onSend }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="p-4 border-t flex">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 p-2 border rounded-l-lg"
        placeholder="Type a message"
      />
      <button onClick={handleSend} className="bg-blue-500 text-white px-4 rounded-r-lg">
        Send
      </button>
    </div>
  );
}
