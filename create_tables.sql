CREATE TABLE IF NOT EXISTS public.bn_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  clean_whatsapp TEXT NOT NULL,
  email TEXT,
  referral_code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  referred_by TEXT,
  referred_by_name TEXT,
  referred_by_whatsapp TEXT,
  is_vip_primary BOOLEAN DEFAULT false,
  vip_expires_at TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bn_purchases (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  product_name TEXT NOT NULL,
  original_link TEXT,
  affiliate_link TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  owner_profit NUMERIC DEFAULT 0,
  cashback NUMERIC DEFAULT 0,
  cashback_rate_pct TEXT,
  category_name TEXT,
  category_icon TEXT,
  status TEXT NOT NULL DEFAULT 'link_created',
  date TEXT NOT NULL,
  user_name TEXT,
  user_whatsapp TEXT,
  primary_user_name TEXT,
  primary_user_whatsapp TEXT,
  primary_bonus_amount NUMERIC DEFAULT 0,
  is_referral_bonus BOOLEAN DEFAULT false,
  referred_buyer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bn_withdrawals (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  user_whatsapp TEXT,
  pix_key TEXT NOT NULL,
  pix_type TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  paid_at TEXT
);

ALTER TABLE public.bn_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bn_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bn_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for bn_users" ON public.bn_users;
CREATE POLICY "Public access for bn_users" ON public.bn_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for bn_purchases" ON public.bn_purchases;
CREATE POLICY "Public access for bn_purchases" ON public.bn_purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for bn_withdrawals" ON public.bn_withdrawals;
CREATE POLICY "Public access for bn_withdrawals" ON public.bn_withdrawals FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.bn_users TO anon, authenticated, service_role;
GRANT ALL ON public.bn_purchases TO anon, authenticated, service_role;
GRANT ALL ON public.bn_withdrawals TO anon, authenticated, service_role;
