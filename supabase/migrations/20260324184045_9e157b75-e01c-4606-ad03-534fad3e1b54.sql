INSERT INTO cities (name, country, is_active, description)
VALUES ('Baghdad', 'Iraq', true, 'Capital of Iraq')
ON CONFLICT DO NOTHING;