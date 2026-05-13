import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDetails() {
    const { data: flights } = await supabase
        .from('flights')
        .select('*')
        .or(`departure_city.ilike.%bagdad%,arrival_city.ilike.%bagdad%`);

    console.log("All 'bag' flights:");
    flights.forEach(f => {
        console.log(`ID: ${f.id} | ${f.departure_city} -> ${f.arrival_city} | Date: ${f.departure_date} | Airline: ${f.airline} | Active: ${f.is_active}`);
    });
}

checkDetails();
