import { ref } from 'vue';

export function useWebGL(map) {
  const glContext = ref(null);

  const initializeWebGL = () => {
    const canvas = document.createElement('canvas');
    glContext.value = canvas.getContext('webgl');

    if (!glContext.value) {
      console.error('WebGL not supported, falling back on experimental-webgl');
      glContext.value = canvas.getContext('experimental-webgl');
    }

    if (!glContext.value) {
      alert('Your browser does not support WebGL');
    }

    // Set up WebGL context settings
    glContext.value.clearColor(0.0, 0.0, 0.0, 1.0);
    glContext.value.clear(glContext.value.COLOR_BUFFER_BIT);
  };

  const renderModel = (model) => {
    // Logic to render the 3D model on the map using WebGL
    // This will involve loading the model and drawing it in the WebGL context
  };

  return {
    glContext,
    initializeWebGL,
    renderModel,
  };
}