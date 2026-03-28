export interface EditEvent {
  field: 'given' | 'problem' | 'solution' | 'explanation';
  event: 'keystroke' | 'pause' | 'delete' | 'focus' | 'blur';
  timestamp: number;
  charCount?: number;
  pauseDuration?: number;
}

class EditTracker {
  private events: EditEvent[] = [];
  private sessionStartTime: number;
  private lastKeystrokeTime: Map<string, number> = new Map();
  private pauseTimeout: Map<string, NodeJS.Timeout> = new Map();
  private lastCharCount: Map<string, number> = new Map();

  constructor() {
    this.sessionStartTime = Date.now();
  }

  private getTimestamp(): number {
    return Date.now() - this.sessionStartTime;
  }

  private clearPauseTimeout(field: string): void {
    const timeout = this.pauseTimeout.get(field);
    if (timeout) {
      clearTimeout(timeout);
      this.pauseTimeout.delete(field);
    }
  }

  trackKeystroke(field: EditEvent['field'], charCount: number): void {
    const now = Date.now();
    const lastTime = this.lastKeystrokeTime.get(field);

    // Check if this is a pause event (>3000ms gap)
    if (lastTime && now - lastTime > 3000) {
      this.events.push({
        field,
        event: 'pause',
        timestamp: this.getTimestamp(),
        pauseDuration: now - lastTime,
      });
    }

    // Clear any pending pause timeout
    this.clearPauseTimeout(field);

    // Add keystroke event
    this.events.push({
      field,
      event: 'keystroke',
      timestamp: this.getTimestamp(),
      charCount,
    });

    this.lastKeystrokeTime.set(field, now);
    this.lastCharCount.set(field, charCount);
  }

  trackFocus(field: EditEvent['field']): void {
    this.clearPauseTimeout(field);
    this.events.push({
      field,
      event: 'focus',
      timestamp: this.getTimestamp(),
    });
  }

  trackBlur(field: EditEvent['field']): void {
    const lastTime = this.lastKeystrokeTime.get(field);
    if (lastTime) {
      // Set timeout to potentially record a pause if blur happens after 3s of inactivity
      const timeout = setTimeout(() => {
        const now = Date.now();
        if (now - lastTime > 3000) {
          this.events.push({
            field,
            event: 'pause',
            timestamp: this.getTimestamp(),
            pauseDuration: now - lastTime,
          });
        }
      }, 3100);
      this.pauseTimeout.set(field, timeout);
    }

    this.events.push({
      field,
      event: 'blur',
      timestamp: this.getTimestamp(),
    });
  }

  trackDelete(field: EditEvent['field'], charCount: number): void {
    const lastCount = this.lastCharCount.get(field) || 0;
    if (charCount < lastCount) {
      this.events.push({
        field,
        event: 'delete',
        timestamp: this.getTimestamp(),
        charCount,
      });
    }
    this.lastCharCount.set(field, charCount);
  }

  getEvents(): EditEvent[] {
    return [...this.events];
  }

  reset(): void {
    this.events = [];
    this.lastKeystrokeTime.clear();
    this.lastCharCount.clear();
    this.pauseTimeout.forEach((timeout) => clearTimeout(timeout));
    this.pauseTimeout.clear();
    this.sessionStartTime = Date.now();
  }
}

export const editTracker = new EditTracker();
