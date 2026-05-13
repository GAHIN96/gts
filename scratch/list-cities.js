import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listUniqueCities() {
    const { data: flights } = await supabase
        .from('flights')
        .select('departure_city, arrival_city');

    const cities = new Set();
    flights.forEach(f => {
        cities.add(f.departure_city);
        cities.add(f.arrival_city);
    });

    console.log("Unique cities in flights table:");
    console.log(Array.from(cities).sort());
}

listUniqueCities();
