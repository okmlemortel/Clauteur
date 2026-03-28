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

class DeepgramClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private isRecordingState: boolean = false;

  async connect(
    token: string,
    onTranscript: (event: TranscriptEvent) => void,
    onError: (err: Error) => void
  ): Promise<void> {
    try {
      // Connect to backend WebSocket proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/deepgram/ws?token=${token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onTranscript(data);
        } catch (err) {
          console.error('Failed to parse transcript:', err);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      this.ws.onerror = (event) => {
        onError(new Error('WebSocket error'));
      };

      this.ws.onclose = () => {
        this.mediaRecorder = null;
      };
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
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
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecordingState) {
      this.mediaRecorder.stop();
      this.isRecordingState = false;
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
  }

  isRecording(): boolean {
    return this.isRecordingState;
  }
}

export const deepgramClient = new DeepgramClient();
