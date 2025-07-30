<template>
  <div class="map-container">
    <!-- Cesium 3D Globe Container -->
    <div
      ref="cesiumContainer"
      id="cesium-container"
      class="cesium-map"
    >
      <div
        v-if="!mapLoaded"
        class="loading-overlay"
      >
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p>Loading 3D Earth...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useTcpClient } from '../composables/useTcpClient.js';

// Props
const props = defineProps({
  aircraft: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['aircraft-clicked']);

const cesiumContainer = ref(null);
const mapLoaded = ref(false);

// TCP Client for IoT sensor
const { 
  isConnected, 
  connectionStatus, 
  lastMessage, 
  messageCount, 
  sensorData, 
  tcpConfig 
} = useTcpClient();

// Cesium variables
let viewer, aircraftEntities = [];
let animationActive = false;

const initCesiumMap = async () => {
  if (!cesiumContainer.value) return;
  
  try {
    console.log('Initializing Cesium 3D Globe...');
    
    // Create Cesium viewer with basic configuration
    viewer = new Cesium.Viewer(cesiumContainer.value, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: true,
      selectionIndicator: true,
    });
    
    // Set initial view to Indonesia
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(106.8456, -6.2088, 2000000), // Jakarta, Indonesia
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0
      }
    });

    // Add click handler for aircraft
    viewer.cesiumWidget.screenSpaceEventHandler.setInputAction((click) => {
      const pickedEntity = viewer.scene.pick(click.position);
      if (pickedEntity && pickedEntity.id && pickedEntity.id.aircraftData) {
        console.log('Aircraft clicked:', pickedEntity.id.aircraftData);
        emit('aircraft-clicked', pickedEntity.id.aircraftData);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Add sample aircraft
    await createSampleAircraft();    // Start animation
    startAircraftAnimation();
    
    mapLoaded.value = true;
    console.log('Cesium 3D Globe initialized successfully');
    
  } catch (error) {
    console.error('Error initializing Cesium:', error);
  }
};

const createSampleAircraft = async () => {
  // Clear existing entities
  aircraftEntities.forEach(entity => {
    viewer.entities.remove(entity);
  });
  aircraftEntities = [];

  let aircraftData = [];
  
  // First priority: Use aircraft prop data (from parent component)
  if (props.aircraft && props.aircraft.length > 0) {
    aircraftData = props.aircraft.map(sensorAircraft => ({
      id: sensorAircraft.icao || sensorAircraft.id,
      name: sensorAircraft.callsign || sensorAircraft.icao,
      position: { 
        lng: sensorAircraft.longitude, 
        lat: sensorAircraft.latitude, 
        alt: sensorAircraft.altitude || 35000 
      },
      speed: sensorAircraft.speed || 450,
      heading: sensorAircraft.heading || 0,
      airline: getAirlineFromCallsign(sensorAircraft.callsign),
      dataSource: 'IoT Sensor (Live)'
    }));
    console.log(`🛰️ Using ${aircraftData.length} aircraft from IoT sensor (prop data)`);
  }
  // Second priority: Use direct TCP sensor data (fallback)
  else if (sensorData.aircraft && sensorData.aircraft.length > 0) {
    // Use real sensor data from TCP client
    aircraftData = sensorData.aircraft.map(sensorAircraft => ({
      id: sensorAircraft.icao || sensorAircraft.id,
      name: sensorAircraft.callsign || sensorAircraft.icao,
      position: { 
        lng: sensorAircraft.longitude, 
        lat: sensorAircraft.latitude, 
        alt: sensorAircraft.altitude || 35000 
      },
      speed: sensorAircraft.speed || 450,
      heading: sensorAircraft.heading || 0,
      airline: getAirlineFromCallsign(sensorAircraft.callsign),
      dataSource: 'IoT Sensor (Direct)'
    }));
    console.log(`🛰️ Using ${aircraftData.length} aircraft from TCP sensor data (direct)`);
  } 
  // Last resort: Use simulated Indonesian flights
  else {
    // Fallback to simulated Indonesian flights
    aircraftData = [
      { 
        id: 'GA123', 
        name: 'Garuda Indonesia GA123',
        position: { lng: 106.8456, lat: -6.2088, alt: 35000 }, // Jakarta
        speed: 450,
        heading: 90,
        airline: 'Garuda Indonesia',
        dataSource: 'Simulated'
      },
      { 
        id: 'LN456', 
        name: 'Lion Air LN456',
        position: { lng: 107.6191, lat: -6.9175, alt: 38000 }, // Bandung
        speed: 480,
        heading: 45,
        airline: 'Lion Air',
        dataSource: 'Simulated'
      },
      { 
        id: 'SJ789', 
        name: 'Sriwijaya Air SJ789',
        position: { lng: 112.7521, lat: -7.2575, alt: 32000 }, // Surabaya
        speed: 420,
        heading: 180,
        airline: 'Sriwijaya Air',
        dataSource: 'Simulated'
      }
    ];
    console.log('Using simulated aircraft data (no TCP sensor data available)');
  }

  // Create aircraft entities
  aircraftData.forEach(flight => {
    // Map sensor aircraft data to display format
    const mappedAircraftData = {
      icao: flight.id,
      hexIdent: flight.id,
      callsign: flight.name,
      registration: flight.registration || null,
      aircraftType: flight.aircraftType || null,
      latitude: flight.position.lat,
      longitude: flight.position.lng,
      altitude: flight.position.alt,
      speed: flight.speed,
      track: flight.heading,
      heading: flight.heading,
      verticalRate: flight.verticalRate || null,
      onGround: flight.onGround || false,
      emergency: flight.emergency || false,
      alert: flight.alert || false,
      spi: flight.spi || false,
      lastSeen: flight.lastSeen || new Date(),
      messageCount: flight.messageCount || 0,
      dataSource: flight.dataSource,
      airline: flight.airline
    };

    const aircraft = viewer.entities.add({
      id: flight.id,
      name: flight.name,
      position: Cesium.Cartesian3.fromDegrees(
        flight.position.lng, 
        flight.position.lat, 
        flight.position.alt
      ),
      billboard: {
        image: createAircraftIcon(),
        scale: 0.8,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.NONE,
        rotation: Cesium.Math.toRadians(flight.heading)
      },
      label: {
        text: flight.id,
        font: '12pt sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, -50),
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE
      },
      description: `
        <div style="font-family: Arial, sans-serif;">
          <h3>${flight.name}</h3>
          <p><strong>ICAO:</strong> ${flight.id}</p>
          <p><strong>Airline:</strong> ${flight.airline || 'Unknown'}</p>
          <p><strong>Altitude:</strong> ${flight.position.alt.toLocaleString()} ft</p>
          <p><strong>Speed:</strong> ${flight.speed} knots</p>
          <p><strong>Heading:</strong> ${flight.heading}°</p>
          <p><strong>Status:</strong> En Route</p>
          <p><strong>Data Source:</strong> ${flight.dataSource}</p>
          <p><strong>TCP Server:</strong> ${tcpConfig.host}:${tcpConfig.port}</p>
          <p><strong>Connection:</strong> ${connectionStatus.value}</p>
        </div>
      `
    });
    
    // Store mapped aircraft data for click handler
    aircraft.aircraftData = mappedAircraftData;
    aircraft.flightData = flight;
    aircraftEntities.push(aircraft);
  });
};

const getAirlineFromCallsign = (callsign) => {
  if (!callsign) return 'Unknown';
  
  const airlineMap = {
    'GIA': 'Garuda Indonesia',
    'LNI': 'Lion Air',
    'SJY': 'Sriwijaya Air',
    'BTK': 'Batik Air',
    'CTV': 'Citilink'
  };
  
  const prefix = callsign.substring(0, 3);
  return airlineMap[prefix] || 'Unknown';
};

const createAircraftIcon = () => {
  // Create a simple aircraft icon
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  // Draw aircraft shape
  ctx.fillStyle = '#FF4444';
  ctx.beginPath();
  // Aircraft body
  ctx.ellipse(32, 32, 25, 8, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  // Wings
  ctx.fillStyle = '#FF6666';
  ctx.fillRect(10, 28, 44, 8);
  
  // Tail
  ctx.fillStyle = '#FF4444';
  ctx.fillRect(50, 20, 8, 24);
  
  return canvas.toDataURL();
};

const startAircraftAnimation = () => {
  if (!viewer || animationActive) return;
  
  animationActive = true;
  
  const animate = () => {
    if (!animationActive) return;
    
    // Simple animation - move aircraft slowly
    aircraftEntities.forEach(aircraft => {
      if (aircraft.flightData) {
        const flight = aircraft.flightData;
        const currentPosition = aircraft.position.getValue(Cesium.JulianDate.now());
        
        if (currentPosition) {
          const cartographic = Cesium.Cartographic.fromCartesian(currentPosition);
          
          // Very slow movement for demonstration
          const speedMs = flight.speed * 0.514444; // knots to m/s
          const distance = speedMs * 0.01; // very slow movement
          const deltaLat = (distance / 111000) * Math.cos(Cesium.Math.toRadians(flight.heading));
          const deltaLon = (distance / 111000) * Math.sin(Cesium.Math.toRadians(flight.heading));
          
          const newLat = cartographic.latitude + Cesium.Math.toRadians(deltaLat);
          const newLon = cartographic.longitude + Cesium.Math.toRadians(deltaLon);
          
          aircraft.position = Cesium.Cartesian3.fromRadians(newLon, newLat, cartographic.height);
        }
      }
    });
    
    requestAnimationFrame(animate);
  };
  
  animate();
};

const loadCesium = () => {
  return new Promise((resolve) => {
    if (window.Cesium) {
      resolve(true);
      return;
    }
    
    // Load Cesium CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Widgets/widgets.css';
    document.head.appendChild(cssLink);
    
    // Load Cesium JS
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Cesium.js';
    script.onload = () => {
      console.log('Cesium loaded successfully');
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load Cesium');
      resolve(false);
    };
    document.head.appendChild(script);
  });
};

onMounted(async () => {
  console.log("Component mounted, initializing Cesium 3D Globe...");
  console.log(`TCP Client configured for IoT sensor at ${tcpConfig.host}:${tcpConfig.port}`);
  
  await nextTick();
  
  // Load Cesium and initialize 3D globe
  const cesiumLoaded = await loadCesium();
  if (cesiumLoaded) {
    setTimeout(() => {
      initCesiumMap();
    }, 1000);
  }
});

// Watch for aircraft prop changes (primary data source)
watch(() => props.aircraft, () => {
  if (viewer && mapLoaded.value) {
    console.log('🛰️ Aircraft prop data updated, refreshing aircraft entities');
    createSampleAircraft();
  }
}, { deep: true });

// Watch for TCP sensor data changes (fallback data source)
watch(() => sensorData.aircraft, () => {
  if (viewer && mapLoaded.value) {
    console.log('🛰️ TCP sensor data updated, refreshing aircraft entities');
    createSampleAircraft();
  }
}, { deep: true });

// Watch message count
watch(messageCount, (count) => {
  console.log(`📡 Received ${count} messages from IoT sensor`);
});

onUnmounted(() => {
  try {
    // Stop animation
    animationActive = false;
    
    // Clean up Cesium
    if (viewer) {
      viewer.destroy();
    }
    
    // Clear entities
    aircraftEntities = [];
  } catch (error) {
    console.error("Error cleaning up Cesium:", error);
  }
});
</script>

<style scoped>
.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cesium-map {
  width: 100vw;
  height: 100vh;
  min-width: 100vw;
  min-height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  font-family: sans-serif;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  color: white;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #ffffff;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

/* Override Cesium default styles */
:deep(.cesium-viewer-bottom) {
  display: none !important;
}

:deep(.cesium-widget-credits) {
  display: none !important;
}

:deep(.cesium-viewer) {
  font-family: inherit;
  width: 100% !important;
  height: 100% !important;
}

:deep(.cesium-widget) {
  width: 100% !important;
  height: 100% !important;
}

:deep(.cesium-canvas) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .cesium-map {
    width: 100vw;
    height: 100vh;
  }
}

@media (max-width: 480px) {
  .cesium-map {
    width: 100vw;
    height: 100vh;
  }
  
  .loading-spinner {
    width: 36px;
    height: 36px;
    border-width: 2px;
  }
}

/* Loading spinner animation */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
