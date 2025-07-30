<template>
  <div class="aircraft-details-panel">
    <div class="panel-header">
      <h3 class="panel-title">Aircraft Details</h3>
      <button class="close-button" @click="$emit('close')">×</button>
    </div>
    
    <div v-if="aircraft" class="aircraft-info">
      <!-- Aircraft Identification -->
      <div class="info-section">
        <h4 class="section-title">Identification</h4>
        <div class="info-item">
          <span class="label">Callsign:</span>
          <span class="value">{{ aircraft.callsign || 'Unknown' }}</span>
        </div>
        <div class="info-item">
          <span class="label">ICAO Hex:</span>
          <span class="value">{{ aircraft.icao || aircraft.hexIdent || 'Unknown' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Registration:</span>
          <span class="value">{{ aircraft.registration || 'Unknown' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Aircraft Type:</span>
          <span class="value">{{ aircraft.aircraftType || 'Unknown' }}</span>
        </div>
      </div>

      <!-- Flight Information -->
      <div class="info-section">
        <h4 class="section-title">Flight Information</h4>
        <div class="info-item">
          <span class="label">Airline:</span>
          <span class="value">{{ getAirlineName(aircraft.callsign) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Flight Status:</span>
          <span class="value status" :class="getStatusClass(aircraft)">{{ getFlightStatus(aircraft) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Emergency:</span>
          <span class="value emergency" :class="{ 'active': aircraft.emergency }">
            {{ aircraft.emergency ? 'EMERGENCY' : 'Normal' }}
          </span>
        </div>
      </div>

      <!-- Position & Navigation -->
      <div class="info-section">
        <h4 class="section-title">Position & Navigation</h4>
        <div class="info-item">
          <span class="label">Latitude:</span>
          <span class="value">{{ formatCoordinate(aircraft.latitude) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Longitude:</span>
          <span class="value">{{ formatCoordinate(aircraft.longitude) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Altitude:</span>
          <span class="value">{{ formatAltitude(aircraft.altitude) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Ground Speed:</span>
          <span class="value">{{ formatSpeed(aircraft.speed) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Track:</span>
          <span class="value">{{ formatHeading(aircraft.track) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Vertical Rate:</span>
          <span class="value">{{ formatVerticalRate(aircraft.verticalRate) }}</span>
        </div>
      </div>

      <!-- Data Source Information -->
      <div class="info-section">
        <h4 class="section-title">Data Source</h4>
        <div class="info-item">
          <span class="label">Source:</span>
          <span class="value">IoT Sensor</span>
        </div>
        <div class="info-item">
          <span class="label">Last Seen:</span>
          <span class="value">{{ formatLastSeen(aircraft.lastSeen) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Message Count:</span>
          <span class="value">{{ aircraft.messageCount || 0 }}</span>
        </div>
        <div class="info-item">
          <span class="label">Signal Quality:</span>
          <span class="value signal" :class="getSignalQuality(aircraft.lastSeen)">
            {{ getSignalText(aircraft.lastSeen) }}
          </span>
        </div>
      </div>
    </div>

    <div v-else class="no-aircraft">
      <div class="no-aircraft-icon">✈️</div>
      <p>Click an aircraft on the map to view details</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  aircraft: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

// Helper functions
const getAirlineName = (callsign) => {
  if (!callsign) return 'Unknown'
  
  const airlineMap = {
    'GIA': 'Garuda Indonesia',
    'LNI': 'Lion Air', 
    'SJY': 'Sriwijaya Air',
    'BTK': 'Batik Air',
    'CTV': 'Citilink',
    'AWQ': 'Indonesia AirAsia',
    'JT': 'Lion Air',
    'QG': 'Citilink', 
    'ID': 'Batik Air',
    'SJ': 'Sriwijaya Air',
    'PAS': 'Pacific Air',
    'TX': 'Military/Training'
  }

  const prefix = callsign.substring(0, 3)
  return airlineMap[prefix] || 'Unknown'
}

const getFlightStatus = (aircraft) => {
  if (!aircraft) return 'Unknown'
  
  if (aircraft.onGround) return 'On Ground'
  if (aircraft.emergency) return 'Emergency'
  if (aircraft.alert) return 'Alert'
  if (aircraft.spi) return 'Special Position Identification'
  
  return 'En Route'
}

const getStatusClass = (aircraft) => {
  if (!aircraft) return ''
  
  if (aircraft.emergency) return 'emergency'
  if (aircraft.alert) return 'alert'
  if (aircraft.onGround) return 'ground'
  
  return 'normal'
}

const getSignalQuality = (lastSeen) => {
  if (!lastSeen) return 'poor'
  
  const timeDiff = Date.now() - new Date(lastSeen).getTime()
  if (timeDiff < 10000) return 'excellent' // < 10 seconds
  if (timeDiff < 30000) return 'good' // < 30 seconds
  if (timeDiff < 60000) return 'fair' // < 1 minute
  
  return 'poor'
}

const getSignalText = (lastSeen) => {
  const quality = getSignalQuality(lastSeen)
  const qualityMap = {
    'excellent': 'Excellent',
    'good': 'Good', 
    'fair': 'Fair',
    'poor': 'Poor'
  }
  
  return qualityMap[quality]
}

const formatCoordinate = (coord) => {
  if (coord === null || coord === undefined) return 'Unknown'
  return coord.toFixed(6) + '°'
}

const formatAltitude = (alt) => {
  if (alt === null || alt === undefined) return 'Unknown'
  return alt.toLocaleString() + ' ft'
}

const formatSpeed = (speed) => {
  if (speed === null || speed === undefined) return 'Unknown'
  return speed + ' knots'
}

const formatHeading = (heading) => {
  if (heading === null || heading === undefined) return 'Unknown'
  return heading + '°'
}

const formatVerticalRate = (rate) => {
  if (rate === null || rate === undefined) return 'Unknown'
  const direction = rate > 0 ? '↗' : rate < 0 ? '↘' : '→'
  return `${Math.abs(rate)} ft/min ${direction}`
}

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Unknown'
  
  const timeDiff = Date.now() - new Date(lastSeen).getTime()
  const seconds = Math.floor(timeDiff / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  
  return new Date(lastSeen).toLocaleTimeString()
}
</script>

<style scoped>
.aircraft-details-panel {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid #334155;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  height: fit-content;
  max-height: calc(100vh - 40px);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(30, 41, 59, 0.8);
  border-bottom: 1px solid #334155;
}

.panel-title {
  color: #f1f5f9;
  font-weight: 600;
  font-size: 16px;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.aircraft-info {
  padding: 16px 20px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.info-section {
  margin-bottom: 24px;
}

.section-title {
  color: #60a5fa;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #334155;
  padding-bottom: 4px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.3);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 500;
}

.value {
  color: #f1f5f9;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  text-align: right;
}

.value.status.emergency {
  color: #f87171;
  font-weight: 600;
}

.value.status.alert {
  color: #fbbf24;
  font-weight: 600;
}

.value.status.ground {
  color: #94a3b8;
}

.value.status.normal {
  color: #4ade80;
}

.value.emergency.active {
  color: #f87171;
  font-weight: 600;
  animation: pulse 2s infinite;
}

.value.signal.excellent {
  color: #4ade80;
}

.value.signal.good {
  color: #60a5fa;
}

.value.signal.fair {
  color: #fbbf24;
}

.value.signal.poor {
  color: #f87171;
}

.no-aircraft {
  padding: 40px 20px;
  text-align: center;
  color: #94a3b8;
}

.no-aircraft-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-aircraft p {
  margin: 0;
  font-size: 14px;
}

/* Scrollbar styling */
.aircraft-info::-webkit-scrollbar {
  width: 6px;
}

.aircraft-info::-webkit-scrollbar-track {
  background: rgba(51, 65, 85, 0.3);
  border-radius: 3px;
}

.aircraft-info::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 3px;
}

.aircraft-info::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.7);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
