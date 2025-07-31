import { ref, reactive, onUnmounted } from 'vue'
import { useTrackerConfig } from './useAppConfig.js'

export const useTcpClient = () => {
  const { config } = useTrackerConfig()
  
  const isConnected = ref(false)
  const connectionStatus = ref('disconnected')
  const lastMessage = ref('')
  const messageCount = ref(0)
  const sensorData = reactive({
    aircraft: [],
    lastUpdate: null,
    rawData: '',
    altitudeRange: {
      min: null,
      max: null,
      withAltitude: 0,
      total: 0
    }
  })

  let ws = null
  let reconnectTimeout = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5

  // TCP server configuration from environment variables
  const tcpConfig = {
    host: config.tcp.host,
    port: config.tcp.port
  }

  const connect = async () => {
    try {
      console.log(`TCP Client: Ready to connect to IoT sensor at ${tcpConfig.host}:${tcpConfig.port}`)
      connectionStatus.value = 'connecting'

      // Note: Direct TCP connections from browsers are not possible due to security restrictions
      // This requires a WebSocket-to-TCP proxy server or similar backend service
      
      // Check if WebSocket proxy is available
      try {
        const wsUrl = `ws://${config.websocket.host}:${config.websocket.port}/`
        console.log('🔗 Connecting to WebSocket proxy at:', wsUrl)
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          console.log('Connected to enhanced aircraft data proxy')
          isConnected.value = true
          connectionStatus.value = 'connected'
          reconnectAttempts = 0
        }

        ws.onmessage = (event) => {
          try {
            // Try to parse as JSON first (from enhanced proxy)
            try {
              const proxyMessage = JSON.parse(event.data)
              
              if (proxyMessage.type === 'aircraft-data') {
                // Handle enhanced proxy aircraft data format
                handleEnhancedAircraftData(proxyMessage.data)
              } else if (proxyMessage.type === 'aircraft-update') {
                // Handle bulk aircraft updates with altitude range info
                handleAircraftUpdate(proxyMessage)
              } else if (proxyMessage.type === 'connection') {
                console.log('Enhanced Proxy:', proxyMessage.message)
                if (proxyMessage.status === 'connected') {
                  isConnected.value = true
                  connectionStatus.value = 'connected'
                  console.log('✅ Real IoT sensor connection established')
                } else if (proxyMessage.status === 'disconnected') {
                  isConnected.value = false
                  connectionStatus.value = 'disconnected'
                }
              } else if (proxyMessage.type === 'error') {
                console.error('Enhanced Proxy Error:', proxyMessage.message)
                connectionStatus.value = 'error'
              }
            } catch (_jsonError) {
              // Handle raw SBS-1 messages directly
              handleSBS1Message(event.data)
            }
          } catch (error) {
            console.error('❌ Error processing WebSocket message:', error)
          }
        }

        ws.onclose = () => {
          console.log('TCP proxy connection closed')
          isConnected.value = false
          connectionStatus.value = 'disconnected'
          scheduleReconnect()
        }

        ws.onerror = async (error) => {
          console.error('WebSocket error:', error)
          console.log('Failed to connect to TCP proxy - waiting for real connection')
          ws = null
          isConnected.value = false
          connectionStatus.value = 'error'
          // Don't fall back to simulation - wait for real connection
          console.log('⏳ No simulation mode - waiting for real TCP connection only')
        }

      } catch (error) {
        console.error('Failed to connect to TCP proxy:', error)
        console.log('Make sure tcp-proxy-server.js is running on port 8080')
        connectionStatus.value = 'error'
        // Don't fall back to simulation - only show real data
        console.log('⏳ Waiting for real TCP connection - no simulation data')
      }
      
    } catch (error) {
      console.error('Connection error:', error)
      connectionStatus.value = 'error'
      console.log('⏳ Only real TCP data will be displayed - no simulation')
    }
  }

  // Handle bulk aircraft updates from enhanced proxy
  const handleAircraftUpdate = (updateMessage) => {
    try {
      if (updateMessage.aircraft && Array.isArray(updateMessage.aircraft)) {
        // Update the aircraft list with the sorted, filtered data from the proxy
        sensorData.aircraft = updateMessage.aircraft
        sensorData.lastUpdate = new Date()
        
        // Update altitude range information
        if (updateMessage.altitudeRange) {
          sensorData.altitudeRange = {
            min: updateMessage.altitudeRange.min,
            max: updateMessage.altitudeRange.max,
            withAltitude: updateMessage.altitudeRange.withAltitude,
            total: updateMessage.altitudeRange.total
          }
        }
        
        console.log(`📊 Aircraft update: ${updateMessage.count} aircraft, range: ${sensorData.altitudeRange.min}ft-${sensorData.altitudeRange.max}ft`)
      }
    } catch (error) {
      console.error('Error handling aircraft update:', error)
    }
  }

  // SBS-1 BaseStation message handler
  // Handle enhanced proxy aircraft data format
  const handleEnhancedAircraftData = (aircraftData) => {
    try {
      
      // Process aircraft only if they have real callsigns (not just hex ID)
      if (aircraftData.hexIdent && aircraftData.callsign && 
          aircraftData.callsign.trim() !== '' &&
          aircraftData.callsign !== aircraftData.hexIdent &&
          aircraftData.callsign !== 'unknown') {
        
        // Convert to format expected by the frontend
        const processedAircraft = {
          hexIdent: aircraftData.hexIdent,
          icao: aircraftData.hexIdent,
          callsign: aircraftData.callsign,
          latitude: aircraftData.latitude,
          longitude: aircraftData.longitude,
          altitude: aircraftData.altitude,
          groundSpeed: aircraftData.groundSpeed,
          track: aircraftData.track,
          squawk: aircraftData.squawk,
          verticalRate: aircraftData.verticalRate,
          timestamp: aircraftData.timestamp,
          airline: getAirlineFromCallsign(aircraftData.callsign)
        }
        
        updateAircraftData(processedAircraft)
        messageCount.value++
        sensorData.lastUpdate = new Date()
        
        // Debug: Log final stored aircraft data
        const storedAircraft = sensorData.aircraft.find(a => a.hexIdent === processedAircraft.hexIdent)
        if (storedAircraft && messageCount.value % 50 === 0) {
          console.log(`� Currently tracking ${sensorData.aircraft.length} aircraft`)
        }
      } else {
        console.log(`⏭️ Skipping aircraft ${aircraftData.hexIdent} - No real callsign (has: '${aircraftData.callsign}')`)
      }
    } catch (error) {
      console.error('❌ Error processing enhanced aircraft data:', error)
    }
  }

  const handleSBS1Message = (rawData) => {
    try {
      // Handle multiple messages that might be concatenated
      const messages = rawData.split('\n').filter(msg => msg.trim().length > 0)
      
      messages.forEach(rawMessage => {
        rawMessage = rawMessage.trim()
        if (!rawMessage) return
        
        lastMessage.value = rawMessage
        messageCount.value++
        sensorData.rawData = rawMessage
        sensorData.lastUpdate = new Date()

        // Parse SBS-1 BaseStation message format
        const parts = rawMessage.split(',')
        
        if (parts[0] === 'MSG' && parts.length >= 10) {
          const aircraftData = parseSBS1Message(parts)
          if (aircraftData) {
            updateAircraftData(aircraftData)
            // Log progress periodically
            if (messageCount.value % 50 === 0) {
              console.log(`� Processed ${messageCount.value} messages, tracking ${sensorData.aircraft.length} aircraft`)
            }
          }
        }
      })
    } catch (error) {
      console.error('Error processing SBS-1 message:', error)
    }
  }

  // Parse SBS-1 BaseStation message according to http://woodair.net/sbs/article/barebones42_socket_data.htm
  const parseSBS1Message = (parts) => {
    try {
      const transmissionType = parseInt(parts[1])
      const hexIdent = parts[4]
      const callsign = parts[10]?.trim()
      const altitude = parts[11] ? parseInt(parts[11]) : null
      const groundSpeed = parts[12] ? parseInt(parts[12]) : null
      const track = parts[13] ? parseInt(parts[13]) : null
      const latitude = parts[14] ? parseFloat(parts[14]) : null
      const longitude = parts[15] ? parseFloat(parts[15]) : null
      const verticalRate = parts[16] ? parseInt(parts[16]) : null
      const squawk = parts[17]?.trim()
      const alert = parts[18] === '1'
      const emergency = parts[19] === '1'
      const spi = parts[20] === '1'
      const isOnGround = parts[21] === '1'

      // Only process messages with valid hex identifier
      if (!hexIdent) return null

      return {
        hexIdent,
        transmissionType,
        callsign: callsign || null, // Don't set to 'Unknown' - use null instead
        altitude,
        groundSpeed,
        track,
        latitude,
        longitude,
        verticalRate,
        squawk: squawk || '',
        alert,
        emergency,
        spi,
        isOnGround,
        timestamp: new Date(),
        lastSeen: new Date(),
        // Additional computed fields
        id: hexIdent,
        airline: getAirlineFromCallsign(callsign),
        country: getCountryFromHexIdent(hexIdent),
        transmissionTypeLabel: getTransmissionTypeLabel(transmissionType)
      }
    } catch (error) {
      console.error('Error parsing SBS-1 message:', error)
      return null
    }
  }

  // Update aircraft data with new information
  const updateAircraftData = (newData) => {
    const existingIndex = sensorData.aircraft.findIndex(a => a.hexIdent === newData.hexIdent)
    
    if (existingIndex >= 0) {
      // Update existing aircraft with new data from any message type
      const existing = sensorData.aircraft[existingIndex]
      
      // Only filter out undefined values, keep null values for fields that might be temporarily null
      const updatedData = {}
      Object.entries(newData).forEach(([key, value]) => {
        if (value !== undefined) {
          updatedData[key] = value
        }
      })
      
      sensorData.aircraft[existingIndex] = {
        ...existing,
        ...updatedData,
        lastSeen: new Date()
      }
    } else {
      // STRICT FILTERING: Only add aircraft with REAL callsigns (not just hex IDs)
      if (newData.hexIdent && newData.hexIdent.trim() !== '') {
        
        // Check if we have a real callsign (not null, not empty, and not same as hex ID)
        const hasRealCallsign = newData.callsign && 
                               newData.callsign.trim() !== '' &&
                               newData.callsign !== newData.hexIdent &&
                               newData.callsign !== 'unknown'
        
        if (hasRealCallsign) {
          // Get airline from the actual callsign
          const airlineFromCallsign = getAirlineFromCallsign(newData.callsign)
          
          const aircraftToAdd = {
            ...newData,
            callsign: newData.callsign,
            airline: airlineFromCallsign,
            lastSeen: new Date()
          }
          
          sensorData.aircraft.push(aircraftToAdd)
        } else {
          console.log(`⏭️ Skipping aircraft ${newData.hexIdent} - No real callsign`)
        }
      }
    }

    // Remove stale aircraft (not seen for 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const _beforeCount = sensorData.aircraft.length
    sensorData.aircraft = sensorData.aircraft.filter(aircraft => 
      aircraft.lastSeen > fifteenMinutesAgo
    )
    
    // Sort aircraft by altitude (lowest first) - aircraft with no altitude go to the end
    sensorData.aircraft.sort((a, b) => {
      if (a.altitude === null || a.altitude === undefined) return 1
      if (b.altitude === null || b.altitude === undefined) return -1
      return a.altitude - b.altitude
    })
  }

  // Get airline from callsign
  const getAirlineFromCallsign = (callsign) => {
    if (!callsign || callsign === 'Unknown') {
      return 'Unknown'
    }

    const airlineMap = {
      // Indonesian Airlines - 3-character codes
      'GIA': 'Garuda Indonesia',
      'LNI': 'Lion Air',
      'SJY': 'Sriwijaya Air',
      'BTK': 'Batik Air',
      'CTV': 'Citilink',
      'AWQ': 'Indonesia AirAsia',
      'PAS': 'Pacific Air',
      'TRI': 'Trigana Air',
      'KAL': 'Kalstar Aviation',
      'SRW': 'Sriwijaya Air',
      'WON': 'Wings Air',
      'NAM': 'Nam Air',
      'SUP': 'Super Air Jet',
      'XAX': 'Xpress Air',
      'SJV': 'Sriwijaya Air',
      
      // Indonesian Airlines - 2-character codes (IATA)
      'GA': 'Garuda Indonesia',
      'JT': 'Lion Air',
      'SJ': 'Sriwijaya Air',
      'ID': 'Batik Air',
      'QG': 'Citilink',
      'QZ': 'Indonesia AirAsia',
      'IW': 'Wings Air',
      'IN': 'Nam Air',
      'IU': 'Super Air Jet',
      'XN': 'Xpress Air',
      'KD': 'Kalstar Aviation',
      'IL': 'Trigana Air',
      'IP': 'Pelita Air',
      '8B': 'TransNusa',
      
      // Regional Airlines
      'MV': 'Merpati Nusantara Airlines',
      'RI': 'Mandala Airlines',
      'SG': 'SpiceJet (Indonesia routes)',
      
      // Cargo Airlines
      'PO': 'Polar Air Cargo',
      'CV': 'Cargolux',
      
      // International Airlines common in Indonesia
      'SQ': 'Singapore Airlines',
      'MH': 'Malaysia Airlines',
      'TG': 'Thai Airways',
      'CX': 'Cathay Pacific',
      'QF': 'Qantas',
      'AK': 'AirAsia Malaysia',
      'FD': 'Thai AirAsia',
      '3K': 'Jetstar Asia',
      'TR': 'Scoot',
      'MAS': 'Malaysia Airlines'
    }

    // Try different prefix lengths
    const callsignUpper = callsign.toUpperCase()
    
    // Try 3-character prefix first
    const prefix3 = callsignUpper.substring(0, 3)
    if (airlineMap[prefix3]) {
      return airlineMap[prefix3]
    }
    
    // Try 2-character prefix
    const prefix2 = callsignUpper.substring(0, 2)
    if (airlineMap[prefix2]) {
      return airlineMap[prefix2]
    }
    
    return 'Unknown'
  }

  // Get country from hex identifier
  const getCountryFromHexIdent = (hexIdent) => {
    if (!hexIdent) return 'Unknown'
    
    // Indonesia hex codes start with 8A, 75, etc.
    if (hexIdent.startsWith('8A') || hexIdent.startsWith('75')) {
      return 'Indonesia'
    }
    
    return 'Unknown'
  }

  // Get transmission type label
  const getTransmissionTypeLabel = (type) => {
    const types = {
      1: 'ES Identification and Category',
      2: 'ES Surface Position',
      3: 'ES Airborne Position',
      4: 'ES Airborne Velocity',
      5: 'Surveillance Alt',
      6: 'Surveillance ID',
      7: 'Air To Air',
      8: 'All Call Reply'
    }
    return types[type] || `Type ${type}`
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      ws = null
    }
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    
    isConnected.value = false
    connectionStatus.value = 'disconnected'
    console.log('TCP connection closed')
  }

  const scheduleReconnect = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++
      const delay = Math.pow(2, reconnectAttempts) * 1000 // Exponential backoff
      console.log(`Scheduling reconnect attempt ${reconnectAttempts} in ${delay}ms`)
      
      reconnectTimeout = setTimeout(() => {
        connect()
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
      connectionStatus.value = 'failed'
    }
  }

  // Auto cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    // State
    isConnected,
    connectionStatus,
    lastMessage,
    messageCount,
    sensorData,
    
    // Methods
    connect,
    disconnect,
    
    // Config
    tcpConfig
  }
}
