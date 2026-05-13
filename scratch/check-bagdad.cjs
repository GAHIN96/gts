const { createClient } = require('@supabase/supabase-client');

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDuplicates() {
    console.log("Checking for 'Bagdad' duplicates...");
    
    const { data: cities, error: citiesError } = await supabase
        .from('cities')
        .select('*')
        .ilike('name', '%bagdad%');
    
    if (citiesError) {
        console.error("Error fetching cities:", citiesError);
    } else {
        console.log("Cities matching 'bagdad':", cities);
    }

    const { data: flights, error: flightsError } = await supabase
        .from('flights')
        .select('id, departure_city, arrival_city')
        .or('departure_city.ilike.%bagdad%,arrival_city.ilike.%bagdad%');

    if (flightsError) {
        console.error("Error fetching flights:", flightsError);
    } else {
        console.log("Flights with 'bagdad':", flights);
    }
}

checkDuplicates();
