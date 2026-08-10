import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useMockDataInserter() {
  useEffect(() => {
    const insertData = async () => {
      try {
        // 1. Check & Insert Cities if empty
        const { data: cities } = await supabase.from('cities').select('id, name');
        let cityList = cities || [];
        if (cityList.length === 0) {
          const { data: newCities } = await supabase.from('cities').insert([
            { name: "Istanbul", country: "Turkey", is_active: true },
            { name: "Dubai", country: "UAE", is_active: true },
            { name: "Cairo", country: "Egypt", is_active: true },
            { name: "Kuala Lumpur", country: "Malaysia", is_active: true },
            { name: "Erbil", country: "Iraq", is_active: true },
          ]).select();
          cityList = newCities || [];
        }

        const istanbulId = cityList.find(c => c.name === "Istanbul")?.id || cityList[0]?.id;
        const dubaiId = cityList.find(c => c.name === "Dubai")?.id || cityList[0]?.id;
        const cairoId = cityList.find(c => c.name === "Cairo")?.id || cityList[0]?.id;

        // 2. Check & Insert Flights
        const { data: existingFlights } = await supabase.from('flights').select('id').limit(1);
        if (existingFlights && existingFlights.length === 0) {
          await supabase.from('flights').insert([
            {
              airline: "Turkish Airlines",
              flight_number: "TK-789",
              departure_city: "Erbil",
              arrival_city: "Istanbul",
              departure_date: "2026-08-10",
              departure_time: "09:30:00",
              arrival_date: "2026-08-10",
              arrival_time: "12:15:00",
              price: 380,
              available_seats: 42,
              class: "economy",
              is_active: true,
              trip_type: "one_way"
            },
            {
              airline: "Emirates",
              flight_number: "EK-902",
              departure_city: "Baghdad",
              arrival_city: "Dubai",
              departure_date: "2026-08-15",
              departure_time: "14:00:00",
              arrival_date: "2026-08-15",
              arrival_time: "17:30:00",
              price: 450,
              available_seats: 30,
              class: "business",
              is_active: true,
              trip_type: "one_way"
            },
            {
              airline: "Iraqi Airways",
              flight_number: "IA-101",
              departure_city: "Erbil",
              arrival_city: "Cairo",
              departure_date: "2026-08-20",
              departure_time: "11:00:00",
              arrival_date: "2026-08-20",
              arrival_time: "13:30:00",
              price: 290,
              available_seats: 60,
              class: "economy",
              is_active: true,
              trip_type: "one_way"
            }
          ]);
        }

        // 3. Check & Insert Hotels
        const { data: existingHotels } = await supabase.from('hotels').select('id').limit(1);
        if (existingHotels && existingHotels.length === 0) {
          await supabase.from('hotels').insert([
            {
              name: "Grand Hyatt Bosphorus",
              star_rating: 5,
              city_id: istanbulId,
              address: "Taksim Square, Istanbul",
              price_per_night: 180,
              description: "Luxurious 5-star hotel in the heart of Istanbul with Bosphorus views.",
              is_active: true
            },
            {
              name: "Atlantis The Palm",
              star_rating: 5,
              city_id: dubaiId,
              address: "Crescent Rd, Palm Jumeirah, Dubai",
              price_per_night: 320,
              description: "Iconic luxury resort on Palm Jumeirah with private waterpark.",
              is_active: true
            },
            {
              name: "Nile Ritz-Carlton",
              star_rating: 5,
              city_id: cairoId,
              address: "Corniche El Nil, Cairo",
              price_per_night: 210,
              description: "Historic luxury overlooking the majestic Nile River.",
              is_active: true
            }
          ]);
        }

        // 4. Check & Insert Tours
        const { data: existingTours } = await supabase.from('tours').select('id').limit(1);
        if (existingTours && existingTours.length === 0) {
          await supabase.from('tours').insert([
            {
              name: "Bosphorus Luxury Dinner Cruise",
              city_id: istanbulId,
              price: 85,
              duration_hours: 4,
              description: "Evening cruise with live shows, traditional Turkish cuisine, and bridge illuminations.",
              is_active: true
            },
            {
              name: "Desert Safari VIP Experience",
              city_id: dubaiId,
              price: 120,
              duration_hours: 6,
              description: "4x4 dune bashing, camel riding, BBQ dinner, and falconry show.",
              is_active: true
            },
            {
              name: "Pyramids & Sphinx Private Tour",
              city_id: cairoId,
              price: 95,
              duration_hours: 8,
              description: "Guided private tour of Giza plateau, Egyptian Museum, and Khan el-Khalili bazaar.",
              is_active: true
            }
          ]);
        }

        // 5. Check & Insert Transfers
        const { data: existingTransfers } = await supabase.from('transfers').select('id').limit(1);
        if (existingTransfers && existingTransfers.length === 0) {
          await supabase.from('transfers').insert([
            {
              name: "Istanbul Airport Private VIP Shuttle",
              route_from: "Istanbul Airport (IST)",
              route_to: "Taksim / Sultanahmet Hotels",
              vehicle_type: "Mercedes Vito VIP",
              capacity: 6,
              price: 65,
              transfer_type: "private",
              city_id: istanbulId,
              is_active: true
            },
            {
              name: "Dubai Airport Luxury Limousine",
              route_from: "Dubai Intl Airport (DXB)",
              route_to: "Downtown / Palm Jumeirah",
              vehicle_type: "Cadillac Escalade",
              capacity: 4,
              price: 110,
              transfer_type: "private",
              city_id: dubaiId,
              is_active: true
            }
          ]);
        }

        // 6. Check & Insert Amenities if empty
        const { data: existingAmenities } = await supabase.from('amenities').select('id').limit(1);
        if (existingAmenities && existingAmenities.length === 0) {
          await supabase.from('amenities').insert([
            { name: 'Wifi', category: 'general', icon: 'wifi', is_active: true },
            { name: 'Air Conditioning', category: 'general', icon: 'wind', is_active: true },
            { name: 'TV', category: 'room', icon: 'tv', is_active: true },
            { name: 'Parking', category: 'hotel', icon: 'car', is_active: true },
            { name: 'Restaurant', category: 'dining', icon: 'utensils', is_active: true },
            { name: 'Pool', category: 'recreation', icon: 'waves', is_active: true },
            { name: 'Gym', category: 'recreation', icon: 'dumbbell', is_active: true }
          ]);
        }
      } catch (err) {
        console.error("Failed to insert mock data:", err);
      }
    };

    insertData();
  }, []);
}
