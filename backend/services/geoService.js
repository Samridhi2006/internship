export async function resolveIpLocation(ipAddress) {
  // Simple simulation of IP location resolver
  const mockLocations = [
    { country: "United States", region: "California", city: "San Francisco", latitude: 37.7749, longitude: -122.4194 },
    { country: "India", region: "Jharkhand", city: "Ranchi", latitude: 23.3441, longitude: 85.3096 },
    { country: "United Kingdom", region: "England", city: "London", latitude: 51.5074, longitude: -0.1278 },
    { country: "Germany", region: "Berlin", city: "Berlin", latitude: 52.5200, longitude: 13.4050 }
  ];
  
  // Return a stable mock location based on IP address numeric segments
  const segments = ipAddress.split('.');
  const sum = segments.reduce((acc, val) => acc + parseInt(val || '0', 10), 0);
  const idx = Math.abs(isNaN(sum) ? 0 : sum) % mockLocations.length;
  return mockLocations[idx] || mockLocations[0];
}
