<template>
  <div class="control-panel bg-gray-800 p-4 rounded-lg mb-4 flex justify-between items-center">
    <div class="flex space-x-4">
      <button 
        @click="toggleTracking" 
        :class="isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
        class="px-4 py-2 rounded text-white font-medium transition-colors"
      >
        {{ isTracking ? 'Stop Tracking' : 'Start Tracking' }}
      </button>
      <button 
        @click="addRandomAircraft" 
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition-colors"
      >
        Add Aircraft
      </button>
      <button 
        @click="clearAllAircraft" 
        class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white font-medium transition-colors"
      >
        Clear All
      </button>
    </div>
    <div class="text-sm text-gray-300">
      Active Aircraft: {{ aircraftList.length }} | Last Update: {{ lastUpdate }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAircraftTracking } from '../composables/useAircraftTracking'

const { aircraftList, isTracking, lastUpdate, toggleTracking, addRandomAircraft, clearAllAircraft } = useAircraftTracking()
</script>

<style scoped>
.control-panel {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>