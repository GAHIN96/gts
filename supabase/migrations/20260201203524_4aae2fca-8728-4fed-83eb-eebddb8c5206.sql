-- Add passport_required and barcode fields to group_packages
ALTER TABLE group_packages 
ADD COLUMN passport_required BOOLEAN DEFAULT true,
ADD COLUMN barcode_value TEXT;