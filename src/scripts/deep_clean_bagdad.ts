
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function deepSearchBagdad() {
  const tables = [
    'flights', 'cities', 'airports', 'flight_deals', 'hotel_deals', 'group_packages', 'hotels', 'bookings'
  ];

  for (const table of tables) {
    console.log(`Searching table: ${table}...`);
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(`Error reading ${table}:`, error);
      continue;
    }

    const matches = data.filter(row => JSON.stringify(row).toLowerCase().includes('bagdad'));
    if (matches.length > 0) {
      console.log(`Table ${table} has ${matches.length} matches for "bagdad":`);
      matches.forEach(m => console.log(' - ID:', m.id || m.booking_number || 'N/A', 'Content:', JSON.stringify(m).substring(0, 100)));
      
      // Delete them
      for (const m of matches) {
        if (m.id) {
          const { error: dError } = await supabase.from(table).delete().eq('id', m.id);
          if (dError) console.error(`Error deleting from ${table}:`, dError);
          else console.log(`Deleted ID ${m.id} from ${table}`);
        }
      }
    }
  }
}

deepSearchBagdad();
