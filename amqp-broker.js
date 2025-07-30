import dotenv from 'dotenv';
import net from 'net';
import rhea from 'rhea';

dotenv.config();

/**
 * Simple AMQP Broker Server
 * A lightweight AMQP-compatible broker for development and testing
 * 
 * Configuration via environment variables:
 * - AMQP_BROKER_PORT: AMQP broker port (default: 5672)
 * 
 * Run this with: node amqp-broker.js
 */


const BROKER_PORT = process.env.AMQP_BROKER_PORT || 5672;

console.log('🚀 Starting Simple AMQP Broker...');

// Create AMQP container
const container = rhea.create_container();
const messageQueues = new Map(); // Store messages for different queues

// Message queue management
function addMessageToQueue(queueName, message) {
  if (!messageQueues.has(queueName)) {
    messageQueues.set(queueName, []);
  }
  messageQueues.get(queueName).push(message);
  console.log(`📬 Message added to queue "${queueName}": ${JSON.stringify(message).substring(0, 100)}...`);
}

function getMessagesFromQueue(queueName) {
  return messageQueues.get(queueName) || [];
}

function clearQueue(queueName) {
  messageQueues.set(queueName, []);
}

// AMQP Broker functionality
container.on('connection_open', (context) => {
  console.log(`✅ AMQP Client connected from ${context.connection.remote.host}`);
});

container.on('connection_close', (context) => {
  console.log(`🔌 AMQP Client disconnected`);
});

container.on('sender_open', (context) => {
  console.log(`📤 Sender opened for: ${context.sender.target.address}`);
});

container.on('receiver_open', (context) => {
  const queueName = context.receiver.source.address;
  console.log(`📥 Receiver opened for queue: ${queueName}`);
  
  // Send any existing messages in the queue
  const messages = getMessagesFromQueue(queueName);
  messages.forEach(message => {
    context.receiver.send(message);
  });
  
  // Clear the queue after sending
  if (messages.length > 0) {
    clearQueue(queueName);
    console.log(`📨 Sent ${messages.length} queued messages to receiver`);
  }
});

container.on('message', (context) => {
  const queueName = context.receiver.target.address;
  console.log(`📬 Message received for queue "${queueName}"`);
  
  // Store the message for any connected receivers
  addMessageToQueue(queueName, context.message);
  
  // Forward to any connected receivers immediately
  // In a real broker, this would be more sophisticated
  setTimeout(() => {
    container.connections.forEach(connection => {
      connection.receivers.forEach(receiver => {
        if (receiver.source && receiver.source.address === queueName) {
          const messages = getMessagesFromQueue(queueName);
          messages.forEach(message => {
            receiver.send(message);
          });
          clearQueue(queueName);
        }
      });
    });
  }, 10);
});

// Start the AMQP broker server
const server = container.listen({ 
  port: BROKER_PORT,
  host: '0.0.0.0'
});

// Handle server events
server.on('listening', () => {
  console.log(`✅ Simple AMQP Broker running on port ${BROKER_PORT}`);
  console.log(`📡 Clients can connect to: amqp://localhost:${BROKER_PORT}`);
  console.log('');
  console.log('🔧 Broker Configuration:');
  console.log(`   AMQP_BROKER_PORT=${BROKER_PORT} (AMQP broker port)`);
  console.log('');
  console.log('📝 Available queues will be created automatically when first accessed');
  console.log('💡 This is a simple development broker - use RabbitMQ for production');
});

server.on('error', (error) => {
  console.error('❌ AMQP Broker Error:', error);
});
