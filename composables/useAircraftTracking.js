import { ref, onMounted, onUnmounted } from 'vue'
import { useTcpClient } from './useTcpClient.js'

export const useAircraftTracking = () => {
  const aircraftList = ref([])
  const isTracking = ref(false)
  const lastUpdate = ref('')
  const dataSource = ref('simulated') // 'simulated' or 'sensor'
  
  // TCP client for IoT sensor data
  const tcpClient = useTcpClient()
  
  let updateInterval = null

  const startTracking = (source = 'simulated') => {
    isTracking.value = true
    dataSource.value = source
    
    if (source === 'sensor') {
      // Connect to TCP sensor
      tcpClient.connect()
      startSensorDataTracking()
    } else {
      // Use simulated data
      updateInterval = setInterval(updateAircraftPositions, 2000)
    }
  }

  const stopTracking = () => {
    isTracking.value = false
    
    if (dataSource.value === 'sensor') {
      tcpClient.disconnect()
    }
    
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  const startSensorDataTracking = () => {
    // Watch for new sensor data and update aircraft list
    const sensorInterval = setInterval(() => {
      if (!tcpClient.isConnected.value) return
      
      // Update aircraft list from sensor data
      if (tcpClient.sensorData.aircraft.length > 0) {
        aircraftList.value = tcpClient.sensorData.aircraft.map(sensorAircraft => ({
          id: sensorAircraft.icao,
          callsign: sensorAircraft.callsign || sensorAircraft.icao,
          position: {
            lat: sensorAircraft.latitude,
            lng: sensorAircraft.longitude,
            alt: sensorAircraft.altitude
          },
          speed: sensorAircraft.speed,
          heading: sensorAircraft.heading,
          status: 'active',
          type: 'Commercial',
          airline: getAirlineFromCallsign(sensorAircraft.callsign),
          lastSeen: sensorAircraft.timestamp
        }))
        
        lastUpdate.value = new Date().toLocaleTimeString()
      }
    }, 1000)
    
    return sensorInterval
  }

  const getAirlineFromCallsign = (callsign) => {
    if (!callsign) return 'Unknown'
    
    const airlineMap = {
      'GIA': 'Garuda Indonesia',
      'LNI': 'Lion Air',
      'SJY': 'Sriwijaya Air',
      'BTK': 'Batik Air',
      'CTV': 'Citilink'
    }
    
    const prefix = callsign.substring(0, 3)
    return airlineMap[prefix] || 'Unknown'
  }

  const updateAircraftPositions = () => {
    aircraftList.value.forEach(aircraft => {
      // Update position based on speed and heading
      const speedKts = aircraft.speed
      const speedKmh = speedKts * 1.852 // knots to km/h
      const speedMs = speedKmh / 3.6    // km/h to m/s
      const distanceKm = (speedMs * 2) / 1000 // distance in 2 seconds in km
      
      const latChange = (distanceKm / 111) * Math.cos(toRadians(aircraft.heading))
      const lngChange = (distanceKm / 111) * Math.sin(toRadians(aircraft.heading)) / Math.cos(toRadians(aircraft.position.lat))
      
      aircraft.position.lat += latChange
      aircraft.position.lng += lngChange
      
      // Keep aircraft within bounds
      if (aircraft.position.lng > 141) aircraft.position.lng = 141
      if (aircraft.position.lng < 95) aircraft.position.lng = 95
      if (aircraft.position.lat > 6) aircraft.position.lat = 6
      if (aircraft.position.lat < -11) aircraft.position.lat = -11
      
      // Random status changes
      if (Math.random() < 0.005) {
        aircraft.status = aircraft.status === 'active' ? 'warning' : 'active'
      }
    })
    lastUpdate.value = new Date().toLocaleTimeString()
  }

  const addAircraft = (aircraft) => {
    aircraftList.value.push(aircraft)
  }

  const clearAllAircraft = () => {
    aircraftList.value = []
  }

  onMounted(() => {
    // Initialize with some sample aircraft
    for (let i = 0; i < 5; i++) {
      addAircraft(generateRandomAircraft())
    }
    startTracking()
  })

  onUnmounted(() => {
    stopTracking()
  })

  return {
    aircraftList,
    isTracking,
    lastUpdate,
    dataSource,
    startTracking,
    stopTracking,
    addAircraft,
    clearAllAircraft,
    // TCP client properties
    tcpConnectionStatus: tcpClient.connectionStatus,
    tcpIsConnected: tcpClient.isConnected,
    tcpMessageCount: tcpClient.messageCount,
    tcpLastMessage: tcpClient.lastMessage
  }
}