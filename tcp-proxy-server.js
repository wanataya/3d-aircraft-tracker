import dotenv from 'dotenv';
dotenv.config();

import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';
import rhea from 'rhea';

/**
 * AMQP-to-WebSocket Proxy Server
 * This server bridges WebSocket connections from browsers to AMQP connections
 * 
 * Configuration via environment variables:
 * - WS_PROXY_PORT: WebSocket server port (default: 8080)
 * - AMQP_HOST: AMQP broker host (keep private!)
 * - AMQP_PORT: AMQP broker port (default: 5672)
 * - AMQP_USERNAME: AMQP username (keep private!)
 * - AMQP_PASSWORD: AMQP password (keep private!)
 * - AMQP_QUEUE: AMQP queue name (default: aircraft-data)
 * 
 * Run this with: node tcp-proxy-server.js
 */



// Configuration from environment variables
const WS_PORT = process.env.WS_PROXY_PORT || 8080;

// AMQP Configuration (secured via environment variables)
const AMQP_CONFIG = {
  host: process.env.AMQP_HOST || 'localhost',
  port: process.env.AMQP_PORT || 5672,
  username: process.env.AMQP_USERNAME || 'guest',
  password: process.env.AMQP_PASSWORD || 'guest',
  queue: process.env.AMQP_QUEUE || 'aircraft-data',
  exchange: process.env.AMQP_EXCHANGE || 'aircraft'
};

console.log('🚀 Starting AMQP-to-WebSocket Proxy Server...');

const wss = new WebSocketServer({
  port: WS_PORT,
  verifyClient: (info) => {
    console.log(`📡 WebSocket connection attempt from: ${info.origin}`);
    return true;
  }
});

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;

  console.log(`🔗 New WebSocket connection, setting up AMQP proxy`);
  setupAMQPProxy(ws, query);
});

// AMQP Proxy Setup
function setupAMQPProxy(ws, query) {
  console.log(`📡 Setting up AMQP connection to ${AMQP_CONFIG.host}:${AMQP_CONFIG.port}`);
  
  const connection = rhea.connect({
    host: AMQP_CONFIG.host,
    port: AMQP_CONFIG.port,
    username: AMQP_CONFIG.username,
    password: AMQP_CONFIG.password,
    reconnect: true
  });

  connection.on('connection_open', () => {
    console.log(`✅ AMQP connected to broker at ${AMQP_CONFIG.host}:${AMQP_CONFIG.port}`);
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      message: 'Connected to AMQP broker'
    }));
  });

  connection.on('connection_error', (error) => {
    console.error(`❌ AMQP Connection Error:`, error.message);
    ws.send(JSON.stringify({
      type: 'error',
      message: `AMQP connection failed: ${error.message}`
    }));
  });

  // Create receiver for the specified queue
  const queueName = query.queue || AMQP_CONFIG.queue;
  console.log(`📨 Listening to AMQP queue: ${queueName}`);
  
  const receiver = connection.open_receiver(queueName);

  receiver.on('message', (context) => {
    try {
      const message = context.message.body;
      console.log(`📨 AMQP -> WS: ${JSON.stringify(message).substring(0, 100)}...`);
      
      ws.send(JSON.stringify({
        type: 'data',
        message: typeof message === 'string' ? message : JSON.stringify(message),
        timestamp: new Date().toISOString(),
        source: 'amqp'
      }));
    } catch (error) {
      console.error('Error forwarding AMQP data:', error);
    }
  });

  // Handle WebSocket messages (send to AMQP if needed)
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'send' && connection.is_open()) {
        const sender = connection.open_sender(AMQP_CONFIG.queue);
        sender.send({ body: data.message });
        console.log(`📤 WS -> AMQP: Message sent to queue`);
      }
    } catch (error) {
      console.error('Error processing WebSocket message for AMQP:', error);
    }
  });

  // Handle WebSocket close
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    if (connection && connection.is_open()) {
      connection.close();
    }
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket Error:', error);
    if (connection && connection.is_open()) {
      connection.close();
    }
  });
}

console.log(`✅ AMQP-to-WebSocket Proxy Server running on port ${WS_PORT}`);
console.log(`📡 Usage: Connect WebSocket to ws://localhost:${WS_PORT}/`);
console.log(`🎯 Example: ws://localhost:${WS_PORT}/?queue=aircraft-data`);
console.log('');
console.log('🔗 The proxy will forward data between WebSocket clients and AMQP broker');
console.log('💡 To install dependencies: npm install ws rhea');
console.log('');
console.log('🔧 Configuration via environment variables:');
console.log(`   WS_PROXY_PORT=${WS_PORT} (WebSocket server port)`);
console.log(`   AMQP_HOST=${AMQP_CONFIG.host} (AMQP broker host)`);
console.log(`   AMQP_PORT=${AMQP_CONFIG.port} (AMQP broker port)`);
console.log(`   AMQP_QUEUE=${AMQP_CONFIG.queue} (Default AMQP queue)`);
