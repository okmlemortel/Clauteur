const { DeepgramClient } = require('@deepgram/sdk');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

/**
 * Create a Deepgram WebSocket connection for streaming audio transcription.
 *
 * SDK v5 flow:
 *   1. const connection = await client.listen.v1.connect(config)
 *   2. connection.connect()
 *   3. await connection.waitForOpen()
 *   4. connection.socket.send(audioData)
 *   5. Events: on('open'), on('message') where data.type === 'Results'
 *
 * @param {Function} onTranscript - Callback for transcript events
 * @param {Function} onError - Callback for errors
 * @returns {Promise<Object>} Connection object with send() and close()
 */
async function createDeepgramConnection(onTranscript, onError) {
  if (!DEEPGRAM_API_KEY) {
    console.warn('[Deepgram] DEEPGRAM_API_KEY not set.');
    return { send: () => {}, close: () => {}, isConnected: () => false };
  }

  let connection = null;
  let isConnected = false;

  try {
    const client = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });

    // Create the connection object
    connection = await client.listen.v1.connect({
      model: 'nova-3',
      language: 'multi',
      smart_format: true,
      interim_results: true,
      endpointing: 300,
      utterance_end_ms: 1000,
    });

    // Register event handlers BEFORE connecting
    connection.on('open', () => {
      console.log('[Deepgram] Live connection opened');
      isConnected = true;
    });

    connection.on('message', (data) => {
      try {
        // Transcript results have type "Results"
        if (data?.type === 'Results') {
          const result = data?.channel?.alternatives?.[0];
          if (result && result.transcript) {
            onTranscript({
              text: result.transcript,
              language: data.channel?.detected_language || 'en',
              isFinal: data.is_final || false,
              words: (result.words || []).map(w => ({
                word: w.word,
                start: w.start,
                end: w.end,
                confidence: w.confidence
              }))
            });
          }
        }
      } catch (err) {
        console.error('[Deepgram] Parse error:', err);
      }
    });

    connection.on('error', (error) => {
      console.error('[Deepgram] Error:', error?.message || error);
      isConnected = false;
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    });

    connection.on('close', () => {
      console.log('[Deepgram] Connection closed');
      isConnected = false;
    });

    // Actually open the WebSocket
    connection.connect();

    // Wait until the WebSocket is ready
    await connection.waitForOpen();
    console.log('[Deepgram] Connection ready');

  } catch (error) {
    console.error('[Deepgram] Failed to create connection:', error?.message || error);
    if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    return { send: () => {}, close: () => {}, isConnected: () => false };
  }

  return {
    send: (audioData) => {
      if (isConnected && connection?.socket) {
        try {
          connection.socket.send(audioData);
        } catch (error) {
          console.error('[Deepgram] Send error:', error);
        }
      }
    },

    close: () => {
      if (connection) {
        try {
          connection.close();
          isConnected = false;
        } catch (error) {
          console.error('[Deepgram] Close error:', error);
        }
      }
    },

    isConnected: () => isConnected
  };
}

module.exports = { createDeepgramConnection };
