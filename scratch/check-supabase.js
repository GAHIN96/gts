import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkAgencies() {
  const { data, error, status, statusText } = await supabase.from('agencies').select('*');
  console.log('Status:', status, statusText);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Agencies data:', data?.length, 'records found');
  }
}

checkAgencies();
