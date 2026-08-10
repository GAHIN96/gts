export const FALLBACK_FLIGHTS = [
  {
    id: "f-101",
    airline: "Turkish Airlines",
    flight_number: "TK-789",
    departure_city: "Erbil",
    arrival_city: "Istanbul",
    departure_date: "2026-08-10",
    departure_time: "09:30",
    arrival_date: "2026-08-10",
    arrival_time: "12:15",
    price: 380,
    available_seats: 42,
    class: "economy",
    is_active: true,
    trip_type: "one_way"
  },
  {
    id: "f-102",
    airline: "Emirates",
    flight_number: "EK-902",
    departure_city: "Baghdad",
    arrival_city: "Dubai",
    departure_date: "2026-08-15",
    departure_time: "14:00",
    arrival_date: "2026-08-15",
    arrival_time: "17:30",
    price: 450,
    available_seats: 30,
    class: "business",
    is_active: true,
    trip_type: "one_way"
  },
  {
    id: "f-103",
    airline: "Iraqi Airways",
    flight_number: "IA-101",
    departure_city: "Erbil",
    arrival_city: "Cairo",
    departure_date: "2026-08-20",
    departure_time: "11:00",
    arrival_date: "2026-08-20",
    arrival_time: "13:30",
    price: 290,
    available_seats: 60,
    class: "economy",
    is_active: true,
    trip_type: "one_way"
  },
  {
    id: "f-104",
    airline: "Flydubai",
    flight_number: "FZ-215",
    departure_city: "Sulaymaniyah",
    arrival_city: "Dubai",
    departure_date: "2026-08-22",
    departure_time: "16:45",
    arrival_date: "2026-08-22",
    arrival_time: "20:10",
    price: 310,
    available_seats: 25,
    class: "economy",
    is_active: true,
    trip_type: "one_way"
  }
];

export const FALLBACK_HOTELS = [
  {
    id: "h-201",
    name: "Grand Hyatt Bosphorus",
    star_rating: 5,
    city_id: "c-1",
    address: "Taksim Square, Istanbul, Turkey",
    price_per_night: 180,
    description: "Luxurious 5-star hotel in the heart of Istanbul with stunning Bosphorus views, spa, and outdoor pool.",
    is_active: true,
    cities: { id: "c-1", name: "Istanbul", country: "Turkey" },
    hotel_rooms: [
      { id: "r-1", room_type: "Deluxe Bosphorus View", price_per_night: 180, capacity: 2, available_rooms: 12 },
      { id: "r-2", room_type: "Executive Suite", price_per_night: 350, capacity: 3, available_rooms: 5 }
    ]
  },
  {
    id: "h-202",
    name: "Atlantis The Palm",
    star_rating: 5,
    city_id: "c-2",
    address: "Crescent Rd, Palm Jumeirah, Dubai, UAE",
    price_per_night: 320,
    description: "Iconic luxury resort on Palm Jumeirah featuring Aquaventure Waterpark and underwater aquarium.",
    is_active: true,
    cities: { id: "c-2", name: "Dubai", country: "UAE" },
    hotel_rooms: [
      { id: "r-3", room_type: "Ocean King Room", price_per_night: 320, capacity: 2, available_rooms: 8 },
      { id: "r-4", room_type: "Imperial Suite", price_per_night: 850, capacity: 4, available_rooms: 2 }
    ]
  },
  {
    id: "h-203",
    name: "Nile Ritz-Carlton",
    star_rating: 5,
    city_id: "c-3",
    address: "1 1113 Corniche El Nil, Cairo, Egypt",
    price_per_night: 210,
    description: "Historic luxury overlooking the Nile River, minutes from Tahrir Square and the Egyptian Museum.",
    is_active: true,
    cities: { id: "c-3", name: "Cairo", country: "Egypt" },
    hotel_rooms: [
      { id: "r-5", room_type: "Nile Deluxe Room", price_per_night: 210, capacity: 2, available_rooms: 15 }
    ]
  }
];

export const FALLBACK_TOURS = [
  {
    id: "t-301",
    name: "Bosphorus Luxury Sunset Cruise & Dinner",
    city_id: "c-1",
    price: 85,
    duration_hours: 4,
    description: "Evening cruise along the Bosphorus strait with live folk dance performance and 3-course dinner.",
    is_active: true,
    cities: { id: "c-1", name: "Istanbul", country: "Turkey" },
    images: ["https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=1000"]
  },
  {
    id: "t-302",
    name: "Desert Safari VIP 4x4 Experience",
    city_id: "c-2",
    price: 120,
    duration_hours: 6,
    description: "High-octane dune bashing, camel rides, falconry show, and traditional Arabian BBQ under the stars.",
    is_active: true,
    cities: { id: "c-2", name: "Dubai", country: "UAE" },
    images: ["https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000"]
  },
  {
    id: "t-303",
    name: "Pyramids & Great Sphinx Private Guide",
    city_id: "c-3",
    price: 95,
    duration_hours: 8,
    description: "Private Egyptologist-guided tour of the Giza Pyramids, Sphinx, and Grand Egyptian Museum.",
    is_active: true,
    cities: { id: "c-3", name: "Cairo", country: "Egypt" },
    images: ["https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&q=80&w=1000"]
  }
];

export const FALLBACK_TRANSFERS = [
  {
    id: "tr-401",
    name: "Istanbul Airport Private VIP Shuttle",
    route_from: "Istanbul Airport (IST)",
    route_to: "Taksim / Sultanahmet Hotels",
    vehicle_type: "Mercedes Vito VIP",
    capacity: 6,
    price: 65,
    transfer_type: "private",
    city_id: "c-1",
    is_active: true
  },
  {
    id: "tr-402",
    name: "Dubai Airport Luxury Limousine",
    route_from: "Dubai Intl Airport (DXB)",
    route_to: "Downtown / Palm Jumeirah",
    vehicle_type: "Cadillac Escalade",
    capacity: 4,
    price: 110,
    transfer_type: "private",
    city_id: "c-2",
    is_active: true
  }
];

export const FALLBACK_PACKAGES = [
  {
    id: "pkg-501",
    title: "Istanbul & Cappadocia Magical 7-Day Tour",
    description: "Complete group package including 5-star hotel stays, Bosphorus cruise, and hot air balloon ride in Cappadocia.",
    price: 890,
    duration_days: 7,
    duration_nights: 6,
    destination: "Istanbul & Cappadocia, Turkey",
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=80&w=1000",
    max_seats: 30,
    booked_seats: 12,
    flights_included: true,
    hotels_included: true,
    transfers_included: true,
    tours_included: true
  },
  {
    id: "pkg-502",
    title: "Dubai & Abu Dhabi Grand VIP Getaway",
    description: "5 Days of pure luxury covering Burj Khalifa, Desert Safari, Atlantis Waterpark, and Sheikh Zayed Mosque.",
    price: 1250,
    duration_days: 5,
    duration_nights: 4,
    destination: "Dubai & Abu Dhabi, UAE",
    is_active: true,
    image_url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1000",
    max_seats: 25,
    booked_seats: 18,
    flights_included: true,
    hotels_included: true,
    transfers_included: true,
    tours_included: true
  }
];

export const FALLBACK_BOOKINGS = [
  {
    id: "bk-601",
    booking_number: "GTS-2026-0081",
    booking_type: "flight",
    total_amount: 760,
    status: "confirmed",
    created_at: new Date().toISOString(),
    passenger_details: [{ firstName: "Omar", lastName: "Hassan", passportNumber: "N987654" }],
    flights: FALLBACK_FLIGHTS[0]
  },
  {
    id: "bk-602",
    booking_number: "GTS-2026-0082",
    booking_type: "hotel",
    total_amount: 900,
    status: "confirmed",
    created_at: new Date().toISOString(),
    passenger_details: [{ firstName: "Sarah", lastName: "Kareem" }],
    hotels: FALLBACK_HOTELS[0]
  },
  {
    id: "bk-603",
    booking_number: "GTS-2026-0083",
    booking_type: "tour",
    total_amount: 240,
    status: "pending_payment",
    created_at: new Date().toISOString(),
    passenger_details: [{ firstName: "Zaid", lastName: "Mustafa" }],
    tours: FALLBACK_TOURS[0]
  }
];
