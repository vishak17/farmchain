class FRSService {
  calculateFRS(wOriginGrams, wDestGrams) {
    if (!wOriginGrams || wOriginGrams <= 0 || wDestGrams < 0) return 0;
    if (wDestGrams > wOriginGrams) return 10000;
    return Math.floor((wDestGrams * 10000) / wOriginGrams);
  }

  getGrade(frsBasisPoints, category) {
    let grade = 'C';
    let label = 'Warning';
    let action = 'Needs Review';
    let shouldDispute = true;

    if (category === 'HIGH_SENSITIVITY') {
      if (frsBasisPoints >= 9800) { grade = 'A'; label = 'Premium'; action = 'None'; shouldDispute = false; }
      else if (frsBasisPoints >= 9500) { grade = 'B'; label = 'Acceptable'; action = 'Monitor'; shouldDispute = false; }
    } else if (category === 'HIGH_TOLERANCE') {
      if (frsBasisPoints >= 9000) { grade = 'A'; label = 'Premium'; action = 'None'; shouldDispute = false; }
      else if (frsBasisPoints >= 8500) { grade = 'B'; label = 'Acceptable'; action = 'Monitor'; shouldDispute = false; }
    } else {
      // STANDARD
      if (frsBasisPoints >= 9600) { grade = 'A'; label = 'Premium'; action = 'None'; shouldDispute = false; }
      else if (frsBasisPoints >= 9200) { grade = 'B'; label = 'Acceptable'; action = 'Monitor'; shouldDispute = false; }
    }

    return { grade, label, action, shouldDispute };
  }

  detectAnomaly(custodyChain) {
    if (!custodyChain || custodyChain.length < 2) return { isAnomaly: false };
    
    for (let i = 1; i < custodyChain.length; i++) {
      const prev = custodyChain[i-1].frsBasisPoints;
      const curr = custodyChain[i].frsBasisPoints;
      
      // If FRS increased by more than 0.5% (50bp) - implies possible preservative tampering
      if (curr > prev + 50) {
        return { isAnomaly: true, suspectedLeg: i, type: 'PRESERVATIVE_SUSPECTED' };
      }
      
      // If FRS drops sharply (>300bp/3%) in one transit leg
      if (prev - curr > 300) {
        return { isAnomaly: false, degradationAlert: true, leg: i, drop: prev - curr };
      }
    }
    
    return { isAnomaly: false };
  }

  computePDEE(category, originFRS, transitHoursExpected) {
    let baseShelfLifeMinutes = 14400; // 10 days
    if (category === 'HIGH_SENSITIVITY') baseShelfLifeMinutes = 4320; // 3 days
    else if (category === 'HIGH_TOLERANCE') baseShelfLifeMinutes = 43200; // 30 days

    const transitMinutes = transitHoursExpected * 60;
    
    // Safety against division by zero
    if (transitMinutes === 0) {
      return new Date(Date.now() + baseShelfLifeMinutes * 60000); // from now
    }

    // Simplified dynamic decay projection
    const decayRate = (10000 - originFRS) / transitMinutes;
    const pdeeMinutes = decayRate > 0 
      ? Math.floor(baseShelfLifeMinutes - (baseShelfLifeMinutes * decayRate))
      : baseShelfLifeMinutes;
      
    // Return Date object
    return new Date(Date.now() + Math.max(0, pdeeMinutes) * 60000);
  }

  generateFRSTrend(custodyChain) {
    if (!custodyChain) return [];
    return custodyChain.map(record => ({
      nodeType: record.nodeType,
      frs: record.frsBasisPoints,
      timestamp: record.timestamp,
      grade: record.grade,
      label: record.label,
      gps: record.gpsLocation
    }));
  }

  getFRSColorClass(grade) {
    if (grade === 'A') return 'green';
    if (grade === 'B') return 'amber';
    return 'red';
  }
}

module.exports = new FRSService();
