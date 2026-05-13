
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkFlights() {
  const { data: flights, error } = await supabase.from('flights').select('departure_city, arrival_city');
  if (error) console.error(error);

  if (flights) {
    const depCities = [...new Set(flights.map(f => f.departure_city))];
    const arrCities = [...new Set(flights.map(f => f.arrival_city))];
    console.log("Unique Departure Cities in Flights:", depCities);
    console.log("Unique Arrival Cities in Flights:", arrCities);
  }
}

checkFlights();
