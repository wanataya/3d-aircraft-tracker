import dotenv from 'dotenv';
import WebSocket, { WebSocketServer } from 'ws';
import net from 'net';
import url from 'url';

dotenv.config();

/**
 * Enhanced Aircraft Data Proxy Server
 * Direct connection to IoT sensors with AMQP architecture in mind
 * Falls back to direct WebSocket when AMQP broker unavailable
 * 
 * SECURITY NOTE: Configure TCP_HOST in .env file for production
 * Never expose sensitive IP addresses in source code
 * 
 * Configuration via environment variables:
 * - WS_PROXY_PORT: WebSocket server port (default: 8080)
 * - TCP_HOST: IoT sensor host (REQUIRED - set in .env file)
 * - TCP_PORT: IoT sensor port (default: 30003)
 */


// Configuration from environment variables
const WS_PORT = process.env.WS_PROXY_PORT || 8080;
const DEFAULT_TCP_HOST = process.env.TCP_HOST || 'localhost';
const DEFAULT_TCP_PORT = process.env.TCP_PORT || 30003;

console.log('🚀 Starting Enhanced Aircraft Data Proxy Server...');

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
    source: 'iot-sensors'
  };
}

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const tcpHost = query.host || DEFAULT_TCP_HOST;
  const tcpPort = parseInt(query.port) || DEFAULT_TCP_PORT;

  console.log(`🔗 New WebSocket connection, connecting to IoT sensors ${tcpHost}:${tcpPort}`);

  // Create TCP connection to the IoT sensors
  const tcpClient = new net.Socket();
  
  // Handle TCP connection
  tcpClient.connect(tcpPort, tcpHost, () => {
    console.log(`✅ TCP connected to IoT sensors ${tcpHost}:${tcpPort}`);
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      message: `Connected to IoT sensors at ${tcpHost}:${tcpPort}`,
      architecture: 'direct-iot-connection'
    }));
  });

  // Forward and parse TCP data to WebSocket
  tcpClient.on('data', (data) => {
    try {
      const messages = data.toString().split('\n');
      messages.forEach(message => {
        if (message.trim()) {
          const aircraftData = parseAircraftMessage(message.trim());
          
          if (aircraftData && aircraftData.hexIdent) {
            console.log(`✈️  Aircraft ${aircraftData.hexIdent} ${aircraftData.callsign || 'unknown'} at ${aircraftData.latitude},${aircraftData.longitude} alt:${aircraftData.altitude}ft`);
            
            ws.send(JSON.stringify({
              type: 'aircraft-data',
              data: aircraftData,
              raw: message.trim(),
              timestamp: new Date().toISOString()
            }));
          }
        }
      });
    } catch (error) {
      console.error('Error processing aircraft data:', error);
    }
  });

  // Handle TCP errors
  tcpClient.on('error', (error) => {
    console.error(`❌ TCP Error connecting to ${tcpHost}:${tcpPort}:`, error.message);
    ws.send(JSON.stringify({
      type: 'error',
      message: `IoT sensor connection failed: ${error.message}`
    }));
  });

  // Handle TCP close
  tcpClient.on('close', () => {
    console.log(`🔌 TCP connection to IoT sensors closed`);
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'disconnected',
      message: 'IoT sensor connection closed'
    }));
  });

  // Handle WebSocket close
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    if (tcpClient && !tcpClient.destroyed) {
      tcpClient.destroy();
    }
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket Error:', error);
    if (tcpClient && !tcpClient.destroyed) {
      tcpClient.destroy();
    }
  });
});

console.log(`✅ Enhanced Aircraft Data Proxy Server running on port ${WS_PORT}`);
console.log(`📡 Usage: Connect WebSocket to ws://localhost:${WS_PORT}/`);
console.log(`🎯 IoT sensor connection configured`);
console.log('');
console.log('🔗 Data flow: IoT Sensors (TCP) → WebSocket Parser → Browser');
console.log('✈️  Real-time aircraft tracking with parsed data');
console.log('');
console.log('🔧 Configuration:');
console.log(`   WS_PROXY_PORT=${WS_PORT} (WebSocket server port)`);
console.log(`   TCP_HOST=${DEFAULT_TCP_HOST === 'localhost' ? 'Not configured (using localhost)' : 'Configured via environment'}`);
console.log(`   TCP_PORT=${DEFAULT_TCP_PORT} (IoT sensor port)`);
