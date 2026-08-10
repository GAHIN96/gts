-- Create transfer_zones table
CREATE TABLE IF NOT EXISTS transfer_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  polygon_coordinates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create transfer_zone_prices table
CREATE TABLE IF NOT EXISTS transfer_zone_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_zone_id UUID REFERENCES transfer_zones(id) ON DELETE CASCADE,
  to_zone_id UUID REFERENCES transfer_zones(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for transfer_zones
ALTER TABLE transfer_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to transfer_zones"
  ON transfer_zones FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users full access to transfer_zones"
  ON transfer_zones FOR ALL
  TO authenticated
  USING (true);

-- RLS for transfer_zone_prices
ALTER TABLE transfer_zone_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to transfer_zone_prices"
  ON transfer_zone_prices FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users full access to transfer_zone_prices"
  ON transfer_zone_prices FOR ALL
  TO authenticated
  USING (true);
