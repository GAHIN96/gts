import { useState, useEffect, useMemo } from "react";
import { Plane, Hotel, Star, Check, ArrowRight, DollarSign, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFlightsByCity, useHotelsByCity } from "@/hooks/useCityFlights";
import { useCities } from "@/hooks/useCities";
import { format } from "date-fns";

interface SelectedHotel {
  hotelId: string;
  tier: "3-star" | "4-star" | "5-star";
  priceAdjustment: number;
  isDefault: boolean;
}

interface PackageFlightHotelSelectorProps {
  cityId: string | null;
  includesFlight: boolean;
  includesHotel: boolean;
  selectedHotels: SelectedHotel[];
  onHotelsChange: (hotels: SelectedHotel[]) => void;
}

export function PackageFlightHotelSelector({
  cityId,
  includesFlight,
  includesHotel,
  selectedHotels,
  onHotelsChange,
}: PackageFlightHotelSelectorProps) {
  const { data: cities } = useCities();
  const selectedCity = cities?.find(c => c.id === cityId);
  const cityName = selectedCity?.name || null;

  const { data: flights, isLoading: flightsLoading } = useFlightsByCity(cityName);
  const { data: hotels, isLoading: hotelsLoading } = useHotelsByCity(cityId);

  // Group flights by direction
  const inboundFlights = flights?.filter(f => 
    f.arrival_city?.toLowerCase().includes(cityName?.toLowerCase() || "")
  ) || [];
  const outboundFlights = flights?.filter(f => 
    f.departure_city?.toLowerCase().includes(cityName?.toLowerCase() || "")
  ) || [];

  const [hotelSearch, setHotelSearch] = useState("");

  const hotelsByRating = useMemo(() => {
    const filtered = hotels?.filter(h => 
      h.name.toLowerCase().includes(hotelSearch.toLowerCase())
    ) || [];
    return {
      "5-star": filtered.filter(h => h.star_rating === 5),
      "4-star": filtered.filter(h => h.star_rating === 4),
      "3-star": filtered.filter(h => h.star_rating === 3 || !h.star_rating || h.star_rating < 3),
    };
  }, [hotels, hotelSearch]);

  const handleHotelToggle = (hotelId: string, starRating: number) => {
    const tier = starRating >= 5 ? "5-star" : starRating >= 4 ? "4-star" : "3-star";
    const exists = selectedHotels.find(h => h.hotelId === hotelId);
    
    if (exists) {
      onHotelsChange(selectedHotels.filter(h => h.hotelId !== hotelId));
    } else {
      onHotelsChange([
        ...selectedHotels,
        { hotelId, tier, priceAdjustment: 0, isDefault: selectedHotels.length === 0 }
      ]);
    }
  };

  const setDefaultHotel = (hotelId: string) => {
    onHotelsChange(selectedHotels.map(h => ({
      ...h,
      isDefault: h.hotelId === hotelId
    })));
  };

  const updatePriceAdjustment = (hotelId: string, adjustment: number) => {
    onHotelsChange(selectedHotels.map(h => 
      h.hotelId === hotelId ? { ...h, priceAdjustment: adjustment } : h
    ));
  };

  if (!cityId) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        Select a destination city first to see available flights and hotels
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Available Flights Section */}
      {includesFlight && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Available Flights to/from {cityName}</h4>
            <Badge variant="outline" className="ml-auto">
              {(inboundFlights.length + outboundFlights.length)} flights
            </Badge>
          </div>
          
          {flightsLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading flights...</div>
          ) : (inboundFlights.length === 0 && outboundFlights.length === 0) ? (
            <div className="text-center py-4 text-muted-foreground border rounded-lg">
              No active flights found for {cityName}
            </div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto border rounded-lg p-3">
              <div className="space-y-2">
                {inboundFlights.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase">To {cityName}</p>
                    {inboundFlights.slice(0, 5).map(flight => (
                      <Card key={flight.id} className="bg-muted/30">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {flight.departure_city}
                              <ArrowRight className="h-3 w-3" />
                              {flight.arrival_city}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {flight.airline} • {flight.flight_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">${flight.price}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(flight.departure_date), "dd/MM")}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {outboundFlights.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase">From {cityName}</p>
                    {outboundFlights.slice(0, 5).map(flight => (
                      <Card key={flight.id} className="bg-muted/30">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {flight.departure_city}
                              <ArrowRight className="h-3 w-3" />
                              {flight.arrival_city}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {flight.airline} • {flight.flight_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">${flight.price}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(flight.departure_date), "dd/MM")}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hotel Tiers Section */}
      {includesHotel && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Hotel className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Select Hotels by Tier</h4>
            <Badge variant="outline" className="ml-auto">
              {selectedHotels.length} selected
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hotels by name..."
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {hotelsLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading hotels...</div>
          ) : !hotels || hotels.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground border rounded-lg">
              No active hotels found in {cityName}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["5-star", "4-star", "3-star"] as const).map(tier => (
                <div key={tier} className="space-y-2">
                  <div className="flex items-center gap-1 pb-2 border-b">
                    {[...Array(parseInt(tier))].map((_, i) => (
                      <Star key={i} className="h-3 w-3 text-gold fill-gold" />
                    ))}
                    <span className="ml-2 text-sm font-medium">{tier.replace("-", " ")}</span>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto">
                    <div className="space-y-2">
                      {hotelsByRating[tier].length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No {tier.replace("-", " ")} hotels
                        </p>
                      ) : (
                        hotelsByRating[tier].map(hotel => {
                          const isSelected = selectedHotels.some(h => h.hotelId === hotel.id);
                          const isDefault = selectedHotels.find(h => h.hotelId === hotel.id)?.isDefault;
                          
                          return (
                            <Card 
                              key={hotel.id} 
                              className={`cursor-pointer transition-all ${
                                isSelected 
                                  ? "border-primary bg-primary/5" 
                                  : "hover:border-muted-foreground/50"
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleHotelToggle(hotel.id, hotel.star_rating || 3);
                              }}
                            >
                              <CardContent className="p-2">
                                <div className="flex items-start gap-2">
                                  <div 
                                    className={`h-4 w-4 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center cursor-pointer ${
                                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHotelToggle(hotel.id, hotel.star_rating || 3);
                                    }}
                                  >
                                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{hotel.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ${hotel.price_per_night || 0}/night
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDefaultHotel(hotel.id);
                                      }}
                                      className={`text-xs px-2 py-0.5 rounded ${
                                        isDefault 
                                          ? "bg-primary text-primary-foreground" 
                                          : "bg-muted hover:bg-muted-foreground/20"
                                      }`}
                                    >
                                      {isDefault ? <Check className="h-3 w-3" /> : "Default"}
                                    </button>
                                  )}
                                </div>
                                {isSelected && (
                                  <div 
                                    className="mt-2 pt-2 border-t border-border"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Label className="text-xs text-muted-foreground">Price Adjustment ($)</Label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                                      <Input
                                        type="number"
                                        value={selectedHotels.find(h => h.hotelId === hotel.id)?.priceAdjustment || 0}
                                        onChange={(e) => updatePriceAdjustment(hotel.id, parseFloat(e.target.value) || 0)}
                                        className="h-7 text-xs"
                                        placeholder="+0"
                                      />
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
