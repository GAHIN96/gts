import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Airport {
  id: string;
  name: string;
  code: string;
  city_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cities?: { name: string; country: string } | null;
}

export function useAirports() {
  const queryClient = useQueryClient();

  const { data: airports = [], isLoading } = useQuery({
    queryKey: ["airports"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("airports").select("*, cities(name, country)").order("name");
      if (error) throw error;
      return data as Airport[];
    },
  });

  const createAirport = useMutation({
    mutationFn: async (airport: { name: string; code: string; city_id?: string; is_active?: boolean }) => {
      const { error } = await (supabase as any).from("airports").insert(airport);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      toast.success("Airport created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateAirport = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Airport> & { id: string }) => {
      const { error } = await (supabase as any).from("airports").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      toast.success("Airport updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const seedAirports = useMutation({
    mutationFn: async () => {
      // 1. Define Cities and Airports to seed
      const regionalCities = [
        { name: 'Baghdad', country: 'Iraq' }, { name: 'Erbil', country: 'Iraq' }, { name: 'Basra', country: 'Iraq' },
        { name: 'Najaf', country: 'Iraq' }, { name: 'Sulaymaniyah', country: 'Iraq' }, { name: 'Kirkuk', country: 'Iraq' },
        { name: 'Nasiriyah', country: 'Iraq' }, { name: 'Sirnak', country: 'Turkey' }, { name: 'Istanbul', country: 'Turkey' },
        { name: 'Antalya', country: 'Turkey' }, { name: 'Ankara', country: 'Turkey' }, { name: 'Izmir', country: 'Turkey' },
        { name: 'Trabzon', country: 'Turkey' }, { name: 'Dalaman', country: 'Turkey' }, { name: 'Bodrum', country: 'Turkey' },
        { name: 'Adana', country: 'Turkey' }, { name: 'Gaziantep', country: 'Turkey' }, { name: 'Dubai', country: 'UAE' },
        { name: 'Abu Dhabi', country: 'UAE' }, { name: 'Sharjah', country: 'UAE' }, { name: 'Amman', country: 'Jordan' },
        { name: 'Beirut', country: 'Lebanon' }, { name: 'Cairo', country: 'Egypt' }, { name: 'Jeddah', country: 'Saudi Arabia' },
        { name: 'Riyadh', country: 'Saudi Arabia' }, { name: 'Doha', country: 'Qatar' }, { name: 'Kuwait City', country: 'Kuwait' },
        { name: 'Muscat', country: 'Oman' }
      ];

      const regionalAirports = [
        { name: 'Baghdad International Airport', code: 'BGW', cityName: 'Baghdad', country: 'Iraq' },
        { name: 'Erbil International Airport', code: 'EBL', cityName: 'Erbil', country: 'Iraq' },
        { name: 'Basra International Airport', code: 'BSR', cityName: 'Basra', country: 'Iraq' },
        { name: 'Al Najaf International Airport', code: 'NJF', cityName: 'Najaf', country: 'Iraq' },
        { name: 'Istanbul Airport', code: 'IST', cityName: 'Istanbul', country: 'Turkey' },
        { name: 'Sabiha Gökçen International Airport', code: 'SAW', cityName: 'Istanbul', country: 'Turkey' },
        { name: 'Antalya Airport', code: 'AYT', cityName: 'Antalya', country: 'Turkey' },
        { name: 'Dubai International Airport', code: 'DXB', cityName: 'Dubai', country: 'UAE' },
        { name: 'Queen Alia International Airport', code: 'AMM', cityName: 'Amman', country: 'Jordan' },
        { name: 'Rafic Hariri International Airport', code: 'BEY', cityName: 'Beirut', country: 'Lebanon' },
        { name: 'Cairo International Airport', code: 'CAI', cityName: 'Cairo', country: 'Egypt' },
        { name: 'King Abdulaziz International Airport', code: 'JED', cityName: 'Jeddah', country: 'Saudi Arabia' }
      ];

      // 2. Ensure Cities exist
      for (const city of regionalCities) {
        const { data: existing } = await supabase.from('cities').select('id').eq('name', city.name).eq('country', city.country).single();
        if (!existing) {
          await supabase.from('cities').insert({ ...city, is_active: true });
        }
      }

      // 3. Get all cities mapping
      const { data: allCities } = await supabase.from('cities').select('id, name, country');
      
      // 4. Insert Airports
      for (const airport of regionalAirports) {
        const city = allCities?.find(c => c.name === airport.cityName && c.country === airport.country);
        if (city) {
          const { data: existing } = await supabase.from('airports').select('id').eq('code', airport.code).single();
          if (!existing) {
            await (supabase as any).from('airports').insert({
              name: airport.name,
              code: airport.code,
              city_id: city.id,
              is_active: true
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success("Regional airports seeded successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAirport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("airports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      toast.success("Airport deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { airports, isLoading, createAirport, updateAirport, deleteAirport, seedAirports };
}
