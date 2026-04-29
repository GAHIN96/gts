import { MapPin, ArrowRight, TrendingUp, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";

import packageTurkey from "@/assets/package-turkey.jpg";
import destinationDubai from "@/assets/destination-dubai.jpg";
import destinationMalaysia from "@/assets/destination-malaysia.jpg";
import destinationThailand from "@/assets/destination-thailand.jpg";
import destinationEgypt from "@/assets/destination-egypt.jpg";

const cityImages: Record<string, string> = {
  Istanbul: packageTurkey,
  Dubai: destinationDubai,
  "Kuala Lumpur": destinationMalaysia,
  Bangkok: destinationThailand,
  Cairo: destinationEgypt,
  Turkey: packageTurkey,
  UAE: destinationDubai,
  Malaysia: destinationMalaysia,
  Thailand: destinationThailand,
  Egypt: destinationEgypt,
};

const countryToIso: Record<string, string> = {
  Turkey: "tr", UAE: "ae", Malaysia: "my", Thailand: "th", Egypt: "eg",
  Indonesia: "id", India: "in", Jordan: "jo", Morocco: "ma", "Saudi Arabia": "sa",
  Oman: "om", Bahrain: "bh", Qatar: "qa", Kuwait: "kw", Georgia: "ge",
  Azerbaijan: "az", Maldives: "mv", "Sri Lanka": "lk", Kenya: "ke", Tanzania: "tz",
  "South Africa": "za", Tunisia: "tn", Lebanon: "lb", Iraq: "iq", Iran: "ir",
  Pakistan: "pk", Bangladesh: "bd", Nepal: "np", China: "cn", Japan: "jp",
  "South Korea": "kr", Philippines: "ph", Vietnam: "vn", Cambodia: "kh",
  Singapore: "sg", Australia: "au", "New Zealand": "nz", France: "fr",
  Italy: "it", Spain: "es", Germany: "de", UK: "gb", Greece: "gr",
  Portugal: "pt", Netherlands: "nl", Switzerland: "ch", Austria: "at",
  "Czech Republic": "cz", Poland: "pl", Hungary: "hu", Croatia: "hr",
  Sweden: "se", Norway: "no", Denmark: "dk", Finland: "fi", Belgium: "be",
  Ireland: "ie", USA: "us", Canada: "ca", Mexico: "mx", Brazil: "br",
  Argentina: "ar", Colombia: "co", Chile: "cl", Peru: "pe",
};

function getCountryFlag(country: string): string | null {
  const iso = countryToIso[country];
  if (!iso) return null;
  return `https://flagcdn.com/w40/${iso}.png`;
}

const trendingTags: Record<string, { label: string; icon: "trending" | "hot" }> = {
  Istanbul: { label: "Trending", icon: "trending" },
  Dubai: { label: "Popular", icon: "hot" },
  Bangkok: { label: "Hot Deal", icon: "hot" },
};

interface CityCardProps {
  id: string;
  name: string;
  country: string;
  imageUrl?: string | null;
  startingPrice: number;
  packageCount: number;
  onClick: () => void;
  index?: number;
  isHero?: boolean;
}

export function CityCard({ name, country, imageUrl, startingPrice, packageCount, onClick, index = 0, isHero = false }: CityCardProps) {
  const image = imageUrl || cityImages[name] || cityImages[country] || packageTurkey;
  const tag = trendingTags[name];
  const flagUrl = getCountryFlag(country);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden cursor-pointer",
        "transition-all duration-500 ease-out",
        "transform hover:scale-[1.02] hover:-translate-y-2",
        "animate-fade-in",
        isHero ? "rounded-[1.5rem] sm:col-span-2 sm:row-span-2" : "rounded-2xl"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Outer glow border */}
      <div className="absolute -inset-[1px] rounded-[inherit] bg-gradient-to-br from-primary/0 via-accent/0 to-primary/0 group-hover:from-primary/50 group-hover:via-accent/40 group-hover:to-primary/50 transition-all duration-700 z-0 blur-[2px]" />

      <div className="relative z-10 rounded-[inherit] overflow-hidden bg-card shadow-card group-hover:shadow-card-hover transition-shadow duration-500">
        {/* Image */}
        <div className={cn("relative overflow-hidden", isHero ? "aspect-[21/9]" : "aspect-[4/3]")}>
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 group-hover:brightness-110 transition-all duration-[1200ms] ease-out"
          />

          {/* Multi-layer gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(231,75%,5%)]/95 via-[hsl(231,70%,8%)]/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[hsl(231,75%,5%)]/20" />

          {/* Shine sweep on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] ease-out bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-20deg]" />
          </div>

          {/* Featured ribbon for hero */}
          {isHero && (
            <div className="absolute top-5 -left-8 z-20 rotate-[-45deg]">
              <div className="bg-gradient-to-r from-accent to-coral-dark px-10 py-1 shadow-lg">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-3 w-3 text-white fill-white" />
                  <span className="text-[9px] font-bold text-white uppercase tracking-[0.15em]">Featured</span>
                </div>
              </div>
            </div>
          )}

          {/* Trending badge — glassmorphic with glow */}
          {tag && (
            <div className="absolute top-3 left-3 z-10">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                "bg-white/10 backdrop-blur-xl border border-white/20",
                "shadow-lg relative overflow-hidden"
              )}>
                {/* Colored glow */}
                <div className={cn(
                  "absolute inset-0 rounded-full blur-md -z-10",
                  tag.icon === "trending" ? "bg-emerald-500/20" : "bg-orange-500/20"
                )} />
                {tag.icon === "trending" ? (
                  <TrendingUp className="h-3 w-3 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                ) : (
                  <>
                    <Flame className="h-3 w-3 text-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.6)]" />
                    {tag.label === "Hot Deal" && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    )}
                  </>
                )}
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{tag.label}</span>
              </div>
            </div>
          )}

          {/* Package count — gradient pill */}
          <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-navy-light shadow-lg border border-white/10">
            <span className="text-[10px] font-bold text-white tracking-wide">
              {packageCount} {packageCount === 1 ? 'Package' : 'Packages'}
            </span>
          </div>

          {/* Hover CTA */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
            <div className="px-6 py-3 rounded-xl bg-white/95 backdrop-blur-md shadow-xl transform translate-y-6 group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center gap-2.5">
              <span className="font-bold text-primary text-sm">Explore Packages</span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Content overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            {/* Gradient divider */}
            <div className="mb-3 h-[1px] w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <h3 className={cn(
                  "font-bold text-white tracking-tight",
                  isHero ? "text-3xl md:text-4xl" : "text-2xl",
                  "drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                )}>
                  {name}
                </h3>
                <div className="flex items-center gap-2 text-white/80">
                  {flagUrl ? (
                    <img
                      src={flagUrl}
                      alt={country}
                      className="h-4 w-6 object-cover rounded-[3px] shadow-sm ring-1 ring-white/30"
                    />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  <span className={cn("font-medium", isHero ? "text-sm" : "text-xs")}>{country}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-[8px] font-bold text-white/70 uppercase tracking-[0.2em] mb-1">
                  From
                </span>
                <p className={cn(
                  "font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]",
                  isHero ? "text-4xl" : "text-3xl",
                  "city-price-gradient"
                )}>
                  <span className="text-white/50 text-xs font-bold mr-0.5">$</span>
                  {startingPrice.toLocaleString()}
                </p>
                <span className="block mt-1 h-[2px] w-full rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] animate-price-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CityGridProps {
  cities: Array<{
    id: string;
    name: string;
    country: string;
    image_url?: string | null;
    startingPrice: number;
    packageCount: number;
  }>;
  onCitySelect: (cityId: string) => void;
}

export function CityGrid({ cities, onCitySelect }: CityGridProps) {
  if (cities.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No destinations available at the moment.</p>
      </div>
    );
  }

  const [firstCity, ...restCities] = cities;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-auto">
      {firstCity && (
        <CityCard
          key={firstCity.id}
          id={firstCity.id}
          name={firstCity.name}
          country={firstCity.country}
          imageUrl={firstCity.image_url}
          startingPrice={firstCity.startingPrice}
          packageCount={firstCity.packageCount}
          onClick={() => onCitySelect(firstCity.id)}
          index={0}
          isHero={true}
        />
      )}
      {restCities.map((city, index) => (
        <CityCard
          key={city.id}
          id={city.id}
          name={city.name}
          country={city.country}
          imageUrl={city.image_url}
          startingPrice={city.startingPrice}
          packageCount={city.packageCount}
          onClick={() => onCitySelect(city.id)}
          index={index + 1}
        />
      ))}
    </div>
  );
}
