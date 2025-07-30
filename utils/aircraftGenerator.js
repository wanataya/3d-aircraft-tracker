export const aircraftTypes = [
  'Boeing 737-800', 'Airbus A320', 'Boeing 777-300ER', 'Airbus A380', 
  'Boeing 787-9', 'Embraer E190', 'ATR 72-600', 'Boeing 747-8F'
];

export const airlines = [
  'Garuda Indonesia', 'Lion Air', 'Sriwijaya Air', 'Citilink',
  'Singapore Airlines', 'Emirates', 'Qatar Airways', 'AirAsia'
];

export const generateRandomAircraft = (customPos = null) => {
  const id = Date.now() + Math.random();
  
  const position = customPos || {
    lat: Math.random() * 17 - 11,    // -11 to 6 (Indonesia latitude range)
    lng: Math.random() * 46 + 95     // 95 to 141 (Indonesia longitude range)
  };
  
  return {
    id,
    name: `${airlines[Math.floor(Math.random() * airlines.length)]} ${Math.floor(Math.random() * 900 + 100)}`,
    type: aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)],
    position,
    altitude: Math.random() * 38000 + 5000, // 5,000-43,000 ft (typical cruising altitudes)
    speed: Math.random() * 400 + 200,       // 200-600 kts (typical airliner speeds)
    heading: Math.random() * 360,           // 0-360 degrees
    status: Math.random() > 0.1 ? 'active' : 'warning'
  };
};