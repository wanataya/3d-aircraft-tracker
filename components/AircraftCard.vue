<template>
  <div class="aircraft-card bg-gray-700 p-4 rounded border-l-4" :class="statusColor">
    <h3 class="font-semibold text-white">{{ aircraft.name }}</h3>
    <p class="text-sm text-gray-300">Type: {{ aircraft.type }}</p>
    <p class="text-xs text-gray-400 mt-1">
      Lat: {{ aircraft.position.lat.toFixed(4) }}<br>
      Lng: {{ aircraft.position.lng.toFixed(4) }}<br>
      Alt: {{ aircraft.altitude.toFixed(0) }} ft<br>
      Speed: {{ aircraft.speed.toFixed(0) }} kts<br>
      Heading: {{ aircraft.heading.toFixed(0) }}°
    </p>
    <p class="text-xs text-gray-400 mt-1">Status: {{ aircraft.status }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineProps({
  aircraft: {
    type: Object,
    required: true
  }
})

const statusColor = computed(() => {
  return aircraft.status === 'active' ? 'border-green-500' : 'border-yellow-500'
})
</script>

<style scoped>
.aircraft-card {
  transition: border-color 0.3s;
}
</style>