<template>
  <div class="aircraft-table-container">
    <div class="table-header">
      <h3 class="text-white text-lg font-semibold mb-3">
        Detected Aircraft ({{ aircraft.length }})
        <span v-if="altitudeRange.min != null" class="altitude-badge">
          {{ altitudeRange.min }}ft - {{ altitudeRange.max }}ft
        </span>
      </h3>
      <div class="text-white text-sm mb-3 altitude-info">
        Live Aircraft Tracking • Sorted by altitude (lowest first)
      </div>
    </div>

    <div class="table-wrapper">
      <table class="aircraft-table">
        <thead>
          <tr>
            <th>Hex ID</th>
            <th>Callsign</th>
            <th>Airline</th>
            <th>Altitude</th>
            <th>Speed</th>
            <th>Track</th>
            <th>Position</th>
            <th>Squawk</th>
            <th>Status</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="aircraft.length === 0">
            <td colspan="10" class="no-data">No aircraft detected yet...</td>
          </tr>
          <tr
            v-for="plane in sortedAircraft"
            :key="plane.hexIdent"
            class="aircraft-row"
            :class="getRowClass(plane)"
          >
            <td class="hex-id">
              <code>{{ plane.hexIdent }}</code>
            </td>
            <td class="callsign">
              <span class="font-semibold">{{ plane.callsign }}</span>
            </td>
            <td class="airline">
              {{ plane.airline }}
            </td>
            <td class="altitude">
              <span v-if="plane.altitude">
                {{ formatAltitude(plane.altitude) }}
              </span>
              <span v-else class="no-data">—</span>
            </td>
            <td class="speed">
              <span v-if="plane.groundSpeed">
                {{ plane.groundSpeed }} kts
              </span>
              <span v-else class="no-data">—</span>
            </td>
            <td class="track">
              <span v-if="plane.track !== null"> {{ plane.track }}° </span>
              <span v-else class="no-data">—</span>
            </td>
            <td class="position">
              <span v-if="plane.latitude && plane.longitude">
                {{ formatPosition(plane.latitude, plane.longitude) }}
              </span>
              <span v-else class="no-data">—</span>
            </td>
            <td class="squawk">
              <code v-if="plane.squawk">{{ plane.squawk }}</code>
              <span v-else class="no-data">—</span>
            </td>
            <td class="status">
              <div class="status-indicators">
                <span v-if="plane.emergency" class="status-badge emergency"
                  >EMG</span
                >
                <span v-if="plane.alert" class="status-badge alert">ALT</span>
                <span v-if="plane.spi" class="status-badge spi">SPI</span>
                <span v-if="plane.isOnGround" class="status-badge ground"
                  >GND</span
                >
                <span v-if="!hasAnyStatus(plane)" class="status-badge normal"
                  >OK</span
                >
              </div>
            </td>
            <td class="last-seen">
              {{ formatLastSeen(plane.lastSeen) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- <div class="table-footer">
      <div class="text-white text-xs opacity-75">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </div>
    </div> -->
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  aircraft: {
    type: Array,
    default: () => [],
  },
  altitudeRange: {
    type: Object,
    default: () => ({ min: null, max: null, withAltitude: 0, total: 0 }),
  },
});

// Sort aircraft by altitude (lowest first, no altitude data last)
const sortedAircraft = computed(() => {
  return [...props.aircraft].sort((a, b) => {
    // Handle null/undefined altitudes
    if (a.altitude == null && b.altitude == null) return 0;
    if (a.altitude == null) return 1; // null goes to end
    if (b.altitude == null) return -1; // null goes to end

    // Sort by altitude (ascending - lowest first)
    return a.altitude - b.altitude;
  });
});

// Format altitude with commas
const formatAltitude = (altitude) => {
  return altitude.toLocaleString() + " ft";
};

// Format position coordinates
const formatPosition = (lat, lon) => {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
};

// Format last seen time
const formatLastSeen = (timestamp) => {
  const now = new Date();
  const lastSeen = new Date(timestamp);
  const diffMs = now - lastSeen;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return `${diffSec}s ago`;
  } else if (diffSec < 3600) {
    return `${Math.floor(diffSec / 60)}m ago`;
  } else {
    return lastSeen.toLocaleTimeString();
  }
};

// Check if aircraft has any status flags
const hasAnyStatus = (plane) => {
  return plane.emergency || plane.alert || plane.spi || plane.isOnGround;
};

// Get row class based on aircraft status
const getRowClass = (plane) => {
  if (plane.emergency) return "emergency-row";
  if (plane.alert) return "alert-row";
  if (plane.isOnGround) return "ground-row";
  return "";
};
</script>

<style scoped>
.aircraft-table-container {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 0.5rem;
  color: white;
  opacity: 95%;
}

.table-header {
  border-radius: 6px;
  padding: 0rem 0.5rem 0.5rem 0.1rem;
  margin-top: 0rem;
}

.table-header h3 {
  color: #f9fafb;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0;
  flex-wrap: wrap;
}

.altitude-badge {
  background: linear-gradient(45deg, #3b82f6, #1d4ed8);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  transition: all 0.3s ease;
  border: 1px solid;
  border-color: #3b82f6;
}

.altitude-info {
  color: #9ca3af;
  font-size: 0.875rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 400;
}

.table-header h3::before {
  font-size: 1.25rem;
}

.table-header .text-sm {
  color: #9ca3af;
  font-size: 0.875rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 400;
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 180px);
  min-height: 300px;
  border-radius: 6px;
  border: 1px solid #374151;

  /* Custom mini scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}

/* Webkit browsers (Chrome, Safari, Edge) */
.table-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: #1f2937;
  border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
  border: 1px solid #374151;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

.table-wrapper::-webkit-scrollbar-corner {
  background: #1f2937;
}

.aircraft-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  background: #111827;
}

.aircraft-table th {
  background: #374151;
  color: #f9fafb;
  padding: 0.2rem 0.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #4b5563;
  position: sticky;
  top: 0px;
  z-index: 10;
}

.aircraft-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #374151;
  vertical-align: middle;
}

.aircraft-row {
  transition: background-color 0.2s;
}

.aircraft-row:hover {
  background: #1f2937;
}

.emergency-row {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
}

.alert-row {
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
}

.ground-row {
  background: rgba(107, 114, 128, 0.1);
  border-left: 3px solid #6b7280;
}

.hex-id code {
  background: #374151;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 0.75rem;
  color: #93c5fd;
}

.callsign {
  color: #60a5fa;
}

.no-data {
  color: #6b7280;
  font-style: italic;
  text-align: center;
}

.status-indicators {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.status-badge {
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.emergency {
  background: #dc2626;
  color: white;
}

.status-badge.alert {
  background: #d97706;
  color: white;
}

.status-badge.spi {
  background: #7c3aed;
  color: white;
}

.status-badge.ground {
  background: #4b5563;
  color: white;
}

.status-badge.normal {
  background: #059669;
  color: white;
}

.table-footer {
  margin-top: 0.75rem;
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .aircraft-table {
    font-size: 0.75rem;
  }

  .aircraft-table th,
  .aircraft-table td {
    padding: 0.375rem 0.25rem;
  }

  .table-wrapper {
    max-height: calc(100vh - 200px);
    min-height: 280px;
  }
}

@media (max-width: 480px) {
  .table-wrapper {
    max-height: calc(100vh - 160px);
    min-height: 220px;
  }

  .aircraft-table {
    font-size: 0.7rem;
  }

  .aircraft-table th,
  .aircraft-table td {
    padding: 0.25rem 0.125rem;
  }

  /* Smaller scrollbar for mobile */
  .table-wrapper::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
}
</style>
