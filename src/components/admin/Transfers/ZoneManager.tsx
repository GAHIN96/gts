import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import "leaflet-draw";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCities } from "@/hooks/useCities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface TransferZone {
  id: string;
  city_id: string;
  name: string;
  polygon_coordinates: any;
}

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapDrawControl({ onCreated, onDeleted, featureGroupRef }: any) {
  const map = useMap();

  useEffect(() => {
    if (!map || !featureGroupRef.current) return;

    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: featureGroupRef.current,
        remove: true,
      },
      draw: {
        polyline: false,
        polygon: true,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
      },
    });

    map.addControl(drawControl);

    const handleCreated = (e: any) => {
      const layer = e.layer;
      featureGroupRef.current?.addLayer(layer);
      onCreated(layer);
    };

    const handleDeleted = (e: any) => {
      onDeleted(e.layers);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DELETED, handleDeleted);
    };
  }, [map, onCreated, onDeleted, featureGroupRef]);

  return null;
}

export function ZoneManager() {
  const { data: cities = [] } = useCities();
  const [cityId, setCityId] = useState<string>("");
  const [zones, setZones] = useState<TransferZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const [currentLayer, setCurrentLayer] = useState<L.Polygon | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.0082, 28.9784]); // Default to Istanbul

  useEffect(() => {
    if (cityId) {
      loadZones(cityId);
      const city = cities.find(c => c.id === cityId);
      if (city) {
        // Try to geocode the city roughly to center the map
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city.name)}`)
          .then(res => res.json())
          .then(data => {
            if (data && data[0]) {
              setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            }
          });
      }
    } else {
      setZones([]);
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
    }
  }, [cityId]);

  const loadZones = async (cId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.from("transfer_zones").select("*").eq("city_id", cId);
    if (!error && data) {
      setZones(data);
      // Render existing zones
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
        data.forEach(zone => {
          if (zone.polygon_coordinates && zone.polygon_coordinates.length > 0) {
            const polygon = L.polygon(zone.polygon_coordinates, { color: 'blue' });
            polygon.bindPopup(`<b>${zone.name}</b>`);
            featureGroupRef.current?.addLayer(polygon);
          }
        });
      }
    }
    setIsLoading(false);
  };

  const handleCreated = (layer: L.Polygon) => {
    setCurrentLayer(layer);
  };

  const handleDeleted = (layers: L.LayerGroup) => {
    setCurrentLayer(null);
  };

  const saveZone = async () => {
    if (!cityId) return toast.error("Please select a city first");
    if (!newZoneName.trim()) return toast.error("Please enter a zone name");
    if (!currentLayer) return toast.error("Please draw a polygon on the map for the zone");

    const latlngs = currentLayer.getLatLngs()[0] as L.LatLng[];
    const coordinates = latlngs.map(ll => [ll.lat, ll.lng]);

    setIsLoading(true);
    const { error } = await supabase.from("transfer_zones").insert({
      city_id: cityId,
      name: newZoneName,
      polygon_coordinates: coordinates,
    });

    if (error) {
      toast.error("Failed to save zone");
    } else {
      toast.success("Zone saved successfully");
      setNewZoneName("");
      setCurrentLayer(null);
      loadZones(cityId);
    }
    setIsLoading(false);
  };

  const deleteZone = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    setIsLoading(true);
    const { error } = await supabase.from("transfer_zones").delete().eq("id", id);
    if (!error) {
      toast.success("Zone deleted");
      loadZones(cityId);
    } else {
      toast.error("Failed to delete zone");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="space-y-1 w-64">
          <label className="text-sm font-medium">Select City</label>
          <Select value={cityId} onValueChange={setCityId}>
            <SelectTrigger><SelectValue placeholder="Choose a city" /></SelectTrigger>
            <SelectContent>
              {cities.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cityId && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 border rounded-lg overflow-hidden h-[500px] relative">
            <MapContainer center={mapCenter} zoom={11} className="h-full w-full" key={`${mapCenter[0]}-${mapCenter[1]}`}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FeatureGroup ref={featureGroupRef}>
                <MapDrawControl onCreated={handleCreated} onDeleted={handleDeleted} featureGroupRef={featureGroupRef} />
              </FeatureGroup>
            </MapContainer>
          </div>

          <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-card space-y-4">
              <h3 className="font-semibold">Add New Zone</h3>
              <p className="text-xs text-muted-foreground">Draw a polygon on the map, name it, and save.</p>
              <Input placeholder="Zone Name (e.g. Zone 1)" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} />
              <Button onClick={saveZone} disabled={isLoading || !currentLayer || !newZoneName.trim()} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Zone
              </Button>
            </div>

            <div className="p-4 border rounded-lg bg-card space-y-4">
              <h3 className="font-semibold">Existing Zones</h3>
              {zones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No zones defined for this city.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {zones.map(zone => (
                    <div key={zone.id} className="flex items-center justify-between p-2 border rounded bg-background">
                      <span className="text-sm font-medium">{zone.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => deleteZone(zone.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
