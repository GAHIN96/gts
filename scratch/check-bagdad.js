import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDuplicates() {
    console.log("Checking for 'Baghdad'/'Bagdad' duplicates...");
    
    const { data: cities, error: citiesError } = await supabase
        .from('cities')
        .select('*');
    
    if (citiesError) {
        console.error("Error fetching cities:", citiesError);
    } else {
        const matching = cities.filter(c => c.name.toLowerCase().includes('bag'));
        console.log("Cities matching 'bag':", matching);
    }

    const { data: flights, error: flightsError } = await supabase
        .from('flights')
        .select('id, departure_city, arrival_city');

    if (flightsError) {
        console.error("Error fetching flights:", flightsError);
    } else {
        const matchingFlights = flights.filter(f => 
            f.departure_city.toLowerCase().includes('bag') || 
            f.arrival_city.toLowerCase().includes('bag')
        );
        console.log("Flights with 'bag':", matchingFlights);
    }
}

checkDuplicates();
