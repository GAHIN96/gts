-- Migration: Add standard amenities
-- Created: 2026-06-14

INSERT INTO public.amenities (name, category, icon, is_active)
VALUES
  -- General
  ('Wifi', 'general', 'wifi', true),
  ('Air Conditioning', 'general', 'wind', true),
  ('Heating', 'general', 'thermometer', true),
  
  -- Room
  ('TV', 'room', 'tv', true),
  ('Balcony', 'room', 'layout', true),
  ('Mini Fridge', 'room', 'refrigerator', true),
  ('Safe', 'room', 'shield', true),
  
  -- Hotel
  ('Parking', 'hotel', 'car', true),
  ('Elevator', 'hotel', 'arrow-up', true),
  ('24-hour Front Desk', 'hotel', 'clock', true),
  ('Concierge', 'hotel', 'info', true),
  
  -- Bathroom
  ('Hair Dryer', 'bathroom', 'wind', true),
  ('Toiletries', 'bathroom', 'droplet', true),
  ('Bathtub', 'bathroom', 'bath', true),
  ('Shower', 'bathroom', 'shower-head', true),
  
  -- Dining
  ('Restaurant', 'dining', 'utensils', true),
  ('Bar', 'dining', 'wine', true),
  ('Room Service', 'dining', 'bell', true),
  ('Breakfast Included', 'dining', 'coffee', true),
  
  -- Recreation
  ('Pool', 'recreation', 'waves', true),
  ('Gym', 'recreation', 'dumbbell', true),
  ('Spa', 'recreation', 'flower', true),
  
  -- Business
  ('Meeting Room', 'business', 'users', true),
  ('Business Center', 'business', 'briefcase', true)
ON CONFLICT DO NOTHING;
