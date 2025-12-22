-- Add INSERT policy for profiles table to allow service role and users to insert profiles
-- This is required for the auth_manager function to create user profiles

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile during registration" ON public.profiles;

-- Allow service role to insert any profile (for backend operations)
CREATE POLICY "Allow service role to insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert own profile during registration" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);