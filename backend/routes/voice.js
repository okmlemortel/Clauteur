const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { createDeepgramConnection } = require('../services/deepgram');
const memory = require('../services/memory');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Setup WebSocket handler for voice transcription
 * Handles WebSocket connections at /api/voice
 *
 * Protocol:
 * 1. Client connects with auth token as query param (?token=...)
 * 2. Server verifies JWT
 * 3. Server opens Deepgram connection
 * 4. Client sends audio chunks (binary frames)
 * 5. Server forwards to Deepgram
 * 6. Deepgram returns transcripts
 * 7. Server forwards transcript events to client as JSON
 * 8. On close, clean up Deepgram connection
 */
function setupVoiceWebSocket(server) {
  const wss = new WebSocket.Server({ noServer: true });

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    // Only handle /api/voice upgrades
    if (request.url.startsWith('/api/voice')) {
      // Extract token from query params
      const urlParams = new URL(request.url, `http://${request.headers.host}`);
      const token = urlParams.searchParams.get('token');

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Verify token
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // Token is valid, upgrade the connection
        request.user = decoded;
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      });
    }
  });

  // Handle new WebSocket connections
  wss.on('connection', async (ws, request) => {
    const userId = request.user?.userId;
    const sessionId = request.url.split('/api/voice?')[1]?.split('&')[0]?.split('=')[1] || null;

    console.log(`Voice WebSocket connected: user=${userId}, session=${sessionId}`);

    let deepgramConnection = null;
    let isAlive = true;

    // Ping/pong to detect dead connections
    const pingInterval = setInterval(() => {
      if (isAlive === false) {
        ws.terminate();
        clearInterval(pingInterval);
        return;
      }

      isAlive = false;
      ws.ping(() => {});
    }, 30000);

    ws.on('pong', () => {
      isAlive = true;
    });

    // Create Deepgram connection
    try {
      deepgramConnection = createDeepgramConnection(
        // onTranscript callback
        (transcript) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'transcript',
              data: transcript
            }));
          }
        },
        // onError callback
        (error) => {
          console.error('Deepgram error:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Transcription error occurred'
            }));
          }
        }
      );

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected'
      }));
    } catch (error) {
      console.error('Failed to create Deepgram connection:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to initialize transcription'
      }));
      ws.close(1011, 'Internal server error');
      return;
    }

    // Handle incoming messages
    ws.on('message', (data) => {
      if (typeof data === 'string') {
        // JSON control message
        try {
          const message = JSON.parse(data);
          if (message.type === 'start') {
            // Client requests to start transcription
            console.log('Voice transcription started');
          } else if (message.type === 'stop') {
            // Client requests to stop transcription
            if (deepgramConnection) {
              deepgramConnection.close();
            }
          }
        } catch (e) {
          console.error('Invalid JSON message:', e);
        }
      } else if (data instanceof Buffer) {
        // Binary audio data - forward to Deepgram
        if (deepgramConnection && deepgramConnection.isConnected?.()) {
          deepgramConnection.send(data);
        } else {
          console.warn('Deepgram connection not available, dropping audio');
        }
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`Voice WebSocket closed: user=${userId}`);

      clearInterval(pingInterval);

      // Clean up Deepgram connection
      if (deepgramConnection) {
        try {
          deepgramConnection.close();
        } catch (error) {
          console.error('Error closing Deepgram connection:', error);
        }
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);

      // Clean up Deepgram connection
      if (deepgramConnection) {
        try {
          deepgramConnection.close();
        } catch (e) {
          console.error('Error closing Deepgram on ws error:', e);
        }
      }

      clearInterval(pingInterval);
    });
  });

  return wss;
}

module.exports = {
  setupVoiceWebSocket
};
