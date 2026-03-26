'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { SessionTimer } from '@/components/ui/SessionTimer';

interface Message {
  id: string;
  content: string;
  sender: 'student' | 'tutor';
  timestamp: string;
}

export default function SessionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartSession = async () => {
    try {
      const data = await api.startSession();
      setSessionId(data.sessionId);
      setSessionStarted(true);
      setStartTime(new Date(data.startedAt));
      setMessages([]);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Impossible de démarrer la session. Veuillez réessayer.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to chat
    const userMsg: Message = {
      id: Date.now().toString(),
      content: userMessage,
      sender: 'student',
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.sendMessage(sessionId, userMessage);

      // Add tutor response
      const tutorMsg: Message = {
        id: Date.now().toString() + '_tutor',
        content: response.tutorResponse,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, tutorMsg]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMsg: Message = {
        id: Date.now().toString() + '_error',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      await api.endSession(sessionId);
      router.push('/student/session');
      setSessionStarted(false);
      setSessionId(null);
      setMessages([]);
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('Impossible de terminer la session. Veuillez réessayer.');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {!sessionStarted ? (
        // Session Start Screen
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl mx-auto">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Prêt à apprendre ?
                </h1>
                <p className="text-slate-600">
                  Démarre une nouvelle session avec ton tuteur IA pour progresser ensemble.
                </p>
              </div>
              <button
                onClick={handleStartSession}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all hover:from-indigo-700 hover:to-indigo-600"
              >
                Nouvelle session
              </button>
              <p className="text-xs text-slate-500">
                💡 Chaque session dure jusqu'à 35 minutes
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Active Session
        <>
          {/* Header with Timer */}
          <div className="bg-white border-b border-slate-200 shadow-sm p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-slate-900">
                  Session de tutorat
                </h1>
                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition text-sm"
                >
                  Terminer
                </button>
              </div>
              {startTime && <SessionTimer startTime={startTime} maxMinutes={35} />}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-slate-600 text-lg font-medium mb-2">
                      Dis bonjour pour commencer ! 👋
                    </p>
                    <p className="text-slate-500 text-sm">
                      Pose tes questions ou demande de l'aide sur un sujet
                    </p>
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
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-slate-200 p-4">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Écris ta question ici..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-slate-100 disabled:cursor-not-allowed"
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
        </>
      )}
    </div>
  );
}
