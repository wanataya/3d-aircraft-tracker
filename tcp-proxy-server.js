/**
 * TCP-to-WebSocket Proxy Server
 * This server bridges WebSocket connections from the browser to TCP connections
 * 
 * Configuration via environment variables:
 * - WS_PROXY_PORT: WebSocket server port (default: 8080)
 * - TCP_HOST: Default TCP host if not specified in query (default: localhost)
 * - TCP_PORT: Default TCP port if not specified in query (default: 30003)
 * 
 * Run this with: node tcp-proxy-server.js
 */

// Load environment variables from .env file
require('dotenv').config();

const WebSocket = require('ws');
const net = require('net');
const url = require('url');

// Configuration from environment variables
const WS_PORT = process.env.WS_PROXY_PORT || 8080;
const DEFAULT_TCP_HOST = process.env.TCP_HOST || 'localhost';
const DEFAULT_TCP_PORT = process.env.TCP_PORT || 30003;

console.log('🚀 Starting TCP-to-WebSocket Proxy Server...');

const wss = new WebSocket.Server({
  port: WS_PORT,
  verifyClient: (info) => {
    console.log(`📡 WebSocket connection attempt from: ${info.origin}`);
    return true;
  }
});

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const tcpHost = query.host || DEFAULT_TCP_HOST;
  const tcpPort = parseInt(query.port) || DEFAULT_TCP_PORT;

  console.log(`🔗 New WebSocket connection, proxying to TCP ${tcpHost}:${tcpPort}`);

  // Create TCP connection to the target server
  const tcpClient = new net.Socket();
  
  // Handle TCP connection
  tcpClient.connect(tcpPort, tcpHost, () => {
    console.log(`✅ TCP connected to ${tcpHost}:${tcpPort}`);
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      message: `Connected to ${tcpHost}:${tcpPort}`
    }));
  });

  // Forward TCP data to WebSocket
  tcpClient.on('data', (data) => {
    try {
      const message = data.toString();
      console.log(`📨 TCP -> WS: ${message.substring(0, 100)}...`);
      
      ws.send(JSON.stringify({
        type: 'data',
        message: message,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error forwarding TCP data:', error);
    }
  });

  // Handle TCP errors
  tcpClient.on('error', (error) => {
    console.error(`❌ TCP Error connecting to ${tcpHost}:${tcpPort}:`, error.message);
    ws.send(JSON.stringify({
      type: 'error',
      message: `TCP connection failed: ${error.message}`
    }));
  });

  // Handle TCP close
  tcpClient.on('close', () => {
    console.log(`🔌 TCP connection to ${tcpHost}:${tcpPort} closed`);
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'disconnected',
      message: 'TCP connection closed'
    }));
  });

  // Forward WebSocket messages to TCP (if needed)
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'send' && tcpClient.writable) {
        tcpClient.write(data.message);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
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

console.log(`✅ TCP-to-WebSocket Proxy Server running on port ${WS_PORT}`);
console.log(`📡 Usage: Connect WebSocket to ws://localhost:${WS_PORT}/tcp-proxy?host=TARGET_HOST&port=TARGET_PORT`);
console.log(`🎯 Example: ws://localhost:${WS_PORT}/tcp-proxy?host=${DEFAULT_TCP_HOST}&port=${DEFAULT_TCP_PORT}`);
console.log('');
console.log('🔗 The proxy will forward data between WebSocket clients and TCP servers');
console.log('💡 To install dependencies: npm install ws');
console.log('');
console.log('🔧 Configuration via environment variables:');
console.log(`   WS_PROXY_PORT=${WS_PORT} (WebSocket server port)`);
console.log(`   TCP_HOST=${DEFAULT_TCP_HOST} (Default TCP host)`);
console.log(`   TCP_PORT=${DEFAULT_TCP_PORT} (Default TCP port)`);
