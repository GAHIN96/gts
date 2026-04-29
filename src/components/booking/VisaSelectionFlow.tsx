import { useState, useMemo } from "react";
import { 
  Globe, MapPin, ArrowLeft, ArrowRight, Clock, FileText, 
  DollarSign, Shield, Stamp, CheckCircle, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Visa } from "@/hooks/useVisas";

const countryImages: Record<string, string> = {
  "Turkey": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=400&fit=crop",
  "UAE": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop",
  "Dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop",
  "Egypt": "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=600&h=400&fit=crop",
  "Malaysia": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&h=400&fit=crop",
  "Thailand": "https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&h=400&fit=crop",
  "Indonesia": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop",
  "Jordan": "https://images.unsplash.com/photo-1563177978-4c5f7e4e7c5f?w=600&h=400&fit=crop",
  "Lebanon": "https://images.unsplash.com/photo-1579033461380-adb47c3eb938?w=600&h=400&fit=crop",
  "Georgia": "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600&h=400&fit=crop",
  "Azerbaijan": "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?w=600&h=400&fit=crop",
};

const getCountryImage = (country: string): string => {
  return countryImages[country] || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=400&fit=crop";
};

// Country to ISO code mapping for real flag images
const countryCodes: Record<string, string> = {
  "Turkey": "tr", "UAE": "ae", "Dubai": "ae", "Egypt": "eg",
  "Malaysia": "my", "Thailand": "th", "Indonesia": "id",
  "Jordan": "jo", "Lebanon": "lb", "Georgia": "ge",
  "Azerbaijan": "az", "Iraq": "iq", "Iran": "ir",
  "Saudi Arabia": "sa", "Qatar": "qa", "Bahrain": "bh",
  "Kuwait": "kw", "Oman": "om", "India": "in", "China": "cn",
  "Japan": "jp", "South Korea": "kr", "United Kingdom": "gb", "UK": "gb",
  "United States": "us", "USA": "us", "Germany": "de", "France": "fr",
  "Italy": "it", "Spain": "es", "Canada": "ca", "Australia": "au",
  "Russia": "ru", "Pakistan": "pk", "Syria": "sy",
  "Morocco": "ma", "Tunisia": "tn", "Algeria": "dz",
  "Nigeria": "ng", "South Africa": "za", "Brazil": "br",
  "Mexico": "mx", "Argentina": "ar", "Colombia": "co",
  "Philippines": "ph", "Vietnam": "vn", "Singapore": "sg",
  "Sri Lanka": "lk", "Bangladesh": "bd", "Nepal": "np",
  // Schengen / Europe
  "Schengen": "eu", "Europe": "eu", "EU": "eu",
  "Schengen Visa": "eu", "Schengen Zone": "eu",
  "Austria": "at", "Belgium": "be", "Czech Republic": "cz",
  "Denmark": "dk", "Estonia": "ee", "Finland": "fi",
  "Greece": "gr", "Hungary": "hu", "Iceland": "is",
  "Latvia": "lv", "Lithuania": "lt", "Luxembourg": "lu",
  "Malta": "mt", "Netherlands": "nl", "Norway": "no",
  "Poland": "pl", "Portugal": "pt", "Slovakia": "sk",
  "Slovenia": "si", "Sweden": "se", "Switzerland": "ch",
  "Croatia": "hr", "Cyprus": "cy", "Ireland": "ie",
  "Romania": "ro", "Bulgaria": "bg",
};
const getFlagUrl = (country: string) => {
  const code = countryCodes[country];
  return code ? `https://flagcdn.com/w80/${code}.png` : null;
};

const FlagImg = ({ country, className = "w-6 h-4" }: { country: string; className?: string }) => {
  const url = getFlagUrl(country);
  if (!url) return <span className="text-sm">🏳️</span>;
  return <img src={url} alt={`${country} flag`} className={`${className} object-cover rounded-sm shadow-sm`} />;
};

// Visa type icons/colors
const visaTypeStyles: Record<string, { color: string; icon: string }> = {
  "Tourist": { color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: "🏖️" },
  "Business": { color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: "💼" },
  "Transit": { color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: "✈️" },
  "Work": { color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: "🔧" },
  "Student": { color: "bg-pink-500/10 text-pink-600 border-pink-200", icon: "🎓" },
  "Medical": { color: "bg-red-500/10 text-red-600 border-red-200", icon: "🏥" },
};

const getVisaTypeStyle = (type: string) => {
  const key = Object.keys(visaTypeStyles).find(k => type.toLowerCase().includes(k.toLowerCase()));
  return visaTypeStyles[key || ""] || { color: "bg-primary/10 text-primary border-primary/20", icon: "📄" };
};

interface VisaSelectionFlowProps {
  visas: Visa[];
  onSelect: (visa: Visa) => void;
}

export function VisaSelectionFlow({ visas, onSelect }: VisaSelectionFlowProps) {
  const [step, setStep] = useState<"country" | "type">("country");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Group visas by country
  const countryGroups = useMemo(() => {
    const groups: Record<string, Visa[]> = {};
    visas.filter(v => v.is_active).forEach(visa => {
      if (!groups[visa.country]) groups[visa.country] = [];
      groups[visa.country].push(visa);
    });
    return groups;
  }, [visas]);

  const countries = useMemo(() => {
    return Object.keys(countryGroups)
      .filter(c => c.toLowerCase().includes(search.toLowerCase()))
      .sort();
  }, [countryGroups, search]);

  const countryVisas = selectedCountry ? (countryGroups[selectedCountry] || []) : [];

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    const visasForCountry = countryGroups[country];
    // If only one visa type, skip type selection
    if (visasForCountry.length === 1) {
      onSelect(visasForCountry[0]);
    } else {
      setStep("type");
      setSearch("");
    }
  };

  const handleBack = () => {
    setStep("country");
    setSelectedCountry(null);
    setSearch("");
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb / Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <button 
          onClick={handleBack}
          className={`flex items-center gap-1.5 font-medium transition-colors ${
            step === "country" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4" />
          Select Country
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className={`flex items-center gap-1.5 font-medium ${
          step === "type" ? "text-primary" : "text-muted-foreground/50"
        }`}>
          <Stamp className="h-4 w-4" />
          Visa Type
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-muted-foreground/50 flex items-center gap-1.5 font-medium">
          <FileText className="h-4 w-4" />
          Application
        </span>
      </div>

      {/* Step 1: Country Selection */}
      {step === "country" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Choose Destination</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{countries.length} countries available</p>
            </div>
            <div className="relative w-64">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {countries.map((country, i) => {
              const visaCount = countryGroups[country].length;
              const lowestPrice = Math.min(...countryGroups[country].map(v => v.price));
              
              return (
                <Card
                  key={country}
                  className="overflow-hidden cursor-pointer border-border/50 hover:border-primary/40 hover:shadow-xl transition-all duration-300 group animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={() => handleCountrySelect(country)}
                >
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={getCountryImage(country)}
                      alt={country}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-white/90 text-foreground text-[10px] font-bold backdrop-blur-sm shadow-sm">
                        {visaCount} {visaCount === 1 ? "type" : "types"}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5">
                      <FlagImg country={country} className="w-7 h-5" />
                      <div>
                        <h3 className="text-base font-bold text-white drop-shadow-md">{country}</h3>
                        <p className="text-white/80 text-xs font-medium">From ${lowestPrice}</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Apply now</span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {countries.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No countries found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Visa Type Selection */}
      {step === "type" && selectedCountry && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md flex items-center justify-center bg-muted">
                <FlagImg country={selectedCountry} className="w-8 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedCountry}</h2>
                <p className="text-sm text-muted-foreground">{countryVisas.length} visa types available</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countryVisas.map((visa, i) => {
              const typeStyle = getVisaTypeStyle(visa.visa_type);
              
              return (
                <Card
                  key={visa.id}
                  className="overflow-hidden cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 group animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                  onClick={() => onSelect(visa)}
                >
                  {/* Top accent bar */}
                  <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
                  
                  <CardContent className="p-5 space-y-4">
                    {/* Visa type header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border border-border/60 bg-muted/30">
                          <FlagImg country={visa.country} className="w-10 h-7" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-base">{visa.visa_type}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><FlagImg country={visa.country} className="w-4 h-3" /> {visa.country}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">${visa.price}</p>
                        <p className="text-[10px] text-muted-foreground">per person</p>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <Clock className="h-3.5 w-3.5 mx-auto text-primary/60 mb-0.5" />
                        <p className="text-xs font-bold">{visa.processing_days}d</p>
                        <p className="text-[9px] text-muted-foreground">Processing</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <FileText className="h-3.5 w-3.5 mx-auto text-primary/60 mb-0.5" />
                        <p className="text-xs font-bold">{visa.documents_required?.length || 0}</p>
                        <p className="text-[9px] text-muted-foreground">Documents</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <Shield className="h-3.5 w-3.5 mx-auto text-primary/60 mb-0.5" />
                        <p className="text-xs font-bold">{visa.requirements?.length || 0}</p>
                        <p className="text-[9px] text-muted-foreground">Requirements</p>
                      </div>
                    </div>

                    {/* Documents preview */}
                    {visa.documents_required && visa.documents_required.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {visa.documents_required.slice(0, 3).map((doc, di) => (
                          <Badge key={di} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal border-border/60 bg-muted/20">
                            {doc}
                          </Badge>
                        ))}
                        {visa.documents_required.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                            +{visa.documents_required.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    <Button variant="navy" className="w-full rounded-xl group-hover:shadow-md transition-shadow">
                      <Stamp className="h-4 w-4 mr-1.5" />
                      Apply for this Visa
                      <ArrowRight className="h-3.5 w-3.5 ml-auto group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
