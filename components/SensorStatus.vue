<template>
  <div class="sensor-status-panel">
    <h3 class="status-title">Details</h3>
    
    <!-- connection status -->
    <div class="status-section">
      <div class="status-target">
        Target: {{ tcpConfig.host }}:{{ tcpConfig.port }}
      </div>
      <div v-if="connectionStatus.includes('simulated')" class="status-mode simulation">
        Running in simulation mode
      </div>
      <!-- <div v-if="connectionStatus === 'connected'" class="status-mode connected">
        Real TCP connection active
      </div> -->
    </div>

    <!-- data statistics -->
    <div class="stats-section">
      <div class="stat-item">
        <span class="stat-label">Aircraft tracked:</span>
        <span class="stat-value">{{ aircraftCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Messages received:</span>
        <span class="stat-value">{{ messageCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Data source:</span>
        <span class="stat-value">{{ dataSource }}</span>
      </div>
      <div v-if="lastUpdate" class="stat-item">
        <span class="stat-label">Last update:</span>
        <span class="stat-value small">{{ lastUpdate }}</span>
      </div>
    </div>

    <!-- latest message preview -->
    <div v-if="lastMessage" class="message-preview">
      <div class="message-label">Latest Message:</div>
      <div class="message-content">{{ lastMessage }}</div>
    </div>

    <!-- help section -->
    <div class="help-section">
      <div class="help-title">Connection Info</div>
      <div class="help-content">
        <div v-if="connectionStatus.includes('simulated')">
          Running in simulation mode
        </div>
        <div v-if="connectionStatus.includes('simulated')">
          For real TCP: run "npm run proxy"
        </div>
        <div v-if="connectionStatus === 'connected'">
          Real-time data from IoT sensor
        </div>
        <div>SBS-1 BaseStation format • Updates every 2s</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  connectionStatus: {
    type: String,
    default: 'disconnected'
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  messageCount: {
    type: Number,
    default: 0
  },
  lastMessage: {
    type: String,
    default: ''
  },
  aircraftCount: {
    type: Number,
    default: 0
  },
  dataSource: {
    type: String,
    default: 'simulated'
  },
  lastUpdate: {
    type: String,
    default: ''
  },
  tcpConfig: {
    type: Object,
    default: () => ({ host: 'demo.example.com', port: 30003 })
  }
})

const connectionStatusColor = computed(() => {
  switch (props.connectionStatus) {
    case 'connected':
      return 'bg-green-500'
    case 'connecting':
      return 'bg-yellow-500 animate-pulse'
    case 'error':
    case 'failed':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
})
</script>

<style scoped>
.sensor-status-panel {
  background: #1e1e1e;
  color: white;
  padding: 0.5rem;
  border-radius: 0.5rem;
  opacity: 95%;
}

.status-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  margin-top: 0;
  color: white;
  padding-left: 0.1rem;
}

.status-section {
  margin-bottom: 1rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.status-label {
  font-weight: 500;
  color: white;
}

.status-value {
  margin-left: 0.5rem;
  text-transform: capitalize;
  color: white;
}

.status-target {
  font-size: 0.875rem;
  color: #d1d5db;
  opacity: 0.8;
  padding-left: 0.1rem;
}

.status-mode {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.status-mode.simulation {
  color: #facc15;
}

.status-mode.connected {
  color: #4ade80;
}

.stats-section {
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.stat-label {
  color: white;
  padding-left: 0.1rem;
}

.stat-value {
  font-family: 'Courier New', monospace;
  color: white;
}

.stat-value.small {
  font-size: 0.75rem;
}

.message-preview {
  margin: 1rem 0;
  padding: 0.5rem;
  background: #1f2937;
  border-radius: 0.375rem;
  font-size: 0.75rem;
}

.message-label {
  color: #9ca3af;
  margin-bottom: 0.25rem;
}

.message-content {
  font-family: 'Courier New', monospace;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.controls-section {
  margin: 1rem 0;
}

.controls-section button {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.help-section {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(30, 58, 138, 0.5);
  border-radius: 0.375rem;
  font-size: 0.75rem;
}

.help-title {
  color: #93c5fd;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.help-content {
  color: #bfdbfe;
}

.help-content div {
  margin-bottom: 0.25rem;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>