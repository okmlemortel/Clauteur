'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, SessionMessage, CaseTemplate } from '@/lib/api';
import { editTracker } from '@/lib/editTracker';
import { deepgramClient, TranscriptEvent } from '@/lib/deepgram';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { WorkspacePanel } from '@/components/workspace/WorkspacePanel';
import { SessionTimer } from '@/components/ui/SessionTimer';

type SessionPhase = 'warmup' | 'plan' | 'solve' | 'explain' | 'ended';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading session...</div>
      </div>
    }>
      <SessionPageInner />
    </Suspense>
  );
}

function SessionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeSessionId = searchParams.get('resume');
  const { user, isLoading: authLoading } = useAuth();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<SessionPhase>('warmup');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [initialElapsed, setInitialElapsed] = useState(0);

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [voiceTargetField, setVoiceTargetField] = useState<string>('');

  // Field feedback
  const [fieldFeedback, setFieldFeedback] = useState<string | undefined>();

  // Completed phases tracking
  const [completedPhases, setCompletedPhases] = useState<('plan' | 'solve' | 'explain')[]>([]);

  // Refs for pause/cleanup
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const initialElapsedRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { initialElapsedRef.current = initialElapsed; }, [initialElapsed]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Start or resume session on mount
  useEffect(() => {
    if (user && !sessionId) {
      if (resumeSessionId) {
        resumeExistingSession(resumeSessionId);
      } else {
        startNewSession();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId, resumeSessionId]);

  // ===== AUTO-PAUSE: beforeunload =====
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;

      const elapsed = getElapsedSeconds();
      const url = `${API_BASE_URL}/session/${sid}/pause`;
      navigator.sendBeacon(url, JSON.stringify({ elapsed_seconds: elapsed }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ===== AUTO-PAUSE: idle detection (5 min) =====
  useEffect(() => {
    if (!sessionId) return;

    let idleTimer: ReturnType<typeof setTimeout>;

    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        if (sessionIdRef.current) {
          const elapsed = getElapsedSeconds();
          try {
            await api.pauseSession(sessionIdRef.current, elapsed);
          } catch (e) {
            console.error('Idle pause failed:', e);
          }
          // Show paused overlay or redirect
          router.push('/dashboard');
        }
      }, IDLE_TIMEOUT_MS);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);
    resetIdle();

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
    };
  }, [sessionId, router]);

  // Cleanup Deepgram on unmount
  useEffect(() => {
    return () => {
      deepgramClient.disconnect();
    };
  }, []);

  const getElapsedSeconds = () => {
    const start = startTimeRef.current;
    const base = initialElapsedRef.current;
    if (!start) return base;
    return base + Math.floor((Date.now() - start.getTime()) / 1000);
  };

  // ===== SESSION LIFECYCLE =====

  const startNewSession = async () => {
    setIsLoading(true);
    try {
      const data = await api.startSession();
      setSessionId(data.session_id);
      setCaseData(data.case);
      setExplainLanguage(data.case.explain_language);
      setStartTime(new Date());
      setInitialElapsed(0);

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
      editTracker.reset();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const resumeExistingSession = async (sid: string) => {
    setIsLoading(true);
    try {
      // 1. Get saved session data
      const resumeData = await api.getResumeData(sid);

      // 2. Rebuild UI state
      setSessionId(sid);
      setCaseData(resumeData.case_template);
      setExplainLanguage(resumeData.case_template.explain_language);
      setStartTime(new Date());
      setInitialElapsed(resumeData.session.elapsed_seconds);

      // Set phase
      const phase = resumeData.session.current_phase as SessionPhase;
      setCurrentPhase(phase || 'warmup');

      // Rebuild messages
      const restoredMessages: SessionMessage[] = resumeData.messages.map((m, i) => ({
        id: `restored-${i}`,
        content: m.content,
        sender: m.role === 'user' ? 'student' : 'tutor',
        timestamp: new Date(m.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));

      // Restore case file content
      setCaseFileContent({
        given: resumeData.casefile.given || '',
        problem: resumeData.casefile.problem || '',
        solution: resumeData.casefile.solution || '',
        explanation: resumeData.casefile.explanation || '',
      });

      // 3. Get welcome-back greeting from Claude
      const { greeting } = await api.resumeSession(sid);
      const welcomeMsg: SessionMessage = {
        id: Date.now().toString(),
        content: greeting,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages([...restoredMessages, welcomeMsg]);
      editTracker.reset();
    } catch (error) {
      console.error('Failed to resume session:', error);
      alert('Failed to resume session. Starting fresh.');
      startNewSession();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!sessionId) return;

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

      if (response.phase && response.phase !== currentPhase) {
        setCurrentPhase(response.phase);
      }

      if (response.fieldFeedback) {
        setFieldFeedback(response.fieldFeedback);
      }

      if (response.languageSwitchTo) {
        setExplainLanguage(response.languageSwitchTo);
      }

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
        if (currentPhase === 'plan' || currentPhase === 'solve' || currentPhase === 'explain') {
          setCompletedPhases((prev) =>
            prev.includes(currentPhase) ? prev : [...prev, currentPhase]
          );
        }

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
    // Guard: don't toggle while a message is being sent
    if (isLoading) return;

    if (isVoiceRecording) {
      deepgramClient.stopRecording();
      setIsVoiceRecording(false);

      if (voiceTranscript.trim()) {
        await handleSendMessage(voiceTranscript.trim());
        setVoiceTranscript('');
      }
    } else {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.error('No auth token for voice');
          return;
        }

        await deepgramClient.connect(
          token,
          (event: TranscriptEvent) => {
            if (event.isFinal && event.text) {
              setVoiceTranscript((prev) => {
                const separator = prev ? ' ' : '';
                return prev + separator + event.text;
              });
            } else if (!event.isFinal && event.text) {
              console.log('[Voice] interim:', event.text);
            }
          },
          (err: Error) => {
            console.error('[Voice] Deepgram error:', err.message);
            setIsVoiceRecording(false);
          }
        );

        await deepgramClient.startRecording();
        setIsVoiceRecording(true);
      } catch (err) {
        console.error('[Voice] Failed to start recording:', err);
        setIsVoiceRecording(false);
        deepgramClient.disconnect();
      }
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    deepgramClient.disconnect();
    setIsVoiceRecording(false);

    try {
      const editLog = editTracker.getEvents();
      await api.endSession(sessionId, editLog);
      setCurrentPhase('ended');
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

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto h-full">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isNarrow={false}
              placeholder="Type your message..."
              emptyStateTitle="Hello!"
              emptyStateDescription="Ready to learn?"
              isVoiceRecording={isVoiceRecording}
              onVoiceToggle={handleVoiceToggle}
              voiceTranscript={voiceTranscript}
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
            {startTime && <SessionTimer startTime={startTime} />}
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <div className="max-w-7xl mx-auto h-full flex gap-4">
            <div className="w-80 flex-shrink-0 h-full rounded-2xl overflow-hidden shadow-lg">
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                isNarrow={true}
                placeholder="Your response..."
                isVoiceRecording={isVoiceRecording}
                onVoiceToggle={handleVoiceToggle}
                voiceTranscript={voiceTranscript}
              />
            </div>

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
                sessionId={sessionId || undefined}
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
        <div className="text-5xl mb-4">&#10003;</div>
        <p className="text-lg text-slate-600 mb-4">Session Complete</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
