import { ref } from 'vue';

export function useMapControls(map) {
  const zoomLevel = ref(map.getZoom());

  const zoomIn = () => {
    map.zoomIn();
    zoomLevel.value = map.getZoom();
  };

  const zoomOut = () => {
    map.zoomOut();
    zoomLevel.value = map.getZoom();
  };

  const panTo = (lat, lng) => {
    map.panTo([lat, lng]);
  };

  return {
    zoomLevel,
    zoomIn,
    zoomOut,
    panTo,
  };
}