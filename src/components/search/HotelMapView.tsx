import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { createRoot, type Root } from "react-dom/client";
import { Star, MapPin, BedDouble, ArrowRight, Sparkles, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Hotel as HotelType } from "@/hooks/useHotels";
import { pickRoomBand } from "@/lib/roomPricingTier";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function formatPrice(p: number): string {
  if (p >= 1000) return `$${(p / 1000).toFixed(p % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(p)}`;
}

/** Branded price-pill marker (Booking/Airbnb style). */
function createPricePillIcon(opts: {
  price: number;
  starRating: number;
  exact: boolean;
  selected?: boolean;
}) {
  const { price, starRating, exact, selected } = opts;
  const isPremium = starRating >= 5;
  const label = price > 0 ? formatPrice(price) : "—";

  // Color logic — selected = inverted (bg light, text primary)
  const bg = selected
    ? "hsl(var(--background))"
    : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.88))";
  const fg = selected ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))";
  const ring = isPremium
    ? "0 0 0 2px hsl(var(--background)), 0 0 0 3.5px #f5b400"
    : "0 0 0 2px hsl(var(--background))";
  const shadow = "0 6px 16px -4px hsl(var(--primary) / 0.5), 0 2px 4px -1px hsl(0 0% 0% / 0.15)";
  const border = exact ? "none" : "1.5px dashed hsl(var(--background))";
  const opacity = exact ? 1 : 0.85;

  // Approximate digit width: 7px per char, padding 18px, min 46px
  const charCount = label.length + (isPremium ? 1 : 0);
  const minWidth = Math.max(46, charCount * 8 + 18);

  const star = isPremium
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#f5b400" stroke="#f5b400" stroke-width="1.5" style="margin-right:3px;flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    : "";

  return L.divIcon({
    className: "hotel-price-pill-marker",
    html: `
      <div class="hpm-wrap" style="position:relative;opacity:${opacity};transition:transform 0.18s cubic-bezier(0.4,0,0.2,1);transform-origin:bottom center;cursor:pointer;will-change:transform;">
        <div class="hpm-pill" style="
          display:inline-flex;align-items:center;justify-content:center;
          background:${bg};color:${fg};
          font-size:12px;font-weight:800;letter-spacing:-0.01em;
          padding:5px 10px;border-radius:999px;
          min-width:${minWidth}px;height:26px;white-space:nowrap;
          box-shadow:${ring}, ${shadow};
          ${border !== "none" ? `outline:${border};outline-offset:-3px;` : ""}
          font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        ">
          ${star}<span style="line-height:1;">${label}</span>
        </div>
        <div style="
          position:absolute;left:50%;bottom:-4px;transform:translateX(-50%) rotate(45deg);
          width:8px;height:8px;background:${selected ? "hsl(var(--background))" : "hsl(var(--primary))"};
          box-shadow:1px 1px 2px hsl(0 0% 0% / 0.15);
          border-radius:1px;
        "></div>
      </div>`,
    iconSize: [minWidth, 32],
    iconAnchor: [minWidth / 2, 32],
    popupAnchor: [0, -34],
  });
}

/** Cluster bubble (when multiple hotels are bucketed together at low zoom). */
function createClusterIcon(count: number, fromPrice: number) {
  const label = `${count} · from ${formatPrice(fromPrice)}`;
  const minWidth = Math.max(80, label.length * 7 + 18);
  return L.divIcon({
    className: "hotel-cluster-marker",
    html: `
      <div style="position:relative;cursor:pointer;transition:transform 0.18s ease;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
        <div style="
          display:inline-flex;align-items:center;gap:4px;
          background:hsl(var(--background));color:hsl(var(--primary));
          font-size:11px;font-weight:800;letter-spacing:-0.01em;
          padding:6px 11px;border-radius:999px;
          min-width:${minWidth}px;height:28px;white-space:nowrap;
          box-shadow:0 0 0 2px hsl(var(--primary)), 0 6px 18px -4px hsl(var(--primary) / 0.45);
          font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
          <span>${label}</span>
        </div>
      </div>`,
    iconSize: [minWidth, 28],
    iconAnchor: [minWidth / 2, 14],
  });
}

import { RoomConfig } from "@/components/booking/HotelRoomConfigurator";
import { resolveRoomPrice } from "@/lib/roomPricingTier";

interface HotelMapViewProps {
  hotels: HotelType[];
  nightCount: number | null;
  roomType?: string;
  roomConfigs?: RoomConfig[];
  onHotelSelect?: (hotel: HotelType) => void;
  onQuickView?: (hotel: HotelType) => void;
}

const GEO_CACHE_KEY = "hotel_geocode_cache_v2";
type GeoCache = Record<string, { lat: number; lng: number } | null>;

function loadGeoCache(): GeoCache {
  try {
    return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveGeoCache(cache: GeoCache) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function HotelPopup({
  hotel,
  cityName,
  countryName,
  nightCount,
  pricePerNight,
  totalPrice,
  roomCount,
  onHotelSelect,
  onQuickView,
}: {
  hotel: HotelType;
  cityName: string;
  countryName?: string | null;
  nightCount: number | null;
  pricePerNight: number;
  totalPrice: number | null;
  roomCount: number;
  onHotelSelect?: (hotel: HotelType) => void;
  onQuickView?: (hotel: HotelType) => void;
}) {
  const flagUrl = countryName ? getCountryFlagUrl(countryName) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/15 bg-card/95 shadow-[0_8px_32px_-6px_hsl(var(--primary)/0.25)] backdrop-blur-xl">
      {hotel.images?.[0] && (
        <div className="relative h-32 w-full overflow-hidden">
          <img src={hotel.images[0]} alt={hotel.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-white/20 bg-background/70 px-2 py-0.5 backdrop-blur-md">
            {flagUrl && <img src={flagUrl} alt="" className="h-2.5 w-auto rounded-[1px]" />}
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold text-foreground">{cityName}</span>
          </div>
          {(hotel.star_rating || 0) > 0 && (
            <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full border border-white/20 bg-background/70 px-2 py-0.5 backdrop-blur-md">
              {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
                <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-2 p-3">
        <div>
          <h4 className="text-sm font-bold leading-tight text-foreground">{hotel.name}</h4>
          {hotel.address && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{hotel.address}</p>
          )}
        </div>

        <div className="flex items-end justify-between border-t border-border/40 pt-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-xl font-extrabold text-transparent">
                ${pricePerNight}
              </span>
              <span className="text-[10px] text-muted-foreground">/night</span>
            </div>
            {totalPrice && (
              <p className="text-[11px] text-muted-foreground">
                {nightCount}n × {roomCount} room{roomCount !== 1 ? "s" : ""} ={" "}
                <span className="text-sm font-extrabold text-foreground">${totalPrice.toLocaleString()}</span>
              </p>
            )}
          </div>
          {hotel.hotel_rooms && hotel.hotel_rooms.length > 0 && (
            <Badge variant="secondary" className="h-5 gap-0.5 text-[9px]">
              <BedDouble className="h-2.5 w-2.5" />
              {hotel.hotel_rooms.length}
            </Badge>
          )}
        </div>

        <div className="flex gap-1.5 pt-0.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 border-primary/30 text-[10px] font-semibold hover:bg-primary/5 hover:text-primary"
            onClick={() => onQuickView?.(hotel)}
          >
            Preview
          </Button>
          <Button
            size="sm"
            className="h-7 flex-1 gap-1 bg-gradient-to-br from-primary via-primary to-primary/85 text-[10px] font-bold text-primary-foreground shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.45)] hover:from-primary hover:to-primary"
            onClick={() => onHotelSelect?.(hotel)}
          >
            Reserve
            <ArrowRight className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ResolvedHotel {
  hotel: HotelType;
  lat: number;
  lng: number;
  cityName: string;
  countryName?: string | null;
  exact: boolean;
  pricePerNight: number;
}

export function HotelMapView({
  hotels,
  nightCount,
  roomType,
  roomConfigs = [],
  onHotelSelect,
  onQuickView,
}: HotelMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const popupRootsRef = useRef<Root[]>([]);

  const [geoCache, setGeoCache] = useState<GeoCache>(() => loadGeoCache());
  const [geocoding, setGeocoding] = useState(false);
  const [zoom, setZoom] = useState(6);

  const getCityData = (hotel: HotelType) =>
    hotel.cities as HotelType["cities"] & {
      country?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
    };

  const hotelKey = (hotel: HotelType) => {
    const city = getCityData(hotel);
    return [hotel.name, hotel.address, city?.name, city?.country]
      .filter(Boolean)
      .join("|")
      .toLowerCase();
  };

  const hasExactAddress = (hotel: HotelType) => Boolean(hotel.address?.trim());

  const computePrice = (hotel: HotelType): number => {
    const rooms = hotel.hotel_rooms || [];
    const specials = (hotel as any).hotel_special_prices || [];
    const roomCount = roomConfigs.length || 1;
    
    if (roomType) {
      let total = 0;
      for (let i = 0; i < roomCount; i++) {
        const config = roomConfigs[i] || { adults: 1, children6to12: 0, children2to6: 0, infants: 0 };
        // Approximate availability: use hotel's total inventory as a hint since we don't have per-night availability in the map props easily
        const resolved = resolveRoomPrice(rooms as any, roomType, 20, specials, new Date());
        if (resolved) {
          total += (resolved.adult * config.adults) + 
                   (resolved.child6 * config.children6to12) + 
                   (resolved.child2 * config.children2to6) + 
                   (resolved.infant * config.infants);
        } else {
          total += (hotel.price_per_night || 0) * config.adults;
        }
      }
      return total / Math.max(1, roomCount);
    }
    return hotel.price_per_night || (rooms[0]?.price_per_night as number) || 0;
  };

  // Geocoding loop (unchanged)
  useEffect(() => {
    let cancelled = false;
    const toGeocode = hotels.filter((hotel) => {
      if (!hasExactAddress(hotel)) return false;
      const key = hotelKey(hotel);
      return !(key in geoCache);
    });

    if (toGeocode.length === 0) {
      setGeocoding(false);
      return;
    }

    setGeocoding(true);

    (async () => {
      const updated: GeoCache = { ...geoCache };
      let processed = 0;

      for (const hotel of toGeocode) {
        if (cancelled) break;
        const city = getCityData(hotel);
        const queries = [
          [hotel.name, hotel.address, city?.name, city?.country].filter(Boolean).join(", "),
          [hotel.address, city?.name, city?.country].filter(Boolean).join(", "),
          [hotel.name, city?.name, city?.country].filter(Boolean).join(", "),
        ].filter((q) => q.length > 3);

        let result: { lat: number; lng: number } | null = null;
        for (const query of queries) {
          result = await geocodeAddress(query);
          if (result) break;
          await new Promise((r) => setTimeout(r, 1100));
        }

        updated[hotelKey(hotel)] = result;
        processed += 1;

        if (!cancelled && processed % 3 === 0) {
          saveGeoCache(updated);
          setGeoCache({ ...updated });
        }
        await new Promise((r) => setTimeout(r, 1100));
      }

      if (!cancelled) {
        saveGeoCache(updated);
        setGeoCache(updated);
        setGeocoding(false);
      }
    })();

    return () => { cancelled = true; };
  }, [geoCache, hotels]);

  const pendingExactCount = useMemo(
    () => hotels.filter((h) => hasExactAddress(h) && !(hotelKey(h) in geoCache)).length,
    [geoCache, hotels],
  );

  const failedExactCount = useMemo(
    () => hotels.filter((h) => {
      if (!hasExactAddress(h)) return false;
      const k = hotelKey(h);
      return k in geoCache && geoCache[k] === null;
    }).length,
    [geoCache, hotels],
  );

  const resolvedHotels = useMemo<ResolvedHotel[]>(() => {
    const result: ResolvedHotel[] = [];
    hotels.forEach((hotel) => {
      const city = getCityData(hotel);
      const cityName = city?.name || "Unknown";
      const countryName = city?.country || null;
      const cached = geoCache[hotelKey(hotel)];
      const pricePerNight = computePrice(hotel);

      if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
        result.push({ hotel, lat: cached.lat, lng: cached.lng, cityName, countryName, exact: true, pricePerNight });
        return;
      }
      if (hasExactAddress(hotel)) return;

      const cityLat = city?.latitude != null ? Number(city.latitude) : null;
      const cityLng = city?.longitude != null ? Number(city.longitude) : null;
      if (cityLat != null && cityLng != null && !Number.isNaN(cityLat) && !Number.isNaN(cityLng)) {
        result.push({ hotel, lat: cityLat, lng: cityLng, cityName, countryName, exact: false, pricePerNight });
      }
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoCache, hotels, roomType, roomCount]);

  const noCoordsCount = useMemo(
    () => hotels.filter((h) => {
      if (hasExactAddress(h)) return false;
      const city = getCityData(h);
      const cityLat = city?.latitude != null ? Number(city.latitude) : null;
      const cityLng = city?.longitude != null ? Number(city.longitude) : null;
      return cityLat == null || cityLng == null || Number.isNaN(cityLat) || Number.isNaN(cityLng);
    }).length,
    [hotels],
  );

  const positions = useMemo<[number, number][]>(
    () => resolvedHotels.map((h) => [h.lat, h.lng]),
    [resolvedHotels],
  );

  // Lightweight grid clustering — bucket by lat/lng grid that scales with zoom.
  // At zoom <= 5, large buckets; at zoom >= 12, no clustering.
  const clusters = useMemo(() => {
    if (zoom >= 11 || resolvedHotels.length <= 1) {
      return resolvedHotels.map((r) => ({ items: [r], lat: r.lat, lng: r.lng }));
    }
    // Bucket size in degrees, scales inversely with zoom
    const bucket = Math.max(0.05, 8 / Math.pow(2, zoom));
    const map = new Map<string, ResolvedHotel[]>();
    resolvedHotels.forEach((r) => {
      const key = `${Math.floor(r.lat / bucket)}_${Math.floor(r.lng / bucket)}`;
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    });
    return Array.from(map.values()).map((items) => {
      const lat = items.reduce((s, i) => s + i.lat, 0) / items.length;
      const lng = items.reduce((s, i) => s + i.lng, 0) / items.length;
      return { items, lat, lng };
    });
  }, [resolvedHotels, zoom]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [25.276987, 55.296249],
      zoom: 6,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(mapRef.current);

    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);

    const handleZoom = () => {
      if (mapRef.current) setZoom(mapRef.current.getZoom());
    };
    mapRef.current.on("zoomend", handleZoom);

    return () => {
      const roots = popupRootsRef.current;
      popupRootsRef.current = [];
      setTimeout(() => {
        roots.forEach((root) => { try { root.unmount(); } catch { /* ignore */ } });
      }, 0);
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      mapRef.current?.off("zoomend", handleZoom);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers / clusters
  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    const oldRoots = popupRootsRef.current;
    popupRootsRef.current = [];
    setTimeout(() => {
      oldRoots.forEach((r) => { try { r.unmount(); } catch { /* ignore */ } });
    }, 0);

    markerLayer.clearLayers();

    const cityFallbackCount = new Map<string, number>();

    clusters.forEach((cluster) => {
      if (cluster.items.length > 1) {
        const minPrice = Math.min(...cluster.items.map((i) => i.pricePerNight).filter((p) => p > 0));
        const icon = createClusterIcon(cluster.items.length, isFinite(minPrice) ? minPrice : 0);
        const marker = L.marker([cluster.lat, cluster.lng], { icon });
        marker.on("click", () => {
          map.flyTo([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, 14), { duration: 0.6 });
        });
        marker.addTo(markerLayer);
        return;
      }

      const item = cluster.items[0];
      const { hotel, cityName, countryName, exact, pricePerNight } = item;
      let lat = item.lat;
      let lng = item.lng;

      if (!exact) {
        const idx = cityFallbackCount.get(cityName) ?? 0;
        cityFallbackCount.set(cityName, idx + 1);
        lat = lat + idx * 0.003 - 0.0015;
        lng = lng + idx * 0.003 - 0.0015;
      }

      const icon = createPricePillIcon({
        price: pricePerNight,
        starRating: hotel.star_rating || 0,
        exact,
      });
      const popupNode = document.createElement("div");
      const popupRoot = createRoot(popupNode);
      popupRoot.render(
        <HotelPopup
          hotel={hotel}
          cityName={cityName}
          countryName={countryName}
          nightCount={nightCount}
          pricePerNight={pricePerNight}
          totalPrice={nightCount ? pricePerNight * nightCount * Math.max(1, roomCount) : null}
          roomCount={roomCount}
          onHotelSelect={onHotelSelect}
          onQuickView={onQuickView}
        />,
      );
      popupRootsRef.current.push(popupRoot);

      const marker = L.marker([lat, lng], { icon, riseOnHover: true })
        .bindPopup(popupNode, { minWidth: 240, maxWidth: 280, className: "brand-hotel-popup" })
        .addTo(markerLayer);

      // Hover scale via DOM
      marker.on("mouseover", (e) => {
        const el = (e.target as L.Marker).getElement();
        const wrap = el?.querySelector<HTMLElement>(".hpm-wrap");
        if (wrap) { wrap.style.transform = "scale(1.18)"; wrap.style.zIndex = "1000"; }
      });
      marker.on("mouseout", (e) => {
        const el = (e.target as L.Marker).getElement();
        const wrap = el?.querySelector<HTMLElement>(".hpm-wrap");
        if (wrap) { wrap.style.transform = "scale(1)"; wrap.style.zIndex = ""; }
      });

      // Selected state
      marker.on("popupopen", () => {
        marker.setIcon(createPricePillIcon({
          price: pricePerNight,
          starRating: hotel.star_rating || 0,
          exact,
          selected: true,
        }));
      });
      marker.on("popupclose", () => {
        marker.setIcon(createPricePillIcon({
          price: pricePerNight,
          starRating: hotel.star_rating || 0,
          exact,
        }));
      });
    });

    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => L.latLng(lat, lng)));
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 0.7 });
    }
  }, [clusters, nightCount, onHotelSelect, onQuickView, positions, roomCount]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => L.latLng(lat, lng)));
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 0.7 });
    } else {
      map.flyTo([25.276987, 55.296249], 6, { duration: 0.7 });
    }
  };

  const exactCount = resolvedHotels.filter((h) => h.exact).length;
  const approximateCount = resolvedHotels.length - exactCount;
  const showEmptyState = resolvedHotels.length === 0 && !geocoding && pendingExactCount === 0;

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl ring-1 ring-border/60 shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15),inset_0_0_0_1px_hsl(var(--background)/0.5)]"
        style={{ height: "560px" }}
      >
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Floating glass legend (top-left) */}
        {resolvedHotels.length > 0 && (
          <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 shadow-lg backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">
              {resolvedHotels.length} {resolvedHotels.length === 1 ? "hotel" : "hotels"}
            </span>
            <span className="h-3 w-px bg-border" />
            {/* Mini price-pin sample */}
            <span className="inline-flex h-4 items-center rounded-full bg-primary px-1.5 text-[9px] font-extrabold text-primary-foreground">
              $
            </span>
            <span className="text-[10px] text-muted-foreground">price / night</span>
            {exactCount > 0 && (
              <>
                <span className="h-3 w-px bg-border" />
                <span className="text-[10px] text-muted-foreground">
                  <span className="font-bold text-primary">{exactCount}</span> exact
                </span>
              </>
            )}
            {approximateCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                · <span className="font-bold">{approximateCount}</span> approx
              </span>
            )}
          </div>
        )}

        {/* Geocoding shimmer (top-right) */}
        {geocoding && (
          <div className="pointer-events-none absolute right-3 top-3 z-[400] flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 backdrop-blur-xl">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-[11px] font-semibold text-primary">
              Locating {pendingExactCount} address{pendingExactCount !== 1 ? "es" : ""}…
            </span>
          </div>
        )}

        {/* Recenter floating button */}
        {resolvedHotels.length > 0 && (
          <button
            type="button"
            onClick={handleRecenter}
            className="absolute bottom-4 right-4 z-[400] flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/95 text-foreground shadow-lg backdrop-blur-xl transition-all hover:scale-110 hover:bg-primary hover:text-primary-foreground"
            title="Recenter map"
            aria-label="Recenter map on all hotels"
          >
            <Locate className="h-4 w-4" />
          </button>
        )}
      </div>

      {showEmptyState && (
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center text-muted-foreground">
          <MapPin className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm">No exact hotel locations could be placed on the map yet.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {exactCount > 0 && (
          <Badge className="border-primary/20 bg-primary/10 text-[11px] text-primary hover:bg-primary/15">
            {exactCount} pinned exactly
          </Badge>
        )}
        {approximateCount > 0 && (
          <Badge variant="secondary" className="text-[11px]">
            {approximateCount} approximate
          </Badge>
        )}
        {failedExactCount > 0 && (
          <Badge variant="outline" className="border-destructive/30 text-[11px] text-destructive">
            {failedExactCount} address not found
          </Badge>
        )}
        {noCoordsCount > 0 && (
          <Badge variant="outline" className="text-[11px]">
            {noCoordsCount} missing map data
          </Badge>
        )}
      </div>
    </div>
  );
}
