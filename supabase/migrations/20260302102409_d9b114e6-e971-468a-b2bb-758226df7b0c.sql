
UPDATE public.package_hotels 
SET is_default = true 
WHERE package_id = 'ad221b19-018a-4fea-9ad2-d60962826597' 
  AND hotel_id = 'aff470df-716a-496b-8352-de3a942aa8c8';

UPDATE public.package_hotels 
SET is_default = false 
WHERE package_id = 'ad221b19-018a-4fea-9ad2-d60962826597' 
  AND hotel_id = '776f57fe-0b15-47aa-815a-a1daedc4a16d';
