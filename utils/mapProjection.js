export const latLngToMercator = (lat, lng) => {
  const x = (lng + 180) * (256 / 360);
  const y = (256 / 2) - (256 * Math.log(Math.tan((Math.PI / 4) + (lat * Math.PI / 180) / 2)) / (2 * Math.PI));
  return { x, y };
};

export const mercatorToLatLng = (x, y) => {
  const lng = x * (360 / 256) - 180;
  const lat = (Math.atan(Math.exp((256 / 2 - y) * (2 * Math.PI / 256))) * 2 - Math.PI / 2) * (180 / Math.PI);
  return { lat, lng };
};