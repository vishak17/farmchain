class SensorSimulator {

  DECAY_RATES = {
    HIGH_SENSITIVITY: 0.0020,   // weight loss per hour as fraction
    STANDARD: 0.0005,
    HIGH_TOLERANCE: 0.0001
  }

  PRODUCE_CATEGORIES = {
    'spinach': 'HIGH_SENSITIVITY', 'lettuce': 'HIGH_SENSITIVITY',
    'coriander': 'HIGH_SENSITIVITY', 'mushroom': 'HIGH_SENSITIVITY',
    'strawberry': 'HIGH_SENSITIVITY', 'mint': 'HIGH_SENSITIVITY',
    'tomato': 'STANDARD', 'mango': 'STANDARD', 'apple': 'STANDARD',
    'capsicum': 'STANDARD', 'grapes': 'STANDARD', 'carrot': 'STANDARD',
    'beans': 'STANDARD', 'brinjal': 'STANDARD',
    'pumpkin': 'HIGH_TOLERANCE', 'coconut': 'HIGH_TOLERANCE',
    'onion': 'HIGH_TOLERANCE', 'garlic': 'HIGH_TOLERANCE',
    'jackfruit': 'HIGH_TOLERANCE', 'watermelon': 'HIGH_TOLERANCE',
    'potato': 'HIGH_TOLERANCE', 'ginger': 'HIGH_TOLERANCE'
  }

  // Karnataka route templates: [fromCity, toCity, waypoints as {lat,lng,name}[]]
  ROUTES = [
    { from: "Tumkur", to: "Bengaluru", waypoints: [
      {lat:13.3379, lng:77.1173, name:"Tumkur Mandi"},
      {lat:13.1000, lng:77.3000, name:"Nelamangala Depot"},
      {lat:13.0827, lng:77.5977, name:"Peenya Hub"},
      {lat:12.9716, lng:77.5946, name:"Bengaluru Market"}
    ]},
    { from: "Hassan", to: "Mysuru", waypoints: [
      {lat:13.0072, lng:76.1004, name:"Hassan Farm"},
      {lat:12.7000, lng:76.4000, name:"Sakleshpur Depot"},
      {lat:12.2958, lng:76.6394, name:"Mysuru APMC"}
    ]},
    { from: "Belagavi", to: "Hubballi", waypoints: [
      {lat:15.8497, lng:74.4977, name:"Belagavi Cold Storage"},
      {lat:15.5000, lng:75.0000, name:"Dharwad Transit Hub"},
      {lat:15.3647, lng:75.1240, name:"Hubballi Market"}
    ]},
    { from: "Mysuru", to: "Bengaluru", waypoints: [
      {lat:12.2958, lng:76.6394, name:"Mysuru Aggregator"},
      {lat:12.5000, lng:77.0000, name:"Mandya Depot"},
      {lat:12.9716, lng:77.5946, name:"Bengaluru Market"}
    ]}
  ]

  getCategory(produceType) {
    return this.PRODUCE_CATEGORIES[produceType.toLowerCase()] || 'STANDARD';
  }

  // Add Gaussian noise using Box-Muller transform
  gaussianNoise(mean, stddev) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return mean + stddev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  generateWeightReading(originWeightGrams, hoursSinceHarvest, produceType, injectTamper = false) {
    const category = this.getCategory(produceType);
    const decayRate = this.DECAY_RATES[category];
    let weight = originWeightGrams * Math.pow(1 - decayRate, hoursSinceHarvest);
    weight = this.gaussianNoise(weight, originWeightGrams * 0.002); // 0.2% noise
    weight = Math.max(weight, originWeightGrams * 0.5); // never below 50% (unrealistic)
    if (injectTamper) {
      const tamperPct = 0.03 + Math.random() * 0.05; // 3-8% theft
      weight *= (1 - tamperPct);
    }
    return Math.round(weight); // grams, integer
  }

  generateGPSForRoute(routeIndex, waypointIndex) {
    const route = this.ROUTES[routeIndex % this.ROUTES.length];
    const wp = route.waypoints[waypointIndex % route.waypoints.length];
    // Add small noise to simulate GPS imprecision
    const lat = wp.lat + (Math.random() - 0.5) * 0.001;
    const lng = wp.lng + (Math.random() - 0.5) * 0.001;
    return { lat: lat.toFixed(6), lng: lng.toFixed(6), location: wp.name };
  }

  generateTemperature(produceType, isColdChain = false) {
    if (isColdChain) return this.gaussianNoise(6, 1).toFixed(1); // 4-8°C
    const base = produceType === 'mushroom' ? 15 : 28;
    return this.gaussianNoise(base, 2).toFixed(1);
  }

  generateHumidity() {
    return this.gaussianNoise(70, 5).toFixed(1);
  }

  generateIoTPayload(batchId, nodeType, produceType, originWeightGrams, hoursSinceHarvest, routeIndex, waypointIndex) {
    const injectTamper = Math.random() < 0.05; // 5% chance
    const weight = this.generateWeightReading(originWeightGrams, hoursSinceHarvest, produceType, injectTamper);
    const gps = this.generateGPSForRoute(routeIndex, waypointIndex);
    const isColdChain = ['mushroom','strawberry','lettuce','spinach'].includes(produceType.toLowerCase());
    return {
      batchId,
      nodeType,
      timestamp: new Date().toISOString(),
      weightGrams: weight,
      gpsLocation: `${gps.lat},${gps.lng}`,
      locationName: gps.location,
      temperature: parseFloat(this.generateTemperature(produceType, isColdChain)),
      humidity: parseFloat(this.generateHumidity()),
      tamperDetected: injectTamper,
      sensorId: `SENSOR-${batchId}-${nodeType}`,
      isColdChain
    };
  }
}

module.exports = new SensorSimulator();
