const { DeepgramClient } = require('@deepgram/sdk');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

/**
 * Create a Deepgram WebSocket connection for streaming audio transcription
 * Returns a Promise that resolves when the connection is ready.
 *
 * @param {Function} onTranscript - Callback for transcript events
 * @param {Function} onError - Callback for errors
 * @returns {Promise<Object>} Connection object with send() and close() methods
 */
async function createDeepgramConnection(onTranscript, onError) {
  // If no API key, return a no-op stub
  if (!DEEPGRAM_API_KEY) {
    console.warn('[Deepgram] DEEPGRAM_API_KEY not set.');
    return {
      send: () => {},
      close: () => {},
      isConnected: () => false
    };
  }

  let socket = null;
  let isConnected = false;
  const audioBuffer = []; // Buffer audio until connection opens

  try {
    const client = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });

    // Live transcription config
    // Do NOT specify encoding/sample_rate — let Deepgram auto-detect from webm/opus stream
    socket = await client.listen.v1.connect({
      model: 'nova-3',
      language: 'multi',
      smart_format: true,
      interim_results: true,
      endpointing: 300,
      utterance_end_ms: 1000,
    });

    // Wait for the socket to actually open
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Deepgram connection timeout')), 10000);

      socket.on('open', () => {
        console.log('[Deepgram] Live connection opened');
        isConnected = true;
        clearTimeout(timeout);

        // Flush any buffered audio
        while (audioBuffer.length > 0) {
          const chunk = audioBuffer.shift();
          try { socket.sendMedia(chunk); } catch (e) { /* ignore */ }
        }

        resolve();
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[Deepgram] Connection error:', error?.message || error);
        reject(error);
      });
    });

    // Handle transcript messages
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

    // Handle late errors (after open)
    socket.on('error', (error) => {
      console.error('[Deepgram] Runtime error:', error?.message || error);
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
    return {
      send: () => {},
      close: () => {},
      isConnected: () => false
    };
  }

  return {
    send: (data) => {
      if (isConnected && socket) {
        try {
          socket.sendMedia(data);
        } catch (error) {
          console.error('[Deepgram] Send error:', error);
        }
      } else {
        // Buffer audio until connection opens
        audioBuffer.push(data);
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
