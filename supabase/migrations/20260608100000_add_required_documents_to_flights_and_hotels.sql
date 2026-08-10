-- Add required_documents JSONB column to flights and hotels
ALTER TABLE flights 
ADD COLUMN required_documents JSONB DEFAULT '[]'::jsonb;

ALTER TABLE hotels 
ADD COLUMN required_documents JSONB DEFAULT '[]'::jsonb;

