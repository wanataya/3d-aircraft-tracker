// filepath: aircraft-tracker-3d/utils/coordinateUtils.js
export const toRadians = (degrees) => degrees * Math.PI / 180;

export const toDegrees = (radians) => radians * 180 / Math.PI;

export const haversineDistance = (coords1, coords2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(coords2.lat - coords1.lat);
  const dLon = toRadians(coords2.lng - coords1.lng);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coords1.lat)) * Math.cos(toRadians(coords2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

export const midpoint = (coords1, coords2) => {
  const lat = (coords1.lat + coords2.lat) / 2;
  const lng = (coords1.lng + coords2.lng) / 2;
  return { lat, lng };
};