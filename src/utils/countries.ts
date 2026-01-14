

// List of common countries with their ISO 3166-1 alpha-2 codes
export const countries: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "ZA", name: "South Africa" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "KR", name: "South Korea" },
  // Add more as needed
];

export const getCountryCode = (nameOrCode: string): string => {
  if (!nameOrCode) return "US";
  
  // If it's already a 2-letter code, assume it's valid (uppercase it)
  if (nameOrCode.length === 2) return nameOrCode.toUpperCase();
  
  // Try to find by name (case insensitive)
  const normalizedInput = nameOrCode.toLowerCase();
  const country = countries.find(c => c.name.toLowerCase() === normalizedInput);
  
  if (country) return country.code;
  
  // Common variations mapping
  const variations: Record<string, string> = {
    "usa": "US",
    "uk": "GB",
    "great britain": "GB",
    "england": "GB",
    "deutschland": "DE",
    "espana": "ES",
    "italia": "IT",
    "france": "FR",
    "nederland": "NL",
    "united states of america": "US",
  };
  
  if (variations[normalizedInput]) return variations[normalizedInput];
  
  // Default to US if not found, or return original if it might be a code
  return "US";
};

export const getCountryName = (code: string): string => {
  const country = countries.find(c => c.code === code.toUpperCase());
  return country ? country.name : code;
};
