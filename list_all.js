
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listAll() {
  const { data: airports } = await supabase.from('airports').select('name, code, city');
  const { data: cities } = await supabase.from('cities').select('name');

  console.log("Airports:", JSON.stringify(airports, null, 2));
  console.log("Cities:", JSON.stringify(cities, null, 2));
}

listAll();
