-- Create beneficiaries table
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  nickname text,
  type text NOT NULL CHECK (type IN ('bluePay', 'wireTransfer')),
  account_number text NOT NULL,
  -- Wire transfer specific fields
  bank_name text,
  swift_code text,
  address text,
  country text,
  currency text,
  bank_address text,
  bank_code_type text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT beneficiaries_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own beneficiaries" ON public.beneficiaries;
CREATE POLICY "Users can view own beneficiaries" ON public.beneficiaries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own beneficiaries" ON public.beneficiaries;
CREATE POLICY "Users can insert own beneficiaries" ON public.beneficiaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own beneficiaries" ON public.beneficiaries;
CREATE POLICY "Users can update own beneficiaries" ON public.beneficiaries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own beneficiaries" ON public.beneficiaries;
CREATE POLICY "Users can delete own beneficiaries" ON public.beneficiaries
  FOR DELETE USING (auth.uid() = user_id);

-- Create a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_beneficiaries_updated_at ON public.beneficiaries;
CREATE TRIGGER update_beneficiaries_updated_at
    BEFORE UPDATE ON public.beneficiaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
