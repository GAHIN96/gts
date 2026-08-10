export const countryToIso: Record<string, string> = {
  Turkey: "tr",
  UAE: "ae",
  Malaysia: "my",
  Thailand: "th",
  Egypt: "eg",
  Indonesia: "id",
  India: "in",
  Jordan: "jo",
  Morocco: "ma",
  "Saudi Arabia": "sa",
  Oman: "om",
  Bahrain: "bh",
  Qatar: "qa",
  Kuwait: "kw",
  Georgia: "ge",
  Azerbaijan: "az",
  Maldives: "mv",
  "Sri Lanka": "lk",
  Kenya: "ke",
  Tanzania: "tz",
  "South Africa": "za",
  Tunisia: "tn",
  Lebanon: "lb",
  Iraq: "iq",
  Iran: "ir",
  Pakistan: "pk",
  Bangladesh: "bd",
  Nepal: "np",
  China: "cn",
  Japan: "jp",
  "South Korea": "kr",
  Philippines: "ph",
  Vietnam: "vn",
  Cambodia: "kh",
  Singapore: "sg",
  Australia: "au",
  "New Zealand": "nz",
  France: "fr",
  Italy: "it",
  Spain: "es",
  Germany: "de",
  UK: "gb",
  Greece: "gr",
  Portugal: "pt",
  Netherlands: "nl",
  Switzerland: "ch",
  Austria: "at",
  "Czech Republic": "cz",
  Poland: "pl",
  Hungary: "hu",
  Croatia: "hr",
  Sweden: "se",
  Norway: "no",
  Denmark: "dk",
  Finland: "fi",
  Belgium: "be",
  Ireland: "ie",
  USA: "us",
  Canada: "ca",
  Mexico: "mx",
  Brazil: "br",
  Argentina: "ar",
  Colombia: "co",
  Chile: "cl",
  Peru: "pe",
  "united kingdom": "gb",
  "united arab emirates": "ae",
  "turkiye": "tr",
  "türkiye": "tr",
};

export function getCountryFlagUrl(country: string, width?: number): string | null {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();
  
  // Try exact match first
  let iso = countryToIso[country];
  
  // If no exact match, try case-insensitive match
  if (!iso) {
    const entry = Object.entries(countryToIso).find(([k]) => k.toLowerCase() === normalized);
    if (entry) iso = entry[1];
  }
  
  if (!iso) return null;
  
  // Use crisp PNG from FlagCDN to avoid browser SVG scaling rendering blur.
  // We use at least 2x resolution of the target width for Retina/High-DPI support.
  let size = "w80";
  if (width) {
    const targetWidth = width * 2; // 2x for Retina crispness
    if (targetWidth <= 40) {
      size = "w40";
    } else if (targetWidth <= 80) {
      size = "w80";
    } else {
      size = "w160";
    }
  } else {
    // Default size when no width is specified
    size = "w160";
  }
  
  return `https://flagcdn.com/${size}/${iso}.png`;
}
