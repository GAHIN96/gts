
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDuplicates() {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .ilike('name', 'baghdad%');

  if (error) {
    console.error(error);
  } else {
    console.log("Found cities:", JSON.stringify(data, null, 2));
  }
}

checkDuplicates();
