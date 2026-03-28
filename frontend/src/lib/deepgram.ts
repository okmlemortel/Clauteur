export interface TranscriptEvent {
  text: string;
  language: 'en' | 'fr';
  isFinal: boolean;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Derive the WebSocket URL from the REST API URL
 * e.g. https://clauteur-production.up.railway.app/api → wss://clauteur-production.up.railway.app
 */
function getWsBaseUrl(): string {
  // Strip /api suffix and switch protocol
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return base.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
}

class DeepgramClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private isRecordingState: boolean = false;
  private onTranscriptCallback: ((event: TranscriptEvent) => void) | null = null;
  private onErrorCallback: ((err: Error) => void) | null = null;

  async connect(
    token: string,
    onTranscript: (event: TranscriptEvent) => void,
    onError: (err: Error) => void
  ): Promise<void> {
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    try {
      // Connect to backend WebSocket proxy on Railway (not Vercel)
      const wsBase = getWsBaseUrl();
      const wsUrl = `${wsBase}/api/voice?token=${token}`;

      console.log('[Deepgram] Connecting to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Deepgram] WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript' && data.data) {
            onTranscript(data.data);
          } else if (data.type === 'error') {
            console.error('[Deepgram] Server error:', data.message);
            onError(new Error(data.message));
          } else if (data.type === 'connection') {
            console.log('[Deepgram] Connection status:', data.status);
          }
        } catch (err) {
          console.error('[Deepgram] Failed to parse message:', err);
        }
      };

      this.ws.onerror = () => {
        console.error('[Deepgram] WebSocket error');
        onError(new Error('Voice WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        console.log('[Deepgram] WebSocket closed:', event.code, event.reason);
        this.isRecordingState = false;
        this.mediaRecorder = null;
      };

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) return reject(new Error('No WebSocket'));
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        this.ws.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
        this.ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Connection failed')); }, { once: true });
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[Deepgram] Connect error:', error.message);
      onError(error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(event.data);
        }
      };

      this.mediaRecorder.start(100); // Send chunks every 100ms
      this.isRecordingState = true;
      console.log('[Deepgram] Recording started');
    } catch (err) {
      console.error('[Deepgram] startRecording error:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecordingState) {
      this.mediaRecorder.stop();
      this.isRecordingState = false;
      console.log('[Deepgram] Recording stopped');
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  disconnect(): void {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onTranscriptCallback = null;
    this.onErrorCallback = null;
  }

  isRecording(): boolean {
    return this.isRecordingState;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const deepgramClient = new DeepgramClient();
