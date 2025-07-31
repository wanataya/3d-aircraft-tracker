import dotenv from 'dotenv';
import WebSocket, { WebSocketServer } from 'ws';
import rhea from 'rhea';
import url from 'url';

dotenv.config();

/**
 * AMQP Aircraft Data Proxy Server
 * Connects to AMQP broker and forwards aircraft data via WebSocket
 * 
 * Configuration via environment variables:
 * - WS_PROXY_PORT: WebSocket server port (default: 8080)
 * - AMQP_HOST: AMQP broker host
 * - AMQP_PORT: AMQP broker port
 * - AMQP_USERNAME: AMQP username
 * - AMQP_PASSWORD: AMQP password
 * - AMQP_QUEUE: AMQP queue name
 * - AMQP_EXCHANGE: AMQP exchange name
 */

// Configuration from environment variables
const WS_PORT = process.env.WS_PROXY_PORT || 8080;
const AMQP_HOST = process.env.AMQP_HOST || 'localhost';
const AMQP_PORT = process.env.AMQP_PORT || 5672;
const AMQP_USERNAME = process.env.AMQP_USERNAME || 'guest';
const AMQP_PASSWORD = process.env.AMQP_PASSWORD || 'guest';
const AMQP_QUEUE = process.env.AMQP_QUEUE || 'aircraft-data';
const AMQP_EXCHANGE = process.env.AMQP_EXCHANGE || 'aircraft';

console.log('🚀 Starting AMQP Aircraft Data Proxy Server...');

// Create WebSocket server
const wss = new WebSocketServer({
  port: WS_PORT,
  verifyClient: (info) => {
    console.log(`📡 WebSocket connection attempt from: ${info.origin}`);
    return true;
  }
});

// Parse MSG format aircraft data
function parseAircraftMessage(message) {
  const parts = message.split(',');
  if (parts[0] !== 'MSG' || parts.length < 22) {
    return null;
  }

  return {
    messageType: 'aircraft',
    hexIdent: parts[4],
    callsign: parts[10]?.trim(),
    altitude: parts[11] ? parseInt(parts[11]) : null,
    groundSpeed: parts[12] ? parseInt(parts[12]) : null,
    track: parts[13] ? parseInt(parts[13]) : null,
    latitude: parts[14] ? parseFloat(parts[14]) : null,
    longitude: parts[15] ? parseFloat(parts[15]) : null,
    verticalRate: parts[16] ? parseInt(parts[16]) : null,
    squawk: parts[17],
    timestamp: new Date().toISOString(),
    source: 'amqp-broker'
  };
}

// Store connected WebSocket clients
const connectedClients = new Set();

// Create AMQP container
const container = rhea.create_container();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log(`🔗 New WebSocket connection established`);
  connectedClients.add(ws);

  // Send connection status
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    message: `Connected to AMQP broker at ${AMQP_HOST}:${AMQP_PORT}`,
    architecture: 'amqp-message-queue'
  }));

  // Handle WebSocket close
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    connectedClients.delete(ws);
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket Error:', error);
    connectedClients.delete(ws);
  });
});

// Connect to AMQP broker
const connection = container.connect({
  host: AMQP_HOST,
  port: AMQP_PORT,
  username: AMQP_USERNAME,
  password: AMQP_PASSWORD
});

// Handle AMQP connection events
connection.on('connection_open', (context) => {
  console.log(`✅ Connected to AMQP broker at ${AMQP_HOST}:${AMQP_PORT}`);
  
  // Create receiver for aircraft data
  const receiver = connection.open_receiver({
    source: AMQP_QUEUE,
    autoaccept: true
  });

  console.log(`📥 Listening for messages on queue: ${AMQP_QUEUE}`);
});

connection.on('connection_error', (context) => {
  console.error('❌ AMQP Connection Error:', context.connection.error);
});

connection.on('connection_close', (context) => {
  console.log('🔌 AMQP connection closed');
});

connection.on('message', (context) => {
  try {
    const messageBody = context.message.body;
    let aircraftData;

    // Handle different message formats
    if (typeof messageBody === 'string') {
      // If it's a raw MSG format string
      aircraftData = parseAircraftMessage(messageBody);
    } else if (typeof messageBody === 'object') {
      // If it's already parsed JSON
      aircraftData = messageBody;
    } else {
      console.log('📦 Unknown message format:', typeof messageBody);
      return;
    }

    if (aircraftData && aircraftData.hexIdent) {
      console.log(`✈️  Aircraft ${aircraftData.hexIdent} ${aircraftData.callsign || 'unknown'} at ${aircraftData.latitude},${aircraftData.longitude} alt:${aircraftData.altitude}ft`);
      
      // Broadcast to all connected WebSocket clients
      const message = JSON.stringify({
        type: 'aircraft-data',
        data: aircraftData,
        timestamp: new Date().toISOString(),
        source: 'amqp'
      });

      connectedClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  } catch (error) {
    console.error('Error processing AMQP message:', error);
  }
});

// Handle server startup
wss.on('listening', () => {
  console.log(`✅ AMQP Aircraft Data Proxy Server running on port ${WS_PORT}`);
  console.log(`📡 Usage: Connect WebSocket to ws://localhost:${WS_PORT}/`);
  console.log(`🎯 AMQP broker connection configured`);
  console.log('');
  console.log('🔗 Data flow: AMQP Queue → WebSocket Parser → Browser');
  console.log('✈️  Real-time aircraft tracking with AMQP messaging');
  console.log('');
  console.log('🔧 Configuration:');
  console.log(`   WS_PROXY_PORT=${WS_PORT} (WebSocket server port)`);
  console.log(`   AMQP_HOST=${AMQP_HOST} (AMQP broker host)`);
  console.log(`   AMQP_PORT=${AMQP_PORT} (AMQP broker port)`);
  console.log(`   AMQP_QUEUE=${AMQP_QUEUE} (Aircraft data queue)`);
  console.log(`   AMQP_EXCHANGE=${AMQP_EXCHANGE} (Message exchange)`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down AMQP proxy server...');
  wss.close();
  if (connection) {
    connection.close();
  }
  process.exit(0);
});
