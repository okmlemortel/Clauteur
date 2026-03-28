'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, SessionMessage, CaseTemplate } from '@/lib/api';
import { editTracker } from '@/lib/editTracker';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { WorkspacePanel } from '@/components/workspace/WorkspacePanel';
import { SessionTimer } from '@/components/ui/SessionTimer';

type SessionPhase = 'warmup' | 'plan' | 'solve' | 'explain' | 'ended';

export default function SessionPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<SessionPhase>('warmup');
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Case data
  const [caseData, setCaseData] = useState<CaseTemplate | null>(null);
  const [explainLanguage, setExplainLanguage] = useState<'en' | 'fr'>('en');

  // Case file content
  const [caseFileContent, setCaseFileContent] = useState({
    given: '',
    problem: '',
    solution: '',
    explanation: '',
  });

  // Voice state
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceTargetField, setVoiceTargetField] = useState<string>('');

  // Field feedback
  const [fieldFeedback, setFieldFeedback] = useState<string | undefined>();

  // Completed phases tracking
  const [completedPhases, setCompletedPhases] = useState<('plan' | 'solve' | 'explain')[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Start session on mount
  useEffect(() => {
    if (user && !sessionId) {
      startNewSession();
    }
  }, [user, sessionId]);

  const startNewSession = async () => {
    setIsLoading(true);
    try {
      const data = await api.startSession();
      setSessionId(data.session_id);
      setCaseData(data.case);
      setExplainLanguage(data.case.explain_language);
      setStartTime(new Date());

      // Add greeting message
      const greetingMsg: SessionMessage = {
        id: Date.now().toString(),
        content: data.greeting,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages([greetingMsg]);

      // Reset edit tracker
      editTracker.reset();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!sessionId) return;

    // Add user message to chat
    const userMsg: SessionMessage = {
      id: Date.now().toString(),
      content: userMessage,
      sender: 'student',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.sendMessage(sessionId, userMessage);

      // Update phase if provided
      if (response.phase && response.phase !== currentPhase) {
        setCurrentPhase(response.phase);
      }

      // Update field feedback
      if (response.fieldFeedback) {
        setFieldFeedback(response.fieldFeedback);
      }

      // Handle language switch
      if (response.languageSwitchTo) {
        setExplainLanguage(response.languageSwitchTo);
      }

      // Add tutor response
      const tutorMsg: SessionMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, tutorMsg]);

      // Check if session ended
      if (response.session_ended) {
        setCurrentPhase('ended');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMsg: SessionMessage = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, an error occurred. Please try again.',
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (
    field: 'given' | 'problem' | 'solution' | 'explanation',
    content: string
  ) => {
    setCaseFileContent((prev) => ({
      ...prev,
      [field]: content,
    }));
  };

  const handleFieldSubmit = async (field: string, content: string) => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await api.submitCaseFile(
        sessionId,
        field as 'given' | 'problem' | 'solution' | 'explanation',
        content
      );

      if (response.phaseComplete) {
        // Mark current phase as completed
        if (currentPhase === 'plan' || currentPhase === 'solve' || currentPhase === 'explain') {
          setCompletedPhases((prev) =>
            prev.includes(currentPhase) ? prev : [...prev, currentPhase]
          );
        }

        // Automatically transition to next phase
        const nextPhase: Record<SessionPhase, SessionPhase> = {
          warmup: 'plan',
          plan: 'solve',
          solve: 'explain',
          explain: 'ended',
          ended: 'ended',
        };
        setCurrentPhase(nextPhase[currentPhase]);
      }

      if (response.feedback) {
        setFieldFeedback(response.feedback);
      }
    } catch (error) {
      console.error('Failed to submit field:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      // Stop recording and send transcript as message
      if (voiceTranscript) {
        await handleSendMessage(voiceTranscript);
        setVoiceTranscript('');
      }
    } else {
      setIsVoiceRecording(true);
      // Start recording - in a real implementation, connect to Deepgram
      // For now, this is a placeholder
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      const editLog = editTracker.getEvents();
      await api.endSession(sessionId, editLog);
      setCurrentPhase('ended');
      router.push('/');
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('Failed to end session. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // ===== WARMUP PHASE =====
  if (currentPhase === 'warmup') {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-900">
                Clauteur — Tutoring Session
              </h1>
              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Full-width chat */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto h-full">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isNarrow={false}
              placeholder="Type your message..."
              emptyStateTitle="Hello! 👋"
              emptyStateDescription="Ready to learn?"
              isVoiceRecording={isVoiceRecording}
              onVoiceToggle={handleVoiceToggle}
            />
          </div>
        </div>
      </div>
    );
  }

  // ===== ACTIVE PHASES (plan/solve/explain) =====
  if (currentPhase === 'plan' || currentPhase === 'solve' || currentPhase === 'explain') {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header with Timer */}
        <div className="bg-white border-b border-slate-200 shadow-sm p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-900">
                Working Phase
              </h1>
              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition text-sm"
              >
                End Session
              </button>
            </div>
            {startTime && <SessionTimer startTime={startTime} maxMinutes={20} />}
          </div>
        </div>

        {/* Main Content - Split Panel */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="max-w-7xl mx-auto h-full flex gap-4">
            {/* Left Panel - Chat (280px) */}
            <div className="w-80 flex-shrink-0 h-full rounded-2xl overflow-hidden shadow-lg">
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                isNarrow={true}
                placeholder="Your response..."
                isVoiceRecording={isVoiceRecording}
                onVoiceToggle={handleVoiceToggle}
              />
            </div>

            {/* Right Panel - Workspace */}
            <div className="flex-1 h-full">
              <WorkspacePanel
                isVisible={true}
                currentPhase={currentPhase}
                completedPhases={completedPhases}
                caseData={caseData || undefined}
                onFieldChange={handleFieldChange}
                onFieldSubmit={handleFieldSubmit}
                fieldFeedback={fieldFeedback}
                isVoiceActive={isVoiceRecording}
                voiceTranscript={voiceTranscript}
                voiceTargetField={voiceTargetField}
                caseFileContent={caseFileContent}
                explainLanguage={explainLanguage}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== ENDED STATE =====
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-lg text-slate-600 mb-4">Session Complete</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
