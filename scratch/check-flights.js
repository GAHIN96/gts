const { createClient } = require('@supabase/supabase-base');
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFlights() {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .filter('is_active', 'eq', true);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Total active flights:', data.length);
  
  // Look for Sirnak/Istanbul flights
  const sirnakFlights = data.filter(f => 
    f.departure_city.toLowerCase().includes('sir') || 
    f.arrival_city.toLowerCase().includes('sir')
  );
  
  console.log('Sirnak related flights:', sirnakFlights.map(f => ({
    id: f.id,
    from: f.departure_city,
    to: f.arrival_city,
    date: f.departure_date,
    type: f.schedule_type,
    days: f.recurring_days
  })));
}

checkFlights();
