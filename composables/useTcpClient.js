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
    rawData: ''
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
        const wsUrl = `ws://${config.websocket.host}:${config.websocket.port}/tcp-proxy?host=${tcpConfig.host}&port=${tcpConfig.port}`
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          console.log('Connected to TCP proxy')
          isConnected.value = true
          connectionStatus.value = 'connected'
          reconnectAttempts = 0
        }

        ws.onmessage = (event) => {
          try {
            console.log('🚨🚨🚨 WEBSOCKET DATA RECEIVED 🚨🚨🚨')
            console.log('📡 Raw TCP data length:', event.data.length)
            console.log('📡 First 200 chars:', event.data.substring(0, 200))
            
            // Try to parse as JSON first (from TCP proxy)
            try {
              const proxyMessage = JSON.parse(event.data)
              
              if (proxyMessage.type === 'data') {
                // Extract the raw SBS-1 message and process it
                console.log('📨 Received JSON-wrapped TCP data:', proxyMessage.message.substring(0, 50) + '...')
                handleSBS1Message(proxyMessage.message)
              } else if (proxyMessage.type === 'connection') {
                console.log('TCP Proxy:', proxyMessage.message)
                if (proxyMessage.status === 'connected') {
                  isConnected.value = true
                  connectionStatus.value = 'connected'
                  console.log('✅ Real TCP connection established')
                } else if (proxyMessage.status === 'disconnected') {
                  isConnected.value = false
                  connectionStatus.value = 'disconnected'
                }
              } else if (proxyMessage.type === 'error') {
                console.error('TCP Proxy Error:', proxyMessage.message)
                connectionStatus.value = 'error'
              }
            } catch (jsonError) {
              console.log('📨 Data is not JSON, treating as raw SBS-1 messages')
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

  // SBS-1 BaseStation message handler
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
          console.log(`🚨🚨🚨 PROCESSING SBS-1 MESSAGE 🚨🚨🚨`)
          console.log(`📋 MSG parts: ${parts.slice(0, 11).join(',')}`)
          console.log(`📋 HexIdent: ${parts[4]}, Callsign: "${parts[10] || 'NO_CALLSIGN'}", TransType: ${parts[1]}`)
          const aircraftData = parseSBS1Message(parts)
          if (aircraftData) {
            console.log(`🚨🛩️ AIRCRAFT PARSED SUCCESSFULLY 🚨🛩️`)
            console.log(`✅ ${aircraftData.hexIdent}, callsign: "${aircraftData.callsign}", airline: "${aircraftData.airline}"`)
            updateAircraftData(aircraftData)
            // Log aircraft count every 10th message to see progress
            if (messageCount.value % 10 === 0) {
              console.log(`🚨📊 MESSAGE ${messageCount.value}: Now tracking ${sensorData.aircraft.length} aircraft 🚨📊`)
            }
          } else {
            console.log(`🚨❌ FAILED TO PARSE: ${rawMessage.substring(0, 80)}... 🚨❌`)
          }
        } else {
          console.log(`⏭️ Ignoring non-MSG or incomplete message: ${rawMessage.substring(0, 50)}...`)
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
      sensorData.aircraft[existingIndex] = {
        ...existing,
        ...Object.fromEntries(
          Object.entries(newData).filter(([key, value]) => value !== null && value !== undefined)
        ),
        lastSeen: new Date()
      }
    } else {
      // STRICT FILTERING: Only add aircraft with REAL callsigns from actual airlines
      if (newData.hexIdent && newData.hexIdent.trim() !== '') {
        
        // Check if we have a real callsign (not null, not "Unknown" and not empty)
        const hasRealCallsign = newData.callsign && 
                               newData.callsign !== 'Unknown' && 
                               newData.callsign !== null &&
                               newData.callsign.trim() !== ''
        
        // Get airline from the actual callsign (not hex ID)
        const airlineFromCallsign = hasRealCallsign ? getAirlineFromCallsign(newData.callsign) : 'Unknown'
        const hasRealAirline = airlineFromCallsign !== 'Unknown'
        
        // ONLY add aircraft that have BOTH real callsign AND real airline
        if (hasRealCallsign && hasRealAirline) {
          const aircraftToAdd = {
            ...newData,
            callsign: newData.callsign,
            airline: airlineFromCallsign
          }
          
          sensorData.aircraft.push(aircraftToAdd)
          console.log(`✅ Aircraft added: ${aircraftToAdd.hexIdent} ${aircraftToAdd.callsign} (${aircraftToAdd.airline})`)
        } else {
          // Skip ALL aircraft without real callsign AND airline
          console.log(`⏭️ Skipping aircraft: ${newData.hexIdent} - Callsign: '${newData.callsign}', Airline: '${airlineFromCallsign}'`)
        }
      }
    }

    // Remove stale aircraft (not seen for 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const beforeCount = sensorData.aircraft.length
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
