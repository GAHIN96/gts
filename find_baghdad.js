
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findBaghdad() {
  const { data: cities, error } = await supabase
    .from('cities')
    .select('*');

  if (error) {
    console.error("Error fetching cities:", error);
    return;
  }

  const baghdads = cities.filter(c => 
    c.name.toLowerCase().includes('bag') || 
    c.name.toLowerCase().includes('بغد')
  );

  console.log("Found cities:", JSON.stringify(baghdads, null, 2));
}

findBaghdad();
