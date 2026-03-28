const { DeepgramClient } = require('@deepgram/sdk');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

/**
 * Create a Deepgram WebSocket connection for streaming audio transcription
 * Uses Deepgram SDK v5 API: client.listen.v1.connect()
 * @param {Function} onTranscript - Callback for transcript events
 * @param {Function} onError - Callback for errors
 * @returns {Object} Connection object with send() and close() methods
 */
function createDeepgramConnection(onTranscript, onError) {
  // If no API key, return a no-op stub
  if (!DEEPGRAM_API_KEY) {
    console.warn('DEEPGRAM_API_KEY not set. Voice transcription will not work.');
    return {
      send: () => { console.warn('Deepgram not configured.'); },
      close: () => {},
      isConnected: () => false
    };
  }

  let connection = null;
  let isConnected = false;

  try {
    const client = new DeepgramClient({ key: DEEPGRAM_API_KEY });

    // Live transcription config
    const liveConfig = {
      model: 'nova-3',
      language: 'multi',          // Auto-detect EN/FR
      smart_format: true,
      interim_results: true,
      endpointing: 300,
      utterance_end_ms: 1000,
      encoding: 'linear16',
      sample_rate: 16000
    };

    // Open live connection (SDK v5 API)
    connection = client.listen.v1.connect(liveConfig);

    connection.on('open', () => {
      console.log('[Deepgram] Live connection opened');
      isConnected = true;
    });

    // Handle transcript events
    connection.on('transcriptReceived', (rawMessage) => {
      try {
        const data = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
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

    // Handle errors
    connection.on('error', (error) => {
      console.error('[Deepgram] Error:', error);
      if (onError) onError(error);
    });

    // Handle close
    connection.on('close', () => {
      console.log('[Deepgram] Connection closed');
      isConnected = false;
    });

  } catch (error) {
    console.error('[Deepgram] Failed to create connection:', error);
    if (onError) onError(error);
  }

  return {
    send: (audioBuffer) => {
      if (connection && isConnected) {
        try {
          connection.send(audioBuffer);
        } catch (error) {
          console.error('[Deepgram] Send error:', error);
          if (onError) onError(error);
        }
      }
    },

    close: () => {
      if (connection) {
        try {
          connection.finish();
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
