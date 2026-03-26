'use client';

import React, { useRef, useEffect } from 'react';
import { ChatBubble } from '../ui/ChatBubble';

export interface Message {
  id: string;
  content: string;
  sender: 'student' | 'tutor';
  timestamp: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isNarrow?: boolean;
  placeholder?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isNarrow = false,
  placeholder = 'Écris ta question ici...',
  emptyStateTitle = 'Dis bonjour pour commencer ! 👋',
  emptyStateDescription = 'Pose tes questions ou demande de l\'aide sur un sujet',
}) => {
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    try {
      await onSendMessage(userMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div
      className={`flex flex-col h-full ${
        isNarrow ? 'bg-slate-50' : 'bg-white'
      }`}
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                {emptyStateTitle}
              </p>
              <p className="text-slate-500 text-sm">{emptyStateDescription}</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message.content}
                sender={message.sender}
                timestamp={message.timestamp}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-200 text-slate-900 px-4 py-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className={`border-t ${isNarrow ? 'border-slate-200 bg-white' : ''} p-4`}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-slate-100 disabled:cursor-not-allowed text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-indigo-600"
          >
            Envoyer
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Le tuteur y répondra en quelques secondes
        </p>
      </div>
    </div>
  );
};
