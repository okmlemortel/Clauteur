const { DeepgramClient } = require('@deepgram/sdk');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

/**
 * Create a Deepgram WebSocket connection for streaming audio transcription
 * Uses Deepgram SDK v5 API:
 *   - Constructor: new DeepgramClient({ apiKey })
 *   - Connect: await client.listen.v1.connect(config)
 *   - Events: on('open'|'message'|'error'|'close', cb)
 *   - Send audio: socket.sendMedia(buffer)
 *   - Close: socket.sendCloseStream()
 *
 * @param {Function} onTranscript - Callback for transcript events
 * @param {Function} onError - Callback for errors
 * @returns {Object} Connection object with send() and close() methods
 */
function createDeepgramConnection(onTranscript, onError) {
  // If no API key, return a no-op stub
  if (!DEEPGRAM_API_KEY) {
    console.warn('[Deepgram] DEEPGRAM_API_KEY not set. Voice transcription will not work.');
    return {
      send: () => {},
      close: () => {},
      isConnected: () => false
    };
  }

  let socket = null;
  let isConnected = false;

  // Create and connect asynchronously
  (async () => {
    try {
      const client = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });

      // Live transcription config
      socket = await client.listen.v1.connect({
        model: 'nova-3',
        language: 'multi',          // Auto-detect EN/FR
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000,
      });

      socket.on('open', () => {
        console.log('[Deepgram] Live connection opened');
        isConnected = true;
      });

      // 'message' receives parsed JSON transcript data
      socket.on('message', (data) => {
        try {
          const result = data?.channel?.alternatives?.[0];
          if (result && result.transcript) {
            const isFinal = data.is_final || false;
            onTranscript({
              text: result.transcript,
              language: data.channel?.detected_language || 'en',
              isFinal,
              words: (result.words || []).map(w => ({
                word: w.word,
                start: w.start,
                end: w.end,
                confidence: w.confidence
              }))
            });
          }
        } catch (err) {
          console.error('[Deepgram] Parse error:', err);
        }
      });

      socket.on('error', (error) => {
        console.error('[Deepgram] Error:', error?.message || error);
        isConnected = false;
        if (onError) onError(error);
      });

      socket.on('close', () => {
        console.log('[Deepgram] Connection closed');
        isConnected = false;
      });

    } catch (error) {
      console.error('[Deepgram] Failed to create connection:', error?.message || error);
      if (onError) onError(error);
    }
  })();

  return {
    send: (audioBuffer) => {
      if (socket && isConnected) {
        try {
          socket.sendMedia(audioBuffer);
        } catch (error) {
          console.error('[Deepgram] Send error:', error);
          if (onError) onError(error);
        }
      }
    },

    close: () => {
      if (socket) {
        try {
          socket.sendCloseStream();
          isConnected = false;
        } catch (error) {
          console.error('[Deepgram] Close error:', error);
        }
      }
    },

    isConnected: () => isConnected
  };
}

module.exports = {
  createDeepgramConnection
};
