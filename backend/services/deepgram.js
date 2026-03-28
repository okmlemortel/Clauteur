const { createClient } = require('@deepgram/sdk');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

/**
 * Create a Deepgram WebSocket connection for streaming audio transcription
 * @param {Function} onTranscript - Callback for transcript events
 * @param {Function} onError - Callback for errors
 * @returns {Object} Connection object with send() and close() methods
 */
function createDeepgramConnection(onTranscript, onError) {
  let connection = null;
  let isConnected = false;

  // Initialize Deepgram client only if API key is present
  if (!DEEPGRAM_API_KEY) {
    console.warn('DEEPGRAM_API_KEY not set. Voice transcription will not work.');
    return {
      send: (audioBuffer) => {
        console.warn('Deepgram not configured. Cannot send audio.');
      },
      close: () => {
        console.warn('Deepgram connection not available.');
      }
    };
  }

  try {
    const deepgram = createClient({
      apiKey: DEEPGRAM_API_KEY
    });

    // Create live connection
    const liveConfig = {
      model: 'nova-3',
      language: 'multi',
      smart_format: true,
      interim_results: true,
      endpointing: 300,
      utterance_end_ms: 1000
    };

    // Open the connection
    connection = deepgram.listen.live(liveConfig);

    // Handle transcript events
    connection.on('Results', (result) => {
      const transcript = result?.result?.channel?.alternatives?.[0];
      if (transcript) {
        const isFinal = result?.result?.is_final || false;
        const text = transcript.transcript || '';
        const words = transcript.words || [];

        if (onTranscript) {
          onTranscript({
            text,
            language: result?.result?.channel?.language || 'en',
            isFinal,
            words: words.map(w => ({
              word: w.word,
              start: w.start_time,
              end: w.end_time,
              confidence: w.confidence
            }))
          });
        }
      }
    });

    // Handle errors
    connection.on('Error', (error) => {
      console.error('Deepgram error:', error);
      if (onError) {
        onError(error);
      }
    });

    // Handle close
    connection.on('Close', () => {
      console.log('Deepgram connection closed');
      isConnected = false;
    });

    isConnected = true;
  } catch (error) {
    console.error('Failed to create Deepgram connection:', error);
    if (onError) {
      onError(error);
    }
  }

  // Return connection interface
  return {
    send: (audioBuffer) => {
      if (connection && isConnected) {
        try {
          connection.send(audioBuffer);
        } catch (error) {
          console.error('Error sending audio to Deepgram:', error);
          if (onError) {
            onError(error);
          }
        }
      }
    },

    close: () => {
      if (connection) {
        try {
          connection.finish();
          isConnected = false;
        } catch (error) {
          console.error('Error closing Deepgram connection:', error);
        }
      }
    },

    isConnected: () => isConnected
  };
}

module.exports = {
  createDeepgramConnection
};
