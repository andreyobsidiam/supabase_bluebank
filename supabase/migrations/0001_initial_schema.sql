-- Create custom types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE audit_event_type AS ENUM (
      'login_success',
      'login_failure',
      'logout',
      'otp_verification',
      'linked_account_add',
      'profile_update',
      'profile_photo_update',
      'transaction_created',
      'password_reset_success',
      'open_checking_account',
      'open_savings_account',
      'open_blue_reserve_account',
      'request_credit_card',
      'request_debit_card',
      'add_new_beneficiary',
      'remove_beneficiary'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  email text UNIQUE,
  name text,
  phone_number text,
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  logon_id text,
  name text,
  email text,
  phone_number text,
  is_banned boolean DEFAULT false,
  banned_until timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_fk FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Create user_logs table
CREATE TABLE IF NOT EXISTS public.user_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  event_type audit_event_type NOT NULL,
  details jsonb,
  device_info jsonb,
  ip_address inet,
  CONSTRAINT user_logs_pkey PRIMARY KEY (id),
  CONSTRAINT user_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins table
DROP POLICY IF EXISTS "Admins can view own admin record" ON public.admins;
CREATE POLICY "Admins can view own admin record" ON public.admins
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update own admin record" ON public.admins;
CREATE POLICY "Admins can update own admin record" ON public.admins
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_logs table
DROP POLICY IF EXISTS "Users can view own logs" ON public.user_logs;
CREATE POLICY "Users can view own logs" ON public.user_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow backend and user to insert audit logs" ON public.user_logs;
CREATE POLICY "Allow backend and user to insert audit logs" ON public.user_logs
  FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow backend to read all audit logs" ON public.user_logs;
CREATE POLICY "Allow backend to read all audit logs" ON public.user_logs
  FOR SELECT USING (true);
