<template>
  <div class="status-panel bg-gray-800 p-4 rounded-lg">
    <h2 class="text-xl font-semibold text-white">Tracking Status</h2>
    <div class="text-sm text-gray-300 mt-2">
      Active Aircraft: {{ activeAircraftCount }} | Last Update: {{ lastUpdate }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAircraftTracking } from '../composables/useAircraftTracking'

const { aircraftList, lastUpdate } = useAircraftTracking()

const activeAircraftCount = computed(() => aircraftList.value.length)
</script>

<style scoped>
.status-panel {
  border: 1px solid #4a4a4a;
}
</style>