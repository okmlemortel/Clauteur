'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, SessionMessage } from '@/lib/api';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { WorkspacePanel } from '@/components/workspace/WorkspacePanel';
import { ModeSelector } from '@/components/workspace/ModeSelector';
import { SessionTimer } from '@/components/ui/SessionTimer';

type SessionFlow = 'warmup' | 'active' | 'explaining' | 'connection' | 'ended';
type Phase = 'concret' | 'visuel' | 'symbolique' | null;

export default function SessionPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [flow, setFlow] = useState<SessionFlow>('warmup');
  const [currentPhase, setCurrentPhase] = useState<Phase>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleModeSelect = async (mode: 'devoir' | 'session' | 'explorer') => {
    setIsLoading(true);
    try {
      const data = await api.startSession(mode);
      setSessionId(data.session_id);
      setStartTime(new Date(data.started_at));
      setFlow('active');

      // Add the greeting message from the API
      const greetingMsg: SessionMessage = {
        id: Date.now().toString(),
        content: data.greeting,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages([greetingMsg]);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Impossible de démarrer la session. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!sessionId) return;

    // Add user message
    const userMsg: SessionMessage = {
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

      // Update phase if provided
      if (response.phase) {
        setCurrentPhase(response.phase);
      }

      // Add tutor response
      const tutorMsg: SessionMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, tutorMsg]);

      // Update flow based on phase or alert
      if (response.phase === 'symbolique') {
        setFlow('explaining');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMsg: SessionMessage = {
        id: (Date.now() + 2).toString(),
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
      setFlow('ended');
      router.push('/');
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('Impossible de terminer la session. Veuillez réessayer.');
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  // Warmup phase - full-width chat only
  if (flow === 'warmup') {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-900">
                Clauteur — Session de tutorat
              </h1>
              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>

        {/* Full-width chat with mode selector */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${
                    msg.sender === 'student' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-md px-4 py-3 rounded-2xl ${
                      msg.sender === 'student'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-200 text-slate-900 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === 'student'
                          ? 'text-indigo-100'
                          : 'text-slate-600'
                      }`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mode Selector */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <ModeSelector
                onSelect={handleModeSelect}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active session - split panel layout
  if (flow === 'active' || flow === 'explaining' || flow === 'connection') {
    const isWorkspaceFaded = flow === 'explaining' || flow === 'connection';

    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header with Timer */}
        <div className="bg-white border-b border-slate-200 shadow-sm p-4">
          <div className="max-w-7xl mx-auto">
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
            {startTime && <SessionTimer startTime={startTime} maxMinutes={40} />}
          </div>
        </div>

        {/* Main Content - Split Panel */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="max-w-7xl mx-auto h-full flex gap-4">
            {/* Left Panel - Chat (fixed width on desktop, full-width on mobile) */}
            <div className="w-full md:w-80 flex-shrink-0 h-full rounded-2xl overflow-hidden shadow-lg">
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                isNarrow={true}
                placeholder="Écris ta réponse..."
                emptyStateTitle="Bonjour ! 👋"
                emptyStateDescription="Prêt à apprendre ?"
              />
            </div>

            {/* Right Panel - Workspace (hidden on mobile) */}
            <div className="hidden md:flex flex-1 h-full">
              <WorkspacePanel
                currentPhase={currentPhase}
                isVisible={!isWorkspaceFaded}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ended state
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-lg text-slate-600 mb-4">Session terminée</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    </div>
  );
}
