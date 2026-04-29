-- Add recurring schedule fields to flights
ALTER TABLE flights ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'specific';
ALTER TABLE flights ADD COLUMN IF NOT EXISTS recurring_days integer[];
ALTER TABLE flights ADD COLUMN IF NOT EXISTS valid_from date;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS valid_until date;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS total_seats integer DEFAULT 100;

-- Add recurring schedule fields to hotels
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS valid_from date;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS valid_until date;

-- Add room inventory fields to hotel_rooms
ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS total_rooms integer DEFAULT 10;
ALTER TABLE hotel_rooms ADD COLUMN IF NOT EXISTS available_rooms integer DEFAULT 10;

-- Add recurring schedule fields to group_packages
ALTER TABLE group_packages ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'specific';
ALTER TABLE group_packages ADD COLUMN IF NOT EXISTS recurring_days integer[];
ALTER TABLE group_packages ADD COLUMN IF NOT EXISTS valid_from date;
ALTER TABLE group_packages ADD COLUMN IF NOT EXISTS valid_until date;

-- Create room availability tracking table
CREATE TABLE IF NOT EXISTS room_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES hotel_rooms(id) ON DELETE CASCADE,
  date date NOT NULL,
  available_count integer DEFAULT 0,
  booked_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, date)
);

-- Enable RLS on room_availability
ALTER TABLE room_availability ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_availability
CREATE POLICY "Admins can manage room availability" ON room_availability
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view room availability" ON room_availability
  FOR SELECT USING (true);