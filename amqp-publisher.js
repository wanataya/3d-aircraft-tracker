import dotenv from 'dotenv';
import net from 'net';
import rhea from 'rhea';

dotenv.config();

/**
 * AMQP Data Publisher
 * Reads aircraft data from TCP source and publishes to AMQP queue
 * 
 * Configuration via environment variables:
 * - TCP_HOST: IoT sensor host
 * - TCP_PORT: IoT sensor port
 * - AMQP_HOST: AMQP broker host
 * - AMQP_PORT: AMQP broker port
 * - AMQP_USERNAME: AMQP username
 * - AMQP_PASSWORD: AMQP password
 * - AMQP_QUEUE: AMQP queue name
 */

// Configuration from environment variables
const TCP_HOST = process.env.TCP_HOST || 'localhost';
const TCP_PORT = process.env.TCP_PORT || 30003;
const AMQP_HOST = process.env.AMQP_HOST || 'localhost';
const AMQP_PORT = process.env.AMQP_PORT || 5673;
const AMQP_USERNAME = process.env.AMQP_USERNAME || 'guest';
const AMQP_PASSWORD = process.env.AMQP_PASSWORD || 'guest';
const AMQP_QUEUE = process.env.AMQP_QUEUE || 'aircraft-data';

console.log('🚀 Starting AMQP Data Publisher...');

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
    source: 'tcp-to-amqp'
  };
}

// Create AMQP container and connection
const container = rhea.create_container();
let amqpSender = null;
let tcpClient = null;

// Connect to AMQP broker
const connection = container.connect({
  host: AMQP_HOST,
  port: AMQP_PORT,
  username: AMQP_USERNAME,
  password: AMQP_PASSWORD
});

connection.on('connection_open', (context) => {
  console.log(`✅ Connected to AMQP broker at ${AMQP_HOST}:${AMQP_PORT}`);
  
  // Create sender for aircraft data
  amqpSender = connection.open_sender({
    target: AMQP_QUEUE
  });

  console.log(`📤 AMQP sender created for queue: ${AMQP_QUEUE}`);
  
  // Now connect to TCP source
  connectToTcpSource();
});

connection.on('connection_error', (context) => {
  console.error('❌ AMQP Connection Error:', context.connection.error);
});

connection.on('connection_close', (context) => {
  console.log('🔌 AMQP connection closed');
});

function connectToTcpSource() {
  console.log(`🔗 Connecting to TCP source ${TCP_HOST}:${TCP_PORT}...`);
  
  tcpClient = new net.Socket();
  
  tcpClient.connect(TCP_PORT, TCP_HOST, () => {
    console.log(`✅ TCP connected to aircraft data source ${TCP_HOST}:${TCP_PORT}`);
    console.log('📡 Starting data flow: TCP → AMQP → WebSocket');
  });

  // Handle TCP data and publish to AMQP
  tcpClient.on('data', (data) => {
    try {
      const messages = data.toString().split('\n');
      messages.forEach(message => {
        if (message.trim()) {
          const aircraftData = parseAircraftMessage(message.trim());
          
          if (aircraftData && aircraftData.hexIdent && amqpSender) {
            console.log(`✈️  Publishing aircraft ${aircraftData.hexIdent} ${aircraftData.callsign || 'unknown'} to AMQP queue`);
            
            // Publish to AMQP queue
            amqpSender.send({
              body: aircraftData,
              content_type: 'application/json'
            });
          }
        }
      });
    } catch (error) {
      console.error('Error processing TCP aircraft data:', error);
    }
  });

  // Handle TCP errors
  tcpClient.on('error', (error) => {
    console.error(`❌ TCP Error connecting to ${TCP_HOST}:${TCP_PORT}:`, error.message);
    // Try to reconnect after 5 seconds
    setTimeout(connectToTcpSource, 5000);
  });

  // Handle TCP close
  tcpClient.on('close', () => {
    console.log(`🔌 TCP connection to aircraft data source closed`);
    // Try to reconnect after 5 seconds
    setTimeout(connectToTcpSource, 5000);
  });
}

console.log(`🔧 Configuration:`);
console.log(`   TCP_HOST=${TCP_HOST} (Aircraft data source)`);
console.log(`   TCP_PORT=${TCP_PORT} (Aircraft data port)`);
console.log(`   AMQP_HOST=${AMQP_HOST} (AMQP broker host)`);
console.log(`   AMQP_PORT=${AMQP_PORT} (AMQP broker port)`);
console.log(`   AMQP_QUEUE=${AMQP_QUEUE} (Aircraft data queue)`);

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down AMQP data publisher...');
  if (tcpClient && !tcpClient.destroyed) {
    tcpClient.destroy();
  }
  if (connection) {
    connection.close();
  }
  process.exit(0);
});
