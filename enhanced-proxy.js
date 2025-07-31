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

// Aircraft data storage for merging different message types
const aircraftDatabase = new Map();
const DATA_EXPIRY_TIME = 30000; // 30 seconds
const UPDATE_INTERVAL = 2000; // 2 seconds

// Clean up old aircraft data periodically
setInterval(() => {
  const now = Date.now();
  for (const [hexIdent, aircraft] of aircraftDatabase.entries()) {
    if (now - aircraft.lastUpdate > DATA_EXPIRY_TIME) {
      aircraftDatabase.delete(hexIdent);
      console.log(`🗑️  Removed expired aircraft: ${hexIdent}`);
    }
  }
}, DATA_EXPIRY_TIME);

// Enhanced ADS-B/Mode S message parser
function parseAircraftMessage(message) {
  const parts = message.split(',');
  if (parts[0] !== 'MSG' || parts.length < 22) {
    return null;
  }

  const msgType = parseInt(parts[1]);
  const hexIdent = parts[4];
  
  if (!hexIdent) {
    return null;
  }

  const now = Date.now();
  
  // Get or create aircraft record
  let aircraft = aircraftDatabase.get(hexIdent) || {
    hexIdent: hexIdent,
    firstSeen: now,
    lastUpdate: now,
    messageCount: 0,
    callsign: null,
    altitude: null,
    groundSpeed: null,
    track: null,
    latitude: null,
    longitude: null,
    verticalRate: null,
    squawk: null,
    category: null,
    onGround: false,
    alert: false,
    emergency: false,
    spi: false
  };

  aircraft.lastUpdate = now;
  aircraft.messageCount++;

  // Parse different message types
  switch (msgType) {
    case 1: // ES Identification and Category
      if (parts[10] && parts[10].trim()) {
        aircraft.callsign = parts[10].trim();
      }
      if (parts[17]) {
        aircraft.category = parseInt(parts[17]);
      }
      break;
      
    case 2: // ES Surface Position Message
      aircraft.onGround = true;
      if (parts[14] && parts[15]) {
        aircraft.latitude = parseFloat(parts[14]);
        aircraft.longitude = parseFloat(parts[15]);
      }
      if (parts[12]) {
        aircraft.groundSpeed = parseInt(parts[12]);
      }
      if (parts[13]) {
        aircraft.track = parseInt(parts[13]);
      }
      break;
      
    case 3: // ES Airborne Position Message
      aircraft.onGround = false;
      if (parts[11]) {
        aircraft.altitude = parseInt(parts[11]);
      }
      if (parts[14] && parts[15]) {
        aircraft.latitude = parseFloat(parts[14]);
        aircraft.longitude = parseFloat(parts[15]);
      }
      if (parts[18]) {
        aircraft.alert = parts[18] === '1';
      }
      if (parts[19]) {
        aircraft.emergency = parts[19] === '1';
      }
      if (parts[20]) {
        aircraft.spi = parts[20] === '1';
      }
      break;
      
    case 4: // ES Airborne Velocity Message
      if (parts[12]) {
        aircraft.groundSpeed = parseInt(parts[12]);
      }
      if (parts[13]) {
        aircraft.track = parseInt(parts[13]);
      }
      if (parts[16]) {
        aircraft.verticalRate = parseInt(parts[16]);
      }
      break;
      
    case 5: // Surveillance Alt Message
      if (parts[11]) {
        aircraft.altitude = parseInt(parts[11]);
      }
      if (parts[18]) {
        aircraft.alert = parts[18] === '1';
      }
      if (parts[19]) {
        aircraft.emergency = parts[19] === '1';
      }
      if (parts[20]) {
        aircraft.spi = parts[20] === '1';
      }
      break;
      
    case 6: // Surveillance ID Message
      if (parts[17]) {
        aircraft.squawk = parts[17];
      }
      if (parts[18]) {
        aircraft.alert = parts[18] === '1';
      }
      if (parts[19]) {
        aircraft.emergency = parts[19] === '1';
      }
      if (parts[20]) {
        aircraft.spi = parts[20] === '1';
      }
      break;
      
    case 7: // Air To Air Message
      if (parts[11]) {
        aircraft.altitude = parseInt(parts[11]);
      }
      break;
      
    case 8: // All Call Reply
      // Basic message, just update last seen
      break;
      
    default:
      console.log(`🔍 Unknown message type: ${msgType}`);
      break;
  }

  // Store updated aircraft data
  aircraftDatabase.set(hexIdent, aircraft);

  return {
    messageType: msgType,
    hexIdent: aircraft.hexIdent,
    callsign: aircraft.callsign,
    altitude: aircraft.altitude,
    groundSpeed: aircraft.groundSpeed,
    track: aircraft.track,
    latitude: aircraft.latitude,
    longitude: aircraft.longitude,
    verticalRate: aircraft.verticalRate,
    squawk: aircraft.squawk,
    category: aircraft.category,
    onGround: aircraft.onGround,
    alert: aircraft.alert,
    emergency: aircraft.emergency,
    spi: aircraft.spi,
    messageCount: aircraft.messageCount,
    firstSeen: aircraft.firstSeen,
    lastUpdate: aircraft.lastUpdate,
    timestamp: new Date().toISOString(),
    source: 'iot-sensors'
  };
}

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const tcpHost = query.host || DEFAULT_TCP_HOST;
  const tcpPort = parseInt(query.port) || DEFAULT_TCP_PORT;

  console.log(`🔗 New WebSocket connection, connecting to IoT sensors ${tcpHost}:${tcpPort}`);

  // Send periodic aircraft updates
  const updateInterval = setInterval(() => {
    const now = Date.now();
    const aircraftList = [];
    
    for (const [hexIdent, aircraft] of aircraftDatabase.entries()) {
      // Only send aircraft with recent updates
      if (now - aircraft.lastUpdate < DATA_EXPIRY_TIME) {
        aircraftList.push({
          hexIdent: aircraft.hexIdent,
          callsign: aircraft.callsign,
          altitude: aircraft.altitude,
          groundSpeed: aircraft.groundSpeed,
          track: aircraft.track,
          latitude: aircraft.latitude,
          longitude: aircraft.longitude,
          verticalRate: aircraft.verticalRate,
          squawk: aircraft.squawk,
          category: aircraft.category,
          onGround: aircraft.onGround,
          alert: aircraft.alert,
          emergency: aircraft.emergency,
          spi: aircraft.spi,
          messageCount: aircraft.messageCount,
          age: Math.round((now - aircraft.lastUpdate) / 1000),
          timestamp: new Date().toISOString()
        });
      }
    }

    // Sort aircraft by altitude (lowest first, null/undefined altitudes last)
    aircraftList.sort((a, b) => {
      // Handle null/undefined altitudes
      if (a.altitude == null && b.altitude == null) return 0;
      if (a.altitude == null) return 1;  // null goes to end
      if (b.altitude == null) return -1; // null goes to end
      
      // Sort by altitude (ascending - lowest first)
      return a.altitude - b.altitude;
    });

    if (aircraftList.length > 0) {
      // Add altitude range info for logging
      const altitudes = aircraftList.filter(a => a.altitude != null).map(a => a.altitude);
      const minAlt = altitudes.length > 0 ? Math.min(...altitudes) : null;
      const maxAlt = altitudes.length > 0 ? Math.max(...altitudes) : null;
      
      ws.send(JSON.stringify({
        type: 'aircraft-update',
        count: aircraftList.length,
        aircraft: aircraftList,
        altitudeRange: {
          min: minAlt,
          max: maxAlt,
          withAltitude: altitudes.length,
          total: aircraftList.length
        },
        timestamp: new Date().toISOString()
      }));
      
      const rangeInfo = minAlt !== null ? ` (alt: ${minAlt}ft-${maxAlt}ft)` : '';
      console.log(`📊 Sent update for ${aircraftList.length} aircraft${rangeInfo} - sorted by altitude`);
    }
  }, UPDATE_INTERVAL);

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
            // Send immediate update for significant changes
            const hasPosition = aircraftData.latitude && aircraftData.longitude;
            const hasMovement = aircraftData.groundSpeed || aircraftData.track;
            const hasAltitude = aircraftData.altitude;
            
            if (hasPosition || hasMovement || hasAltitude) {
              const logData = [];
              if (aircraftData.callsign) logData.push(`${aircraftData.callsign}`);
              if (hasPosition) logData.push(`pos: ${aircraftData.latitude?.toFixed(4)},${aircraftData.longitude?.toFixed(4)}`);
              if (hasAltitude) logData.push(`alt: ${aircraftData.altitude}ft`);
              if (aircraftData.groundSpeed) logData.push(`spd: ${aircraftData.groundSpeed}kt`);
              if (aircraftData.track) logData.push(`hdg: ${aircraftData.track}°`);
              
              console.log(`✈️  [MSG${aircraftData.messageType}] ${aircraftData.hexIdent} ${logData.join(' | ')}`);
              
              ws.send(JSON.stringify({
                type: 'aircraft-data',
                data: aircraftData,
                raw: message.trim(),
                timestamp: new Date().toISOString()
              }));
            }
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
    clearInterval(updateInterval);
    if (tcpClient && !tcpClient.destroyed) {
      tcpClient.destroy();
    }
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket Error:', error);
    clearInterval(updateInterval);
    if (tcpClient && !tcpClient.destroyed) {
      tcpClient.destroy();
    }
  });
});

console.log(`✅ Enhanced Aircraft Data Proxy Server running on port ${WS_PORT}`);
console.log(`📡 Usage: Connect WebSocket to ws://localhost:${WS_PORT}/`);
console.log(`🎯 Enhanced ADS-B/Mode S parsing configured`);
console.log('');
console.log('🔗 Data flow: IoT Sensors (TCP) → Enhanced Parser → WebSocket → Browser');
console.log('✈️  Real-time aircraft tracking with merged data from multiple message types');
console.log('📊 Aircraft database with 2-second updates and 30-second expiry');
console.log('');
console.log('🔧 Configuration:');
console.log(`   WS_PROXY_PORT=${WS_PORT} (WebSocket server port)`);
console.log(`   TCP_HOST=${DEFAULT_TCP_HOST === 'localhost' ? 'Not configured (using localhost)' : 'Configured via environment'}`);
console.log(`   TCP_PORT=${DEFAULT_TCP_PORT} (ADS-B/Mode S data port)`);
console.log(`   UPDATE_INTERVAL=${UPDATE_INTERVAL}ms (Aircraft update frequency)`);
console.log(`   DATA_EXPIRY_TIME=${DATA_EXPIRY_TIME}ms (Aircraft data expiry time)`);
