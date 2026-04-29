UPDATE app_settings 
SET setting_value = jsonb_set(
  setting_value::jsonb, 
  '{logo}', 
  '"https://wumholworulutftwkqjw.supabase.co/storage/v1/object/public/settings-images/logos/company-logo-latest.png"'
)
WHERE setting_key = 'company_settings';