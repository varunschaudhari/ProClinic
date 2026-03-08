// Indian Cities and States data for autocomplete

export interface CityState {
  city: string;
  state: string;
}

// Popular Indian cities with their states
export const indianCities: CityState[] = [
  // Maharashtra
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Aurangabad", state: "Maharashtra" },
  { city: "Solapur", state: "Maharashtra" },
  { city: "Thane", state: "Maharashtra" },
  { city: "Pimpri-Chinchwad", state: "Maharashtra" },
  { city: "Kalyan-Dombivali", state: "Maharashtra" },
  { city: "Vasai-Virar", state: "Maharashtra" },
  { city: "Navi Mumbai", state: "Maharashtra" },
  { city: "Satara", state: "Maharashtra" },
  { city: "Kolhapur", state: "Maharashtra" },
  { city: "Sangli", state: "Maharashtra" },
  { city: "Jalgaon", state: "Maharashtra" },
  { city: "Amravati", state: "Maharashtra" },
  { city: "Nanded", state: "Maharashtra" },
  { city: "Latur", state: "Maharashtra" },
  { city: "Dhule", state: "Maharashtra" },
  { city: "Ahmednagar", state: "Maharashtra" },
  
  // Delhi
  { city: "New Delhi", state: "Delhi" },
  { city: "Delhi", state: "Delhi" },
  
  // Karnataka
  { city: "Bangalore", state: "Karnataka" },
  { city: "Mysore", state: "Karnataka" },
  { city: "Hubli", state: "Karnataka" },
  { city: "Mangalore", state: "Karnataka" },
  { city: "Belgaum", state: "Karnataka" },
  { city: "Gulbarga", state: "Karnataka" },
  { city: "Davangere", state: "Karnataka" },
  { city: "Shimoga", state: "Karnataka" },
  { city: "Bijapur", state: "Karnataka" },
  { city: "Raichur", state: "Karnataka" },
  
  // Telangana
  { city: "Hyderabad", state: "Telangana" },
  { city: "Warangal", state: "Telangana" },
  { city: "Nizamabad", state: "Telangana" },
  { city: "Karimnagar", state: "Telangana" },
  { city: "Ramagundam", state: "Telangana" },
  { city: "Khammam", state: "Telangana" },
  { city: "Mahbubnagar", state: "Telangana" },
  { city: "Nalgonda", state: "Telangana" },
  { city: "Adilabad", state: "Telangana" },
  { city: "Suryapet", state: "Telangana" },
  
  // Tamil Nadu
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Tiruchirappalli", state: "Tamil Nadu" },
  { city: "Salem", state: "Tamil Nadu" },
  { city: "Tirunelveli", state: "Tamil Nadu" },
  { city: "Erode", state: "Tamil Nadu" },
  { city: "Vellore", state: "Tamil Nadu" },
  { city: "Thanjavur", state: "Tamil Nadu" },
  { city: "Dindigul", state: "Tamil Nadu" },
  { city: "Tiruppur", state: "Tamil Nadu" },
  { city: "Kanchipuram", state: "Tamil Nadu" },
  { city: "Nagercoil", state: "Tamil Nadu" },
  { city: "Karur", state: "Tamil Nadu" },
  { city: "Hosur", state: "Tamil Nadu" },
  
  // West Bengal
  { city: "Kolkata", state: "West Bengal" },
  { city: "Howrah", state: "West Bengal" },
  { city: "Durgapur", state: "West Bengal" },
  { city: "Asansol", state: "West Bengal" },
  { city: "Siliguri", state: "West Bengal" },
  { city: "Bardhaman", state: "West Bengal" },
  { city: "Malda", state: "West Bengal" },
  { city: "Kharagpur", state: "West Bengal" },
  { city: "Jalpaiguri", state: "West Bengal" },
  { city: "Ranaghat", state: "West Bengal" },
  
  // Gujarat
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Surat", state: "Gujarat" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Bhavnagar", state: "Gujarat" },
  { city: "Jamnagar", state: "Gujarat" },
  { city: "Gandhinagar", state: "Gujarat" },
  { city: "Anand", state: "Gujarat" },
  { city: "Bharuch", state: "Gujarat" },
  { city: "Junagadh", state: "Gujarat" },
  { city: "Gandhidham", state: "Gujarat" },
  { city: "Nadiad", state: "Gujarat" },
  { city: "Surendranagar", state: "Gujarat" },
  { city: "Mehsana", state: "Gujarat" },
  { city: "Bhuj", state: "Gujarat" },
  
  // Rajasthan
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Kota", state: "Rajasthan" },
  { city: "Bikaner", state: "Rajasthan" },
  { city: "Ajmer", state: "Rajasthan" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Bhilwara", state: "Rajasthan" },
  { city: "Alwar", state: "Rajasthan" },
  { city: "Bharatpur", state: "Rajasthan" },
  { city: "Sikar", state: "Rajasthan" },
  { city: "Pali", state: "Rajasthan" },
  { city: "Tonk", state: "Rajasthan" },
  { city: "Sriganganagar", state: "Rajasthan" },
  { city: "Hanumangarh", state: "Rajasthan" },
  { city: "Churu", state: "Rajasthan" },
  
  // Uttar Pradesh
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Allahabad", state: "Uttar Pradesh" },
  { city: "Meerut", state: "Uttar Pradesh" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Bareilly", state: "Uttar Pradesh" },
  { city: "Aligarh", state: "Uttar Pradesh" },
  { city: "Moradabad", state: "Uttar Pradesh" },
  { city: "Saharanpur", state: "Uttar Pradesh" },
  { city: "Gorakhpur", state: "Uttar Pradesh" },
  { city: "Faizabad", state: "Uttar Pradesh" },
  { city: "Jhansi", state: "Uttar Pradesh" },
  { city: "Mathura", state: "Uttar Pradesh" },
  { city: "Muzaffarnagar", state: "Uttar Pradesh" },
  { city: "Rampur", state: "Uttar Pradesh" },
  { city: "Shahjahanpur", state: "Uttar Pradesh" },
  { city: "Firozabad", state: "Uttar Pradesh" },
  
  // Madhya Pradesh
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Gwalior", state: "Madhya Pradesh" },
  { city: "Jabalpur", state: "Madhya Pradesh" },
  { city: "Ujjain", state: "Madhya Pradesh" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Bhilai", state: "Chhattisgarh" },
  { city: "Bilaspur", state: "Chhattisgarh" },
  { city: "Korba", state: "Chhattisgarh" },
  { city: "Raigarh", state: "Chhattisgarh" },
  
  // Andhra Pradesh
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Guntur", state: "Andhra Pradesh" },
  { city: "Nellore", state: "Andhra Pradesh" },
  { city: "Kurnool", state: "Andhra Pradesh" },
  { city: "Rajahmundry", state: "Andhra Pradesh" },
  { city: "Tirupati", state: "Andhra Pradesh" },
  { city: "Kakinada", state: "Andhra Pradesh" },
  { city: "Kadapa", state: "Andhra Pradesh" },
  { city: "Anantapur", state: "Andhra Pradesh" },
  
  // Kerala
  { city: "Kochi", state: "Kerala" },
  { city: "Cochin", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Kozhikode", state: "Kerala" },
  { city: "Thrissur", state: "Kerala" },
  { city: "Kollam", state: "Kerala" },
  { city: "Alappuzha", state: "Kerala" },
  { city: "Kannur", state: "Kerala" },
  { city: "Kottayam", state: "Kerala" },
  { city: "Palakkad", state: "Kerala" },
  
  // Punjab
  { city: "Ludhiana", state: "Punjab" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Jalandhar", state: "Punjab" },
  { city: "Patiala", state: "Punjab" },
  { city: "Bathinda", state: "Punjab" },
  { city: "Pathankot", state: "Punjab" },
  { city: "Hoshiarpur", state: "Punjab" },
  { city: "Mohali", state: "Punjab" },
  { city: "Moga", state: "Punjab" },
  { city: "Firozpur", state: "Punjab" },
  
  // Haryana
  { city: "Faridabad", state: "Haryana" },
  { city: "Gurgaon", state: "Haryana" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Panipat", state: "Haryana" },
  { city: "Ambala", state: "Haryana" },
  { city: "Yamunanagar", state: "Haryana" },
  { city: "Rohtak", state: "Haryana" },
  { city: "Hisar", state: "Haryana" },
  { city: "Karnal", state: "Haryana" },
  { city: "Sonipat", state: "Haryana" },
  
  // Bihar
  { city: "Patna", state: "Bihar" },
  { city: "Gaya", state: "Bihar" },
  { city: "Bhagalpur", state: "Bihar" },
  { city: "Muzaffarpur", state: "Bihar" },
  { city: "Purnia", state: "Bihar" },
  { city: "Darbhanga", state: "Bihar" },
  { city: "Bihar Sharif", state: "Bihar" },
  { city: "Arrah", state: "Bihar" },
  { city: "Begusarai", state: "Bihar" },
  { city: "Katihar", state: "Bihar" },
  
  // Odisha
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Cuttack", state: "Odisha" },
  { city: "Rourkela", state: "Odisha" },
  { city: "Berhampur", state: "Odisha" },
  { city: "Sambalpur", state: "Odisha" },
  { city: "Puri", state: "Odisha" },
  { city: "Balasore", state: "Odisha" },
  { city: "Bhadrak", state: "Odisha" },
  { city: "Baripada", state: "Odisha" },
  { city: "Jharsuguda", state: "Odisha" },
  
  // Assam
  { city: "Guwahati", state: "Assam" },
  { city: "Silchar", state: "Assam" },
  { city: "Dibrugarh", state: "Assam" },
  { city: "Jorhat", state: "Assam" },
  { city: "Nagaon", state: "Assam" },
  { city: "Tinsukia", state: "Assam" },
  { city: "Tezpur", state: "Assam" },
  { city: "Bongaigaon", state: "Assam" },
  { city: "Dhubri", state: "Assam" },
  { city: "Sivasagar", state: "Assam" },
  
  // Jammu and Kashmir
  { city: "Srinagar", state: "Jammu and Kashmir" },
  { city: "Jammu", state: "Jammu and Kashmir" },
  { city: "Anantnag", state: "Jammu and Kashmir" },
  { city: "Baramulla", state: "Jammu and Kashmir" },
  { city: "Sopore", state: "Jammu and Kashmir" },
  { city: "Kathua", state: "Jammu and Kashmir" },
  { city: "Udhampur", state: "Jammu and Kashmir" },
  { city: "Rajouri", state: "Jammu and Kashmir" },
  
  // Chandigarh
  { city: "Chandigarh", state: "Chandigarh" },
  
  // Goa
  { city: "Panaji", state: "Goa" },
  { city: "Vasco da Gama", state: "Goa" },
  { city: "Margao", state: "Goa" },
  { city: "Mapusa", state: "Goa" },
  
  // Other states
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Haridwar", state: "Uttarakhand" },
  { city: "Roorkee", state: "Uttarakhand" },
  { city: "Haldwani", state: "Uttarakhand" },
  { city: "Rishikesh", state: "Uttarakhand" },
  
  { city: "Shillong", state: "Meghalaya" },
  { city: "Imphal", state: "Manipur" },
  { city: "Aizawl", state: "Mizoram" },
  { city: "Kohima", state: "Nagaland" },
  { city: "Agartala", state: "Tripura" },
  { city: "Gangtok", state: "Sikkim" },
  { city: "Itanagar", state: "Arunachal Pradesh" },
  { city: "Dispur", state: "Assam" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Jamshedpur", state: "Jharkhand" },
  { city: "Dhanbad", state: "Jharkhand" },
  { city: "Bokaro", state: "Jharkhand" },
  { city: "Hazaribagh", state: "Jharkhand" },
];

// Get unique states
export const indianStates = Array.from(
  new Set(indianCities.map((city) => city.state))
).sort();

// Filter cities by search term
export const filterCities = (searchTerm: string): CityState[] => {
  if (!searchTerm || searchTerm.length < 1) {
    return [];
  }
  const term = searchTerm.toLowerCase();
  return indianCities.filter(
    (city) =>
      city.city.toLowerCase().includes(term) ||
      city.state.toLowerCase().includes(term)
  );
};

// Filter states by search term
export const filterStates = (searchTerm: string): string[] => {
  if (!searchTerm || searchTerm.length < 1) {
    return [];
  }
  const term = searchTerm.toLowerCase();
  return indianStates.filter((state) => state.toLowerCase().includes(term));
};

// Get cities by state
export const getCitiesByState = (state: string): string[] => {
  return indianCities
    .filter((city) => city.state.toLowerCase() === state.toLowerCase())
    .map((city) => city.city)
    .sort();
};
