// Indian Pincode to City and State mapping
// Uses pincode ranges for efficiency

interface PincodeData {
  city: string;
  state: string;
}

// Pincode ranges mapped to cities and states
// Format: [startRange, endRange, city, state]
const pincodeRanges: Array<[number, number, string, string]> = [
  // Mumbai (400000-400099)
  [400000, 400099, "Mumbai", "Maharashtra"],
  // Pune (411000-411099)
  [411000, 411099, "Pune", "Maharashtra"],
  // Delhi (110000-110099)
  [110000, 110099, "New Delhi", "Delhi"],
  // Bangalore (560000-560099)
  [560000, 560099, "Bangalore", "Karnataka"],
  // Hyderabad (500000-500099)
  [500000, 500099, "Hyderabad", "Telangana"],
  // Chennai (600000-600099)
  [600000, 600099, "Chennai", "Tamil Nadu"],
  // Kolkata (700000-700099)
  [700000, 700099, "Kolkata", "West Bengal"],
  // Ahmedabad (380000-380099)
  [380000, 380099, "Ahmedabad", "Gujarat"],
  // Surat (395000-395099)
  [395000, 395099, "Surat", "Gujarat"],
  // Jaipur (302000-302099)
  [302000, 302099, "Jaipur", "Rajasthan"],
  // Lucknow (226000-226099)
  [226000, 226099, "Lucknow", "Uttar Pradesh"],
  // Kanpur (208000-208099)
  [208000, 208099, "Kanpur", "Uttar Pradesh"],
  // Nagpur (440000-440099)
  [440000, 440099, "Nagpur", "Maharashtra"],
  // Indore (452000-452099)
  [452000, 452099, "Indore", "Madhya Pradesh"],
  // Thane (400600-400699)
  [400600, 400699, "Thane", "Maharashtra"],
  // Bhopal (462000-462099)
  [462000, 462099, "Bhopal", "Madhya Pradesh"],
  // Visakhapatnam (530000-530099)
  [530000, 530099, "Visakhapatnam", "Andhra Pradesh"],
  // Patna (800000-800099)
  [800000, 800099, "Patna", "Bihar"],
  // Vadodara (390000-390099)
  [390000, 390099, "Vadodara", "Gujarat"],
  // Ghaziabad (201000-201099)
  [201000, 201099, "Ghaziabad", "Uttar Pradesh"],
  // Ludhiana (141000-141099)
  [141000, 141099, "Ludhiana", "Punjab"],
  // Agra (282000-282099)
  [282000, 282099, "Agra", "Uttar Pradesh"],
  // Nashik (422000-422099)
  [422000, 422099, "Nashik", "Maharashtra"],
  // Faridabad (121000-121099)
  [121000, 121099, "Faridabad", "Haryana"],
  // Meerut (250000-250099)
  [250000, 250099, "Meerut", "Uttar Pradesh"],
  // Rajkot (360000-360099)
  [360000, 360099, "Rajkot", "Gujarat"],
  // Varanasi (221000-221099)
  [221000, 221099, "Varanasi", "Uttar Pradesh"],
  // Srinagar (190000-190099)
  [190000, 190099, "Srinagar", "Jammu and Kashmir"],
  // Amritsar (143000-143099)
  [143000, 143099, "Amritsar", "Punjab"],
  // Chandigarh (160000-160099)
  [160000, 160099, "Chandigarh", "Chandigarh"],
  // Coimbatore (641000-641099)
  [641000, 641099, "Coimbatore", "Tamil Nadu"],
  // Madurai (625000-625099)
  [625000, 625099, "Madurai", "Tamil Nadu"],
  // Raipur (492000-492099)
  [492000, 492099, "Raipur", "Chhattisgarh"],
  // Allahabad (211000-211099)
  [211000, 211099, "Allahabad", "Uttar Pradesh"],
  // Cochin (682000-682099)
  [682000, 682099, "Cochin", "Kerala"],
  // Jodhpur (342000-342099)
  [342000, 342099, "Jodhpur", "Rajasthan"],
  // Guwahati (781000-781099)
  [781000, 781099, "Guwahati", "Assam"],
];

// Function to get city and state from pincode
export const getCityStateFromPincode = (pincode: string): PincodeData | null => {
  if (!pincode || pincode.length !== 6) {
    return null;
  }

  const pincodeNum = parseInt(pincode, 10);
  
  if (isNaN(pincodeNum)) {
    return null;
  }

  // Find matching range
  for (const [start, end, city, state] of pincodeRanges) {
    if (pincodeNum >= start && pincodeNum <= end) {
      return { city, state };
    }
  }

  return null;
};
