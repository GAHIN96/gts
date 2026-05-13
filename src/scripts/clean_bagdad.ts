
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanBagdad() {
  console.log('Checking for "bagdad"...');
  
  // Check flights
  const { data: flights, error: fError } = await supabase
    .from('flights')
    .select('id, departure_city, arrival_city')
    .or('departure_city.ilike.bagdad,arrival_city.ilike.bagdad');
    
  if (fError) {
    console.error('Error fetching flights:', fError);
  } else if (flights && flights.length > 0) {
    console.log(`Found ${flights.length} flights with "bagdad". Deleting...`);
    const { error: dError } = await supabase
      .from('flights')
      .delete()
      .in('id', flights.map(f => f.id));
    if (dError) console.error('Error deleting flights:', dError);
    else console.log('Deleted flights successfully.');
  } else {
    console.log('No flights with "bagdad" found.');
  }

  // Check cities table
  const { data: cities, error: cError } = await supabase
    .from('cities')
    .select('id, name')
    .ilike('name', 'bagdad');

  if (cError) {
    console.error('Error fetching cities:', cError);
  } else if (cities && cities.length > 0) {
    console.log(`Found ${cities.length} cities with "bagdad". Deleting...`);
    const { error: dError } = await supabase
      .from('cities')
      .delete()
      .in('id', cities.map(c => c.id));
    if (dError) console.error('Error deleting cities:', dError);
    else console.log('Deleted cities successfully.');
  } else {
    console.log('No cities with "bagdad" found.');
  }
}

cleanBagdad();
