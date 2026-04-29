ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'pay_by_transfer';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'pay_by_card';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'rasheed_bank';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'trade_bank_iraq';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'national_bank_iraq';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'kurdistan_intl_bank';