<template>
  <div class="aircraft-tracker">
    <!-- Left Aircraft Details Panel -->
    <div v-if="selectedAircraft" class="left-panel">
      <AircraftDetails 
        :aircraft="selectedAircraft" 
        @close="selectedAircraft = null" 
      />
    </div>
    
    <!-- Full Screen Map Background -->
    <div class="fullscreen-map">
      <AircraftMap3D 
        ref="mapRef" 
        :aircraft="throttledAircraftData" 
        @aircraft-clicked="handleAircraftClick"
      />
    </div>
    
    <!-- Floating Panels Container -->
    <div class="floating-panels">
      <!-- TCP Status Panel -->
      <div class="floating-panel">
        <div class="panel-header" @click="toggleStatusPanel">
          <div class="header-left">
            <h3 class="panel-title">TCP Connection Status:</h3>
            <span class="status-badge" :class="getStatusBadgeClass">{{ connectionStatus }}</span>
          </div>
          <button class="minimize-button">{{ statusMinimized ? '−' : '−' }}</button>
        </div>
        <div class="panel-content" :class="{ 'minimized': statusMinimized, 'expanded': !statusMinimized }">
          <SensorStatus
            :connection-status="connectionStatus"
            :is-connected="isConnected"
            :message-count="messageCount"
            :last-message="lastMessage"
            :aircraft-count="aircraftCount"
            :data-source="dataSource"
            :last-update="lastUpdate"
            :tcp-config="tcpConfig"
          />
        </div>
      </div>
      
      <!-- Aircraft Table Panel -->
      <div class="floating-panel">
        <div class="panel-header" @click="toggleTablePanel">
          <h3 class="panel-title">Aircraft Detection ({{ aircraftCount }})</h3>
          <button class="minimize-button">{{ tableMinimized ? '−' : '−' }}</button>
        </div>
        <div class="panel-content" :class="{ 'minimized': tableMinimized, 'expanded': !tableMinimized }">
          <AircraftTable :aircraft="throttledAircraftData" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AircraftMap3D from "~/components/AircraftMap3D.vue";
import SensorStatus from "~/components/SensorStatus.vue";
import AircraftTable from "~/components/AircraftTable.vue";
import AircraftDetails from "~/components/AircraftDetails.vue";
import { useTcpClient } from '~/composables/useTcpClient.js';

const mapRef = ref(null);

// Panel visibility state
const statusMinimized = ref(false);
const tableMinimized = ref(false);
const selectedAircraft = ref(null);

// TCP Client integration
const { 
  isConnected, 
  connectionStatus, 
  lastMessage, 
  messageCount, 
  sensorData,
  tcpConfig,
  connect,
  disconnect: _disconnect
} = useTcpClient();

// Throttled aircraft data - updates every 2 seconds to reduce visual spam
const throttledAircraftData = ref([]);
let lastUpdateTime = 0;

// Watch for aircraft data changes and throttle updates
const updateThrottledData = () => {
  const now = Date.now();
  if (now - lastUpdateTime > 2000) { // 2 second throttle
    throttledAircraftData.value = [...sensorData.aircraft];
    lastUpdateTime = now;
  }
};

// Set up interval to check for updates
onMounted(() => {
  setInterval(() => {
    updateThrottledData();
  }, 1000); // Check every second, but only update every 2 seconds
});

// Computed properties for status panel
const aircraftCount = computed(() => sensorData.aircraft?.length || 0);
const dataSource = computed(() => isConnected.value ? 'sensor' : 'simulated');
const lastUpdate = computed(() => sensorData.lastUpdate ? new Date(sensorData.lastUpdate).toLocaleTimeString() : '');

// Computed property for status badge styling
const getStatusBadgeClass = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'status-connected';
    case 'connecting':
      return 'status-connecting';
    case 'error':
    case 'failed':
    case 'disconnected':
      return 'status-disconnected';
    default:
      return 'status-disconnected';
  }
});

// Panel toggle functions
const toggleStatusPanel = () => {
  statusMinimized.value = !statusMinimized.value;
}

const toggleTablePanel = () => {
  tableMinimized.value = !tableMinimized.value;
}

// Aircraft click handler
const handleAircraftClick = (aircraftData) => {
  console.log('Aircraft selected:', aircraftData);
  selectedAircraft.value = aircraftData;
}

onMounted(() => {
  console.log('🛰️ Aircraft Tracker initialized');
  console.log(`📡 TCP Client ready for IoT sensor at ${tcpConfig.host}:${tcpConfig.port}`);
  
  // Auto-connect to TCP sensor on page load
  console.log('🔄 Auto-connecting to TCP sensor...');
  connect();
});
</script>

<style scoped>
/* Global responsive setup */
* {
  box-sizing: border-box;
}

.aircraft-tracker {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  min-height: 100vh;
  min-width: 100vw;
}

.left-panel {
  position: fixed !important;
  top: 10px !important;
  left: 10px !important;
  bottom: auto !important;
  right: auto !important;
  z-index: 2147483647 !important;
  width: min(350px, calc(100vw - 20px));
  max-width: calc(100vw - 20px);
  pointer-events: auto !important;
}

.fullscreen-map {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  min-width: 100vw;
  min-height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  z-index: 1;
  overflow: hidden;
}

.floating-panels {
  position: fixed !important;
  top: 10px !important;
  right: 10px !important;
  bottom: auto !important;
  left: auto !important;
  z-index: 2147483647 !important;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(450px, calc(100vw - 20px));
  min-width: min(350px, calc(100vw - 20px));
  width: auto;
  pointer-events: auto !important;
}

.floating-panel {
  background: rgba(30, 30, 30, 0.95) !important;
  border: 1px solid #444;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative !important;
  pointer-events: auto !important;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #444;
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  margin: 0;
}

.minimize-button {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.minimize-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  transition: all 0.3s ease;
  border: 1px solid;
}

.status-connected {
  background-color: #10b981;
  border-color: #059669;
  color: #ffffff;
}

.status-connecting {
  background-color: #f59e0b;
  border-color: #d97706;
  color: #ffffff;
  animation: pulse 2s infinite;
}

.status-disconnected {
  background-color: #ef4444;
  border-color: #dc2626;
  color: #ffffff;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.panel-content {
  transition: all 0.3s ease;
  overflow: hidden;
}

.panel-content.minimized {
  max-height: 0;
  padding: 0;
}

.panel-content.expanded {
  max-height: min(600px, calc(100vh - 120px));
  padding: 8px;
}

.floating-panel:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  transform: translateY(-2px);
}

/* Responsive design for smaller screens */
@media (max-width: 768px) {
  .left-panel {
    left: 10px !important;
    right: auto !important;
    width: min(350px, calc(100vw - 20px));
    max-width: calc(100vw - 20px);
  }
  
  .floating-panels {
    right: 10px !important;
    left: auto !important;
    bottom: auto !important;
    top: 10px !important;
    max-width: min(400px, calc(100vw - 20px));
    min-width: min(300px, calc(100vw - 20px));
  }
  
  .floating-panel {
    margin: 0 0 10px 0;
  }
  
  .panel-content.expanded {
    max-height: min(500px, calc(100vh - 130px));
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .left-panel {
    left: 5px !important;
    right: auto !important;
    width: calc(100vw - 10px);
    max-width: calc(100vw - 10px);
    top: 5px !important;
  }
  
  .floating-panels {
    top: 350px !important;
    right: 5px !important;
    left: 5px !important;
    bottom: auto !important;
    max-width: calc(100vw - 10px);
    min-width: calc(100vw - 10px);
    width: calc(100vw - 10px);
  }
  
  .panel-content.expanded {
    padding: 8px;
    max-height: min(400px, calc(100vh - 140px));
  }
}

/* Extra small screens */
@media (max-width: 360px) {
  .left-panel {
    width: calc(100vw - 6px);
    max-width: calc(100vw - 6px);
    left: 3px !important;
    top: 3px !important;
  }
  
  .floating-panels {
    width: calc(100vw - 6px);
    max-width: calc(100vw - 6px);
    min-width: calc(100vw - 6px);
    left: 3px !important;
    right: 3px !important;
    top: 320px !important;
  }
  
  .panel-content.expanded {
    max-height: min(300px, calc(100vh - 160px));
    padding: 6px;
  }
}

/* Landscape orientation for mobile devices */
@media (max-width: 768px) and (orientation: landscape) {
  .left-panel {
    width: min(300px, calc(50vw - 15px));
    max-width: calc(50vw - 15px);
  }
  
  .floating-panels {
    left: auto !important;
    right: 10px !important;
    top: 10px !important;
    width: min(300px, calc(50vw - 15px));
    max-width: calc(50vw - 15px);
    min-width: min(250px, calc(50vw - 15px));
  }
  
  .panel-content.expanded {
    max-height: calc(100vh - 180px);
  }
}
</style>
