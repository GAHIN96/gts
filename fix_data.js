
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixData() {
  // 1. Fix "bagdad" typo in all flights
  const { data: update1, error: err1 } = await supabase
    .from('flights')
    .update({ departure_city: 'Baghdad' })
    .eq('departure_city', 'bagdad');

  const { data: update2, error: err2 } = await supabase
    .from('flights')
    .update({ arrival_city: 'Baghdad' })
    .eq('arrival_city', 'bagdad');

  if (err1) console.error("Update1 error:", err1);
  if (err2) console.error("Update2 error:", err2);

  console.log("Fix complete. Check flight counts for Sirnak -> Istanbul:");
  
  const { data: sirnakFlights, error: sirErr } = await supabase
    .from('flights')
    .select('*')
    .eq('departure_city', 'Sirnak')
    .eq('arrival_city', 'Istanbul');

  if (sirErr) console.error("Sirnak fetch error:", sirErr);
  console.log("Found Sirnak -> Istanbul flights:", JSON.stringify(sirnakFlights, null, 2));
}

fixData();
