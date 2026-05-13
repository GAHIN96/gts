
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkEverything() {
  const { data: cities, error: cErr } = await supabase.from('cities').select('*');
  const { data: airports, error: aErr } = await supabase.from('airports').select('*');

  if (cErr) console.error("Cities error:", cErr);
  if (aErr) console.error("Airports error:", aErr);

  console.log("Cities found:", cities?.length || 0);
  console.log("Airports found:", airports?.length || 0);

  if (cities) {
    console.log("Cities names:", cities.map(c => c.name).join(', '));
  }
  if (airports) {
    console.log("Airports names:", airports.map(a => a.name).join(', '));
  }
}

checkEverything();
