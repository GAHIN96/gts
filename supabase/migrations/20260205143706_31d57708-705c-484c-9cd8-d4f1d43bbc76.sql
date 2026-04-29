-- Add required_documents JSONB column to group_packages
ALTER TABLE group_packages 
ADD COLUMN required_documents JSONB DEFAULT '[]'::jsonb;

-- Migrate existing passport_required and visa_required data to new format
UPDATE group_packages
SET required_documents = 
  CASE 
    WHEN passport_required = true AND visa_required = true THEN 
      '[{"id":"passport","name":"Passport","description":"Valid passport with 6+ months validity","required":true,"icon":"passport"},{"id":"visa","name":"Visa","description":"Approved visa document","required":true,"icon":"file"}]'::jsonb
    WHEN passport_required = true THEN 
      '[{"id":"passport","name":"Passport","description":"Valid passport with 6+ months validity","required":true,"icon":"passport"}]'::jsonb
    WHEN visa_required = true THEN 
      '[{"id":"visa","name":"Visa","description":"Approved visa document","required":true,"icon":"file"}]'::jsonb
    ELSE '[]'::jsonb
  END;